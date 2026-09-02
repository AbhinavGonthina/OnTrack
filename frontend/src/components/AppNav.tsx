"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { Logo } from "@/components/Logo";
import { PageContainer } from "@/components/PageContainer";
import { ThemeToggle } from "@/components/ThemeToggle";

const LINKS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/applications", label: "Applications" },
  { href: "/profile", label: "Profile" },
];

// Login sets isAuthenticated synchronously, before the router.push transition to the
// authenticated route actually completes - without this list, the nav bar would pop in
// on top of the still-visible auth page for that brief window and shove its layout around.
const AUTH_PATHS = ["/login", "/signup", "/forgot-password", "/reset-password", "/verify-email"];

export function AppNav() {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, user, logout } = useAuth();

  if (!isAuthenticated || AUTH_PATHS.includes(pathname)) {
    return null;
  }

  function handleLogout() {
    // Every authenticated page has its own "redirect if logged out" guard
    // effect, which also points at "/" - matching that destination here
    // means the async router.push race against that guard no longer matters.
    logout();
    router.push("/");
  }

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-surface-border bg-surface/80 text-sm backdrop-blur-md">
      <PageContainer className="relative flex h-16 items-center justify-between">
        <Link
          href="/dashboard"
          className="flex cursor-pointer items-center gap-2 font-display text-lg font-bold text-foreground transition-opacity hover:opacity-90"
        >
          <Logo size={28} />
          OnTrack
        </Link>
        <div className="absolute left-1/2 flex -translate-x-1/2 items-center gap-6">
          {LINKS.map((link) => {
            const isActive = pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`border-b-2 py-1.5 font-medium transition-colors ${
                  isActive
                    ? "border-brand text-foreground"
                    : "border-transparent text-muted hover:text-foreground"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </div>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          {user && (
            <span
              title={user.email}
              className="flex h-7 w-7 items-center justify-center rounded-full bg-linear-to-br from-brand to-brand-secondary text-xs font-semibold text-white ring-2 ring-brand/25"
            >
              {user.email[0].toUpperCase()}
            </span>
          )}
          <button
            onClick={handleLogout}
            title="Log out"
            className="rounded-lg p-1.5 text-muted transition-colors hover:bg-white/5 hover:text-foreground"
          >
            <LogOut size={16} />
          </button>
        </div>
      </PageContainer>
    </nav>
  );
}
