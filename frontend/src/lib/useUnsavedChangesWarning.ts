"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

/**
 * Asks for confirmation before leaving a page with unsaved edits.
 *
 * <p>Covers two different kinds of leaving, because neither mechanism handles both:
 *
 * <ul>
 *   <li><b>Closing the tab, refreshing, or navigating to another site</b> is only interceptable
 *       via `beforeunload`. Browsers deliberately ignore any custom message here and show their
 *       own generic wording, so there is no point passing one.
 *   <li><b>Clicking a link inside the app</b> never fires `beforeunload`, because the page is
 *       never unloaded. The App Router has no navigation guard either, so this catches the click
 *       during the capture phase, before Next's own handler sees it.
 * </ul>
 *
 * <p>Switching browser tabs is deliberately not covered: nothing is lost, the page keeps running,
 * and browsers give no way to block it. Same for the Profile page's own Formatted/Raw tabs, which
 * only change which view renders and never touch the edited text.
 */
export function useUnsavedChangesWarning(hasUnsavedChanges: boolean, message: string) {
  const router = useRouter();
  // Set just before a deliberate external navigation, so the beforeunload handler below doesn't
  // prompt a second time for a departure the user has already confirmed.
  const isLeavingDeliberately = useRef(false);

  useEffect(() => {
    if (!hasUnsavedChanges) {
      return;
    }

    function handleBeforeUnload(event: BeforeUnloadEvent) {
      if (isLeavingDeliberately.current) {
        return;
      }
      // preventDefault is what actually triggers the prompt in current browsers; the legacy
      // returnValue assignment is kept for older ones that still check it.
      event.preventDefault();
      event.returnValue = "";
    }

    function handleClick(event: MouseEvent) {
      if (event.defaultPrevented || event.button !== 0) {
        return;
      }
      // Ctrl/Cmd/Shift-click opens a new tab or window, so this page and its edits survive.
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
        return;
      }
      const anchor = (event.target as HTMLElement | null)?.closest?.("a[href]");
      if (!(anchor instanceof HTMLAnchorElement) || anchor.target === "_blank") {
        return;
      }
      // Same-page links (and pure hash changes) don't unmount anything.
      const destination = new URL(anchor.href, window.location.href);
      if (destination.pathname === window.location.pathname) {
        return;
      }

      // Cancel the click up front and re-issue the navigation by hand if it's confirmed.
      // Letting the original click proceed does not work: Chromium drops a click's default
      // action when a modal dialog is opened synchronously during dispatch, so confirm() itself
      // swallows the navigation and "Leave" appears to do nothing.
      event.preventDefault();
      event.stopPropagation();

      if (!window.confirm(message)) {
        return;
      }
      if (destination.origin === window.location.origin) {
        router.push(destination.pathname + destination.search + destination.hash);
      } else {
        isLeavingDeliberately.current = true;
        window.location.href = anchor.href;
      }
    }

    window.addEventListener("beforeunload", handleBeforeUnload);
    document.addEventListener("click", handleClick, true);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      document.removeEventListener("click", handleClick, true);
    };
  }, [hasUnsavedChanges, message, router]);
}
