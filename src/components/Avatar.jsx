export default function Avatar({ name, tone, size = 44, radius = "rounded-xl" }) {
  const initials = name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  const [from, to] = tone;

  return (
    <div
      className={`flex shrink-0 items-center justify-center ${radius} font-display font-semibold text-white`}
      style={{
        width: size,
        height: size,
        fontSize: size * 0.36,
        background: `linear-gradient(135deg, ${from}, ${to})`,
      }}
    >
      {initials}
    </div>
  );
}
