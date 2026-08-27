"use client";

import Link from "next/link";
import { motion, MotionConfig, type Variants } from "motion/react";
import { History, Workflow, Sparkles, ShieldCheck, type LucideIcon } from "lucide-react";
import { useBackendWake } from "@/context/BackendWakeContext";
import { Button } from "@/components/Button";
import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";

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

const heroContainer: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12, delayChildren: 0.1 } },
};

const heroItem: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } },
};

export default function LandingPage() {
  const { startWaking } = useBackendWake();

  return (
    <MotionConfig reducedMotion="user">
      <main className="flex-1 overflow-hidden bg-background">
        <motion.nav
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6"
        >
          <span className="flex items-center gap-2 font-display text-lg font-semibold tracking-tight text-foreground">
            <Logo />
            OnTrack
          </span>
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <Link
              href="/login"
              onClick={startWaking}
              className="text-sm font-medium text-muted hover:text-foreground"
            >
              Log In
            </Link>
          </div>
        </motion.nav>

        <section className="relative">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{
              backgroundImage: "radial-gradient(circle, var(--surface-border) 1px, transparent 1px)",
              backgroundSize: "28px 28px",
              maskImage: "radial-gradient(ellipse 60% 55% at 50% 0%, black 40%, transparent 100%)",
              WebkitMaskImage: "radial-gradient(ellipse 60% 55% at 50% 0%, black 40%, transparent 100%)",
            }}
          />
          <motion.div
            aria-hidden
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: [0, 0.55, 0.45, 0.55], scale: [0.85, 1, 1.05, 1] }}
            transition={{
              opacity: { duration: 8, times: [0, 0.15, 0.6, 1], repeat: Infinity, ease: "easeInOut" },
              scale: { duration: 8, times: [0, 0.15, 0.6, 1], repeat: Infinity, ease: "easeInOut" },
            }}
            className="pointer-events-none absolute top-6 left-1/2 h-[440px] w-[680px] -translate-x-1/2 blur-3xl"
            style={{
              background:
                "radial-gradient(circle, var(--brand) 0%, var(--brand-secondary) 45%, transparent 72%)",
            }}
          />
          <motion.div
            variants={heroContainer}
            initial="hidden"
            animate="show"
            className="relative mx-auto flex max-w-4xl flex-col items-center gap-6 px-6 pb-20 pt-12 text-center"
          >
            <motion.h1
              variants={heroItem}
              className="font-display text-4xl font-bold tracking-tight text-foreground sm:text-5xl"
            >
              Keep your job search{" "}
              <motion.span
                className="gradient-text inline-block"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: 0.55, ease: "backOut" }}
              >
                on track
              </motion.span>
              .
            </motion.h1>
            <motion.p variants={heroItem} className="max-w-xl text-lg text-foreground/70">
              OnTrack is a job application tracker built specifically for SWE/CS job searches —
              status-pipeline analytics, a funnel visualization, and an AI-powered resume/JD fit
              check, all in one place.
            </motion.p>
            <motion.div variants={heroItem} className="mt-2 flex flex-col items-center gap-3 sm:flex-row">
              <Link href="/demo" onClick={startWaking}>
                <Button variant="primary">Try Demo</Button>
              </Link>
              <Link href="/signup" onClick={startWaking}>
                <Button variant="secondary">Sign Up Free</Button>
              </Link>
            </motion.div>
            <motion.p
              variants={heroItem}
              className="mt-2 max-w-md rounded-full border border-surface-border bg-surface px-4 py-1.5 text-xs text-muted"
            >
              Running on free-tier hosting, so the server naps when idle — first load can take up to
              a minute. We&apos;ll keep you entertained with some CS trivia while it wakes up.
            </motion.p>
          </motion.div>
        </section>

        <section className="mx-auto grid max-w-6xl grid-cols-1 gap-6 px-6 pb-24 sm:grid-cols-2">
          {FEATURES.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.5, delay: index * 0.08, ease: "easeOut" }}
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
            </motion.div>
          ))}
        </section>
      </main>
    </MotionConfig>
  );
}
