"use client";

import { createContext, ReactNode, useCallback, useContext, useEffect, useState } from "react";
import { getAiUsage } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import type { AiUsageResponse } from "@/lib/types";

interface AiUsageContextValue {
  aiUsage: AiUsageResponse | null;
  /** Re-fetches the current budget - call after any Gemini-backed request settles
   * (success or failure both consume from the shared daily budget). */
  refresh: () => void;
}

const AiUsageContext = createContext<AiUsageContextValue | undefined>(undefined);

export function AiUsageProvider({ children }: { children: ReactNode }) {
  const { token } = useAuth();
  const [aiUsage, setAiUsage] = useState<AiUsageResponse | null>(null);

  const refresh = useCallback(() => {
    if (!token) return;
    getAiUsage(token)
      .then(setAiUsage)
      .catch(() => {
        // Non-critical - better to show nothing than a stale/wrong count.
      });
  }, [token]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return <AiUsageContext.Provider value={{ aiUsage, refresh }}>{children}</AiUsageContext.Provider>;
}

export function useAiUsage(): AiUsageContextValue {
  const context = useContext(AiUsageContext);
  if (!context) {
    throw new Error("useAiUsage must be used within an AiUsageProvider");
  }
  return context;
}
