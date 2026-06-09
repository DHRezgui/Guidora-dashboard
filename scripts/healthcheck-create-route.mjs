/** Healthcheck Docker : manifest Turbopack + routes éditeur joignables. */
import { REQUIRED_NESTED_ROUTES, verifyRouteTree } from "./verify-route-tree.mjs";

const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOSTNAME || "127.0.0.1";
const TIMEOUT_MS = 45_000;

const tree = verifyRouteTree();
if (!tree.ok) {
  process.exit(1);
}

try {
  for (const route of REQUIRED_NESTED_ROUTES) {
    const response = await fetch(`http://${HOST}:${PORT}${route}`, {
      redirect: "manual",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (response.status === 404 || response.status >= 500) {
      process.exit(1);
    }
  }
  process.exit(0);
} catch {
  process.exit(1);
}
