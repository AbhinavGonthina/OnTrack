"use client";

import { AnimatePresence, motion } from "motion/react";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

function isInternalNavigationClick(e: MouseEvent): boolean {
  const anchor = (e.target as HTMLElement)?.closest("a");
  if (!anchor) return false;
  if (anchor.target === "_blank" || anchor.hasAttribute("download")) return false;

  const href = anchor.getAttribute("href");
  if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) return false;

  let url: URL;
  try {
    url = new URL(href, window.location.href);
  } catch {
    return false;
  }
  if (url.origin !== window.location.origin) return false;
  if (url.pathname === window.location.pathname && url.search === window.location.search) return false;

  return true;
}

function NavigationProgressBarContent() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (isInternalNavigationClick(e)) {
        setLoading(true);
      }
    }
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, []);

  useEffect(() => {
    // The new route has committed - clear the pending indicator.
    const id = setTimeout(() => setLoading(false), 0);
    return () => clearTimeout(id);
  }, [pathname, searchParams]);

  return (
    <AnimatePresence>
      {loading && (
        <motion.div
          aria-hidden
          data-testid="navigation-progress-bar"
          className="pointer-events-none fixed top-0 left-0 z-50 h-0.5 w-full origin-left bg-linear-to-r from-brand to-brand-secondary"
          initial={{ scaleX: 0, opacity: 1 }}
          animate={{ scaleX: 0.85 }}
          exit={{ scaleX: 1, opacity: 0, transition: { duration: 0.3 } }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        />
      )}
    </AnimatePresence>
  );
}

export function NavigationProgressBar() {
  return (
    <Suspense fallback={null}>
      <NavigationProgressBarContent />
    </Suspense>
  );
}
