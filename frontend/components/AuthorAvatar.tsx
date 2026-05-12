interface Props {
  name: string;
  seed?: string | null;
  size?: number;
}

const PALETTE = [
  ["#6366f1","#818cf8"], ["#8b5cf6","#a78bfa"], ["#ec4899","#f472b6"],
  ["#14b8a6","#2dd4bf"], ["#f59e0b","#fbbf24"], ["#22c55e","#4ade80"],
  ["#ef4444","#f87171"], ["#0ea5e9","#38bdf8"],
];

export default function AuthorAvatar({ name, seed, size = 32 }: Props) {
  const idx = seed
    ? seed.charCodeAt(0) % PALETTE.length
    : name.charCodeAt(0) % PALETTE.length;
  const [from, to] = PALETTE[idx];
  const initials = name
    .split(" ")
    .map((w) => w[0]?.toUpperCase() ?? "")
    .slice(0, 2)
    .join("");

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: `linear-gradient(135deg, ${from}, ${to})`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: size * 0.38,
        fontWeight: 700,
        color: "#fff",
        flexShrink: 0,
        userSelect: "none",
      }}
    >
      {initials || "?"}
    </div>
  );
}
