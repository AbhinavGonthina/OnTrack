"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ApiError, getApplication, updateApplication, type ApplicationInput } from "@/lib/api";
import { applicationsCacheKey, invalidateCache, statsCacheKey } from "@/lib/requestCache";
import { useAuth } from "@/context/AuthContext";
import { ApplicationForm } from "@/components/ApplicationForm";
import { Spinner } from "@/components/Spinner";

export default function EditApplicationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { token, isAuthenticated, isInitializing, logout } = useAuth();

  const [initial, setInitial] = useState<ApplicationInput | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isInitializing && !isAuthenticated) {
      router.replace("/");
    }
  }, [isInitializing, isAuthenticated, router]);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;

    getApplication(token, id)
      .then((detail) => {
        if (cancelled) return;
        setInitial({
          company: detail.company,
          role: detail.role,
          jobDescriptionText: detail.jobDescriptionText ?? "",
          dateApplied: detail.dateApplied,
        });
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
  }, [token, id, logout, router]);

  async function handleSubmit(input: ApplicationInput) {
    if (!token) return;
    setError(null);
    setIsSubmitting(true);
    try {
      await updateApplication(token, id, input);
      invalidateCache(applicationsCacheKey(token), statsCacheKey(token));
      router.push(`/applications/${id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <main className="mx-auto w-full max-w-lg flex-1 px-6 py-10">
      <h1 className="font-display text-2xl font-bold text-foreground">Edit application</h1>
      <div className="mt-6">
        {!initial && !error && <Spinner label="Loading…" />}
        {initial && (
          <ApplicationForm
            initial={initial}
            submitLabel="Save"
            isSubmitting={isSubmitting}
            error={error}
            onSubmit={handleSubmit}
          />
        )}
        {!initial && error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      </div>
    </main>
  );
}
