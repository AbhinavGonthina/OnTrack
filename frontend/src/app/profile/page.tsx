"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ApiError, getProfile, updateResume } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/Button";
import { Spinner } from "@/components/Spinner";
import { FIELD_CLASSNAME } from "@/lib/inputStyles";

export default function ProfilePage() {
  const router = useRouter();
  const { token, isAuthenticated, logout } = useAuth();

  const [resumeText, setResumeText] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace("/");
    }
  }, [isAuthenticated, router]);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;

    getProfile(token)
      .then((profile) => {
        if (cancelled) return;
        setResumeText(profile.resumeText ?? "");
        setIsLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 401) {
          logout();
          router.replace("/");
          return;
        }
        setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
        setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [token, logout, router]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!token) return;
    setError(null);
    setSaved(false);
    setIsSubmitting(true);
    try {
      await updateResume(token, resumeText);
      setSaved(true);
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
      <h1 className="font-display text-2xl font-bold text-foreground">Profile</h1>
      <p className="mt-1 text-sm text-foreground/70">
        Paste your resume text here - the AI fit-analysis feature compares it against each job description.
      </p>
      {isLoading ? (
        <Spinner label="Loading…" className="mt-6" />
      ) : (
        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
          <label className="flex flex-col gap-1 text-sm text-foreground">
            Resume text
            <textarea
              rows={16}
              value={resumeText}
              onChange={(e) => {
                setResumeText(e.target.value);
                setSaved(false);
              }}
              className={FIELD_CLASSNAME}
            />
          </label>
          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
          {saved && !error && <p className="text-sm text-green-600 dark:text-green-400">Saved.</p>}
          <Button type="submit" disabled={isSubmitting} className="mt-2 w-full sm:w-fit">
            {isSubmitting ? "Saving…" : "Save"}
          </Button>
        </form>
      )}
    </main>
  );
}
