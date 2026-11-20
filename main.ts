// Palmera Bay — Sunset Run: the gta6-01 entry point (Node 22, stdlib only).
//
// What this program does: it gathers the entry — the playable game in
// game/ and the four screenshots in screenshots/ — into the output
// directory and writes dossier.json there, the summary the house judge
// reads. The dossier is built by the vendored make.fun library at
// vendor/makefun-game.ts, which is the kit's own copy and is left alone.
//
// The game itself is plain static files: game/index.html plus its ES
// modules, canvas only, no library and no network request, so a desktop
// browser opens it offline and plays.
//
// To play locally first: `node serve.ts`, then open http://localhost:8080.
// To hand it in outside the grader's container, MAKEFUN_OUTPUT_DIR stands
// in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
//
import { cpSync, existsSync, mkdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// Pre-flight: refuse to hand in a half-built entry. The game folder and the
// four screenshots must be beside this file, or the dossier would describe
// a game that is not there.
if (!existsSync(join(here, 'game', 'index.html'))) {
  throw new Error('game/index.html is missing — the entry is not ready to hand in');
}
for (const shot of ['1-chase.jpg', '2-pier.jpg', '3-race.jpg', '4-title.jpg']) {
  if (!existsSync(join(here, 'screenshots', shot))) {
    throw new Error(`screenshots/${shot} is missing — re-take the screenshots first`);
  }
  // The scorer refuses a screenshot over 256 KiB, so refuse it here first
  // with a message that says which shot to re-take, smaller.
  const shotBytes = statSync(join(here, 'screenshots', shot)).size;
  if (shotBytes > 262144) {
    throw new Error(`screenshots/${shot} is ${shotBytes} bytes — over the 256 KiB cap, re-take it at a lower quality`);
  }
}

mkdirSync(out, { recursive: true });
cpSync(join(here, 'game'), join(out, 'game'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) {
  cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });
}

// The scorer's caps, from the kit's reference/gate.json. Only text_max_bytes
// shapes the dossier's size; the rest refuse an entry the scorer would
// refuse anyway — more than 4 screenshots, one over 256 KiB, more than 993
// files in game/ or 48 MiB of game files in all, or a game/ path over 1000
// bytes (game/ counts beside /output's own 1000-entry cap, its screenshots/
// and dossier.json).
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
