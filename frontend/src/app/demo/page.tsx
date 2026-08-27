"use client";

import { useEffect, useState } from "react";
import { ApiError, getDemoApplications, getDemoStats } from "@/lib/api";
import { ColdStartGate } from "@/components/ColdStartGate";
import { DashboardView } from "@/components/DashboardView";
import type { ApplicationResponse, StatsResponse } from "@/lib/types";

function DemoDashboardContent() {
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
    <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-10">
      <h1 className="font-display text-2xl font-bold text-foreground">Demo dashboard</h1>
      <p className="mt-1 text-sm text-foreground/70">
        Sample data - sign up to track your own job search.
      </p>
      {error && <p className="mt-4 text-sm text-red-600 dark:text-red-400">{error}</p>}
      {!error && (!stats || !applications) && (
        <p className="mt-4 text-sm text-muted">Loading…</p>
      )}
      {stats && applications && (
        <div className="mt-6">
          <DashboardView stats={stats} applications={applications} readOnly />
        </div>
      )}
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
