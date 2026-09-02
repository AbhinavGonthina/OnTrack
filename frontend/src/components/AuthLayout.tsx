"use client";

import Link from "next/link";
import { ReactNode } from "react";
import {
  Award,
  BarChart3,
  Briefcase,
  Building2,
  Calendar,
  ClipboardCheck,
  Clock,
  FileText,
  Mail,
  Search,
  Send,
  Target,
  Trophy,
  TrendingUp,
} from "lucide-react";
import { DotGridBackground } from "@/components/DotGridBackground";
import { FloatingIcons, type FloatingIconConfig } from "@/components/FloatingIcons";
import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";

// Two "rings": an inner arc kept within ~15-30% of horizontal center (close enough to
// orbit the card without overlapping its max-w-md footprint or the logo above it), and
// an outer ring near the far edges so the background doesn't read as empty on wide screens.
const FLOATING_ICONS: FloatingIconConfig[] = [
  // Inner left arc: top -> mid -> bottom
  { Icon: Briefcase, className: "top-[8%] left-[24%] h-6 w-6 -rotate-12", delay: 0.1, duration: 4.5, accent: "brand-secondary" },
  { Icon: Calendar, className: "top-[28%] left-[20%] h-6 w-6 rotate-6", delay: 0.9, duration: 4.8, accent: "brand" },
  { Icon: TrendingUp, className: "top-[52%] left-[26%] h-6 w-6 -rotate-6", delay: 1.7, duration: 5.1, accent: "brand-secondary" },
  { Icon: Trophy, className: "bottom-[10%] left-[22%] h-7 w-7 rotate-12", delay: 0.5, duration: 4.4, accent: "brand" },
  // Inner right arc: top -> mid -> bottom, offset for asymmetry
  { Icon: FileText, className: "top-[10%] right-[22%] h-6 w-6 rotate-6", delay: 1.3, duration: 5, accent: "brand" },
  { Icon: Award, className: "top-[32%] right-[26%] h-6 w-6 -rotate-12", delay: 0.2, duration: 4.9, accent: "brand-secondary" },
  { Icon: Target, className: "top-[54%] right-[20%] h-6 w-6 rotate-6", delay: 1.1, duration: 4.7, accent: "brand" },
  { Icon: Search, className: "bottom-[10%] right-[24%] h-6 w-6 -rotate-6", delay: 1.9, duration: 4.3, accent: "brand-secondary" },
  // Outer left column, near the far edge
  { Icon: Mail, className: "top-[14%] left-[6%] h-6 w-6 rotate-12", delay: 0.7, duration: 4.6, accent: "brand" },
  { Icon: BarChart3, className: "top-[46%] left-[4%] h-6 w-6 -rotate-12", delay: 1.5, duration: 5.4, accent: "brand-secondary" },
  { Icon: ClipboardCheck, className: "bottom-[16%] left-[8%] h-6 w-6 rotate-6", delay: 0.3, duration: 4.9, accent: "brand" },
  // Outer right column, near the far edge
  { Icon: Clock, className: "top-[16%] right-[6%] h-6 w-6 -rotate-6", delay: 1.0, duration: 5, accent: "brand-secondary" },
  { Icon: Send, className: "top-[48%] right-[4%] h-6 w-6 rotate-12", delay: 1.8, duration: 4.7, accent: "brand" },
  { Icon: Building2, className: "bottom-[18%] right-[8%] h-6 w-6 -rotate-6", delay: 0.6, duration: 5.3, accent: "brand-secondary" },
];

export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="relative isolate flex min-h-svh flex-1 items-center justify-center overflow-hidden bg-background px-6 py-16">
      <DotGridBackground center />
      <FloatingIcons icons={FLOATING_ICONS} />

      {/* The card alone is main's flex-centered child - the logo is absolutely positioned
          above it so it doesn't add height to that centering calculation and push the
          card below true viewport center. */}
      <div
        className="relative w-full max-w-md rounded-2xl bg-surface/80 p-8 shadow-xl shadow-black/50 backdrop-blur-xl"
        style={{ border: "1px solid color-mix(in srgb, var(--foreground) 10%, transparent)" }}
      >
        <Link
          href="/"
          className="absolute -top-[68px] left-1/2 flex -translate-x-1/2 items-center gap-2 font-display text-xl font-semibold tracking-tight text-foreground hover:opacity-80"
        >
          <Logo size={36} />
          OnTrack
        </Link>
        <div className="absolute top-8 right-8">
          <ThemeToggle />
        </div>
        {children}
      </div>
    </main>
  );
}
