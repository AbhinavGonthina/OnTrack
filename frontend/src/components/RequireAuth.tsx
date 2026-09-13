"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useSlowAction } from "@/lib/useSlowAction";
import { Spinner } from "@/components/Spinner";
import { WakingUpNoticeContent } from "@/components/WakingUpNotice";

/**
 * Gates a page on being signed in, and shows something while it works out whether you are.
 *
 * <p>Every guarded page used to inline this, and all of them rendered `null` until the session
 * check resolved. That check is an HTTP call to Render, which spins down after about 15 minutes
 * idle, so typing /dashboard while signed out produced a blank white page for as long as the
 * container took to boot (measured at 155 seconds on 2026-09-12) before the redirect fired. A
 * blank page is indistinguishable from a broken one, and the redirect it was waiting on was
 * never going to need the backend's answer in the first place for a visitor with no session.
 *
 * <p>So: a spinner immediately, the cold-start explanation once the wait stops looking normal,
 * and the redirect the moment we actually know there's no session.
 */
export function RequireAuth({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { isAuthenticated, isInitializing } = useAuth();
  // Same 10s threshold the in-app actions use, so a cold start reads identically wherever the
  // user happens to hit it.
  const isSlow = useSlowAction(isInitializing);

  useEffect(() => {
    // Waiting on isInitializing is deliberate: redirecting before the session check resolves
    // would bounce someone who is still logged in and just pressed refresh.
    if (!isInitializing && !isAuthenticated) {
      router.replace("/");
    }
  }, [isInitializing, isAuthenticated, router]);

  if (isInitializing) {
    return (
      <main className="flex w-full flex-1 items-center justify-center px-4 py-16">
        {isSlow ? <WakingUpNoticeContent isSlow /> : <Spinner label="Loading…" />}
      </main>
    );
  }

  // Known to be signed out, with the redirect already queued by the effect above. Rendering
  // nothing here is fine because it lasts a frame, not a cold start.
  if (!isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}
