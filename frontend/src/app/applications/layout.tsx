import type { Metadata } from "next";

import { RequireAuth } from "@/components/RequireAuth";
import { TITLE_TEMPLATE } from "@/lib/metadata";

// Re-declares the template because this segment has child routes (/new, /[id], /[id]/edit)
// - see the note in lib/metadata.ts.
export const metadata: Metadata = {
  title: {
    default: "Applications",
    template: TITLE_TEMPLATE,
  },
};

export default function ApplicationsLayout({ children }: LayoutProps<"/applications">) {
  return <RequireAuth>{children}</RequireAuth>;
}
