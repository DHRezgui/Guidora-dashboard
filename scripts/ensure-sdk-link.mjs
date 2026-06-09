/**
 * Lie dashboard/sdks/react → ../sdks/react pour que Turbopack (root=/app ou /dashboard)
 * résolve @sdk sans sortir du répertoire projet (même layout que Docker).
 */
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const dashboardRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const linkPath = path.join(dashboardRoot, 'sdks', 'react');
const targetPath = path.join(dashboardRoot, '..', 'sdks', 'react');
const marker = path.join(linkPath, 'src', 'utils', 'auto-publish-session-dedupe.ts');
const targetMarker = path.join(targetPath, 'src', 'utils', 'auto-publish-session-dedupe.ts');

// docker-compose monte ./sdks/react sur /app/sdks/react — pas de junction nécessaire.
if (fs.existsSync('/.dockerenv')) {
  process.exit(0);
}

if (fs.existsSync(marker)) {
  process.exit(0);
}

if (!fs.existsSync(targetMarker)) {
  console.warn('[ensure-sdk-link] SDK source introuvable:', targetPath);
  process.exit(0);
}

function removeEmptyTree(dir) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir)) {
    removeEmptyTree(path.join(dir, entry));
  }
  fs.rmdirSync(dir);
}

if (fs.existsSync(linkPath)) {
  const stat = fs.lstatSync(linkPath);
  if (stat.isSymbolicLink()) {
    process.exit(0);
  }
  if (stat.isDirectory()) {
    const children = fs.readdirSync(linkPath);
    if (children.length === 0) {
      fs.rmdirSync(linkPath);
    } else {
      console.warn(
        '[ensure-sdk-link] Dossier non vide sans SDK — supprimez manuellement:',
        linkPath,
      );
      process.exit(1);
    }
  } else {
    console.warn('[ensure-sdk-link] Chemin bloquant:', linkPath);
    process.exit(1);
  }
}

fs.mkdirSync(path.dirname(linkPath), { recursive: true });

if (process.platform === 'win32') {
  execSync(`cmd /c mklink /J "${linkPath}" "${targetPath}"`, { stdio: 'inherit' });
} else {
  fs.symlinkSync(targetPath, linkPath, 'dir');
}

console.log('[ensure-sdk-link] Lié', linkPath, '→', targetPath);
