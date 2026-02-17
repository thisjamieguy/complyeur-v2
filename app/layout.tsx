import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { Geist, Geist_Mono } from "next/font/google";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Toaster } from "@/components/ui/sonner";
import { MaintenanceBanner } from "@/components/ui/maintenance-banner";
import { ConsentAwareGoogleAnalytics } from "@/components/analytics/consent-aware-google-analytics";
import { defaultMetadata, SITE_URL, X_HANDLE } from "@/lib/metadata";
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
  const xProfileUrl = `https://x.com/${X_HANDLE.replace(/^@/, '')}`

  return (
    <html lang="en">
      <head>
        {/* Preload LCP images for landing page and auth pages performance */}
        <link rel="preload" href="/images/Icons/01_Logo_Horizontal/ComplyEur_Logo_Horizontal.svg" as="image" type="image/svg+xml" />
        <link rel="preload" href="/images/Icons/02_Logo_Stacked/ComplyEur_Logo_Stacked.svg" as="image" type="image/svg+xml" />
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
        {/* JSON-LD Structured Data for SEO - safe static content */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify([
              {
                "@context": "https://schema.org",
                "@type": "WebSite",
                "@id": `${SITE_URL}/#website`,
                name: "ComplyEur",
                url: SITE_URL,
                description: "Schengen compliance management for UK businesses",
                publisher: {
                  "@id": `${SITE_URL}/#organization`,
                },
              },
              {
                "@context": "https://schema.org",
                "@type": "Organization",
                "@id": `${SITE_URL}/#organization`,
                name: "ComplyEur",
                url: SITE_URL,
                logo: `${SITE_URL}/images/Icons/01_Logo_Horizontal/ComplyEur_Logo_Horizontal.svg`,
                sameAs: [xProfileUrl],
                description: "Helping UK businesses track EU Schengen 90/180-day visa compliance for their employees.",
              },
              {
                "@context": "https://schema.org",
                "@type": "SoftwareApplication",
                "@id": `${SITE_URL}/#software`,
                name: "ComplyEur",
                applicationCategory: "BusinessApplication",
                applicationSubCategory: "Compliance Management",
                operatingSystem: "Web browser",
                url: SITE_URL,
                description:
                  "Track and manage EU Schengen 90/180-day visa compliance for your employees. Automated tracking, real-time alerts, and compliance reporting for UK businesses.",
                featureList: [
                  "Real-time compliance tracking",
                  "90/180-day rule calculator",
                  "Employee travel management",
                  "Automated alerts and warnings",
                  "Trip planning tools",
                  "GDPR compliant data handling",
                ],
                offers: {
                  "@type": "Offer",
                  availability: "https://schema.org/PreOrder",
                  price: "0",
                  priceCurrency: "GBP",
                  priceValidUntil: "2026-12-31",
                },
                publisher: {
                  "@id": `${SITE_URL}/#organization`,
                },
              },
            ]),
          }}
        />
        <MaintenanceBanner />
        {children}
        <Toaster />
        <SpeedInsights />
        {process.env.NODE_ENV === 'production' && (
          <ConsentAwareGoogleAnalytics gaId="G-PKKZZFWD63" />
        )}
      </body>
    </html>
  );
}
