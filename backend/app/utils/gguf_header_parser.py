"""
Lightweight GGUF binary header parser.

GGUF format (little-endian):
  4 bytes  — magic "GGUF"
  4 bytes  — version (uint32)
  8 bytes  — n_tensors (uint64)
  8 bytes  — n_kv (uint64)
  [n_kv KV pairs]
    each KV:
      string key  (uint64 len + bytes)
      uint32 type
      value       (type-dependent)

We fetch only the first N bytes via HTTP Range request, so we may not get
all tensors, but the metadata KV block comes first and contains everything
we need (architecture, context length, layer counts, etc.)
"""

import struct
import io
from typing import Any, Optional


class GGUFType:
    UINT8   = 0
    INT8    = 1
    UINT16  = 2
    INT16   = 3
    UINT32  = 4
    INT32   = 5
    FLOAT32 = 6
    BOOL    = 7
    STRING  = 8
    ARRAY   = 9
    UINT64  = 10
    INT64   = 11
    FLOAT64 = 12


GGUF_MAGIC = b"GGUF"
MAX_ARRAY_ELEMENTS = 512   # avoid OOM on huge arrays in header
MAX_STRING_LENGTH  = 65536  # 64 KB per string
MAX_KV_COUNT       = 4096   # no header should have more than this
MAX_NESTING_DEPTH  = 2      # arrays of arrays not expected in GGUF


class GGUFHeaderParser:
    def __init__(self, data: bytes):
        self._stream = io.BytesIO(data)
        self._data_len = len(data)

    # ── Primitive readers ──────────────────────────────────────────────────

    def _read(self, n: int) -> bytes:
        chunk = self._stream.read(n)
        if len(chunk) < n:
            raise EOFError(f"Truncated GGUF header — needed {n}, got {len(chunk)}")
        return chunk

    def read_uint8(self)  -> int:   return struct.unpack("<B", self._read(1))[0]
    def read_int8(self)   -> int:   return struct.unpack("<b", self._read(1))[0]
    def read_uint16(self) -> int:   return struct.unpack("<H", self._read(2))[0]
    def read_int16(self)  -> int:   return struct.unpack("<h", self._read(2))[0]
    def read_uint32(self) -> int:   return struct.unpack("<I", self._read(4))[0]
    def read_int32(self)  -> int:   return struct.unpack("<i", self._read(4))[0]
    def read_float32(self)-> float: return struct.unpack("<f", self._read(4))[0]
    def read_uint64(self) -> int:   return struct.unpack("<Q", self._read(8))[0]
    def read_int64(self)  -> int:   return struct.unpack("<q", self._read(8))[0]
    def read_float64(self)-> float: return struct.unpack("<d", self._read(8))[0]
    def read_bool(self)   -> bool:  return bool(self.read_uint8())

    def read_string(self) -> str:
        length = self.read_uint64()
        if length > 65536:
            raise ValueError(f"String length suspiciously large: {length}")
        return self._read(length).decode("utf-8", errors="replace")

    def read_value(self, type_id: int) -> Any:
        scalar_readers = {
            GGUFType.UINT8:   self.read_uint8,
            GGUFType.INT8:    self.read_int8,
            GGUFType.UINT16:  self.read_uint16,
            GGUFType.INT16:   self.read_int16,
            GGUFType.UINT32:  self.read_uint32,
            GGUFType.INT32:   self.read_int32,
            GGUFType.FLOAT32: self.read_float32,
            GGUFType.BOOL:    self.read_bool,
            GGUFType.STRING:  self.read_string,
            GGUFType.UINT64:  self.read_uint64,
            GGUFType.INT64:   self.read_int64,
            GGUFType.FLOAT64: self.read_float64,
        }
        if type_id == GGUFType.ARRAY:
            arr_type = self.read_uint32()
            count = self.read_uint64()
            count = min(count, MAX_ARRAY_ELEMENTS)
            reader = scalar_readers.get(arr_type)
            if reader:
                return [reader() for _ in range(count)]
            return []
        reader = scalar_readers.get(type_id)
        if reader:
            return reader()
        raise ValueError(f"Unknown GGUF type: {type_id}")

    # ── Main parse ─────────────────────────────────────────────────────────

    def parse(self) -> dict:
        magic = self._stream.read(4)
        if magic != GGUF_MAGIC:
            raise ValueError(f"Not a GGUF file (magic={magic!r})")

        version   = self.read_uint32()
        if version not in (2, 3):
            raise ValueError(f"Unsupported GGUF version: {version}")
        n_tensors = self.read_uint64()
        n_kv      = self.read_uint64()
        if n_kv > MAX_KV_COUNT:
            raise ValueError(f"Suspicious KV count: {n_kv} (max {MAX_KV_COUNT})")

        metadata: dict[str, Any] = {}
        for _ in range(n_kv):
            try:
                key     = self.read_string()
                type_id = self.read_uint32()
                value   = self.read_value(type_id)
                metadata[key] = value
            except (EOFError, ValueError):
                break  # truncated header — use what we got

        return {
            "version":   version,
            "n_tensors": n_tensors,
            "metadata":  metadata,
        }


# ── Metadata extraction helpers ────────────────────────────────────────────

def extract_model_info(metadata: dict) -> dict:
    """
    Extract useful fields from GGUF metadata KV pairs.
    Handles architecture prefix variations (llama., qwen2., phi3., etc.)
    """
    arch = metadata.get("general.architecture", "unknown")
    prefix = arch if arch != "unknown" else "llama"

    def get(*keys, default=None):
        for k in keys:
            v = metadata.get(k)
            if v is not None:
                return v
        return default

    return {
        "architecture":    arch,
        "name":            get("general.name", default=""),
        "parameter_count": get("general.parameter_count", default=0),
        "quantization_id": get("general.file_type", default=-1),
        "context_length":  get(
            f"{prefix}.context_length",
            "general.context_length",
            default=4096,
        ),
        "n_layers":   get(f"{prefix}.block_count", default=32),
        "n_heads":    get(f"{prefix}.attention.head_count", default=32),
        "n_kv_heads": get(
            f"{prefix}.attention.head_count_kv",
            f"{prefix}.attention.head_count",
            default=8,
        ),
        "head_dim": get(
            f"{prefix}.attention.key_length",
            default=_derive_head_dim(metadata, prefix),
        ),
        "vocab_size": get(
            f"{prefix}.vocab_size",
            "tokenizer.ggml.tokens",  # fallback: count of token list
            default=32000,
        ),
        "embedding_length": get(f"{prefix}.embedding_length", default=4096),
        "feed_forward_length": get(f"{prefix}.feed_forward_length", default=0),
        "rope_freq_base": get(f"{prefix}.rope.freq_base", default=10000.0),
        "tokenizer_model": get("tokenizer.ggml.model", default="unknown"),
    }


class ParsedGGUFMetadata:
    """Validated, normalized metadata extracted from a GGUF header."""
    __slots__ = (
        "architecture", "name", "parameter_count", "context_length",
        "n_layers", "n_heads", "n_kv_heads", "head_dim", "vocab_size",
        "embedding_length", "feed_forward_length", "rope_freq_base",
        "tokenizer_model", "quantization_id",
    )

    def __init__(self, raw: dict):
        self.architecture: str       = raw.get("architecture", "unknown")
        self.name: str               = raw.get("name", "")
        self.parameter_count: int    = max(int(raw.get("parameter_count", 0)), 0)
        self.context_length: int     = max(int(raw.get("context_length", 4096)), 128)
        self.n_layers: int           = max(int(raw.get("n_layers", 32)), 1)
        self.n_heads: int            = max(int(raw.get("n_heads", 32)), 1)
        self.n_kv_heads: int         = max(int(raw.get("n_kv_heads", 8)), 1)
        self.head_dim: int           = max(int(raw.get("head_dim", 128)), 1)
        self.vocab_size: int         = max(int(raw.get("vocab_size", 32000)), 1)
        self.embedding_length: int   = int(raw.get("embedding_length", 4096))
        self.feed_forward_length: int = int(raw.get("feed_forward_length", 0))
        self.rope_freq_base: float   = float(raw.get("rope_freq_base", 10000.0))
        self.tokenizer_model: str    = raw.get("tokenizer_model", "unknown")
        self.quantization_id: int    = int(raw.get("quantization_id", -1))

    def to_dict(self) -> dict:
        return {s: getattr(self, s) for s in self.__slots__}


def _derive_head_dim(metadata: dict, prefix: str) -> int:
    """Derive head_dim from embedding_length / n_heads if not stored."""
    emb = metadata.get(f"{prefix}.embedding_length", 4096)
    heads = metadata.get(f"{prefix}.attention.head_count", 32)
    if heads and emb:
        return emb // heads
    return 128
