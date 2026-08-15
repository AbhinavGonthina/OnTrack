"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ApiError, login } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { useBackendWake } from "@/context/BackendWakeContext";
import { WakingUpNotice } from "@/components/WakingUpNotice";
import { Button } from "@/components/Button";

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
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-16">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-semibold text-black dark:text-white">Log in</h1>
        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
          <label className="flex flex-col gap-1 text-sm text-black dark:text-white">
            Email
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="rounded-lg border border-black/15 px-3 py-2 text-sm dark:border-white/20 dark:bg-black"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-black dark:text-white">
            Password
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="rounded-lg border border-black/15 px-3 py-2 text-sm dark:border-white/20 dark:bg-black"
            />
          </label>
          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
          <Button type="submit" disabled={isSubmitting} className="mt-2 w-full">
            {isSubmitting ? "Logging in…" : "Log In"}
          </Button>
        </form>
        <p className="mt-6 text-sm text-black/70 dark:text-white/70">
          Don&apos;t have an account?{" "}
          <Link href="/signup" className="font-medium text-black underline dark:text-white">
            Sign up
          </Link>
        </p>
      </div>
    </main>
  );
}
