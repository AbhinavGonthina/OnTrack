"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { Mail, MailCheck } from "lucide-react";
import { ApiError, forgotPassword } from "@/lib/api";
import { Button } from "@/components/Button";
import { AuthInput } from "@/components/AuthInput";
import { DotGridBackground } from "@/components/DotGridBackground";
import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await forgotPassword(email);
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="relative isolate flex flex-1 flex-col items-center justify-center overflow-hidden bg-background px-6 py-16">
      <DotGridBackground />
      <div className="absolute top-6 left-1/2 z-10 flex -translate-x-1/2 flex-col items-center gap-4">
        <Link
          href="/"
          className="flex items-center gap-2 font-display text-xl font-semibold tracking-tight text-foreground hover:opacity-80"
        >
          <Logo size={36} />
          OnTrack
        </Link>
        <div className="h-0.5 w-[248px] rounded-full bg-linear-to-r from-brand to-brand-secondary" />
      </div>
      <div className="card relative w-full max-w-sm p-8 shadow-sm">
        <div className="absolute top-4 right-4">
          <ThemeToggle />
        </div>

        {submitted ? (
          <>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand/10 text-brand">
              <MailCheck size={20} />
            </div>
            <h1 className="mt-4 font-display text-2xl font-bold text-foreground">Check your email</h1>
            <p className="mt-2 text-sm text-foreground/70">
              If an account with that email exists, we sent a link to reset your password.
            </p>
            <p className="mt-6 text-sm text-foreground/70">
              <Link href="/login" className="font-medium text-brand hover:underline">
                Back to log in
              </Link>
            </p>
          </>
        ) : (
          <>
            <h1 className="font-display text-2xl font-bold text-foreground">Forgot password</h1>
            <p className="mt-2 text-sm text-foreground/70">
              Enter your email and we&apos;ll send you a link to reset your password.
            </p>
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
              {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
              <Button type="submit" disabled={isSubmitting} className="mt-2 w-full">
                {isSubmitting ? "Sending…" : "Send reset link"}
              </Button>
            </form>
            <p className="mt-6 text-sm text-foreground/70">
              <Link href="/login" className="font-medium text-brand hover:underline">
                Back to log in
              </Link>
            </p>
          </>
        )}
      </div>
    </main>
  );
}
