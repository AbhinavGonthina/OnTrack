"use client";

import Link from "next/link";
import { motion, MotionConfig, type Variants } from "motion/react";
import { Check, History, Workflow, Sparkles, ShieldCheck, type LucideIcon } from "lucide-react";
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
      <main className="relative flex-1 overflow-hidden bg-background">
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
          <motion.div
            variants={heroContainer}
            initial="hidden"
            animate="show"
            className="relative mx-auto flex max-w-4xl flex-col items-center gap-6 px-6 pt-12 pb-20 text-center"
          >
            <motion.h1
              variants={heroItem}
              className="font-display text-4xl font-bold tracking-tight text-foreground sm:text-5xl"
            >
              Keep your job search{" "}
              <motion.span
                className="gradient-text relative inline-block"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: 0.55, ease: "backOut" }}
              >
                on track
                <svg
                  aria-hidden
                  viewBox="0 0 100 12"
                  preserveAspectRatio="none"
                  className="absolute -bottom-2 left-0 h-3 w-full"
                >
                  <motion.path
                    d="M2 8 Q 25 3, 50 6 T 98 4"
                    fill="none"
                    stroke="var(--brand-secondary)"
                    strokeWidth="3"
                    strokeLinecap="round"
                    initial={{ pathLength: 0, opacity: 0 }}
                    animate={{ pathLength: 1, opacity: 1 }}
                    transition={{ duration: 0.5, delay: 0.9, ease: "easeInOut" }}
                  />
                </svg>
              </motion.span>
              <motion.span
                initial={{ scale: 0, opacity: 0, rotate: -30 }}
                animate={{ scale: 1, opacity: 1, rotate: 0 }}
                transition={{ duration: 0.4, delay: 1.35, ease: "backOut" }}
                className="ml-2 inline-flex h-9 w-9 items-center justify-center rounded-full bg-brand-secondary align-middle text-white"
              >
                <Check size={20} strokeWidth={3} />
              </motion.span>
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
          </motion.div>
        </section>

        <motion.div
          aria-hidden
          initial={{ opacity: 0, scaleX: 0.6 }}
          animate={{ opacity: 1, scaleX: 1 }}
          transition={{ duration: 0.6, delay: 0.4, ease: "easeOut" }}
          className="relative mx-auto mb-16 h-px w-full max-w-2xl"
        >
          <div
            className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2"
            style={{ background: "linear-gradient(90deg, transparent, var(--brand-secondary), transparent)" }}
          />
        </motion.div>

        <section className="mx-auto grid max-w-6xl grid-cols-1 gap-6 px-6 pb-24 sm:grid-cols-2">
          {FEATURES.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.5, delay: index * 0.08, ease: "easeOut" }}
              className="card relative overflow-hidden p-6 shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg"
            >
              <div
                aria-hidden
                className="absolute top-0 left-0 h-1 w-full"
                style={{ backgroundColor: `var(--${feature.accent})` }}
              />
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
