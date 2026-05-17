import type { NextConfig } from "next";
import path from "path";

/**
 * Local SDK lives at repo `sdks/react` (linked via file:../sdks/react in package.json).
 * Next/webpack does not reliably resolve that link in Docker (dashboard-only context +
 * anonymous node_modules volume). Alias the package name to source so dev works without npm publish.
 *
 * In Docker dev, compose mounts `./sdks/react` -> `/sdks/react` so this path exists in the container.
 */
const sdkReactSrc = path.resolve(__dirname, "..", "sdks", "react", "src");

const nextConfig: NextConfig = {
  reactStrictMode: true,
  experimental: {
    externalDir: true,
  },
  turbopack: {
    root: path.join(process.cwd(), ".."),
    /** Next dev (Turbopack) ignores webpack aliases — keep @sdk on live sources in Docker. */
    resolveAlias: {
      "@sdk": sdkReactSrc,
      "@trustdev/onboarding-sdk-react": sdkReactSrc,
    },
  },
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002/api/v1',
    NEXT_PUBLIC_INTERNAL_API_URL: process.env.NEXT_PUBLIC_INTERNAL_API_URL || 'http://localhost:3002/api/v1',
  },
  webpack: (config) => {
    config.resolve.alias = {
      ...(config.resolve.alias as Record<string, string | string[] | false | undefined>),
      "@sdk": sdkReactSrc,
      "@trustdev/onboarding-sdk-react": sdkReactSrc,
    };
    return config;
  },
};

export default nextConfig;
