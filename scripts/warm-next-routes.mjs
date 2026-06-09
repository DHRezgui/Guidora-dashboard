/**
 * Pré-compile les routes critiques au démarrage dev (évite 404 juste après restart Docker).
 */
import { REQUIRED_NESTED_ROUTES, verifyRouteTree } from "./verify-route-tree.mjs";

const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOSTNAME || "127.0.0.1";
const ROUTES = [
  "/dashboard/tours",
  "/dashboard/blueprints",
  ...REQUIRED_NESTED_ROUTES,
];
const INTERVAL_MS = 3_000;
const MAX_ATTEMPTS = 40;
const REQUEST_TIMEOUT_MS = 12_000;
const INITIAL_DELAY_MS = 8_000;

async function probeRoute(route) {
  try {
    const response = await fetch(`http://${HOST}:${PORT}${route}`, {
      redirect: "manual",
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    return response.status !== 404 && response.status < 500;
  } catch {
    return false;
  }
}

async function warmRoutes() {
  await new Promise((resolve) => setTimeout(resolve, INITIAL_DELAY_MS));

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    const tree = verifyRouteTree();
    const httpOk = await Promise.all(ROUTES.map(probeRoute));
    if (tree.ok && httpOk.every(Boolean)) {
      console.log(`[warm-next-routes] OK (${ROUTES.join(", ")})`);
      return;
    }
    if (attempt % 5 === 0) {
      console.warn("[warm-next-routes] En attente…", {
        attempt,
        treeOk: tree.ok,
        treeReason: tree.reason,
        http: ROUTES.map((r, i) => `${r}:${httpOk[i] ? "ok" : "404"}`),
      });
    }
    await new Promise((resolve) => setTimeout(resolve, INTERVAL_MS));
  }
  console.warn(
    "[warm-next-routes] Timeout — le garde-fou dev-server tentera une récupération Turbopack.",
  );
  process.exit(2);
}

void warmRoutes();
