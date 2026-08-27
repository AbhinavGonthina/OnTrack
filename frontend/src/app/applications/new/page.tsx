"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ApiError, createApplication, type ApplicationInput } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { ApplicationForm } from "@/components/ApplicationForm";

export default function NewApplicationPage() {
  const router = useRouter();
  const { token, isAuthenticated } = useAuth();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace("/login");
    }
  }, [isAuthenticated, router]);

  async function handleSubmit(input: ApplicationInput) {
    if (!token) return;
    setError(null);
    setIsSubmitting(true);
    try {
      const created = await createApplication(token, input);
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
    <main className="mx-auto w-full max-w-lg flex-1 px-6 py-10">
      <h1 className="font-display text-2xl font-bold text-foreground">New application</h1>
      <div className="mt-6">
        <ApplicationForm
          submitLabel="Create"
          isSubmitting={isSubmitting}
          error={error}
          onSubmit={handleSubmit}
        />
      </div>
    </main>
  );
}
