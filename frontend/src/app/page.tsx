"use client";

import Link from "next/link";
import { motion, MotionConfig, type Variants } from "motion/react";
import {
  Check,
  History,
  Workflow,
  Sparkles,
  StickyNote,
  Briefcase,
  FileText,
  Mail,
  Calendar,
  Building2,
  BarChart3,
  ClipboardCheck,
  Send,
  Trophy,
  Target,
  Clock,
  Search,
  MessageSquare,
  Award,
  Rocket,
  type LucideIcon,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useBackendWake } from "@/context/BackendWakeContext";
import { DotGridBackground } from "@/components/DotGridBackground";
import { FloatingIcons, type FloatingIconConfig } from "@/components/FloatingIcons";
import { Logo } from "@/components/Logo";
import { ProductPreview } from "@/components/ProductPreview";
import { ThemeToggle } from "@/components/ThemeToggle";

const FEATURES: { title: string; description: string; icon: LucideIcon; accent: "brand" | "brand-secondary" }[] = [
  {
    title: "Track every application",
    description:
      "Log every stage as it happens: Applied, OA, Phone Screen, Onsite, Offer or Rejected. See exactly when and where each application moved.",
    icon: History,
    accent: "brand",
  },
  {
    title: "Visualize your whole pipeline",
    description:
      "One dashboard shows your whole search at a glance: how many applications reach OA, phone screen, onsite and offer, plus where rejections cluster.",
    icon: Workflow,
    accent: "brand-secondary",
  },
  {
    title: "Check your fit before you apply",
    description:
      "Paste a job description and get an AI fit score, missing keywords, and rewritten resume bullets tailored to that role.",
    icon: Sparkles,
    accent: "brand",
  },
  {
    title: "Notes for every application",
    description:
      "Jot down recruiter calls, interview feedback or next steps. Every note stays attached to the right application, next to its status history.",
    icon: StickyNote,
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

const FLOATING_ICONS: FloatingIconConfig[] = [
  { Icon: Briefcase, className: "top-[4%] left-[6%] h-7 w-7 -rotate-12", delay: 0.2, duration: 4.5, accent: "brand-secondary" },
  { Icon: FileText, className: "top-[9%] right-[7%] h-6 w-6 rotate-6", delay: 0.35, duration: 5, accent: "brand" },
  { Icon: Mail, className: "top-[3%] right-[24%] h-6 w-6 rotate-12", delay: 0.5, duration: 4.2, accent: "brand" },
  { Icon: BarChart3, className: "top-[15%] left-[2%] h-6 w-6 -rotate-12", delay: 0.95, duration: 4.6, accent: "brand-secondary" },
  { Icon: Calendar, className: "top-[24%] right-[4%] h-7 w-7 -rotate-6", delay: 0.65, duration: 4.8, accent: "brand-secondary" },
  { Icon: Building2, className: "top-[27%] left-[5%] h-6 w-6 rotate-12", delay: 0.8, duration: 5.3, accent: "brand" },
  { Icon: ClipboardCheck, className: "top-[46%] left-[4%] h-6 w-6 rotate-6", delay: 0.4, duration: 4.7, accent: "brand" },
  { Icon: Send, className: "top-[50%] right-[5%] h-6 w-6 -rotate-12", delay: 0.55, duration: 5.1, accent: "brand-secondary" },
  { Icon: Trophy, className: "top-[63%] left-[7%] h-7 w-7 rotate-12", delay: 0.25, duration: 4.4, accent: "brand-secondary" },
  { Icon: Target, className: "top-[59%] right-[8%] h-6 w-6 -rotate-6", delay: 0.7, duration: 4.9, accent: "brand" },
  { Icon: Clock, className: "top-[76%] left-[3%] h-6 w-6 rotate-12", delay: 0.45, duration: 5.2, accent: "brand" },
  { Icon: Search, className: "top-[72%] right-[3%] h-6 w-6 -rotate-12", delay: 0.6, duration: 4.3, accent: "brand-secondary" },
  { Icon: Rocket, className: "top-[19%] left-[10%] h-6 w-6 rotate-12", delay: 0.3, duration: 4.9, accent: "brand" },
  { Icon: MessageSquare, className: "top-[38%] right-[3%] h-6 w-6 -rotate-6", delay: 0.5, duration: 4.6, accent: "brand-secondary" },
  { Icon: Award, className: "top-[87%] left-[8%] h-7 w-7 rotate-6", delay: 0.4, duration: 5, accent: "brand" },
];

export default function LandingPage() {
  const { isAuthenticated } = useAuth();
  const { startWaking } = useBackendWake();

  return (
    <MotionConfig reducedMotion="user">
      <main className="relative flex-1 overflow-hidden bg-background">
        <DotGridBackground />
        <FloatingIcons icons={FLOATING_ICONS} />

        <motion.nav
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6"
        >
          <Link
            href="/"
            className="flex items-center gap-2 font-display text-lg font-semibold tracking-tight text-foreground hover:opacity-80"
          >
            <Logo />
            OnTrack
          </Link>
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <Link
              href={isAuthenticated ? "/dashboard" : "/login"}
              onClick={startWaking}
              className="text-sm font-medium text-muted hover:text-foreground"
            >
              {isAuthenticated ? "Dashboard" : "Log In"}
            </Link>
          </div>
        </motion.nav>

        <section className="relative">
          <motion.div
            variants={heroContainer}
            initial="hidden"
            animate="show"
            className="relative mx-auto flex max-w-4xl flex-col items-center gap-6 px-6 pt-20 pb-14 text-center"
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
                <motion.span
                  initial={{ scale: 0, opacity: 0, rotate: -30 }}
                  animate={{ scale: 1, opacity: 1, rotate: 0 }}
                  transition={{ duration: 0.4, delay: 1.35, ease: "backOut" }}
                  className="absolute -top-2 -right-2 inline-flex h-8 w-8 items-center justify-center rounded-full bg-brand-secondary text-white sm:-top-3 sm:-right-3"
                >
                  <Check size={18} strokeWidth={3} />
                </motion.span>
              </motion.span>
            </motion.h1>
            <motion.p
              variants={heroItem}
              className="max-w-xl text-base leading-relaxed font-normal text-muted sm:text-lg"
            >
              OnTrack is a job application tracker built specifically for SWE/CS job searches. It
              gives you status-pipeline analytics, a funnel visualization and an AI-powered
              resume/JD fit check, all in one place.
            </motion.p>
            <motion.div variants={heroItem} className="mt-2 flex flex-col items-center gap-3 sm:flex-row">
              <Link
                href="/demo"
                onClick={startWaking}
                className="cursor-pointer rounded-full bg-brand px-6 py-2.5 font-medium text-white shadow-[0_0_24px_rgba(124,58,237,0.35)] transition-all hover:bg-brand/90"
              >
                Try Demo
              </Link>
              <Link
                href={isAuthenticated ? "/dashboard" : "/signup"}
                onClick={startWaking}
                className="cursor-pointer rounded-full border border-zinc-700/60 bg-zinc-900/80 px-6 py-2.5 font-medium text-zinc-200 transition-all hover:bg-zinc-800/80"
              >
                {isAuthenticated ? "View Dashboard" : "Sign Up Free"}
              </Link>
            </motion.div>
          </motion.div>
        </section>

        <ProductPreview />

        <motion.div
          aria-hidden
          initial={{ opacity: 0, scaleX: 0.6 }}
          animate={{ opacity: 1, scaleX: 1 }}
          transition={{ duration: 0.6, delay: 0.4, ease: "easeOut" }}
          className="mx-auto my-16 flex max-w-2xl items-center gap-3 px-6"
        >
          <div
            className="h-px flex-1"
            style={{ background: "linear-gradient(90deg, transparent, var(--surface-border))" }}
          />
          <div
            className="h-2 w-2 shrink-0 rotate-45 rounded-[2px]"
            style={{ background: "linear-gradient(135deg, var(--brand), var(--brand-secondary))" }}
          />
          <div
            className="h-px flex-1"
            style={{ background: "linear-gradient(270deg, transparent, var(--surface-border))" }}
          />
        </motion.div>

        <section className="mx-auto max-w-6xl px-6 pb-24">
          <motion.h2
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="mb-10 text-center font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl"
          >
            Everything you need to stay on track
          </motion.h2>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
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
              <h3 className="font-display text-base font-semibold text-foreground">{feature.title}</h3>
              <p className="mt-2 text-sm text-foreground/70">{feature.description}</p>
            </motion.div>
            ))}
          </div>
        </section>

        <footer className="relative px-6 py-8 text-center text-sm text-muted">
          © {new Date().getFullYear()} Abhinav Gonthina. All rights reserved.
        </footer>
      </main>
    </MotionConfig>
  );
}
