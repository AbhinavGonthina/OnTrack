"use client";

import { useRef, useState, type DragEvent } from "react";
import { AlertCircle, CheckCircle2, Gauge, Sparkles, UploadCloud } from "lucide-react";
import type { ResumeStrengthResponse } from "@/lib/types";
import { parseResumeBlocks } from "@/lib/resumeFormatting";
import { Button } from "@/components/Button";
import { AiUsageBadge } from "@/components/AiUsageBadge";
import { FIELD_CLASSNAME } from "@/lib/inputStyles";
import { useSlowAction } from "@/lib/useSlowAction";

type Tab = "formatted" | "raw";

interface Props {
  resumeText: string;
  onResumeTextChange: (text: string) => void;

  onSave: () => void;
  isSaving: boolean;
  isDirty: boolean;
  lastSavedAt: Date | null;
  saveError: string | null;

  onUpload: (file: File) => void;
  isUploading: boolean;
  uploadError: string | null;

  onNormalize: () => void;
  isNormalizing: boolean;
  normalizeError: string | null;

  strength: ResumeStrengthResponse | null;
  onScoreStrength: (force?: boolean) => void;
  isScoringStrength: boolean;
  strengthError: string | null;
}

function SaveStatusBadge({
  isDirty,
  isSaving,
  lastSavedAt,
}: {
  isDirty: boolean;
  isSaving: boolean;
  lastSavedAt: Date | null;
}) {
  if (isSaving) {
    return <span className="text-xs text-muted">Saving…</span>;
  }
  if (isDirty) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-600 dark:text-amber-400">
        <AlertCircle size={14} />
        Unsaved changes
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
      <CheckCircle2 size={14} />
      Saved{lastSavedAt ? ` · ${lastSavedAt.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}` : ""}
    </span>
  );
}

function StrengthScoreCard({
  strength,
  onScoreStrength,
  isScoringStrength,
  strengthError,
  disabled,
}: {
  strength: ResumeStrengthResponse | null;
  onScoreStrength: (force?: boolean) => void;
  isScoringStrength: boolean;
  strengthError: string | null;
  disabled: boolean;
}) {
  return (
    <div className="card flex flex-col gap-3 p-4">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-1.5 text-sm font-medium text-muted">
          <Gauge size={15} className="text-brand" />
          Resume strength
        </h2>
        <Button
          variant="secondary"
          size="sm"
          // Force only when re-analyzing something already on screen. A first Analyze stays
          // cacheable, so clicking it on unchanged text is free rather than a second call.
          onClick={() => onScoreStrength(strength !== null)}
          disabled={isScoringStrength || disabled}
        >
          {isScoringStrength ? "Analyzing…" : strength ? "Re-analyze" : "Analyze"}
        </Button>
      </div>
      {strengthError && <p className="text-xs text-red-600 dark:text-red-400">{strengthError}</p>}
      {strength ? (
        <>
          <div className="flex items-baseline gap-2">
            <span className="font-display text-3xl font-bold gradient-text">{strength.score}</span>
            <span className="text-sm text-muted">/ 100</span>
            {strength.cached && (
              <span
                title="Stored from an earlier analysis of this exact resume. Re-analyze to recompute."
                className="ml-auto rounded-full bg-foreground/10 px-2 py-0.5 text-xs font-normal text-muted"
              >
                Saved result
              </span>
            )}
          </div>
          <div className="flex flex-col gap-2.5">
            {strength.categories.map((category) => (
              <div key={category.name}>
                <div className="flex items-baseline justify-between text-xs">
                  <span className="font-medium text-foreground/80">{category.name}</span>
                  <span className="text-muted">{category.score}</span>
                </div>
                <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-brand/15">
                  <div className="h-full rounded-full bg-brand" style={{ width: `${category.score}%` }} />
                </div>
                <p className="mt-1 text-xs text-foreground/60">{category.feedback}</p>
              </div>
            ))}
          </div>
          {strength.recommendations.length > 0 && (
            <ul className="list-disc pl-5 text-sm text-foreground/70">
              {strength.recommendations.map((rec, i) => (
                <li key={i}>{rec}</li>
              ))}
            </ul>
          )}
        </>
      ) : (
        !strengthError && <p className="text-sm text-muted">Run an analysis to get a Gemini-scored strength rating.</p>
      )}
    </div>
  );
}

function UploadDropzone({
  onUpload,
  isUploading,
  uploadError,
}: {
  onUpload: (file: File) => void;
  isUploading: boolean;
  uploadError: string | null;
}) {
  // Render's free tier spins down after ~15 minutes idle, and a cold boot was measured at 155s.
  // Past a normal wait, say so rather than continuing to claim the file is being extracted.
  const isWakingBackend = useSlowAction(isUploading);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDraggingOver(false);
    const file = e.dataTransfer.files[0];
    if (file) onUpload(file);
  }

  return (
    // flex-1: fills whatever leftover height the grid's default column-stretch gives this
    // column when it's shorter than the right column (the normal "nothing expanded" case) -
    // without it, the columns would still align at the grid level, but this card would stay
    // short and leave a visible empty gap below it.
    <div className="card flex flex-1 flex-col gap-2 p-4">
      <h2 className="shrink-0 text-sm font-medium text-muted">Upload resume</h2>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDraggingOver(true);
        }}
        onDragLeave={() => setIsDraggingOver(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`flex min-h-[160px] flex-1 cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed p-4 text-center transition-colors ${
          isDraggingOver
            ? "border-brand bg-brand/10"
            : "border-surface-border bg-foreground/[0.03] hover:bg-foreground/[0.06]"
        } ${isUploading ? "pointer-events-none opacity-60" : ""}`}
      >
        <UploadCloud size={24} className="text-brand" />
        <p className="text-xs text-muted">
          {!isUploading
            ? "Drag a PDF or DOCX here, or click to browse"
            : isWakingBackend
              ? "Still working. The server may be waking up, which takes up to two minutes on free hosting."
              : "Extracting & normalizing…"}
        </p>
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.docx"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onUpload(file);
            e.target.value = "";
          }}
        />
      </div>
      {uploadError && <p className="text-xs text-red-600 dark:text-red-400">{uploadError}</p>}
    </div>
  );
}

function FormattedPreview({ resumeText }: { resumeText: string }) {
  const blocks = parseResumeBlocks(resumeText);

  if (blocks.length === 0) {
    return <p className="text-sm text-muted">Nothing to preview yet. Add resume text in the raw editor.</p>;
  }

  return (
    <div className="flex flex-col gap-2 text-sm text-foreground/90">
      {blocks.map((block, i) => {
        if (block.type === "heading") {
          return (
            <h3 key={i} className="mt-2 font-display text-base font-bold text-foreground first:mt-0">
              {block.text}
            </h3>
          );
        }
        if (block.type === "bullet") {
          return (
            <li key={i} className="ml-5 list-disc">
              {block.text}
            </li>
          );
        }
        return <p key={i}>{block.text}</p>;
      })}
    </div>
  );
}

function RawEditor({
  resumeText,
  onResumeTextChange,
}: {
  resumeText: string;
  onResumeTextChange: (text: string) => void;
}) {
  const wordCount = resumeText.trim() ? resumeText.trim().split(/\s+/).length : 0;

  return (
    <div className="flex h-full flex-col gap-2">
      <textarea
        value={resumeText}
        onChange={(e) => onResumeTextChange(e.target.value)}
        className={`h-full flex-1 resize-none font-mono text-xs leading-relaxed ${FIELD_CLASSNAME}`}
      />
      <p className="shrink-0 text-right text-xs text-muted">
        {wordCount} words · {resumeText.length} characters
      </p>
    </div>
  );
}

export function ProfileView({
  resumeText,
  onResumeTextChange,
  onSave,
  isSaving,
  isDirty,
  lastSavedAt,
  saveError,
  onUpload,
  isUploading,
  uploadError,
  onNormalize,
  isNormalizing,
  normalizeError,
  strength,
  onScoreStrength,
  isScoringStrength,
  strengthError,
}: Props) {
  const [tab, setTab] = useState<Tab>("formatted");

  return (
    <div className="grid grid-cols-12 gap-6">
      <div className="col-span-12 flex flex-col gap-3 md:col-span-4">
        <div className="card flex items-center justify-between p-4">
          <SaveStatusBadge isDirty={isDirty} isSaving={isSaving} lastSavedAt={lastSavedAt} />
          <Button size="sm" onClick={onSave} disabled={isSaving || !isDirty}>
            {isSaving ? "Saving…" : "Save"}
          </Button>
        </div>
        {saveError && <p className="text-xs text-red-600 dark:text-red-400">{saveError}</p>}

        <StrengthScoreCard
          strength={strength}
          onScoreStrength={onScoreStrength}
          isScoringStrength={isScoringStrength}
          strengthError={strengthError}
          disabled={resumeText.trim().length === 0}
        />

        <UploadDropzone onUpload={onUpload} isUploading={isUploading} uploadError={uploadError} />
      </div>

      <div className="col-span-12 flex flex-col gap-3 md:col-span-8">
        {/* Stacked below sm: side by side, the tab pills, the AI-usage badge and the
            Normalize button each wrapped onto three lines on a phone (and overflowed the
            viewport outright at 320px). Given a full row each, both fit on one line. */}
        <div className="flex shrink-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-1 self-start rounded-full border border-surface-border bg-foreground/[0.03] p-1 text-sm sm:self-auto">
            <button
              onClick={() => setTab("formatted")}
              className={`rounded-full px-3 py-1.5 whitespace-nowrap transition-colors ${
                tab === "formatted" ? "bg-brand/15 text-brand" : "text-muted hover:text-foreground"
              }`}
            >
              Formatted Preview
            </button>
            <button
              onClick={() => setTab("raw")}
              className={`rounded-full px-3 py-1.5 whitespace-nowrap transition-colors ${
                tab === "raw" ? "bg-brand/15 text-brand" : "text-muted hover:text-foreground"
              }`}
            >
              Raw Text Editor
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <AiUsageBadge />
            <Button
              variant="secondary"
              size="sm"
              onClick={onNormalize}
              disabled={isNormalizing || resumeText.trim().length === 0}
            >
              <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
                <Sparkles size={14} />
                {isNormalizing ? "Normalizing…" : "Normalize with Gemini"}
              </span>
            </Button>
          </div>
        </div>
        {normalizeError && <p className="shrink-0 text-xs text-red-600 dark:text-red-400">{normalizeError}</p>}

        {/* A real fixed height (not just a minimum) so this scrolls internally for a long
            resume, like before - the page itself can still grow/scroll too if the left
            column (e.g. a tall strength breakdown) ends up taller than this card. Shorter
            on phones, where 600px is most of the viewport and pushes everything else off. */}
        <div className="card h-[420px] overflow-y-auto p-4 sm:h-[600px]">
          {tab === "formatted" ? (
            <FormattedPreview resumeText={resumeText} />
          ) : (
            <RawEditor resumeText={resumeText} onResumeTextChange={onResumeTextChange} />
          )}
        </div>
      </div>
    </div>
  );
}
