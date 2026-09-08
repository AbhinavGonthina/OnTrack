import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Demo application",
};

export default function DemoApplicationLayout({ children }: LayoutProps<"/demo/applications/[id]">) {
  return children;
}
