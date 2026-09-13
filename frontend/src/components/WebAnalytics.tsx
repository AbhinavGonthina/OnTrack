"use client";

import { Analytics } from "@vercel/analytics/next";

/**
 * Vercel Web Analytics, with application ids stripped out of the recorded path.
 *
 * <p>Chosen over Google Analytics because it is cookieless, which means no consent banner, and
 * over anything self-hosted because logging a view to our own backend would wake Render's free
 * tier on every landing-page hit. A cold start was measured at 155 seconds, so the analytics
 * call would frequently outlive the visit it was trying to record.
 *
 * <p>The redaction matters: routes like {@code /applications/652819e8-f086-...} would otherwise
 * send a real application's id to a third party on every page view. Nothing there is secret,
 * but it is user data leaving the system for no reason, and the aggregate question being asked
 * ("is anyone looking at this") is answered just as well by {@code /applications/[id]}.
 */
const UUID_PATTERN = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;

export function WebAnalytics() {
  return (
    <Analytics
      beforeSend={(event) => ({
        ...event,
        url: event.url.replace(UUID_PATTERN, "[id]"),
      })}
    />
  );
}
