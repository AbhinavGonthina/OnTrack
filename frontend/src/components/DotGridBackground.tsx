export function DotGridBackground() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0"
      style={{
        backgroundImage: "radial-gradient(circle, var(--surface-border) 1px, transparent 1px)",
        backgroundSize: "28px 28px",
        maskImage: "radial-gradient(ellipse 70% 60% at 50% 0%, black 30%, transparent 100%)",
        WebkitMaskImage: "radial-gradient(ellipse 70% 60% at 50% 0%, black 30%, transparent 100%)",
      }}
    />
  );
}
