// Palmera Bay — Sunset Run: the handoff program (Node 22, stdlib only).
// It copies game/ and screenshots/ from beside this file to /output and
// writes /output/dossier.json with the vendored make.fun library, so the
// judge can read the game. Outside the grader, MAKEFUN_OUTPUT_DIR stands
// in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
//
// The scorer refuses any screenshot over 256 KiB, so this program checks
// first and says so plainly instead of handing in a broken entry.

import { cpSync, existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
const MAX_SCREENSHOT_BYTES = 262144;

// A screenshot over the cap fails the whole entry: refuse it loudly.
const shotsDir = join(here, 'screenshots');
if (existsSync(shotsDir)) {
  for (const name of readdirSync(shotsDir)) {
    if (name.startsWith('.')) continue;
    const file = join(shotsDir, name);
    const size = statSync(file).size;
    if (size > MAX_SCREENSHOT_BYTES) {
      throw new Error(`screenshot ${name} is ${size} bytes, over the 256 KiB cap — re-take it smaller`);
    }
  }
}

mkdirSync(out, { recursive: true });
cpSync(join(here, 'game'), join(out, 'game'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(shotsDir)) cpSync(shotsDir, join(out, 'screenshots'), { recursive: true });

// The scorer's own caps (reference/gate.json): only text_max_bytes shapes
// the bytes; the others refuse an entry the scorer would refuse (more than
// 4 screenshots or one over 256 KiB; more than 993 files in game/ or 48 MiB
// of game files, in all, or a path under game/ over 1000 bytes: game/ counts
// beside /output's own 1000-entry cap, its screenshots/ and dossier.json).
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: MAX_SCREENSHOT_BYTES },
    game_max_files: 993,
    game_max_bytes: 50331648,
    game_path_max_bytes: 1000,
  }),
);
