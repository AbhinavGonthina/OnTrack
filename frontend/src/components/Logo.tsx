export function Logo({ size = 28 }: { size?: number }) {
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded-lg bg-linear-to-br from-brand to-brand-secondary font-display font-bold text-white"
      style={{ width: size, height: size, fontSize: size * 0.42 }}
    >
      OT
    </span>
  );
}
