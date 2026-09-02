"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Inbox } from "lucide-react";
import { ApiError, deleteApplication, getApplications } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/Button";
import { Spinner } from "@/components/Spinner";
import { StatusBadge } from "@/components/Badge";
import type { ApplicationResponse } from "@/lib/types";

export default function ApplicationsPage() {
  const router = useRouter();
  const { token, isAuthenticated, logout } = useAuth();

  const [applications, setApplications] = useState<ApplicationResponse[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace("/");
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
        <h1 className="font-display text-2xl font-bold text-foreground">Applications</h1>
        <Link href="/applications/new">
          <Button>New application</Button>
        </Link>
      </div>

      {error && <p className="mt-4 text-sm text-red-600 dark:text-red-400">{error}</p>}
      {!error && !applications && <Spinner label="Loading…" className="mt-4" />}
      {applications && applications.length === 0 && (
        <div className="card mt-6 flex flex-col items-center gap-3 p-10 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand/10 text-brand">
            <Inbox size={22} />
          </div>
          <p className="text-sm text-muted">
            No applications yet.{" "}
            <Link href="/applications/new" className="font-medium text-brand hover:underline">
              Add your first one
            </Link>
            .
          </p>
        </div>
      )}
      {applications && applications.length > 0 && (
        <ul className="card mt-6 divide-y divide-surface-border">
          {applications.map((app) => (
            <li key={app.id} className="flex items-center justify-between gap-4 px-4 py-3">
              <Link href={`/applications/${app.id}`} className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">
                  {app.role} · {app.company}
                </p>
                <p className="mt-1 text-xs text-muted">applied {app.dateApplied}</p>
              </Link>
              <div className="flex shrink-0 items-center gap-3 text-sm">
                <StatusBadge status={app.currentStatus} />
                <Link href={`/applications/${app.id}/edit`} className="font-medium text-brand hover:underline">
                  Edit
                </Link>
                <button
                  onClick={() => handleDelete(app.id)}
                  disabled={deletingId === app.id}
                  className="font-medium text-red-600 hover:underline disabled:opacity-50 dark:text-red-400"
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
