import type { Metadata } from "next";
import { TITLE_TEMPLATE } from "@/lib/metadata";

// Re-declares the template because this segment has a child route
// (/demo/applications/[id]) - see the note in lib/metadata.ts.
export const metadata: Metadata = {
  title: {
    default: "Demo dashboard",
    template: TITLE_TEMPLATE,
  },
};

export default function DemoLayout({ children }: LayoutProps<"/demo">) {
  return children;
}
