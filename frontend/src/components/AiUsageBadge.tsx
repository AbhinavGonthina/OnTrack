"use client";

import { useAiUsage } from "@/context/AiUsageContext";

/** Self-contained (reads AiUsageContext directly) so it can be dropped into any
 * authenticated view without prop drilling - hides itself in demo/read-only mode
 * since there's no token to fetch usage for. */
export function AiUsageBadge() {
  const { aiUsage } = useAiUsage();

  if (!aiUsage) {
    return null;
  }

  return (
    <span className="text-xs text-muted">
      {aiUsage.remaining} / {aiUsage.limit} AI calls left today
    </span>
  );
}
