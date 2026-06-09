import type { NextConfig } from "next";
import fs from "fs";
import path from "path";
import { createRequire } from "module";

const dashboardRoot = path.resolve(__dirname);
const requireFromDashboard = createRequire(path.join(dashboardRoot, "package.json"));
const sdkMarker = path.join("utils", "auto-publish-session-dedupe.ts");

type SdkPaths = {
  sdkReactSrc: string;
  sdkTurbopackAlias: string;
};

/**
 * Résout le SDK React pour webpack (absolu) et Turbopack (relatif à /app).
 * La racine Turbopack reste toujours le dossier dashboard : évite les 404 intermittents
 * quand root=monorepo parent (routes vues comme ./dashboard/app/...).
 */
function resolveSdkPaths(): SdkPaths {
  const inAppSrc = path.join(dashboardRoot, "sdks", "react", "src");
  const inAppMarker = path.join(inAppSrc, sdkMarker);
  /** Chemin réel sous /app (volume Docker) — évite le symlink npm file:../sdks/react. */
  const turbopackInApp = "./sdks/react/src";

  if (fs.existsSync(inAppMarker)) {
    return { sdkReactSrc: inAppSrc, sdkTurbopackAlias: turbopackInApp };
  }

  const nodeModulesSrc = path.join(
    dashboardRoot,
    "node_modules",
    "@trustdev",
    "onboarding-sdk-react",
    "src",
  );
  if (fs.existsSync(path.join(nodeModulesSrc, sdkMarker))) {
    const relative = path
      .relative(dashboardRoot, nodeModulesSrc)
      .split(path.sep)
      .join("/");
    return {
      sdkReactSrc: nodeModulesSrc,
      sdkTurbopackAlias: relative.startsWith(".") ? relative : `./${relative}`,
    };
  }

  const siblingSrc = path.resolve(dashboardRoot, "..", "sdks", "react", "src");
  return {
    sdkReactSrc: siblingSrc,
    sdkTurbopackAlias: turbopackInApp,
  };
}

const { sdkReactSrc, sdkTurbopackAlias } = resolveSdkPaths();

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@trustdev/onboarding-sdk-react"],
  experimental: {
    externalDir: true,
  },
  turbopack: {
    // Racine absolue du projet dashboard (/app en Docker) — scanner récursif app/…/page.tsx
    root: dashboardRoot,
    resolveAlias: {
      "@sdk": sdkTurbopackAlias,
      "@trustdev/onboarding-sdk-react": sdkTurbopackAlias,
    },
  },
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:3020/api/v1",
    NEXT_PUBLIC_INTERNAL_API_URL:
      process.env.NEXT_PUBLIC_INTERNAL_API_URL || "http://localhost:3002/api/v1",
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
