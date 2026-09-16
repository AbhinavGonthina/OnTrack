"use client";

import { ReactNode, useEffect } from "react";
import { useBackendWake } from "@/context/BackendWakeContext";
import { useSlowAction } from "@/lib/useSlowAction";
import { Spinner } from "@/components/Spinner";
import { WakingUpNotice } from "@/components/WakingUpNotice";

/**
 * Two thresholds, because the health check now usually succeeds in about 200ms.
 *
 * <p>This used to render the full waking notice the instant status was anything other than
 * "awake", which included the idle state before the first poll even fired. With the backend kept
 * warm by an uptime monitor, that meant every visitor saw the "Waking up the server" heading and
 * the trivia quiz flash up and vanish, advertising a problem that was not happening.
 *
 * <p>So: nothing at all for the first {@link QUIET_MS}, which covers a warm response entirely; a
 * plain spinner after that, for a slow network or a briefly busy instance; and only past
 * {@link NOTICE_MS} the full explanation and quiz, by which point it really is a cold boot worth
 * describing. Mirrors how RequireAuth already staged the same problem.
 */
const QUIET_MS = 600;
const NOTICE_MS = 3000;

export function ColdStartGate({ children }: { children: ReactNode }) {
  const { status, isSlow, startWaking } = useBackendWake();
  const isWaiting = status !== "awake";
  const pastQuiet = useSlowAction(isWaiting, QUIET_MS);
  const pastNotice = useSlowAction(isWaiting, NOTICE_MS);

  useEffect(() => {
    // Covers direct navigation to a gated route without going through a
    // landing-page link first (e.g. a shared /demo URL).
    startWaking();
  }, [startWaking]);

  if (status === "awake") {
    return <>{children}</>;
  }

  if (!pastQuiet) {
    return null;
  }

  if (!pastNotice) {
    return (
      <main className="flex w-full flex-1 items-center justify-center px-4 py-16">
        <Spinner label="Loading…" />
      </main>
    );
  }

  return <WakingUpNotice isSlow={isSlow} />;
}
