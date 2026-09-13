"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ApiError, getApplication, updateApplication, type ApplicationInput } from "@/lib/api";
import { applicationsCacheKey, invalidateCache, statsCacheKey } from "@/lib/requestCache";
import { useAuth } from "@/context/AuthContext";
import { ApplicationForm } from "@/components/ApplicationForm";
import { DotGridBackground } from "@/components/DotGridBackground";
import { Spinner } from "@/components/Spinner";

export default function EditApplicationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { token, logout } = useAuth();

  const [initial, setInitial] = useState<ApplicationInput | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);


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

  return (
    <main className="relative isolate w-full flex-1 px-6">
      <DotGridBackground center />
      <div className="mx-auto my-12 w-full max-w-xl">
        <Link
          href={`/applications/${id}`}
          className="mb-4 flex w-fit items-center gap-2 text-sm text-muted transition-colors hover:text-foreground"
        >
          <ArrowLeft size={15} />
          Back to application
        </Link>

        <div className="card p-6 shadow-2xl shadow-purple-950/20 sm:p-8">
          <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
            Edit application
          </h1>
          <p className="mt-1.5 text-sm text-muted">
            Update the company, role, date or job description. Status changes are logged from the
            application&apos;s own timeline.
          </p>

          <div className="mt-6">
            {!initial && !error && <Spinner label="Loading…" />}
            {initial && (
              <ApplicationForm
                initial={initial}
                submitLabel="Save changes"
                isSubmitting={isSubmitting}
                error={error}
                onSubmit={handleSubmit}
                cancelHref={`/applications/${id}`}
              />
            )}
            {!initial && error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
          </div>
        </div>
      </div>
    </main>
  );
}
