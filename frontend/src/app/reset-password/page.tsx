"use client";

import { FormEvent, Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Lock } from "lucide-react";
import { ApiError, resetPassword } from "@/lib/api";
import { Button } from "@/components/Button";
import { AuthInput } from "@/components/AuthInput";
import { DotGridBackground } from "@/components/DotGridBackground";
import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!token) {
      setError("This link is invalid or has expired.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords don't match.");
      return;
    }

    setIsSubmitting(true);
    try {
      await resetPassword(token, password);
      router.push("/login");
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
        <h1 className="font-display text-2xl font-bold text-foreground">Reset password</h1>
        <p className="mt-2 text-sm text-foreground/70">Choose a new password for your account.</p>
        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
          <AuthInput
            icon={Lock}
            label="New password"
            type="password"
            placeholder="••••••••"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <AuthInput
            icon={Lock}
            label="Confirm new password"
            type="password"
            placeholder="••••••••"
            required
            minLength={8}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
          <Button type="submit" disabled={isSubmitting} className="mt-2 w-full">
            {isSubmitting ? "Resetting…" : "Reset password"}
          </Button>
        </form>
        <p className="mt-6 text-sm text-foreground/70">
          <Link href="/login" className="font-medium text-brand hover:underline">
            Back to log in
          </Link>
        </p>
      </div>
    </main>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordContent />
    </Suspense>
  );
}
