"use client";

import { ReactNode, useEffect } from "react";
import { useBackendWake } from "@/context/BackendWakeContext";
import { WakingUpNotice } from "@/components/WakingUpNotice";

export function ColdStartGate({ children }: { children: ReactNode }) {
  const { status, isSlow, startWaking } = useBackendWake();

  useEffect(() => {
    // Covers direct navigation to a gated route without going through a
    // landing-page link first (e.g. a shared /demo URL).
    startWaking();
  }, [startWaking]);

  if (status === "awake") {
    return <>{children}</>;
  }

  return <WakingUpNotice isSlow={isSlow} />;
}
