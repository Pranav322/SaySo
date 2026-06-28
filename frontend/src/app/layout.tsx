import type { Metadata } from "next";
import localFont from "next/font/local";
import { Fraunces } from "next/font/google";
import "./globals.css";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

// Display serif — high-contrast, editorial. Optical sizing on for big headlines.
const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  axes: ["opsz", "SOFT"],
  display: "swap",
});

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL; // set in prod; omitted for now
const DESCRIPTION =
  "Real-time AI voice practice for the conversations that make you nervous. Talk to the date, the stranger, the friend — out loud, before it counts.";

export const metadata: Metadata = {
  ...(SITE_URL ? { metadataBase: new URL(SITE_URL) } : {}),
  title: {
    default: "Sayso — Rehearse the conversation that scares you",
    template: "%s · Sayso",
  },
  description: DESCRIPTION,
  applicationName: "Sayso",
  keywords: [
    "voice practice", "conversation practice", "social confidence",
    "AI voice", "rehearse conversations", "speaking practice", "social anxiety",
  ],
  openGraph: {
    title: "Sayso — Rehearse the conversation that scares you",
    description: DESCRIPTION,
    siteName: "Sayso",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Sayso — Rehearse the conversation that scares you",
    description: DESCRIPTION,
  },
};

export const viewport = { themeColor: "#15100C" };

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Set theme before paint to avoid a flash on reload. */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "try{document.documentElement.dataset.theme=localStorage.getItem('sayso_theme')||'light'}catch(e){document.documentElement.dataset.theme='light'}",
          }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${fraunces.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
