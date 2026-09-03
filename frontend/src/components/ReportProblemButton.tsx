"use client";

import { FormEvent, useState } from "react";
import { usePathname } from "next/navigation";
import { MessageSquareWarning, X } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { ApiError, submitFeedback } from "@/lib/api";
import { Button } from "@/components/Button";
import { FIELD_CLASSNAME } from "@/lib/inputStyles";

interface Props {
  /** "icon" for the compact nav trigger, "action" for the dashboard quick-actions card. */
  variant?: "icon" | "action";
}

export function ReportProblemButton({ variant = "icon" }: Props) {
  const { token } = useAuth();
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSent, setIsSent] = useState(false);

  function openModal() {
    setMessage("");
    setError(null);
    setIsSent(false);
    setIsOpen(true);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!token || !message.trim() || isSubmitting) return;
    setIsSubmitting(true);
    setError(null);
    try {
      await submitFeedback(token, message.trim(), pathname);
      setIsSent(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      {variant === "icon" ? (
        <button
          onClick={openModal}
          title="Report a problem"
          className="rounded-lg p-1.5 text-muted transition-colors hover:bg-white/5 hover:text-foreground"
        >
          <MessageSquareWarning size={16} />
        </button>
      ) : (
        <button
          onClick={openModal}
          className="flex flex-1 cursor-pointer items-center gap-2 rounded-lg border border-surface-border bg-white/[0.03] p-2.5 text-left text-sm text-foreground transition-all hover:bg-white/[0.08]"
        >
          <MessageSquareWarning size={16} className="text-brand" />
          Report a problem
        </button>
      )}

      {isOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4"
          onClick={() => setIsOpen(false)}
        >
          <div className="card w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg font-bold text-foreground">Report a problem</h2>
              <button
                onClick={() => setIsOpen(false)}
                className="rounded-lg p-1 text-muted transition-colors hover:bg-white/5 hover:text-foreground"
              >
                <X size={18} />
              </button>
            </div>
            {isSent ? (
              <p className="mt-4 text-sm text-foreground">Thanks - we&apos;ll take a look.</p>
            ) : (
              <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-3">
                <label className="flex flex-col gap-1 text-xs text-foreground">
                  What&apos;s going wrong?
                  <textarea
                    autoFocus
                    rows={5}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Describe the problem…"
                    className={FIELD_CLASSNAME}
                  />
                </label>
                {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
                <Button type="submit" disabled={isSubmitting || !message.trim()} className="w-fit text-sm">
                  {isSubmitting ? "Sending…" : "Send feedback"}
                </Button>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
