import type { NextConfig } from "next";
import bundleAnalyzer from "@next/bundle-analyzer";
import { withSentryConfig } from "@sentry/nextjs";
import { networkInterfaces } from "node:os";
import { hasSentryBuildConfiguration } from "./lib/monitoring/sentry";
import { shouldEnforceHttps } from "./lib/security/transport-security";

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

const shouldSendHsts = shouldEnforceHttps()
const baseSecurityHeaders = [
  {
    key: 'X-DNS-Prefetch-Control',
    value: 'on',
  },
  ...(shouldSendHsts ? [{
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  }] : []),
  {
    key: 'X-Frame-Options',
    value: 'DENY',
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff',
  },
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin',
  },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), browsing-topics=()',
  },
  {
    key: 'Cross-Origin-Embedder-Policy',
    value: 'credentialless',
  },
  {
    key: 'Cross-Origin-Opener-Policy',
    value: 'same-origin',
  },
  {
    key: 'Cross-Origin-Resource-Policy',
    value: 'same-origin',
  },
]

function normalizeDevOrigin(origin: string): string | null {
  const trimmed = origin.trim()
  if (!trimmed) return null

  try {
    return new URL(trimmed).hostname
  } catch {
    return trimmed.split('/')[0]?.split(':')[0] ?? null
  }
}

function getAllowedDevOrigins(): string[] | undefined {
  if (process.env.NODE_ENV !== 'development') return undefined

  const configuredOrigins = (process.env.NEXT_ALLOWED_DEV_ORIGINS ?? '')
    .split(',')
    .map(normalizeDevOrigin)
    .filter((origin): origin is string => Boolean(origin))

  const localNetworkOrigins = Object.values(networkInterfaces())
    .flatMap((entries) => entries ?? [])
    .filter((entry) => entry.family === 'IPv4' && !entry.internal)
    .map((entry) => entry.address)

  const origins = Array.from(new Set([...configuredOrigins, ...localNetworkOrigins]))
  return origins.length > 0 ? origins : undefined
}

const allowedDevOrigins = getAllowedDevOrigins()

const nextConfig: NextConfig = {
  poweredByHeader: false,
  ...(allowedDevOrigins ? { allowedDevOrigins } : {}),

  // Fix turbopack workspace root detection
  turbopack: {
    root: process.cwd(),
  },

  // Performance optimizations
  experimental: {
    // Configure stale-while-revalidate times for client-side router cache
    staleTimes: {
      dynamic: 30,  // 30 seconds for dynamic routes
      static: 180,  // 3 minutes for static routes
    },
  },

  // Image optimization settings
  images: {
    formats: ['image/webp', 'image/avif'],
    deviceSizes: [640, 750, 828, 1080, 1200],
    imageSizes: [16, 32, 48, 64, 96, 128, 256],
  },

  // Enable gzip compression
  compress: true,

  // Note: lucide-react and date-fns v4 support tree-shaking natively
  // modularizeImports is not needed and can cause issues with Turbopack

  // Headers for caching static assets
  async headers() {
    return [
      {
        source: '/:path*',
        headers: baseSecurityHeaders,
      },
      {
        // Cache static assets for 1 year
        source: '/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },
};

// Sentry configuration options
const sentryWebpackPluginOptions = {
  // For all available options, see:
  // https://github.com/getsentry/sentry-webpack-plugin#options

  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,

  // Only print logs for uploading source maps in CI
  silent: !process.env.CI,

  // For all available options, see:
  // https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

  // Upload a larger set of source maps for prettier stack traces (increases build time)
  widenClientFileUpload: true,

  // Route browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers
  tunnelRoute: "/monitoring",

  // Hides source maps from generated client bundles
  hideSourceMaps: true,

  // Webpack-specific options (new format)
  webpack: {
    // Automatically annotate React components to show their full name in breadcrumbs and session replay
    reactComponentAnnotation: {
      enabled: true,
    },
    // Automatically tree-shake Sentry logger statements to reduce bundle size
    treeshake: {
      removeDebugLogging: true,
    },
    // Enables automatic instrumentation of Vercel Cron Monitors
    automaticVercelMonitors: true,
  },
};

const bundledConfig = withBundleAnalyzer(nextConfig);

export default hasSentryBuildConfiguration
  ? withSentryConfig(bundledConfig, sentryWebpackPluginOptions)
  : bundledConfig;
