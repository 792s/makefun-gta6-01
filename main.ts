// SOLMARA — entry program for make.fun's gta6-01 bounty (Node 22, standard
// library only). The game is this directory's game/ folder: plain static files
// a desktop browser loads offline (game/index.html and its ES modules, no
// library and no network request). This program hands it in: it copies game/
// and screenshots/ from beside this file to /output and writes
// /output/dossier.json, the summary the judge reads, with the vendored
// make.fun library.
//
// Before it copies anything it fails fast on the mistakes that would make the
// entry invalid at the gate: a missing game/ folder, or a screenshots/ folder
// that does not hold 3 or 4 images of at most 256 KiB each. A clear message
// here beats a silent refusal there.
//
// Serve the game locally with `node serve.ts`, then open http://localhost:8080.
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
const MAX_SCREENSHOTS = 4;
const MIN_SCREENSHOTS = 3;
const MAX_SCREENSHOT_BYTES = 262144;

function fail(message: string): never {
  console.error(`[entry] ${message}`);
  process.exit(1);
}

// Fail fast: the game folder must be there, and the screenshots must be the
// 3 or 4 images the gate allows, each small enough to pass.
const gameDir = join(here, 'game');
if (!existsSync(gameDir)) fail('game/ is missing next to main.ts — nothing to hand in.');
if (!existsSync(join(gameDir, 'index.html'))) fail('game/index.html is missing — the game has no page to open.');

// The scorer's own caps (reference/gate.json): at most 993 files in game/
// and 48 MiB of game files in all, no path under game/ over 1000 bytes.
// Check the tree before copying, so a bad entry fails here with a clear
// message instead of being refused at the gate.
function checkGameTree(dir, prefix) {
  let files = 0;
  let bytes = 0;
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    const rel = prefix ? `${prefix}/${name}` : name;
    if (rel.length > 1000) fail(`game/${rel} is over 1000 bytes long as a path.`);
    const stats = statSync(path);
    if (stats.isDirectory()) {
      const sub = checkGameTree(path, rel);
      files += sub.files;
      bytes += sub.bytes;
    } else {
      files += 1;
      bytes += stats.size;
    }
  }
  return { files, bytes };
}
const tree = checkGameTree(gameDir, '');
if (tree.files > 993) fail(`game/ holds ${tree.files} files; the gate allows at most 993.`);
if (tree.bytes > 50331648) fail(`game/ is ${tree.bytes} bytes; the gate allows at most 48 MiB.`);
const shotsDir = join(here, 'screenshots');
if (!existsSync(shotsDir)) fail('screenshots/ is missing next to main.ts — the judge needs 3 or 4 screenshots.');
const shots = readdirSync(shotsDir).filter((name) => !name.startsWith('.'));
if (shots.length < MIN_SCREENSHOTS || shots.length > MAX_SCREENSHOTS) {
  fail(`screenshots/ holds ${shots.length} image(s); the competition needs ${MIN_SCREENSHOTS} to ${MAX_SCREENSHOTS}.`);
}
for (const name of shots) {
  if (!/\.(jpg|jpeg|png)$/i.test(name)) {
    fail(`screenshots/${name} is not a JPEG or PNG image.`);
  }
  const size = statSync(join(shotsDir, name)).size;
  if (size > MAX_SCREENSHOT_BYTES) fail(`screenshots/${name} is ${size} bytes, over the 256 KiB limit.`);
}

// --stats: print what the entry holds and stop, without copying anything.
// A quick sanity check before the real run, and the same numbers the judge
// sees in the dossier, in one line each.
function printStats(): void {
  const srcDir = join(gameDir, 'src');
  const modules = existsSync(srcDir)
    ? readdirSync(srcDir).filter((name) => name.endsWith('.js')).sort()
    : [];
  console.log(`[entry] game/: ${tree.files} files, ${tree.bytes} bytes`);
  console.log(`[entry] game/src/: ${modules.length} modules — ${modules.join(', ')}`);
  for (const name of shots) {
    console.log(`[entry] screenshots/${name}: ${statSync(join(shotsDir, name)).size} bytes`);
  }
  console.log(`[entry] dossier would go to ${join(out, 'dossier.json')}`);
}
if (process.argv.includes('--stats')) {
  printStats();
  process.exit(0);
}

mkdirSync(out, { recursive: true });
cpSync(gameDir, join(out, 'game'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
cpSync(shotsDir, join(out, 'screenshots'), { recursive: true });

// The scorer's own caps (reference/gate.json): only text_max_bytes shapes the bytes; the others refuse an entry the
// scorer would refuse (more than 4 screenshots or one over 256 KiB; more than 993 files in game/ or 48 MiB of game
// files, in all, or a path under game/ over 1000 bytes: game/ counts beside /output's own 1000-entry cap, its
// screenshots/ and dossier.json).
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: MAX_SCREENSHOTS, max_bytes: MAX_SCREENSHOT_BYTES },
    game_max_files: 993,
    game_max_bytes: 50331648,
    game_path_max_bytes: 1000,
  }),
);
console.log(`[entry] handed in: ${tree.files} game files (${tree.bytes} bytes), ${shots.length} screenshots, dossier at ${join(out, 'dossier.json')}`);
