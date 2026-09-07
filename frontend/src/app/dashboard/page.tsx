"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ApiError, getApplications, getStats } from "@/lib/api";
import { cachedFetch, applicationsCacheKey, statsCacheKey } from "@/lib/requestCache";
import { useAuth } from "@/context/AuthContext";
import { DashboardView } from "@/components/DashboardView";
import { Spinner } from "@/components/Spinner";
import { Button } from "@/components/Button";
import { DotGridBackground } from "@/components/DotGridBackground";
import { PageContainer } from "@/components/PageContainer";
import type { ApplicationResponse, StatsResponse } from "@/lib/types";

export default function DashboardPage() {
  const router = useRouter();
  const { token, isAuthenticated, isInitializing, logout } = useAuth();

  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [applications, setApplications] = useState<ApplicationResponse[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // isInitializing covers the brief window while a page-refresh session check is still in
    // flight - redirecting before it resolves would bounce an actually-still-logged-in user.
    if (!isInitializing && !isAuthenticated) {
      router.replace("/");
    }
  }, [isInitializing, isAuthenticated, router]);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;

    Promise.all([
      cachedFetch(statsCacheKey(token), () => getStats(token)),
      cachedFetch(applicationsCacheKey(token), () => getApplications(token)),
    ])
      .then(([statsRes, applicationsRes]) => {
        if (cancelled) return;
        setStats(statsRes);
        setApplications(applicationsRes);
      })
      .catch((err) => {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 401) {
          logout();
          router.replace("/");
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
    <main className="relative isolate flex w-full flex-col py-6">
      <DotGridBackground center />
      <PageContainer className="flex flex-col">
        {/* Stacked below sm: the heading doesn't shrink and the button doesn't wrap, so on a
            narrow phone the two just rendered on top of each other. */}
        <div className="mb-6 flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="font-display text-2xl font-bold text-foreground">Dashboard</h1>
          <Link href="/applications/new">
            <Button>+ Add Application</Button>
          </Link>
        </div>
        {error && <p className="mb-4 text-sm text-red-600 dark:text-red-400">{error}</p>}
        {!error && (!stats || !applications) && <Spinner label="Loading…" />}
        {stats && applications && <DashboardView stats={stats} applications={applications} readOnly={false} />}
      </PageContainer>
    </main>
  );
}
