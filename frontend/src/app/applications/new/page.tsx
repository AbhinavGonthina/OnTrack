"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ApiError, createApplication, type ApplicationInput } from "@/lib/api";
import { applicationsCacheKey, invalidateCache, statsCacheKey } from "@/lib/requestCache";
import { useAuth } from "@/context/AuthContext";
import { ApplicationForm } from "@/components/ApplicationForm";
import { DotGridBackground } from "@/components/DotGridBackground";

export default function NewApplicationPage() {
  const router = useRouter();
  const { token, isAuthenticated, isInitializing } = useAuth();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isInitializing && !isAuthenticated) {
      router.replace("/");
    }
  }, [isInitializing, isAuthenticated, router]);

  async function handleSubmit(input: ApplicationInput) {
    if (!token) return;
    setError(null);
    setIsSubmitting(true);
    try {
      const created = await createApplication(token, input);
      invalidateCache(applicationsCacheKey(token), statsCacheKey(token));
      router.push(`/applications/${created.id}`);
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
    <main className="relative isolate w-full flex-1 px-6">
      <DotGridBackground center />
      {/* Kept as a route rather than a modal over the table: it is linked to directly from
          several places (the dashboard's quick actions, the empty state, the nav) and a
          dialog would need its own URL to stay shareable and back-button friendly. */}
      <div className="mx-auto my-12 w-full max-w-xl">
        <Link
          href="/applications"
          className="mb-4 flex w-fit items-center gap-2 text-sm text-muted transition-colors hover:text-foreground"
        >
          <ArrowLeft size={15} />
          Back to applications
        </Link>

        <div className="card p-6 shadow-2xl shadow-purple-950/20 sm:p-8">
          <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
            New application
          </h1>
          <p className="mt-1.5 text-sm text-muted">
            Log a new job application to begin pipeline tracking and AI fit analysis.
          </p>

          <div className="mt-6">
            <ApplicationForm
              submitLabel="Create application"
              isSubmitting={isSubmitting}
              error={error}
              onSubmit={handleSubmit}
              cancelHref="/applications"
              showInitialStatus
            />
          </div>
        </div>
      </div>
    </main>
  );
}
