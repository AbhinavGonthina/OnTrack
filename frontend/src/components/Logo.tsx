export function Logo({ size = 28 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 72 72"
      role="img"
      aria-label="OnTrack"
      className="shrink-0"
    >
      {/* application stages climbing toward a completed offer, tracing the app's own status pipeline */}
      <path
        d="M12 50 L26 50 L26 36 L44 36 L44 20 L54 20"
        stroke="var(--brand)"
        strokeWidth="6"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="50" r="4" fill="var(--brand)" />
      <circle cx="26" cy="36" r="4" fill="var(--brand)" />
      <circle cx="44" cy="20" r="5.5" fill="var(--brand)" />
      <path
        d="M50 20 L54 24 L61 15"
        stroke="var(--brand)"
        strokeWidth="4.5"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
