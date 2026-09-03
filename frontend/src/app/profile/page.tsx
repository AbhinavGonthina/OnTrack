"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ApiError, getProfile, getResumeStrength, normalizeResumeText, updateResume, uploadResume } from "@/lib/api";
import { cachedFetch, invalidateCache, profileCacheKey } from "@/lib/requestCache";
import { useAuth } from "@/context/AuthContext";
import { PageContainer } from "@/components/PageContainer";
import { Spinner } from "@/components/Spinner";
import { DotGridBackground } from "@/components/DotGridBackground";
import { ProfileView } from "@/components/ProfileView";
import type { ResumeStrengthResponse } from "@/lib/types";

function errorMessage(err: unknown): string {
  return err instanceof ApiError ? err.message : "Something went wrong. Please try again.";
}

export default function ProfilePage() {
  const router = useRouter();
  const { token, isAuthenticated, isInitializing, logout } = useAuth();

  const [resumeText, setResumeText] = useState("");
  const [savedResumeText, setSavedResumeText] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);

  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const [isNormalizing, setIsNormalizing] = useState(false);
  const [normalizeError, setNormalizeError] = useState<string | null>(null);

  const [strength, setStrength] = useState<ResumeStrengthResponse | null>(null);
  const [isScoringStrength, setIsScoringStrength] = useState(false);
  const [strengthError, setStrengthError] = useState<string | null>(null);

  useEffect(() => {
    if (!isInitializing && !isAuthenticated) {
      router.replace("/");
    }
  }, [isInitializing, isAuthenticated, router]);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;

    cachedFetch(profileCacheKey(token), () => getProfile(token))
      .then((profile) => {
        if (cancelled) return;
        setResumeText(profile.resumeText ?? "");
        setSavedResumeText(profile.resumeText ?? "");
        setIsLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 401) {
          logout();
          router.replace("/");
          return;
        }
        setLoadError(errorMessage(err));
        setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [token, logout, router]);

  async function handleSave() {
    if (!token) return;
    setSaveError(null);
    setIsSaving(true);
    try {
      await updateResume(token, resumeText);
      invalidateCache(profileCacheKey(token));
      setSavedResumeText(resumeText);
      setLastSavedAt(new Date());
    } catch (err) {
      setSaveError(errorMessage(err));
    } finally {
      setIsSaving(false);
    }
  }

  async function handleUpload(file: File) {
    if (!token) return;
    setUploadError(null);
    setIsUploading(true);
    try {
      const result = await uploadResume(token, file);
      setResumeText(result.resumeText);
    } catch (err) {
      setUploadError(errorMessage(err));
    } finally {
      setIsUploading(false);
    }
  }

  async function handleNormalize() {
    if (!token) return;
    setNormalizeError(null);
    setIsNormalizing(true);
    try {
      const result = await normalizeResumeText(token, resumeText);
      setResumeText(result.resumeText);
    } catch (err) {
      setNormalizeError(errorMessage(err));
    } finally {
      setIsNormalizing(false);
    }
  }

  async function handleScoreStrength() {
    if (!token) return;
    setStrengthError(null);
    setIsScoringStrength(true);
    try {
      setStrength(await getResumeStrength(token, resumeText));
    } catch (err) {
      setStrengthError(errorMessage(err));
    } finally {
      setIsScoringStrength(false);
    }
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <main className="relative isolate flex w-full flex-col overflow-y-auto py-6 md:h-[calc(100vh-4rem-1px)] md:max-h-[calc(100vh-4rem-1px)] md:overflow-hidden">
      <DotGridBackground center />
      <PageContainer className="flex flex-col md:min-h-0 md:flex-1">
        <div className="mb-6 shrink-0">
          <h1 className="font-display text-2xl font-bold text-foreground">Profile</h1>
          <p className="mt-1 text-sm text-foreground/70">
            Keep your resume up to date - it powers fit analysis against every job description.
          </p>
        </div>
        {loadError && <p className="mb-4 shrink-0 text-sm text-red-600 dark:text-red-400">{loadError}</p>}
        {!loadError && isLoading && <Spinner label="Loading…" className="shrink-0" />}
        {!isLoading && !loadError && (
          <div className="md:min-h-0 md:flex-1 md:overflow-hidden">
            <ProfileView
              resumeText={resumeText}
              onResumeTextChange={setResumeText}
              onSave={handleSave}
              isSaving={isSaving}
              isDirty={resumeText !== savedResumeText}
              lastSavedAt={lastSavedAt}
              saveError={saveError}
              onUpload={handleUpload}
              isUploading={isUploading}
              uploadError={uploadError}
              onNormalize={handleNormalize}
              isNormalizing={isNormalizing}
              normalizeError={normalizeError}
              strength={strength}
              onScoreStrength={handleScoreStrength}
              isScoringStrength={isScoringStrength}
              strengthError={strengthError}
            />
          </div>
        )}
      </PageContainer>
    </main>
  );
}
