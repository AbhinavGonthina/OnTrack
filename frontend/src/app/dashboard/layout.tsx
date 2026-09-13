import type { Metadata } from "next";

import { RequireAuth } from "@/components/RequireAuth";

export const metadata: Metadata = {
  title: "Dashboard",
};

export default function DashboardLayout({ children }: LayoutProps<"/dashboard">) {
  return <RequireAuth>{children}</RequireAuth>;
}
