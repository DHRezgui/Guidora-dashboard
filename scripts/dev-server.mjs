import { spawn } from "node:child_process";
import { execSync } from "node:child_process";
import { existsSync, readdirSync, rmSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { startRouteTreeGuard } from "./route-tree-guard.mjs";
import { touchAppPageFiles } from "./touch-app-pages.mjs";
import { verifyRouteTree } from "./verify-route-tree.mjs";

const dashboardRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const clean = process.argv.includes("--clean");
const inDocker = existsSync("/.dockerenv");

process.chdir(dashboardRoot);

execSync("node scripts/ensure-sdk-link.mjs", { stdio: "inherit" });

if (clean) {
  clearNextCacheSync();
}

const RECOVERY_WINDOW_MS = 10 * 60 * 1000;
const MAX_RECOVERIES_PER_WINDOW = 4;

let next = null;
let serverReady = false;
let serverReadyAt = null;
let warmupStarted = false;
let recoveryCount = 0;
let recoveryWindowStart = Date.now();
let stopGuard = null;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function waitForNextExit(child, timeoutMs = 15_000) {
  return new Promise((resolve) => {
    if (!child || child.exitCode !== null) {
      resolve(child?.exitCode ?? 0);
      return;
    }
    const timer = setTimeout(() => resolve(null), timeoutMs);
    child.once("exit", (code) => {
      clearTimeout(timer);
      resolve(code ?? 0);
    });
  });
}

function clearNextCacheSync() {
  const nextDir = path.join(dashboardRoot, ".next");
  if (!existsSync(nextDir)) {
    return;
  }

  try {
    rmSync(nextDir, { recursive: true, force: true });
  } catch (error) {
    const code = /** @type {NodeJS.ErrnoException} */ (error).code;
    if (code !== "EBUSY" && code !== "EPERM") {
      throw error;
    }
    // Volume Docker monté sur /app/.next : on vide le contenu sans retirer le point de montage.
    for (const entry of readdirSync(nextDir)) {
      rmSync(path.join(nextDir, entry), { recursive: true, force: true });
    }
  }
}

async function clearNextCache() {
  clearNextCacheSync();
  if (inDocker) {
    console.log("[dev-server] Attente VirtioFS (2s) après nettoyage .next…");
    await sleep(2_000);
  }
}

function canRecover() {
  const now = Date.now();
  if (now - recoveryWindowStart > RECOVERY_WINDOW_MS) {
    recoveryCount = 0;
    recoveryWindowStart = now;
  }
  return recoveryCount < MAX_RECOVERIES_PER_WINDOW;
}

async function recoverTurbopack(reason) {
  if (!canRecover()) {
    console.error(
      "[dev-server] Trop de récupérations Turbopack — redémarrez le conteneur dashboard.",
    );
    process.exit(1);
  }

  recoveryCount += 1;
  console.warn(
    `[dev-server] Manifest Turbopack invalide (${reason}) — nettoyage .next et redémarrage (${recoveryCount}/${MAX_RECOVERIES_PER_WINDOW})…`,
  );

  serverReady = false;
  serverReadyAt = null;
  warmupStarted = false;

  if (next) {
    next.kill("SIGTERM");
    const exitCode = await waitForNextExit(next);
    if (exitCode === null) {
      next.kill("SIGKILL");
      await waitForNextExit(next, 5_000);
    }
    next = null;
  }

  await clearNextCache();
  startNextProcess();
}

function maybeStartWarmup(chunk) {
  if (warmupStarted) return;
  const text = chunk.toString();
  if (/Ready in|started server on|Local:/i.test(text)) {
    warmupStarted = true;
    serverReady = true;
    serverReadyAt = Date.now();
    spawn("node", ["scripts/warm-next-routes.mjs"], {
      stdio: "inherit",
      shell: true,
      env: process.env,
      detached: true,
    }).unref();
  }
}

function attachNextStreams(child) {
  child.stdout.on("data", (chunk) => {
    process.stdout.write(chunk);
    maybeStartWarmup(chunk);
  });

  child.stderr.on("data", (chunk) => {
    process.stderr.write(chunk);
    maybeStartWarmup(chunk);
  });

  child.on("exit", (code) => {
    if (child !== next) {
      return;
    }
    serverReady = false;
    process.exit(code ?? 0);
  });
}

function startNextProcess() {
  if (inDocker) {
    console.log("[dev-server] Turbopack (Docker)");
  }

  const nextArgs = ["next", "dev", "--port", "3000"];
  next = spawn("npx", nextArgs, {
    stdio: ["inherit", "pipe", "pipe"],
    shell: true,
    env: process.env,
  });

  attachNextStreams(next);
}

if (inDocker) {
  console.log("[dev-server] Attente VirtioFS (3s) avant Turbopack…");
  await sleep(3_000);
  const touched = touchAppPageFiles(path.join(dashboardRoot, "app"));
  console.log(`[dev-server] ${touched} page.tsx touché(s) (indexation Turbopack)`);
}

if (!clean) {
  const bootTree = verifyRouteTree();
  if (!bootTree.ok) {
    console.warn("[dev-server] Cache .next suspect au démarrage — nettoyage…", bootTree.reason);
    await clearNextCache();
  }
}

startNextProcess();

stopGuard = startRouteTreeGuard({
  serverReady: () => serverReady,
  readySince: () => serverReadyAt,
  onRecover: recoverTurbopack,
});

process.on("SIGINT", () => {
  stopGuard?.();
  next?.kill("SIGINT");
});
process.on("SIGTERM", () => {
  stopGuard?.();
  next?.kill("SIGTERM");
});
