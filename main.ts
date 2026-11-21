// Palmera Bay — Sunset Run: the handoff program (Node 22, standard library
// only). It copies the game and its screenshots into the output directory and
// writes the dossier the judge reads, with the vendored make.fun library.
//
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(out, { recursive: true });
cpSync(join(here, 'game'), join(out, 'game'), { recursive: true });

// Screenshots: exactly the ones the maker took, none over the 256 KiB cap.
const shotsDir = join(here, 'screenshots');
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(shotsDir)) {
  for (const name of readdirSync(shotsDir).sort()) {
    const file = join(shotsDir, name);
    const size = statSync(file).size;
    if (size > 262144) {
      throw new Error(`screenshot ${name} is ${size} bytes, over the 256 KiB cap`);
    }
    cpSync(file, join(out, 'screenshots', name));
  }
}

writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
    game_path_max_bytes: 1000,
  }),
);
