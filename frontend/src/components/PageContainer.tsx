import { ReactNode } from "react";

// Shared horizontal boundary for the sticky nav and every top-level authenticated page
// (Dashboard, Applications, Profile), so the logo, active nav tab, and page content all
// sit on the same fixed vertical grid line no matter which tab is active.
export function PageContainer({ className = "", children }: { className?: string; children: ReactNode }) {
  return <div className={`mx-auto w-full max-w-[1400px] px-6 sm:px-8 lg:px-12 ${className}`}>{children}</div>;
}
