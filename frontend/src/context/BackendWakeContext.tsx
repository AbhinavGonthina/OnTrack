"use client";

import { createContext, ReactNode, useCallback, useContext, useRef, useState } from "react";
import { checkHealth } from "@/lib/api";

type WakeStatus = "idle" | "waking" | "awake";

interface BackendWakeContextValue {
  status: WakeStatus;
  /** True once waking has taken long enough that the UI should reassure the user, per spec. */
  isSlow: boolean;
  /** Idempotent - safe to call from multiple click handlers without starting duplicate polling. */
  startWaking: () => void;
  /** Resolves immediately if already awake, otherwise starts waking and resolves once it is. */
  waitUntilAwake: () => Promise<void>;
}

const POLL_INTERVAL_MS = 2500;
const SLOW_THRESHOLD_MS = 30000;

const BackendWakeContext = createContext<BackendWakeContextValue | undefined>(undefined);

export function BackendWakeProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<WakeStatus>("idle");
  const [isSlow, setIsSlow] = useState(false);
  const pollingRef = useRef(false);
  const statusRef = useRef<WakeStatus>("idle");

  const startWaking = useCallback(() => {
    if (pollingRef.current || statusRef.current === "awake") {
      return;
    }
    pollingRef.current = true;
    statusRef.current = "waking";
    setStatus("waking");
    const startedAt = Date.now();

    const poll = async () => {
      try {
        await checkHealth();
        pollingRef.current = false;
        statusRef.current = "awake";
        setStatus("awake");
        return;
      } catch {
        // Still waking up - Render's free tier holds the request while the
        // container spins up, so a single attempt can itself take a while.
      }
      if (Date.now() - startedAt >= SLOW_THRESHOLD_MS) {
        setIsSlow(true);
      }
      if (pollingRef.current) {
        setTimeout(poll, POLL_INTERVAL_MS);
      }
    };

    poll();
  }, []);

  const waitUntilAwake = useCallback((): Promise<void> => {
    if (statusRef.current === "awake") {
      return Promise.resolve();
    }
    startWaking();
    return new Promise((resolve) => {
      const check = setInterval(() => {
        if (statusRef.current === "awake") {
          clearInterval(check);
          resolve();
        }
      }, 300);
    });
  }, [startWaking]);

  return (
    <BackendWakeContext.Provider value={{ status, isSlow, startWaking, waitUntilAwake }}>
      {children}
    </BackendWakeContext.Provider>
  );
}

export function useBackendWake(): BackendWakeContextValue {
  const context = useContext(BackendWakeContext);
  if (!context) {
    throw new Error("useBackendWake must be used within a BackendWakeProvider");
  }
  return context;
}
