"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

export function AppNav() {
  const router = useRouter();
  const { isAuthenticated, user, logout } = useAuth();

  if (!isAuthenticated) {
    return null;
  }

  function handleLogout() {
    // Every authenticated page has its own "redirect to /login if logged out"
    // guard effect. router.push is an async transition, so that guard can
    // still fire (and win) before it resolves - pointing this at the same
    // /login destination instead of "/" means the race no longer matters.
    logout();
    router.push("/login");
  }

  return (
    <nav className="flex items-center justify-between border-b border-black/10 px-6 py-3 text-sm dark:border-white/10">
      <div className="flex items-center gap-4">
        <Link href="/dashboard" className="font-semibold text-black dark:text-white">
          OnTrack
        </Link>
        <Link href="/dashboard" className="text-black/70 hover:text-black dark:text-white/70 dark:hover:text-white">
          Dashboard
        </Link>
        <Link
          href="/applications"
          className="text-black/70 hover:text-black dark:text-white/70 dark:hover:text-white"
        >
          Applications
        </Link>
        <Link href="/profile" className="text-black/70 hover:text-black dark:text-white/70 dark:hover:text-white">
          Profile
        </Link>
      </div>
      <div className="flex items-center gap-4">
        {user && <span className="hidden text-black/50 sm:inline dark:text-white/50">{user.email}</span>}
        <button
          onClick={handleLogout}
          className="font-medium text-black underline dark:text-white"
        >
          Log out
        </button>
      </div>
    </nav>
  );
}
