import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Verify email",
};

export default function VerifyEmailLayout({ children }: LayoutProps<"/verify-email">) {
  return children;
}
