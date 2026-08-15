"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ApiError, deleteApplication, getApplications } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/Button";
import type { ApplicationResponse } from "@/lib/types";

export default function ApplicationsPage() {
  const router = useRouter();
  const { token, isAuthenticated, logout } = useAuth();

  const [applications, setApplications] = useState<ApplicationResponse[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace("/login");
    }
  }, [isAuthenticated, router]);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;

    getApplications(token)
      .then((res) => {
        if (!cancelled) setApplications(res);
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

  async function handleDelete(id: string) {
    if (!token) return;
    if (!confirm("Delete this application? This can't be undone.")) return;
    setDeletingId(id);
    try {
      await deleteApplication(token, id);
      setApplications((prev) => prev?.filter((app) => app.id !== id) ?? prev);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
    } finally {
      setDeletingId(null);
    }
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-black dark:text-white">Applications</h1>
        <Link href="/applications/new">
          <Button>New application</Button>
        </Link>
      </div>

      {error && <p className="mt-4 text-sm text-red-600 dark:text-red-400">{error}</p>}
      {!error && !applications && (
        <p className="mt-4 text-sm text-black/50 dark:text-white/50">Loading…</p>
      )}
      {applications && applications.length === 0 && (
        <p className="mt-4 text-sm text-black/50 dark:text-white/50">
          No applications yet.{" "}
          <Link href="/applications/new" className="font-medium text-black underline dark:text-white">
            Add your first one
          </Link>
          .
        </p>
      )}
      {applications && applications.length > 0 && (
        <ul className="mt-6 divide-y divide-black/10 rounded-xl border border-black/10 dark:divide-white/10 dark:border-white/10">
          {applications.map((app) => (
            <li key={app.id} className="flex items-center justify-between gap-4 px-4 py-3">
              <Link href={`/applications/${app.id}`} className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-black dark:text-white">
                  {app.role} · {app.company}
                </p>
                <p className="text-xs text-black/50 dark:text-white/50">
                  {app.currentStatus} · applied {app.dateApplied}
                </p>
              </Link>
              <div className="flex shrink-0 items-center gap-3 text-sm">
                <Link
                  href={`/applications/${app.id}/edit`}
                  className="font-medium text-black underline dark:text-white"
                >
                  Edit
                </Link>
                <button
                  onClick={() => handleDelete(app.id)}
                  disabled={deletingId === app.id}
                  className="font-medium text-red-600 underline disabled:opacity-50 dark:text-red-400"
                >
                  {deletingId === app.id ? "Deleting…" : "Delete"}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
