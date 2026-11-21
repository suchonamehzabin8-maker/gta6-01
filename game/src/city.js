// Palmera Bay — the city itself. Generated once from a seed: a road grid, the
// blocks between it, and the districts and landmarks that make the map worth
// exploring. Nothing here touches the DOM; it is pure data, so Node can build
// the same city the browser does.
import { makeRng, clamp, dist } from './random.js';
import { WORLD, ROADS_V, ROADS_H, ROAD_HALF, BEACH_TOP, WATER_TOP, SEED } from './config.js';

// Where the special places sit. Fixed by design, not by chance, so missions
// and screenshots can rely on them.
export const LANDMARKS = {
  downtown: { x: 1500, y: 900, w: 700, h: 700 },
  park: { x: 700, y: 1500, w: 600, h: 420 },
  beach: { x: 0, y: BEACH_TOP, w: WORLD.w, h: WORLD.h - BEACH_TOP },
  boardwalk: { x: 400, y: 2260, w: 2800, h: 70 },
  pier: { x: 1800, y: 2380, w: 90, h: 200 },
  bayWheel: { x: 2620, y: 2290, r: 85 },
  marina: { x: 3000, y: 1850, w: 520, h: 380 },
  lighthouse: { x: 3400, y: 300, r: 34 },
  airfield: { x: 200, y: 200, w: 700, h: 520 },
  docks: { x: 150, y: 1500, w: 380, h: 560 },
  motel: { x: 560, y: 2050, w: 220, h: 120 },
  stadium: { x: 2200, y: 400, w: 520, h: 420 },
  casino: { x: 1900, y: 1200, w: 200, h: 140 },
  safehouse: { x: 3300, y: 2100 },
  bank: { x: 1700, y: 1000 },
};

const PALETTE = {
  tower: ['#7d8aa0', '#93a3b8', '#6b7c94', '#a8b4c6'],
  block: ['#c9a06a', '#b98d5f', '#d3b083', '#a87f52'],
  house: ['#e0b183', '#d99a6c', '#c98f66', '#e8c39a'],
  shop: ['#e07a5f', '#81b29a', '#f2cc8f', '#3d8bfd'],
};

function inRect(x, y, r) {
  return x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
}
function rectsOverlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

export function createCity(seed = SEED) {
  const rng = makeRng(seed);
  const buildings = [];
  const trees = [];
  const billboards = [];

  // Blocks are the cells between neighbouring roads. A building only goes in
  // when its whole footprint clears the reserved districts.
  const reserved = [
    LANDMARKS.park, LANDMARKS.airfield, LANDMARKS.docks, LANDMARKS.marina,
    LANDMARKS.stadium, LANDMARKS.motel,
    { x: 0, y: BEACH_TOP - 40, w: WORLD.w, h: WORLD.h - BEACH_TOP + 40 },
    { x: 2500, y: 2200, w: 260, h: 170 }, // Bay Wheel plaza
  ];
  const roadEdgesV = [60, ...ROADS_V, WORLD.w - 60];
  const roadEdgesH = [60, ...ROADS_H, WORLD.h - 60];

  for (let i = 0; i < roadEdgesV.length - 1; i++) {
    for (let j = 0; j < roadEdgesH.length - 1; j++) {
      const bx = roadEdgesV[i] + ROAD_HALF + 14;
      const by = roadEdgesH[j] + ROAD_HALF + 14;
      const bw = roadEdgesV[i + 1] - roadEdgesV[i] - 2 * (ROAD_HALF + 14);
      const bh = roadEdgesH[j + 1] - roadEdgesH[j] - 2 * (ROAD_HALF + 14);
      if (bw < 90 || bh < 90) continue;
      const cell = { x: bx, y: by, w: bw, h: bh };
      if (reserved.some(r => rectsOverlap(cell, r))) {
        // A reserved cell can still hold a few trees.
        if (rng.chance(0.6)) {
          trees.push({ x: bx + rng.range(30, bw - 30), y: by + rng.range(30, bh - 30) });
        }
        continue;
      }
      const downtown = inRect(bx + bw / 2, by + bh / 2, LANDMARKS.downtown);
      const count = downtown ? rng.int(1, 2) : rng.int(1, 3);
      for (let k = 0; k < count; k++) {
        const w = downtown ? rng.range(90, 150) : rng.range(60, 130);
        const h = downtown ? rng.range(90, 150) : rng.range(60, 120);
        const x = bx + rng.range(6, Math.max(7, bw - w - 6));
        const y = by + rng.range(6, Math.max(7, bh - h - 6));
        const b = { x, y, w, h, hgt: downtown ? rng.range(60, 170) : rng.range(14, 42) };
        if (buildings.some(o => rectsOverlap(o, { x: x - 8, y: y - 8, w: w + 16, h: h + 16 }))) continue;
        b.color = downtown ? rng.pick(PALETTE.tower) : rng.pick(PALETTE.block);
        b.roof = rng.pick(['#5b4a3a', '#6e5847', '#4a5568', '#7a6a55']);
        buildings.push(b);
      }
      if (rng.chance(0.5)) {
        trees.push({ x: bx + rng.range(20, bw - 20), y: by + rng.range(20, bh - 20) });
      }
    }
  }

  // Neon billboards along the main avenues.
  const boardSpots = [
    [700, 620], [1900, 620], [2700, 1020], [1100, 1420], [2300, 1820],
    [1500, 220], [3100, 620], [500, 1020],
  ];
  for (const [x, y] of boardSpots) {
    billboards.push({ x, y, color: rng.pick(['#ff5d8f', '#22d3ee', '#facc15', '#a78bfa']) });
  }

  // Palm rows down the beach road and around the park.
  const palms = [];
  for (let x = 420; x < 3300; x += 130) palms.push({ x: x + rng.range(-8, 8), y: 2290 });
  for (let i = 0; i < 26; i++) {
    palms.push({
      x: LANDMARKS.park.x + rng.range(20, LANDMARKS.park.w - 20),
      y: LANDMARKS.park.y + rng.range(20, LANDMARKS.park.h - 20),
    });
  }

  // The two garages, four stunt ramps, twelve sunset tokens, weapon stashes,
  // vendors and the race route — all fixed spots the design relies on.
  const garages = [
    { name: "Mara's Garage", x: 900, y: 1100, color: '#e07a5f' },
    { name: 'Sunset Spray', x: 2700, y: 1900, color: '#3d8bfd' },
  ];
  const ramps = [
    { x: 1200, y: 2350, angle: -Math.PI / 2, name: 'Beach Ramp' },
    { x: 400, y: 1800, angle: 0, name: 'Dock Ramp' },
    { x: 600, y: 500, angle: Math.PI / 2, name: 'Airfield Ramp' },
    { x: 2400, y: 650, angle: Math.PI, name: 'Stadium Ramp' },
  ];
  const tokenSpots = [
    [3400, 330], [500, 480], [1800, 2500], [2620, 2200], [1000, 1700],
    [3300, 2000], [700, 2100], [2300, 450], [1500, 1450], [2900, 1200],
    [400, 1500], [2100, 2350],
  ];
  const tokens = tokenSpots.map(([x, y], i) => ({ id: i, x, y, found: false }));
  const stashes = [
    { weapon: 'smg', x: 350, y: 1750, label: 'Docks stash' },
    { weapon: 'smg', x: 3200, y: 2000, label: 'Marina stash' },
    { weapon: 'smg', x: 500, y: 400, label: 'Airfield stash' },
    { weapon: 'shotgun', x: 2400, y: 650, label: 'Stadium stash' },
    { weapon: 'shotgun', x: 2000, y: 2320, label: 'Boardwalk stash' },
  ];
  const vendors = [
    { x: 800, y: 2290, goods: 'Tacos' },
    { x: 1400, y: 2290, goods: 'Ice cream' },
    { x: 2200, y: 2290, goods: 'Sunglasses' },
    { x: 2900, y: 2290, goods: 'Souvenirs' },
  ];
  // Nine race checkpoints: beach road east, then a downtown loop.
  const raceRoute = [
    { x: 700, y: 2250 }, { x: 1500, y: 2250 }, { x: 2300, y: 2250 },
    { x: 3100, y: 2250 }, { x: 3100, y: 1450 }, { x: 3100, y: 650 },
    { x: 2300, y: 650 }, { x: 1500, y: 650 }, { x: 700, y: 650 },
  ];

  return {
    seed, buildings, trees, palms, billboards,
    garages, ramps, tokens, stashes, vendors, raceRoute,
    spawn: { x: 1050, y: 1050 },
    motel: LANDMARKS.motel,
    safehouse: LANDMARKS.safehouse,
    bank: LANDMARKS.bank,
    stadium: LANDMARKS.stadium,
    pier: LANDMARKS.pier,
    bayWheel: LANDMARKS.bayWheel,
    lighthouse: LANDMARKS.lighthouse,
    marina: LANDMARKS.marina,
    airfield: LANDMARKS.airfield,
    docks: LANDMARKS.docks,
    park: LANDMARKS.park,
    downtown: LANDMARKS.downtown,
  };
}

// --- Queries the game uses every frame -------------------------------------

export function isOnRoad(city, x, y) {
  for (const rx of ROADS_V) if (Math.abs(x - rx) <= ROAD_HALF) return true;
  for (const ry of ROADS_H) if (Math.abs(y - ry) <= ROAD_HALF) return true;
  return false;
}

export function roadAxisAt(city, x, y) {
  // Returns 'v' or 'h' for the nearest road, or null off the grid.
  let best = null, bestD = Infinity;
  for (const rx of ROADS_V) {
    const d = Math.abs(x - rx);
    if (d < bestD) { bestD = d; best = 'v'; }
  }
  for (const ry of ROADS_H) {
    const d = Math.abs(y - ry);
    if (d < bestD) { bestD = d; best = 'h'; }
  }
  return bestD <= ROAD_HALF + 40 ? best : null;
}

export function nearestRoadPoint(city, x, y) {
  let bx = x, by = y, bd = Infinity;
  for (const rx of ROADS_V) {
    const d = Math.abs(x - rx);
    if (d < bd) { bd = d; bx = rx; by = y; }
  }
  for (const ry of ROADS_H) {
    const d = Math.abs(y - ry);
    if (d < bd) { bd = d; bx = x; by = ry; }
  }
  return { x: clamp(bx, 40, WORLD.w - 40), y: clamp(by, 40, WORLD.h - 40) };
}

export function buildingAt(city, x, y, pad = 0) {
  for (const b of city.buildings) {
    if (x >= b.x - pad && x <= b.x + b.w + pad && y >= b.y - pad && y <= b.y + b.h + pad) return b;
  }
  return null;
}

export function circleHitsBuilding(city, x, y, r) {
  for (const b of city.buildings) {
    const cx = clamp(x, b.x, b.x + b.w);
    const cy = clamp(y, b.y, b.y + b.h);
    if (dist(x, y, cx, cy) < r) return b;
  }
  return null;
}

export function inWater(x, y) { return y >= WATER_TOP; }
export function onBeach(x, y) { return y >= BEACH_TOP && y < WATER_TOP; }
export function inPark(city, x, y) { return inRect(x, y, city.park); }
