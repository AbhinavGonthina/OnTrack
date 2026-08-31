"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Mail, Lock, Building2, ClipboardCheck, Rocket, Award } from "lucide-react";
import { ApiError, signup } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { useBackendWake } from "@/context/BackendWakeContext";
import { WakingUpNotice } from "@/components/WakingUpNotice";
import { Button } from "@/components/Button";
import { AuthInput } from "@/components/AuthInput";
import { DotGridBackground } from "@/components/DotGridBackground";
import { FloatingIcons, type FloatingIconConfig } from "@/components/FloatingIcons";
import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";

const FLOATING_ICONS: FloatingIconConfig[] = [
  { Icon: Rocket, className: "top-[10%] left-[12%] h-7 w-7 rotate-12", delay: 0.2, duration: 4.9, accent: "brand" },
  { Icon: Building2, className: "top-[18%] right-[14%] h-6 w-6 rotate-6", delay: 0.35, duration: 5, accent: "brand-secondary" },
  { Icon: ClipboardCheck, className: "bottom-[20%] right-[10%] h-6 w-6 -rotate-6", delay: 0.5, duration: 4.7, accent: "brand" },
  { Icon: Award, className: "bottom-[14%] left-[10%] h-7 w-7 -rotate-12", delay: 0.65, duration: 5.2, accent: "brand-secondary" },
  { Icon: Mail, className: "top-[45%] right-[6%] h-6 w-6 rotate-12", delay: 0.4, duration: 4.4, accent: "brand" },
];

export default function SignupPage() {
  const router = useRouter();
  const { login: authLogin } = useAuth();
  const { isSlow, waitUntilAwake } = useBackendWake();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isWaiting, setIsWaiting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setIsWaiting(true);
    await waitUntilAwake();
    setIsWaiting(false);
    setIsSubmitting(true);
    try {
      const response = await signup(email, password);
      authLogin(response.token, { id: response.userId, email: response.email });
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isWaiting) {
    return <WakingUpNotice isSlow={isSlow} />;
  }

  return (
    <main className="relative isolate flex flex-1 flex-col items-center justify-center overflow-hidden bg-background px-6 py-16">
      <DotGridBackground />
      <FloatingIcons icons={FLOATING_ICONS} />
      <Link
        href="/"
        className="absolute top-6 left-1/2 z-10 flex -translate-x-1/2 items-center gap-2 font-display text-xl font-semibold tracking-tight text-foreground hover:opacity-80"
      >
        <Logo size={36} />
        OnTrack
      </Link>
      <div className="card relative w-full max-w-sm p-8 shadow-sm">
        <div className="absolute top-4 right-4">
          <ThemeToggle />
        </div>
        <h1 className="font-display text-2xl font-bold text-foreground">Sign up</h1>
        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
          <AuthInput
            icon={Mail}
            label="Email"
            type="email"
            placeholder="you@example.com"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <div className="flex flex-col gap-1">
            <AuthInput
              icon={Lock}
              label="Password"
              type="password"
              placeholder="••••••••"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <span className="text-xs text-muted">At least 8 characters.</span>
          </div>
          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
          <Button type="submit" disabled={isSubmitting} className="mt-2 w-full">
            {isSubmitting ? "Creating account…" : "Sign Up"}
          </Button>
        </form>
        <p className="mt-6 text-sm text-foreground/70">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-brand hover:underline">
            Log in
          </Link>
        </p>
      </div>
    </main>
  );
}
