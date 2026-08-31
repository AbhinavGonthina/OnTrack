"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ApiError,
  addNote,
  addStatusEvent,
  deleteNote,
  getApplication,
  requestFitAnalysis,
} from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { ApplicationDetailView } from "@/components/ApplicationDetailView";
import { Spinner } from "@/components/Spinner";
import type { ApplicationDetailResponse, ApplicationStatus } from "@/lib/types";

export default function ApplicationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { token, isAuthenticated, logout } = useAuth();

  const [detail, setDetail] = useState<ApplicationDetailResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace("/login");
    }
  }, [isAuthenticated, router]);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;

    getApplication(token, id)
      .then((res) => {
        if (!cancelled) setDetail(res);
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
  }, [token, id, logout, router]);

  async function handleAddStatusEvent(
    status: ApplicationStatus,
    eventDate: string,
    rejectedFromStage?: ApplicationStatus,
  ) {
    if (!token) return;
    await addStatusEvent(token, id, status, eventDate, rejectedFromStage);
    setDetail(await getApplication(token, id));
  }

  async function handleAddNote(text: string) {
    if (!token || !detail) return;
    const note = await addNote(token, id, text);
    setDetail({ ...detail, notes: [...detail.notes, note] });
  }

  async function handleDeleteNote(noteId: string) {
    if (!token || !detail) return;
    await deleteNote(token, noteId);
    setDetail({ ...detail, notes: detail.notes.filter((n) => n.id !== noteId) });
  }

  async function handleRunFitAnalysis() {
    if (!token) throw new Error("Not authenticated");
    return requestFitAnalysis(token, id);
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-10">
      <Link href="/applications" className="text-sm font-medium text-brand hover:underline">
        ← Back to applications
      </Link>
      <div className="mt-4">
        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
        {!error && !detail && <Spinner label="Loading…" />}
        {detail && (
          <>
            <div className="mb-4 flex justify-end">
              <Link
                href={`/applications/${id}/edit`}
                className="text-sm font-medium text-brand hover:underline"
              >
                Edit application
              </Link>
            </div>
            <ApplicationDetailView
              detail={detail}
              readOnly={false}
              onAddStatusEvent={handleAddStatusEvent}
              onAddNote={handleAddNote}
              onDeleteNote={handleDeleteNote}
              onRunFitAnalysis={handleRunFitAnalysis}
            />
          </>
        )}
      </div>
    </main>
  );
}
