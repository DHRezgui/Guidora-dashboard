/**
 * Surveille le manifest Turbopack (routes.d.ts) et les routes critiques.
 * Corruption / routes imbriquées absentes → déclenche une récupération (.next + restart).
 */
import { REQUIRED_NESTED_ROUTES, verifyRouteTree } from "./verify-route-tree.mjs";

const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOSTNAME || "127.0.0.1";
const PROBE_TIMEOUT_MS = 8_000;

export async function probeCriticalRoutes(routes = REQUIRED_NESTED_ROUTES) {
  const results = await Promise.all(
    routes.map(async (route) => {
      try {
        const response = await fetch(`http://${HOST}:${PORT}${route}`, {
          redirect: "manual",
          signal: AbortSignal.timeout(PROBE_TIMEOUT_MS),
        });
        return response.status !== 404 && response.status < 500;
      } catch {
        return false;
      }
    }),
  );
  return results.every(Boolean);
}

/**
 * @param {{ serverReady: () => boolean, readySince: () => number | null, onRecover: (reason: string) => void | Promise<void> }} options
 */
export function startRouteTreeGuard(options) {
  const intervalMs = Number(process.env.ROUTE_TREE_GUARD_INTERVAL_MS || 5_000);
  const threshold = Number(process.env.ROUTE_TREE_UNHEALTHY_THRESHOLD || 3);
  const graceMs = Number(process.env.ROUTE_TREE_GUARD_GRACE_MS || 90_000);
  let unhealthyStreak = 0;
  let recovering = false;

  const timer = setInterval(async () => {
    if (recovering || !options.serverReady()) {
      return;
    }

    const readySince = options.readySince();
    if (readySince === null || Date.now() - readySince < graceMs) {
      return;
    }

    const tree = verifyRouteTree();
    const httpOk = tree.ok ? await probeCriticalRoutes() : false;
    const healthy = tree.ok && httpOk;

    if (healthy) {
      unhealthyStreak = 0;
      return;
    }

    unhealthyStreak += 1;
    if (unhealthyStreak < threshold) {
      return;
    }

    unhealthyStreak = 0;
    recovering = true;
    try {
      const reason = tree.ok
        ? "route critique HTTP 404"
        : (tree.reason ?? "manifest Turbopack invalide");
      await options.onRecover(reason);
    } finally {
      recovering = false;
    }
  }, intervalMs);

  timer.unref?.();

  return () => clearInterval(timer);
}
