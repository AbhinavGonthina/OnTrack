"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ApiError, deleteApplication, getApplications } from "@/lib/api";
import { cachedFetch, applicationsCacheKey, invalidateCache, statsCacheKey } from "@/lib/requestCache";
import { useAuth } from "@/context/AuthContext";
import { ApplicationsTable } from "@/components/ApplicationsTable";
import { DotGridBackground } from "@/components/DotGridBackground";
import { PageContainer } from "@/components/PageContainer";
import { Spinner } from "@/components/Spinner";
import type { ApplicationResponse } from "@/lib/types";

export default function ApplicationsPage() {
  const router = useRouter();
  const { token, logout } = useAuth();

  const [applications, setApplications] = useState<ApplicationResponse[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);


  useEffect(() => {
    if (!token) return;
    let cancelled = false;

    cachedFetch(applicationsCacheKey(token), () => getApplications(token))
      .then((res) => {
        if (!cancelled) setApplications(res);
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

  async function handleDelete(id: string) {
    if (!token) return;
    if (!confirm("Delete this application? This can't be undone.")) return;
    setDeletingId(id);
    try {
      await deleteApplication(token, id);
      invalidateCache(applicationsCacheKey(token), statsCacheKey(token));
      setApplications((prev) => prev?.filter((app) => app.id !== id) ?? prev);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <main className="relative isolate w-full flex-1 py-10">
      <DotGridBackground center />
      <PageContainer>
        <h1 className="font-display text-2xl font-bold text-foreground">Applications</h1>

        {error && <p className="mt-4 text-sm text-red-600 dark:text-red-400">{error}</p>}
        {!error && !applications && <Spinner label="Loading…" className="mt-4" />}
        {applications && (
          <ApplicationsTable applications={applications} onDelete={handleDelete} deletingId={deletingId} />
        )}
      </PageContainer>
    </main>
  );
}
