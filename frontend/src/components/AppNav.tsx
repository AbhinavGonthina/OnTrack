"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { Logo } from "@/components/Logo";
import { PageContainer } from "@/components/PageContainer";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ReportProblemButton } from "@/components/ReportProblemButton";

const LINKS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/applications", label: "Applications" },
  { href: "/profile", label: "Profile" },
];

// These pages have their own public-facing header (or, for the auth pages, none at all) and
// should never show the authenticated app nav, even for a signed-in user who navigates back
// to one - e.g. the landing page. (Login also sets isAuthenticated synchronously, before the
// router.push transition to the authenticated route actually completes - without "/login"
// etc. here, the nav bar would pop in on top of the still-visible auth page for that brief
// window and shove its layout around.)
const PUBLIC_ONLY_PATHS = ["/", "/login", "/signup", "/forgot-password", "/reset-password", "/verify-email"];

// Rendered twice: absolutely centered in the bar itself at md+, and as a normal in-flow
// second row below the bar on narrow screens (see the nav's own comment for why).
function NavLinks({ pathname }: { pathname: string }) {
  return LINKS.map((link) => {
    const isActive = pathname.startsWith(link.href);
    return (
      <Link
        key={link.href}
        href={link.href}
        className={`border-b-2 py-1.5 font-medium transition-colors ${
          isActive ? "border-brand text-foreground" : "border-transparent text-muted hover:text-foreground"
        }`}
      >
        {link.label}
      </Link>
    );
  });
}

// p-3 gives these 16px icons a 40px touch target on phones, tightening back to the
// original compact 28px on desktop where a cursor doesn't need the extra area.
const ICON_BUTTON_CLASSNAME =
  "rounded-lg p-3 text-muted transition-colors hover:bg-white/5 hover:text-foreground md:p-1.5";

export function AppNav() {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, user, logout } = useAuth();

  function handleLogout() {
    // Every authenticated page has its own "redirect if logged out" guard
    // effect, which also points at "/" - matching that destination here
    // means the async router.push race against that guard no longer matters.
    logout();
    router.push("/");
  }

  if (PUBLIC_ONLY_PATHS.includes(pathname)) {
    return null;
  }

  if (!isAuthenticated) {
    // The read-only demo is the one place a logged-out visitor lands on a page that isn't
    // "public-only" above - without some nav they'd have no way back home or to log in short
    // of the browser's back button. A lightweight version of the landing page's own nav (not
    // the full authenticated one, which assumes a real user/session) covers that.
    if (!pathname.startsWith("/demo")) {
      return null;
    }

    return (
      <nav className="sticky top-0 z-50 w-full border-b border-surface-border bg-surface/80 text-sm backdrop-blur-md">
        <PageContainer className="flex h-16 items-center justify-between">
          <Link
            href="/"
            className="flex cursor-pointer items-center gap-2 font-display text-lg font-bold text-foreground transition-opacity hover:opacity-90"
          >
            <Logo size={28} />
            OnTrack
          </Link>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Link href="/login" className="text-sm font-medium text-muted hover:text-foreground">
              Log In
            </Link>
          </div>
        </PageContainer>
      </nav>
    );
  }

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-surface-border bg-surface/80 text-sm backdrop-blur-md">
      <PageContainer className="relative flex h-16 items-center justify-between">
        <Link
          href="/"
          className="flex cursor-pointer items-center gap-2 font-display text-lg font-bold text-foreground transition-opacity hover:opacity-90"
        >
          <Logo size={28} />
          OnTrack
        </Link>
        {/* Absolutely centered so the active tab lines up with the page's own vertical grid
            regardless of how wide the logo or the right-hand controls are - but that also
            takes it out of flow, so on a phone it used to render straight on top of both.
            Hidden here below md and re-rendered as a real second row underneath instead. */}
        <div className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-6 md:flex">
          <NavLinks pathname={pathname} />
        </div>
        <div className="flex items-center gap-1 md:gap-3">
          <ThemeToggle />
          <ReportProblemButton variant="icon" />
          {user && (
            <span
              title={user.email}
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-brand to-brand-secondary text-xs font-semibold text-white ring-2 ring-brand/25"
            >
              {user.email[0].toUpperCase()}
            </span>
          )}
          <button onClick={handleLogout} title="Log out" className={ICON_BUTTON_CLASSNAME}>
            <LogOut size={16} />
          </button>
        </div>
      </PageContainer>
      <PageContainer className="flex items-center gap-6 pb-2 text-sm md:hidden">
        <NavLinks pathname={pathname} />
      </PageContainer>
    </nav>
  );
}
