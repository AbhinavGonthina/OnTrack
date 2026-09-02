"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Mail, Lock } from "lucide-react";
import { ApiError, login, resendVerification } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { useBackendWake } from "@/context/BackendWakeContext";
import { WakingUpNotice } from "@/components/WakingUpNotice";
import { startNavigationProgress } from "@/components/NavigationProgressBar";
import { AuthLayout } from "@/components/AuthLayout";
import { Button } from "@/components/Button";
import { AuthInput } from "@/components/AuthInput";

export default function LoginPage() {
  const router = useRouter();
  const { login: authLogin } = useAuth();
  const { isSlow, waitUntilAwake } = useBackendWake();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isWaiting, setIsWaiting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unverified, setUnverified] = useState(false);
  const [resent, setResent] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setUnverified(false);
    setIsWaiting(true);
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

  if (isWaiting) {
    return <WakingUpNotice isSlow={isSlow} />;
  }

  return (
    <AuthLayout>
      <h1 className="font-display text-2xl font-bold text-foreground">Log in</h1>
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
            {resent && <p className="mt-1 text-foreground/70">Sent — check your inbox.</p>}
          </div>
        )}
        <Button type="submit" disabled={isSubmitting} className="mt-2 w-full">
          {isSubmitting ? "Logging in…" : "Log In"}
        </Button>
      </form>
      <p className="mt-6 text-sm text-foreground/70">
        Don&apos;t have an account?{" "}
        <Link href="/signup" className="font-medium text-brand hover:underline">
          Sign up
        </Link>
      </p>
    </AuthLayout>
  );
}
