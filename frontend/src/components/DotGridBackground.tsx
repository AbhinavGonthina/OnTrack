export function DotGridBackground({ center = false }: { center?: boolean }) {
  const maskImage = center
    ? "radial-gradient(ellipse 70% 70% at 50% 50%, black 0%, black 40%, transparent 100%)"
    : "radial-gradient(ellipse 70% 60% at 50% 0%, black 30%, transparent 100%)";

  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0"
      style={{
        backgroundImage: "radial-gradient(circle, var(--surface-border) 1px, transparent 1px)",
        backgroundSize: "28px 28px",
        maskImage,
        WebkitMaskImage: maskImage,
      }}
    />
  );
}
