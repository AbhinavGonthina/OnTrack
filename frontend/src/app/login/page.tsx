"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Mail, Lock } from "lucide-react";
import { ApiError, login, resendVerification } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { useBackendWake } from "@/context/BackendWakeContext";
import { WakingUpNoticeContent } from "@/components/WakingUpNotice";
import { startNavigationProgress } from "@/components/NavigationProgressBar";
import { AuthLayout } from "@/components/AuthLayout";
import { Button } from "@/components/Button";
import { AuthInput } from "@/components/AuthInput";

export default function LoginPage() {
  const router = useRouter();
  const { login: authLogin, isAuthenticated, isInitializing } = useAuth();
  const { status, isSlow, startWaking, waitUntilAwake } = useBackendWake();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isWaiting, setIsWaiting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unverified, setUnverified] = useState(false);
  const [resent, setResent] = useState(false);

  useEffect(() => {
    // Start the health check as soon as this page mounts (not just on submit), so a
    // backend that's already awake by the time the user finishes typing never needs the
    // full-screen WakingUpNotice swap - it only shows for a genuine cold start.
    startWaking();
  }, [startWaking]);

  useEffect(() => {
    // Landing here while an existing session is still valid (e.g. the "Log In" link was
    // clicked before the session-rehydrate check resolved, or the page was reached directly)
    // should go straight into the app rather than showing the form again.
    if (!isInitializing && isAuthenticated) {
      router.replace("/dashboard");
    }
  }, [isInitializing, isAuthenticated, router]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setUnverified(false);
    if (status !== "awake") {
      setIsWaiting(true);
    }
    await waitUntilAwake();
    setIsWaiting(false);
    setIsSubmitting(true);
    try {
      const response = await login(email, password);
      authLogin(response.token, { id: response.userId, email: response.email });
      startNavigationProgress();
      router.push("/dashboard");
    } catch (err) {
      if (err instanceof ApiError && err.status === 403) {
        setUnverified(true);
      }
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
      ) : (
        <>
          <h1 className="font-display text-2xl font-bold text-foreground">Log in</h1>
          <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
            <AuthInput
              icon={Mail}
              label="Email"
              type="email"
              autoComplete="username"
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
                autoComplete="current-password"
                placeholder="••••••••"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <Link href="/forgot-password" className="self-end text-xs font-medium text-brand hover:underline">
                Forgot password?
              </Link>
            </div>
            {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
            {unverified && (
              <div className="text-sm">
                <button type="button" onClick={handleResend} className="font-medium text-brand hover:underline">
                  Resend verification email
                </button>
                {resent && <p className="mt-1 text-foreground/70">Sent. Check your inbox.</p>}
              </div>
            )}
            <Button type="submit" loading={isSubmitting} className="mt-2 w-full">
              {isSubmitting ? "Logging in…" : "Log In"}
            </Button>
          </form>
          <p className="mt-6 text-sm text-foreground/70">
            Don&apos;t have an account?{" "}
            <Link href="/signup" className="font-medium text-brand hover:underline">
              Sign up
            </Link>
          </p>
        </>
      )}
    </AuthLayout>
  );
}
