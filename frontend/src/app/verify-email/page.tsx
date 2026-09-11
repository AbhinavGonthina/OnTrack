"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, Mail, XCircle } from "lucide-react";
import { resendVerification, verifyEmail } from "@/lib/api";
import { AuthLayout } from "@/components/AuthLayout";
import { Button } from "@/components/Button";
import { AuthInput } from "@/components/AuthInput";

type Status = "verifying" | "success" | "error";

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [status, setStatus] = useState<Status>("verifying");
  const [email, setEmail] = useState("");
  const [resent, setResent] = useState(false);
  // Verifying consumes a single-use token, so it must only ever actually fire once per
  // token - without this guard, React's dev-mode Strict Mode double-invokes this effect
  // and races two real requests against the same token.
  const requestedTokenRef = useRef<string | null>(null);

  useEffect(() => {
    if (!token) {
      const id = setTimeout(() => setStatus("error"), 0);
      return () => clearTimeout(id);
    }
    if (requestedTokenRef.current === token) return;
    requestedTokenRef.current = token;

    verifyEmail(token)
      .then(() => setStatus("success"))
      .catch(() => setStatus("error"));
  }, [token]);

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
      {status === "verifying" && (
        <>
          <h1 className="font-display text-2xl font-bold text-foreground">Verifying…</h1>
          <p className="mt-2 text-sm text-foreground/70">Hang on while we confirm your email.</p>
        </>
      )}

      {status === "success" && (
        <>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand/10 text-brand">
            <CheckCircle2 size={20} />
          </div>
          <h1 className="mt-4 font-display text-2xl font-bold text-foreground">Email verified</h1>
          <p className="mt-2 text-sm text-foreground/70">Your account is active. You can log in now.</p>
          <Link href="/login">
            <Button className="mt-6 w-full">Log in</Button>
          </Link>
        </>
      )}

      {status === "error" && (
        <>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/10 text-red-600 dark:text-red-400">
            <XCircle size={20} />
          </div>
          <h1 className="mt-4 font-display text-2xl font-bold text-foreground">Link invalid or expired</h1>
          <p className="mt-2 text-sm text-foreground/70">
            Enter your email and we&apos;ll send a fresh verification link.
          </p>
          <div className="mt-4 flex flex-col gap-3">
            <AuthInput
              icon={Mail}
              label="Email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <Button onClick={handleResend} className="w-full">
              Resend verification email
            </Button>
            {resent && (
              <p className="text-sm text-foreground/70">Sent. Check your inbox, and your spam folder.</p>
            )}
          </div>
          <p className="mt-6 text-sm text-foreground/70">
            <Link href="/login" className="font-medium text-brand hover:underline">
              Back to log in
            </Link>
          </p>
        </>
      )}
    </AuthLayout>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={null}>
      <VerifyEmailContent />
    </Suspense>
  );
}
