import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { Geist, Geist_Mono } from "next/font/google";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Toaster } from "@/components/ui/sonner";
import { MaintenanceBanner } from "@/components/ui/maintenance-banner";
import "./globals.css";

// Import CookieYes types for global window augmentation
import "@/lib/cookieyes";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export const metadata: Metadata = {
  title: "ComplyEUR - Schengen Compliance Management",
  description: "Track employee travel compliance with EU Schengen 90/180-day visa rules",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        {/* CookieYes Consent Management Script - GDPR compliance */}
        {process.env.NODE_ENV === 'production' && (
          <Script
            id="cookieyes"
            src="https://cdn-cookieyes.com/client_data/8c2e311aa3e53bd1fc42091adb588e5c/script.js"
            strategy="beforeInteractive"
          />
        )}
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        suppressHydrationWarning
      >
        <MaintenanceBanner />
        {children}
        <Toaster />
        <SpeedInsights />
      </body>
    </html>
  );
}
