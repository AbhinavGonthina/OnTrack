"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Mail, Lock } from "lucide-react";
import { ApiError, login } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { useBackendWake } from "@/context/BackendWakeContext";
import { WakingUpNotice } from "@/components/WakingUpNotice";
import { Button } from "@/components/Button";
import { AuthInput } from "@/components/AuthInput";
import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";

export default function LoginPage() {
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
      const response = await login(email, password);
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
    <main className="flex flex-1 flex-col items-center justify-center bg-background px-6 py-16">
      <div className="card relative w-full max-w-sm p-8 shadow-sm">
        <div className="absolute top-4 right-4">
          <ThemeToggle />
        </div>
        <Logo size={32} />
        <h1 className="mt-4 font-display text-2xl font-bold text-foreground">Log in</h1>
        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
          <AuthInput
            icon={Mail}
            label="Email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <AuthInput
            icon={Lock}
            label="Password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
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
      </div>
    </main>
  );
}
