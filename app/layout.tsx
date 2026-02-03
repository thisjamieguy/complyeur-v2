import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { Geist, Geist_Mono } from "next/font/google";
import { GoogleAnalytics } from "@next/third-parties/google";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Toaster } from "@/components/ui/sonner";
import { MaintenanceBanner } from "@/components/ui/maintenance-banner";
import { defaultMetadata, SITE_URL } from "@/lib/metadata";
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

export const metadata: Metadata = defaultMetadata;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        {/* Preload LCP image for landing page performance */}
        <link rel="preload" href="/logo.svg" as="image" type="image/svg+xml" />
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
        {/* JSON-LD Structured Data for SEO */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "SoftwareApplication",
              name: "ComplyEUR",
              applicationCategory: "BusinessApplication",
              operatingSystem: "Web",
              url: SITE_URL,
              description:
                "Track and manage EU Schengen 90/180-day visa compliance for your employees. Automated tracking, real-time alerts, and compliance reporting for UK businesses.",
              offers: {
                "@type": "Offer",
                availability: "https://schema.org/PreOrder",
                price: "0",
                priceCurrency: "GBP",
              },
              publisher: {
                "@type": "Organization",
                name: "ComplyEUR",
                url: SITE_URL,
              },
            }),
          }}
        />
        <MaintenanceBanner />
        {children}
        <Toaster />
        <SpeedInsights />
        {process.env.NODE_ENV === 'production' && (
          <GoogleAnalytics gaId="G-PKKZZFWD63" />
        )}
      </body>
    </html>
  );
}
