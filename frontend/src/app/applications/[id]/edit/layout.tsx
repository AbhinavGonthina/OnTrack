import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Edit application",
};

export default function EditApplicationLayout({ children }: LayoutProps<"/applications/[id]/edit">) {
  return children;
}
