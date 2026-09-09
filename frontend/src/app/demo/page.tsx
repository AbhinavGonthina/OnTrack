"use client";

import { useEffect, useState } from "react";
import { ApiError, getDemoApplications, getDemoStats } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { ColdStartGate } from "@/components/ColdStartGate";
import { DashboardView } from "@/components/DashboardView";
import { DotGridBackground } from "@/components/DotGridBackground";
import { PageContainer } from "@/components/PageContainer";
import { Spinner } from "@/components/Spinner";
import type { ApplicationResponse, StatsResponse } from "@/lib/types";

function DemoDashboardContent() {
  const { isAuthenticated } = useAuth();
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [applications, setApplications] = useState<ApplicationResponse[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    Promise.all([getDemoStats(), getDemoApplications()])
      .then(([statsRes, applicationsRes]) => {
        if (cancelled) return;
        setStats(statsRes);
        setApplications(applicationsRes);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className="relative isolate flex w-full flex-col py-6">
      <DotGridBackground center />
      <PageContainer className="flex flex-col">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground">Demo dashboard</h1>
            <p className="mt-1 text-sm text-foreground/70">
              {isAuthenticated
                ? "Sample data. You're already signed in, so just click Dashboard in the navbar above to start tracking your own job search."
                : "Sample data. Sign up to track your own job search."}
            </p>
          </div>
        </div>
        {error && <p className="mb-4 text-sm text-red-600 dark:text-red-400">{error}</p>}
        {!error && (!stats || !applications) && <Spinner label="Loading…" />}
        {stats && applications && <DashboardView stats={stats} applications={applications} readOnly />}
      </PageContainer>
    </main>
  );
}

export default function DemoDashboardPage() {
  return (
    <ColdStartGate>
      <DemoDashboardContent />
    </ColdStartGate>
  );
}
