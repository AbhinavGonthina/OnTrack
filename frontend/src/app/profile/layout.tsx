import type { Metadata } from "next";

import { RequireAuth } from "@/components/RequireAuth";

export const metadata: Metadata = {
  title: "Profile",
};

export default function ProfileLayout({ children }: LayoutProps<"/profile">) {
  return <RequireAuth>{children}</RequireAuth>;
}
