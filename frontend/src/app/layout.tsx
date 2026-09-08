import type { Metadata } from "next";
import { Geist, Geist_Mono, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { AiUsageProvider } from "@/context/AiUsageContext";
import { AuthProvider } from "@/context/AuthContext";
import { BackendWakeProvider } from "@/context/BackendWakeContext";
import { ThemeProvider } from "@/context/ThemeContext";
import { TITLE_TEMPLATE } from "@/lib/metadata";
import { AppNav } from "@/components/AppNav";
import { NavigationProgressBar } from "@/components/NavigationProgressBar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

// Every page under app/ is a client component, and Next only reads `metadata` from server
// components - so each route carries its tab title in a tiny server-component layout.ts of
// its own, and this template wraps whatever they declare. `default` covers the root
// segment's own page (the landing page): per Next's rules a template applies to *child*
// segments only, never to a page in the same segment where it's defined.
export const metadata: Metadata = {
  title: {
    default: "OnTrack — Home",
    template: TITLE_TEMPLATE,
  },
  description:
    "A job application tracker built for SWE/CS job searches, with status-pipeline analytics and an AI-powered resume/JD fit check.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${spaceGrotesk.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <ThemeProvider>
          <AuthProvider>
            <AiUsageProvider>
              <BackendWakeProvider>
                <NavigationProgressBar />
                <AppNav />
                {children}
              </BackendWakeProvider>
            </AiUsageProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
