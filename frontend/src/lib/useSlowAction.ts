"use client";

import { useEffect, useState } from "react";

/**
 * Reports whether an in-flight action has been running long enough that the UI owes the user an
 * explanation.
 *
 * <p>The app already handles cold starts on the way in, via `ColdStartGate` and
 * `BackendWakeContext`, but nothing covered an action started from *inside* the app. Render's
 * free tier spins the backend down after about 15 minutes idle, so leaving a page open and then
 * doing something holds the request open while the container boots. That boot was measured at
 * **155 seconds** on 2026-09-12, against roughly 2 seconds for the same request once warm.
 *
 * <p>A spinner alone reads as "broken" after that long, and a specific label like "Extracting &
 * normalizing…" reads as a lie, because no extracting is happening: the server does not exist
 * yet. This lets a caller swap in honest copy once the wait stops looking normal.
 */
const DEFAULT_THRESHOLD_MS = 10_000;

export function useSlowAction(isRunning: boolean, thresholdMs: number = DEFAULT_THRESHOLD_MS): boolean {
  const [isSlow, setIsSlow] = useState(false);

  useEffect(() => {
    if (!isRunning) {
      return;
    }
    const timer = setTimeout(() => setIsSlow(true), thresholdMs);
    // Reset on the way out rather than in the effect body. Clearing it here still runs when the
    // action finishes (the effect re-runs and tears the old one down first), but doing it in the
    // body would be a synchronous setState on every render where nothing is in flight.
    return () => {
      clearTimeout(timer);
      setIsSlow(false);
    };
  }, [isRunning, thresholdMs]);

  return isSlow;
}
