"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ApiError, getApplications, getStats } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { DashboardView } from "@/components/DashboardView";
import { Spinner } from "@/components/Spinner";
import type { ApplicationResponse, StatsResponse } from "@/lib/types";

export default function DashboardPage() {
  const router = useRouter();
  const { token, isAuthenticated, logout } = useAuth();

  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [applications, setApplications] = useState<ApplicationResponse[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace("/login");
      return;
    }
  }, [isAuthenticated, router]);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;

    Promise.all([getStats(token), getApplications(token)])
      .then(([statsRes, applicationsRes]) => {
        if (cancelled) return;
        setStats(statsRes);
        setApplications(applicationsRes);
      })
      .catch((err) => {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 401) {
          logout();
          router.replace("/login");
          return;
        }
        setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
      });

    return () => {
      cancelled = true;
    };
  }, [token, logout, router]);

  if (!isAuthenticated) {
    return null;
  }

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-10">
      <h1 className="font-display text-2xl font-bold text-foreground">Dashboard</h1>
      {error && <p className="mt-4 text-sm text-red-600 dark:text-red-400">{error}</p>}
      {!error && (!stats || !applications) && <Spinner label="Loading…" className="mt-4" />}
      {stats && applications && (
        <div className="mt-6">
          <DashboardView stats={stats} applications={applications} readOnly={false} />
        </div>
      )}
    </main>
  );
}
