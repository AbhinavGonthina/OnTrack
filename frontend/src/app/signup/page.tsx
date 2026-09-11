"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { Mail, Lock, MailCheck } from "lucide-react";
import { ApiError, resendVerification, signup } from "@/lib/api";
import { useBackendWake } from "@/context/BackendWakeContext";
import { WakingUpNoticeContent } from "@/components/WakingUpNotice";
import { AuthLayout } from "@/components/AuthLayout";
import { Button } from "@/components/Button";
import { AuthInput } from "@/components/AuthInput";

export default function SignupPage() {
  const { status, isSlow, startWaking, waitUntilAwake } = useBackendWake();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isWaiting, setIsWaiting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [resent, setResent] = useState(false);

  useEffect(() => {
    // Start the health check as soon as this page mounts (not just on submit), so a
    // backend that's already awake by the time the user finishes typing never needs the
    // full-screen WakingUpNotice swap - it only shows for a genuine cold start.
    startWaking();
  }, [startWaking]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (status !== "awake") {
      setIsWaiting(true);
    }
    await waitUntilAwake();
    setIsWaiting(false);
    setIsSubmitting(true);
    try {
      await signup(email, password);
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleResend() {
    setResent(false);
    try {
      await resendVerification(email);
      setResent(true);
    } catch {
      // Resend failures aren't shown separately - the button stays clickable to retry.
    }
  }

  return (
    <AuthLayout>
      {isWaiting ? (
        <WakingUpNoticeContent isSlow={isSlow} showLogo={false} />
      ) : submitted ? (
        <>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand/10 text-brand">
            <MailCheck size={20} />
          </div>
          <h1 className="mt-4 font-display text-2xl font-bold text-foreground">Check your email</h1>
          <p className="mt-2 text-sm text-foreground/70">
            We sent a verification link to <span className="font-medium text-foreground">{email}</span>. Click it
            to activate your account, then log in.
          </p>
          {/* OnTrack sends from a new low-volume domain, so Gmail in particular files these under
              Spam often enough that leaving it unsaid costs people the whole signup. */}
          <p className="mt-2 text-sm text-foreground/70">
            It should arrive within a minute. If you don&apos;t see it, check your spam folder.
          </p>
          <Button onClick={handleResend} variant="secondary" className="mt-6 w-full">
            Resend verification email
          </Button>
          {resent && <p className="mt-2 text-sm text-foreground/70">Sent again. Check your inbox.</p>}
          <p className="mt-6 text-sm text-foreground/70">
            <Link href="/login" className="font-medium text-brand hover:underline">
              Back to log in
            </Link>
          </p>
        </>
      ) : (
        <>
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
        </>
      )}
    </AuthLayout>
  );
}
