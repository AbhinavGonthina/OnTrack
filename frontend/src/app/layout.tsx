import type { Metadata } from "next";
import { Geist, Geist_Mono, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { BackendWakeProvider } from "@/context/BackendWakeContext";
import { ThemeProvider } from "@/context/ThemeContext";
import { AppNav } from "@/components/AppNav";

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

export const metadata: Metadata = {
  title: "OnTrack — keep your job search on track",
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
            <BackendWakeProvider>
              <AppNav />
              {children}
            </BackendWakeProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
