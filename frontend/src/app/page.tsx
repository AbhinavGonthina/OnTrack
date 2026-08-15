"use client";

import Link from "next/link";
import { useBackendWake } from "@/context/BackendWakeContext";
import { Button } from "@/components/Button";

const FEATURES = [
  {
    title: "Event-sourced status pipeline",
    description:
      "Every status change is recorded as its own event, so your funnel history is never lost — see exactly when and where each application moved forward or fell off.",
  },
  {
    title: "Sankey funnel visualization",
    description:
      "A single chart shows your whole search at a glance: how many applications reach OA, phone screen, onsite, and offer — and where rejections cluster.",
  },
  {
    title: "AI-powered fit analysis",
    description:
      "Paste a job description and get a Gemini-backed fit score, missing keywords, and rewritten resume bullets — cached so you're never charged twice for the same check.",
  },
  {
    title: "Built like production software",
    description:
      "JWT auth, per-user rate limiting, and SQL-driven analytics under the hood — this isn't a spreadsheet with a UI on top.",
  },
];

export default function LandingPage() {
  const { startWaking } = useBackendWake();

  return (
    <main className="flex-1 bg-white dark:bg-black">
      <nav className="mx-auto flex max-w-5xl items-center justify-between px-6 py-6">
        <span className="text-lg font-semibold tracking-tight text-black dark:text-white">
          OnTrack
        </span>
        <Link
          href="/login"
          onClick={startWaking}
          className="text-sm font-medium text-black/70 hover:text-black dark:text-white/70 dark:hover:text-white"
        >
          Log In
        </Link>
      </nav>

      <section className="mx-auto flex max-w-3xl flex-col items-center gap-6 px-6 pb-20 pt-12 text-center">
        <h1 className="text-4xl font-semibold tracking-tight text-black sm:text-5xl dark:text-white">
          Keep your job search on track.
        </h1>
        <p className="max-w-xl text-lg text-black/70 dark:text-white/70">
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
        <p className="mt-2 max-w-md text-xs text-black/50 dark:text-white/50">
          Running on free-tier hosting, so the server naps when idle — first load can take up to
          a minute. We&apos;ll keep you entertained with some CS trivia while it wakes up.
        </p>
      </section>

      <section className="mx-auto grid max-w-5xl grid-cols-1 gap-8 px-6 pb-24 sm:grid-cols-2">
        {FEATURES.map((feature) => (
          <div key={feature.title} className="rounded-2xl border border-black/10 p-6 dark:border-white/15">
            <h2 className="text-base font-semibold text-black dark:text-white">{feature.title}</h2>
            <p className="mt-2 text-sm text-black/70 dark:text-white/70">{feature.description}</p>
          </div>
        ))}
      </section>
    </main>
  );
}
