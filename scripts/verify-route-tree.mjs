/**
 * Vérifie que Turbopack a bien enregistré les routes imbriquées (ex. /dashboard/tours/create).
 * routes.d.ts corrompu ou incomplet → 404 malgré page.tsx présent.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const dashboardRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const routesFile = path.join(dashboardRoot, ".next", "dev", "types", "routes.d.ts");

/** Routes statiques imbriquées critiques — doivent figurer dans AppRoutes. */
export const REQUIRED_NESTED_ROUTES = [
  "/dashboard/tours/create",
  "/dashboard/blueprints/create",
  "/dashboard/sdk-tests/simple",
];

function listAppPages(dir, prefix = "") {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const routes = [];
  for (const entry of entries) {
    if (entry.name.startsWith("(") && entry.name.endsWith(")")) {
      routes.push(...listAppPages(path.join(dir, entry.name), prefix));
      continue;
    }
    const segment = entry.name;
    const rel = segment ? `${prefix}/${segment}` : prefix;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      routes.push(...listAppPages(full, rel));
    } else if (entry.name === "page.tsx" || entry.name === "page.ts") {
      routes.push(normalizeRoute(prefix || "/"));
    }
  }
  return routes;
}

function normalizeRoute(route) {
  return route.replace(/\/+/g, "/") || "/";
}

export function verifyRouteTree() {
  const appDir = path.join(dashboardRoot, "app");
  if (!fs.existsSync(appDir)) {
    return { ok: false, reason: "app/ introuvable" };
  }

  const diskRoutes = listAppPages(appDir).map(normalizeRoute);
  const nestedOnDisk = diskRoutes.filter((r) => r.split("/").filter(Boolean).length > 2);

  if (!fs.existsSync(routesFile)) {
    return {
      ok: false,
      reason: "routes.d.ts absent (Turbopack pas prêt)",
      nestedOnDisk: nestedOnDisk.length,
    };
  }

  const content = fs.readFileSync(routesFile, "utf8");

  const appRoutesCount = (content.match(/^type AppRoutes =/gm) ?? []).length;
  const declareGlobalCount = (content.match(/^declare global \{/gm) ?? []).length;
  const layoutSlotRefs = (content.match(/LayoutSlotMap\[LayoutRoute\]/g) ?? []).length;
  if (
    appRoutesCount > 1 ||
    declareGlobalCount > 1 ||
    layoutSlotRefs > 2 ||
    content.includes("\ns<'/blog/")
  ) {
    return { ok: false, reason: "routes.d.ts corrompu (contenu dupliqué)" };
  }

  const missingRequired = REQUIRED_NESTED_ROUTES.filter((r) => !content.includes(`"${r}"`));
  const missingNested = nestedOnDisk.filter((r) => !content.includes(`"${r}"`));

  if (missingRequired.length > 0 || missingNested.length > 0) {
    return {
      ok: false,
      reason: "routes imbriquées absentes du manifest Turbopack",
      missingRequired,
      missingNestedCount: missingNested.length,
      missingNestedSample: missingNested.slice(0, 8),
      diskPageCount: diskRoutes.length,
    };
  }

  return { ok: true, diskPageCount: diskRoutes.length, nestedOnDisk: nestedOnDisk.length };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = verifyRouteTree();
  if (result.ok) {
    console.log(
      `[verify-route-tree] OK (${result.diskPageCount} pages, ${result.nestedOnDisk} imbriquées)`,
    );
    process.exit(0);
  }
  console.warn("[verify-route-tree]", result.reason, result);
  process.exit(1);
}
