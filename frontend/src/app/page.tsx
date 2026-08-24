"use client";

import Link from "next/link";
import { History, Workflow, Sparkles, ShieldCheck, type LucideIcon } from "lucide-react";
import { useBackendWake } from "@/context/BackendWakeContext";
import { Button } from "@/components/Button";
import { Logo } from "@/components/Logo";

const FEATURES: { title: string; description: string; icon: LucideIcon; accent: "brand" | "brand-secondary" }[] = [
  {
    title: "Event-sourced status pipeline",
    description:
      "Every status change is recorded as its own event, so your funnel history is never lost — see exactly when and where each application moved forward or fell off.",
    icon: History,
    accent: "brand",
  },
  {
    title: "Sankey funnel visualization",
    description:
      "A single chart shows your whole search at a glance: how many applications reach OA, phone screen, onsite, and offer — and where rejections cluster.",
    icon: Workflow,
    accent: "brand-secondary",
  },
  {
    title: "AI-powered fit analysis",
    description:
      "Paste a job description and get a Gemini-backed fit score, missing keywords, and rewritten resume bullets — cached so you're never charged twice for the same check.",
    icon: Sparkles,
    accent: "brand",
  },
  {
    title: "Built like production software",
    description:
      "JWT auth, per-user rate limiting, and SQL-driven analytics under the hood — this isn't a spreadsheet with a UI on top.",
    icon: ShieldCheck,
    accent: "brand-secondary",
  },
];

export default function LandingPage() {
  const { startWaking } = useBackendWake();

  return (
    <main className="flex-1 overflow-hidden bg-background">
      <nav className="mx-auto flex max-w-5xl items-center justify-between px-6 py-6">
        <span className="flex items-center gap-2 font-display text-lg font-semibold tracking-tight text-foreground">
          <Logo />
          OnTrack
        </span>
        <Link
          href="/login"
          onClick={startWaking}
          className="text-sm font-medium text-muted hover:text-foreground"
        >
          Log In
        </Link>
      </nav>

      <section className="relative">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-32 left-1/2 h-[420px] w-[720px] -translate-x-1/2 rounded-full bg-linear-to-br from-brand to-brand-secondary opacity-20 blur-3xl"
        />
        <div className="relative mx-auto flex max-w-3xl flex-col items-center gap-6 px-6 pb-20 pt-12 text-center">
          <h1 className="font-display text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
            Keep your job search <span className="gradient-text">on track</span>.
          </h1>
          <p className="max-w-xl text-lg text-foreground/70">
            OnTrack is a job application tracker built specifically for SWE/CS job searches —
            status-pipeline analytics, a funnel visualization, and an AI-powered resume/JD fit
            check, all in one place.
          </p>
          <div className="mt-2 flex flex-col items-center gap-3 sm:flex-row">
            <Link href="/demo" onClick={startWaking}>
              <Button variant="primary">Try Demo</Button>
            </Link>
            <Link href="/signup" onClick={startWaking}>
              <Button variant="secondary">Sign Up Free</Button>
            </Link>
          </div>
          <p className="mt-2 max-w-md rounded-full border border-surface-border bg-surface px-4 py-1.5 text-xs text-muted">
            Running on free-tier hosting, so the server naps when idle — first load can take up to
            a minute. We&apos;ll keep you entertained with some CS trivia while it wakes up.
          </p>
        </div>
      </section>

      <section className="mx-auto grid max-w-5xl grid-cols-1 gap-6 px-6 pb-24 sm:grid-cols-2">
        {FEATURES.map((feature) => (
          <div
            key={feature.title}
            className="card p-6 shadow-sm transition-shadow hover:shadow-md"
          >
            <div
              className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl"
              style={{
                backgroundColor: `color-mix(in srgb, var(--${feature.accent}) 15%, transparent)`,
                color: `var(--${feature.accent})`,
              }}
            >
              <feature.icon size={20} />
            </div>
            <h2 className="font-display text-base font-semibold text-foreground">{feature.title}</h2>
            <p className="mt-2 text-sm text-foreground/70">{feature.description}</p>
          </div>
        ))}
      </section>
    </main>
  );
}
