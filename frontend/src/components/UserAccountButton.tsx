"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { KeyRound, Mail, X } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { ApiError, forgotPassword } from "@/lib/api";
import { Button } from "@/components/Button";

/** Clicking the avatar opens a popup with the account's email and a "Reset password"
 * action - reuses the exact same forgot-password flow as the public /forgot-password
 * page (an email is sent; the password itself only changes once that link is clicked),
 * just pre-filled with the already-known logged-in email instead of asking for it again. */
export function UserAccountButton() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isSendingReset, setIsSendingReset] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);
  const [resetSent, setResetSent] = useState(false);

  function openModal() {
    setResetError(null);
    setResetSent(false);
    setIsOpen(true);
  }

  async function handleResetPassword() {
    if (!user || isSendingReset) return;
    setIsSendingReset(true);
    setResetError(null);
    try {
      await forgotPassword(user.email);
      setResetSent(true);
    } catch (err) {
      setResetError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
    } finally {
      setIsSendingReset(false);
    }
  }

  if (!user) {
    return null;
  }

  return (
    <>
      <button
        onClick={openModal}
        title={user.email}
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-brand to-brand-secondary text-xs font-semibold text-white ring-2 ring-brand/25 transition-transform hover:scale-105"
      >
        {user.email[0].toUpperCase()}
      </button>

      {isOpen &&
        createPortal(
          // Portaled to <body>, same reasoning as ReportProblemButton's modal: the nav
          // bar's backdrop-blur establishes a containing block for position:fixed
          // descendants, which would otherwise pin this near the top of the page.
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4"
            onClick={() => setIsOpen(false)}
          >
            <div className="card w-full max-w-sm p-6" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between">
                <h2 className="font-display text-lg font-bold text-foreground">Your account</h2>
                <button
                  onClick={() => setIsOpen(false)}
                  className="rounded-lg p-1 text-muted transition-colors hover:bg-foreground/5 hover:text-foreground"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="mt-4 flex items-center gap-2 text-sm text-foreground">
                <Mail size={15} className="shrink-0 text-muted" />
                <span className="truncate">{user.email}</span>
              </div>

              <div className="mt-5 border-t border-surface-border pt-4">
                {resetSent ? (
                  <p className="text-sm text-foreground/70">
                    Check your email for a link to reset your password.
                  </p>
                ) : (
                  <>
                    <Button variant="secondary" size="sm" onClick={handleResetPassword} disabled={isSendingReset}>
                      <span className="inline-flex items-center gap-1.5">
                        <KeyRound size={14} />
                        {isSendingReset ? "Sending…" : "Reset password"}
                      </span>
                    </Button>
                    <p className="mt-2 text-xs text-muted">
                      We&apos;ll email you a link. Your password only changes once you click it.
                    </p>
                  </>
                )}
                {resetError && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{resetError}</p>}
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
