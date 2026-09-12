import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Geist, Geist_Mono, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { AiUsageProvider } from "@/context/AiUsageContext";
import { AuthProvider } from "@/context/AuthContext";
import { BackendWakeProvider } from "@/context/BackendWakeContext";
import { ThemeProvider } from "@/context/ThemeContext";
import { TITLE_TEMPLATE } from "@/lib/metadata";
import { THEME_COOKIE, parseTheme } from "@/lib/theme";
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

// Reading the theme cookie here, on the server, is what makes the choice survive a refresh
// without a flash: data-theme is already correct in the first byte of HTML, so the browser
// never paints the wrong palette and then corrects itself. The cost is that this makes the
// route dynamic, which is fine for an app whose pages are almost all authenticated anyway.
export default async function RootLayout({ children }: LayoutProps<"/">) {
  const theme = parseTheme((await cookies()).get(THEME_COOKIE)?.value);

  return (
    <html
      lang="en"
      data-theme={theme}
      className={`${geistSans.variable} ${geistMono.variable} ${spaceGrotesk.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <ThemeProvider initialTheme={theme}>
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
