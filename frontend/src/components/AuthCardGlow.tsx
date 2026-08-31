export function AuthCardGlow() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute top-1/2 left-1/2 -z-10 h-[560px] w-[560px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-25 blur-3xl"
      style={{ background: "linear-gradient(135deg, var(--brand), var(--brand-secondary))" }}
    />
  );
}
