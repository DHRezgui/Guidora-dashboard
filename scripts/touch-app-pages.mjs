/**
 * Met à jour le mtime des page.tsx sous app/ pour forcer Turbopack à les indexer
 * (bind mount Windows/VirtioFS : sous-dossiers parfois absents du premier scan).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const dashboardRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

/**
 * @param {string} [appDir]
 * @returns {number} nombre de fichiers page touchés
 */
export function touchAppPageFiles(appDir = path.join(dashboardRoot, "app")) {
  if (!fs.existsSync(appDir)) {
    return 0;
  }

  const now = new Date();
  let count = 0;

  /** @param {string} dir */
  function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name.startsWith("_")) {
          continue;
        }
        walk(full);
        continue;
      }
      if (entry.name === "page.tsx" || entry.name === "page.ts") {
        fs.utimesSync(full, now, now);
        count += 1;
      }
    }
  }

  walk(appDir);
  return count;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const n = touchAppPageFiles();
  console.log(`[touch-app-pages] ${n} page(s) touchée(s)`);
}
