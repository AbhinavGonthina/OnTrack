import type { Metadata } from "next";
import { TITLE_TEMPLATE } from "@/lib/metadata";

// Re-declares the template because this segment has a child route (/edit) - see the note in
// lib/metadata.ts.
export const metadata: Metadata = {
  title: {
    default: "Application",
    template: TITLE_TEMPLATE,
  },
};

export default function ApplicationDetailLayout({ children }: LayoutProps<"/applications/[id]">) {
  return children;
}
