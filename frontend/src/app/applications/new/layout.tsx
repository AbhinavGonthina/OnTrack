import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "New application",
};

export default function NewApplicationLayout({ children }: LayoutProps<"/applications/new">) {
  return children;
}
