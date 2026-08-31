export function Logo({ size = 28 }: { size?: number }) {
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center font-display font-bold tracking-tight text-white shadow-md shadow-brand/30"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.4,
        borderRadius: `${size * 0.55}px ${size * 0.14}px ${size * 0.14}px ${size * 0.14}px`,
        backgroundImage:
          "linear-gradient(to bottom, rgba(255,255,255,0.28), rgba(255,255,255,0) 55%), linear-gradient(135deg, var(--brand) 0%, var(--brand-secondary) 100%)",
      }}
    >
      OT
    </span>
  );
}
