"""
Tests for input validation utilities.
"""

import pytest
from fastapi import HTTPException
from app.core.validation import validate_repo_id, validate_search_query


class TestValidateRepoID:
    def test_valid_repo(self):
        assert validate_repo_id("bartowski/Llama-3.1-8B-GGUF") == "bartowski/Llama-3.1-8B-GGUF"

    def test_valid_repo_with_dots(self):
        assert validate_repo_id("meta-llama/Meta-Llama-3.1-8B") == "meta-llama/Meta-Llama-3.1-8B"

    def test_whitespace_stripped(self):
        assert validate_repo_id("  bartowski/test  ") == "bartowski/test"

    def test_empty_raises(self):
        with pytest.raises(HTTPException) as exc:
            validate_repo_id("")
        assert exc.value.status_code == 400

    def test_too_long_raises(self):
        with pytest.raises(HTTPException):
            validate_repo_id("a" * 100 + "/" + "b" * 200)

    def test_path_traversal_raises(self):
        with pytest.raises(HTTPException):
            validate_repo_id("../../../etc/passwd")

    def test_no_slash_raises(self):
        with pytest.raises(HTTPException):
            validate_repo_id("just-a-name")

    def test_multiple_slashes_raises(self):
        with pytest.raises(HTTPException):
            validate_repo_id("a/b/c")

    def test_special_chars_raises(self):
        with pytest.raises(HTTPException):
            validate_repo_id("user/<script>alert(1)</script>")


class TestValidateSearchQuery:
    def test_basic(self):
        assert validate_search_query("llama 3.1") == "llama 3.1"

    def test_strips_dangerous(self):
        result = validate_search_query('test<script>alert("xss")</script>')
        assert "<" not in result
        assert ">" not in result

    def test_truncates_long(self):
        result = validate_search_query("x" * 500)
        assert len(result) <= 200
