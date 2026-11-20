// Palmera Bay — Sunset Run: the city itself.
// One seeded build produces the whole map — roads, blocks, buildings,
// districts and landmarks — so the game always plays in the same city.
// Everything here is plain data; render.js draws it, the other modules
// query it. Nothing in this file touches the DOM.

import { WORLD, COLORS } from './config.js';
import { rngFrom, rint, rrange, pick, chance, clamp } from './random.js';

function blockTypeFor(cx, cy, rng) {
  // cx, cy are block column/row indices between the roads.
  if (cy === 0 && cx >= 5) return 'airfield';
  if (cy === 0 && cx >= 2 && cx <= 4) return 'downtown';
  if (cx === 0 && cy === 3) return 'docks';
  if (cx === 6 && cy === 2) return 'park';
  if (cx === 7) return 'beachfront';
  if (cy === 3 && cx >= 5) return 'marina';
  if (cy === 2 && cx === 1) return 'motel';
  if (cy === 1 && cx === 3) return 'casino';
  return chance(rng, 0.5) ? 'residential' : 'shops';
}

export function buildCity(seed = WORLD.seed) {
  const rng = rngFrom(seed);
  const { roadsX, roadsY, roadW } = WORLD;
  const city = {
    seed,
    roadsX,
    roadsY,
    roadW,
    blocks: [],
    buildings: [],
    trees: [],
    billboards: [],
    garages: [],
    ramps: [],
    stashes: [],
    tokens: [],
    taxiStands: [],
    vendors: [],
  };

  // Blocks are the rectangles between neighbouring roads.
  const xs = [0, ...roadsX, WORLD.w];
  const ys = [0, ...roadsY, WORLD.h];
  for (let cy = 0; cy < ys.length - 1; cy++) {
    for (let cx = 0; cx < xs.length - 1; cx++) {
      const x0 = xs[cx] + (cx === 0 ? 0 : roadW / 2) + 26;
      const x1 = xs[cx + 1] - (cx + 1 >= xs.length - 1 ? 0 : roadW / 2) - 26;
      const y0 = ys[cy] + (cy === 0 ? 0 : roadW / 2) + 26;
      const y1 = ys[cy + 1] - (cy + 1 >= ys.length - 1 ? 0 : roadW / 2) - 26;
      if (x1 - x0 < 60 || y1 - y0 < 60) continue;
      // The beach strip is sand, not blocks.
      if (x0 >= WORLD.sandX) continue;
      const type = blockTypeFor(cx, cy, rng);
      const block = { x: x0, y: y0, w: x1 - x0, h: y1 - y0, type };
      city.blocks.push(block);
      fillBlock(city, block, rng, cx, cy);
    }
  }

  // --- Landmarks, placed on the map by hand so missions can rely on them. ---
  city.pier = { x: WORLD.sandX - 40, y: 1180, w: 300, h: 84 };
  city.marina = { x: 2760, y: 2080, w: 420, h: 260, boats: [] };
  for (let i = 0; i < 7; i++) {
    city.marina.boats.push({ x: 2800 + i * 52, y: 2120 + (i % 2) * 130, angle: rrange(rng, -0.3, 0.3) });
  }
  city.lighthouse = { x: 3420, y: 2380, r: 26 };
  city.airfield = { x: 120, y: 120, w: 520, h: 240, runway: { x: 170, y: 210, w: 420, h: 44 } };
  city.docks = { x: 120, y: 1980, w: 420, h: 300, crates: [] };
  for (let i = 0; i < 14; i++) {
    city.docks.crates.push({ x: 150 + (i % 5) * 78, y: 2020 + Math.floor(i / 5) * 74, w: 62, h: 58, color: pick(rng, ['#c96a4a', '#5a8ab5', '#7a9a4a', '#b59a3a']) });
  }
  city.motel = { x: 760, y: 1560, w: 260, h: 90 };
  city.casino = { x: 1160, y: 760, w: 300, h: 130 };
  city.stadium = { x: 1960, y: 1560, w: 420, h: 260 };
  city.boardwalk = { x: WORLD.sandX - 30, y: 480, w: 130, h: 1500 };
  city.wheel = { x: 3260, y: 1220, r: 78 };
  city.safehouse = { x: 760, y: 560 };
  city.spawn = { x: 760, y: 560 };

  city.billboards = [
    { x: 1120, y: 320, w: 150, h: 54, text: 'PALMERA BAY', color: COLORS.neonPink },
    { x: 1920, y: 1520, w: 150, h: 54, text: 'SUNSET FM', color: COLORS.neonCyan },
    { x: 2720, y: 720, w: 150, h: 54, text: 'BAY WHEEL', color: COLORS.neonGold },
    { x: 320, y: 1920, w: 150, h: 54, text: 'FLAMINGO', color: COLORS.neonPink },
  ];

  // Garages: Mara's Garage downtown, Sunset Spray by the beach road.
  city.garages = [
    { id: 'mara', name: "Mara's Garage", x: 1560, y: 1160, r: 92 },
    { id: 'spray', name: 'Sunset Spray', x: 2960, y: 1760, r: 92 },
  ];

  // Four wooden stunt ramps.
  city.ramps = [
    { x: 3050, y: 900, angle: -Math.PI / 2 },
    { x: 420, y: 2050, angle: 0 },
    { x: 560, y: 260, angle: Math.PI / 2 },
    { x: 2150, y: 1820, angle: Math.PI },
  ];

  // Hidden guns: spray guns at the docks, marina and airfield; boomsticks at
  // the stadium and the boardwalk.
  city.stashes = [
    { kind: 'smg', x: 300, y: 2100 },
    { kind: 'smg', x: 2900, y: 2200 },
    { kind: 'smg', x: 320, y: 300 },
    { kind: 'boomstick', x: 2100, y: 1650 },
    { kind: 'boomstick', x: 3220, y: 900 },
  ];

  // Twelve sunset tokens, scattered where a curious driver will find them.
  const tokenSpots = [
    [340, 340], [1140, 340], [2340, 340], [3060, 340],
    [340, 1140], [1540, 740], [2340, 1140], [3060, 1540],
    [340, 1940], [1140, 1940], [1940, 2340], [3420, 250],
  ];
  city.tokens = tokenSpots.map(([x, y], i) => ({ id: i, x, y, taken: false }));

  city.taxiStands = [
    { x: 760, y: 340 }, { x: 1560, y: 740 }, { x: 2360, y: 1140 }, { x: 3060, y: 1940 },
  ];

  // Vendor stalls along the boardwalk.
  city.vendors = [
    { x: 3120, y: 560 }, { x: 3120, y: 900 }, { x: 3120, y: 1300 }, { x: 3120, y: 1700 },
  ];

  return city;
}

function fillBlock(city, block, rng, cx, cy) {
  const { x, y, w, h, type } = block;
  if (type === 'park') {
    for (let i = 0; i < 14; i++) {
      city.trees.push({ x: x + rrange(rng, 20, w - 20), y: y + rrange(rng, 20, h - 20), r: rrange(rng, 10, 18) });
    }
    return;
  }
  if (type === 'airfield' || type === 'marina') return; // drawn as landmarks
  const cols = type === 'downtown' || type === 'casino' ? 2 : rint(rng, 1, 3);
  const rows = type === 'downtown' || type === 'casino' ? 2 : rint(rng, 1, 2);
  const cw = w / cols;
  const ch = h / rows;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (type === 'beachfront' && chance(rng, 0.35)) continue;
      const bw = cw * rrange(rng, 0.55, 0.82);
      const bh = ch * rrange(rng, 0.55, 0.82);
      const bx = x + c * cw + (cw - bw) / 2;
      const by = y + r * ch + (ch - bh) / 2;
      const tall = type === 'downtown' || type === 'casino';
      city.buildings.push({
        x: bx, y: by, w: bw, h: bh,
        hgt: tall ? rint(rng, 3, 7) : rint(rng, 1, 2),
        color: pick(rng, COLORS.building),
        type,
      });
    }
  }
  if (type === 'residential' || type === 'park') {
    for (let i = 0; i < 4; i++) {
      city.trees.push({ x: x + rrange(rng, 10, w - 10), y: y + rrange(rng, 10, h - 10), r: rrange(rng, 8, 14) });
    }
  }
}

// --- Queries the other modules use ------------------------------------------

export function onRoad(city, x, y) {
  const half = city.roadW / 2;
  for (const rx of city.roadsX) if (Math.abs(x - rx) <= half && y >= 0 && y <= WORLD.h) return true;
  for (const ry of city.roadsY) if (Math.abs(y - ry) <= half && x >= 0 && x <= WORLD.w) return true;
  return false;
}

// Nearest point on the road grid to (x, y) — traffic and spawning snap here.
export function nearestRoadPoint(city, x, y) {
  let best = null;
  let bestD = Infinity;
  for (const rx of city.roadsX) {
    const px = rx;
    const py = clamp(y, 0, WORLD.h);
    const d = (px - x) * (px - x) + (py - y) * (py - y);
    if (d < bestD) { bestD = d; best = { x: px, y: py, horizontal: false }; }
  }
  for (const ry of city.roadsY) {
    const px = clamp(x, 0, WORLD.w);
    const py = ry;
    const d = (px - x) * (px - x) + (py - y) * (py - y);
    if (d < bestD) { bestD = d; best = { x: px, y: py, horizontal: true }; }
  }
  return best;
}

export function isWater(city, x, y) {
  if (x >= WORLD.waterX) return true;
  if (x >= WORLD.sandX && y >= 1180 && y <= 1264 && x <= WORLD.sandX + 260) return false; // the pier
  return false;
}

export function isSand(city, x, y) {
  return x >= WORLD.sandX && x < WORLD.waterX;
}

// Push a circle out of every building it overlaps. Returns true on contact.
export function collideBuildings(city, body, r) {
  let hit = false;
  for (const b of city.buildings) {
    const cx = clamp(body.x, b.x, b.x + b.w);
    const cy = clamp(body.y, b.y, b.y + b.h);
    const dx = body.x - cx;
    const dy = body.y - cy;
    const d2 = dx * dx + dy * dy;
    if (d2 < r * r) {
      hit = true;
      const d = Math.sqrt(d2) || 0.001;
      const push = r - d;
      body.x += (dx / d) * push;
      body.y += (dy / d) * push;
    }
  }
  return hit;
}

export function districtAt(city, x, y) {
  if (x >= WORLD.sandX) return 'Beach';
  if (y < 700 && x > 2100) return 'Airfield';
  if (y < 700 && x > 1000) return 'Downtown';
  if (y > 1900 && x < 700) return 'Old Docks';
  if (y > 1900 && x > 2400) return 'Marina';
  if (x > 1900 && y > 1400 && y < 1900) return 'Stadium District';
  if (x > 2900) return 'Boardwalk';
  return 'Palmera Bay';
}
