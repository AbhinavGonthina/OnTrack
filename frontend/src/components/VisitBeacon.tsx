"use client";

import { useEffect } from "react";
import { countVisit } from "@/lib/visit";

/**
 * Pings the visit-notification worker once, for a direct arrival at the landing page.
 *
 * <p>Mounted in the root layout, which stays mounted across client-side navigation, so the
 * effect runs once per full page load. countVisit itself decides whether to fire (production
 * host, path "/", Do Not Track off) and waits for the window load event, so the request never
 * competes with fonts or first paint.
 */
export function VisitBeacon() {
  useEffect(() => {
    countVisit();
  }, []);

  return null;
}
