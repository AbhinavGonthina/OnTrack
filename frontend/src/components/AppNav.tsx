"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { Logo } from "@/components/Logo";
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
    <nav className="flex items-center justify-between border-b border-surface-border bg-surface px-6 py-3 text-sm">
      <div className="flex items-center gap-2">
        <Link href="/dashboard" className="mr-2 flex items-center gap-2 font-display font-semibold text-foreground">
          <Logo size={24} />
        </Link>
        {LINKS.map((link) => {
          const isActive = pathname.startsWith(link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`rounded-full px-3 py-1.5 font-medium transition-colors ${
                isActive
                  ? "bg-brand/10 text-brand"
                  : "text-muted hover:text-foreground"
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
            className="flex h-7 w-7 items-center justify-center rounded-full bg-linear-to-br from-brand to-brand-secondary text-xs font-semibold text-white"
          >
            {user.email[0].toUpperCase()}
          </span>
        )}
        <button
          onClick={handleLogout}
          title="Log out"
          className="flex items-center gap-1.5 font-medium text-muted hover:text-foreground"
        >
          <LogOut size={16} />
        </button>
      </div>
    </nav>
  );
}
