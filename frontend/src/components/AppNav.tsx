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
    logout();
    router.push("/");
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
