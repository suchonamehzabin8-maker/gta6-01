// Palmera Bay: a sun-soaked coastal city, built from a seed. Avenues run
// north-south, streets east-west, and the blocks between them hold buildings,
// a park, a beach and a pier. East of downtown sits the Marina District —
// boat slips, a lighthouse and the Golden Palm Casino — and the Bay Stadium
// anchors the south-east. Nothing here is a real place: every street,
// district and name is invented for this game.
import { WORLD, PALETTE } from './config.js';
import { mulberry32, pick, range, rangeInt, chance } from './random.js';

export const ROAD_W = 96;
export const AVENUES = [300, 700, 1100, 1500, 1900, 2300, 2700, 3100];
export const STREETS = [250, 550, 850, 1150, 1450, 1750, 2050];
export const BEACH_TOP = 2250; // sand starts here; the sea starts at SEA_TOP
export const SEA_TOP = 2420;

export const PLACES = {
  garage: { x: 560, y: 430, name: "Mara's Garage" },
  pier: { x: 1800, y: 2510, name: 'Palmera Pier' },
  docks: { x: 260, y: 1920, name: 'Old Docks' },
  bank: { x: 1600, y: 1000, name: 'Bay Trust Bank' },
  safehouse: { x: 2920, y: 480, name: 'Safehouse' },
  shop1: { x: 980, y: 700, name: 'Sunrise Mart' },
  shop2: { x: 2100, y: 1300, name: 'Palm Liquors' },
  shop3: { x: 1300, y: 1600, name: 'Neon Nails' },
  airport: { x: 3350, y: 900, name: 'Palmera Airfield' },
  park: { x: 2100, y: 700, name: 'Coral Park' },
  motel: { x: 700, y: 1900, name: 'Flamingo Motel' },
  marina: { x: 3240, y: 2330, name: 'Marina District' },
  casino: { x: 1900, y: 1000, name: 'Golden Palm Casino' },
  stadium: { x: 3050, y: 1900, name: 'Bay Stadium' },
  lighthouse: { x: 3450, y: 2520, name: 'Palmera Lighthouse' },
  spray: { x: 900, y: 1750, name: 'Sunset Spray' },
  boardwalk: { x: 2400, y: 2400, name: 'Palmera Boardwalk' },
};

// Landmarks the renderer draws specially and the minimap marks with a diamond.
export const LANDMARKS = [
  { x: 3450, y: 2520, name: 'Palmera Lighthouse', kind: 'lighthouse' },
  { x: 3050, y: 1900, name: 'Bay Stadium', kind: 'stadium' },
  { x: 3240, y: 2330, name: 'Marina District', kind: 'marina' },
  { x: 1900, y: 1000, name: 'Golden Palm Casino', kind: 'casino' },
  { x: 1800, y: 2510, name: 'Palmera Pier', kind: 'pier' },
  { x: 2400, y: 2400, name: 'Palmera Boardwalk', kind: 'boardwalk' },
  { x: 2620, y: 2400, name: 'Bay Wheel', kind: 'wheel' },
];

// True when a point is on a road: an avenue, a street, or the beach road.
export function isRoad(x, y) {
  if (y >= BEACH_TOP) return y < SEA_TOP; // the beach road runs along the sand
  for (const avenue of AVENUES) {
    if (Math.abs(x - avenue) <= ROAD_W / 2) return true;
  }
  for (const street of STREETS) {
    if (Math.abs(y - street) <= ROAD_W / 2) return true;
  }
  return false;
}

// True when a point sits where an avenue crosses a street.
export function isIntersection(x, y) {
  if (y >= BEACH_TOP) return false;
  const onAvenue = AVENUES.some((avenue) => Math.abs(x - avenue) <= ROAD_W / 2);
  const onStreet = STREETS.some((street) => Math.abs(y - street) <= ROAD_W / 2);
  return onAvenue && onStreet;
}

// The nearest point on a road centreline (avenues, streets, or the beach
// road at y=2330). Traffic and police use it to find their way back.
export function nearestRoadPoint(x, y) {
  let best = null;
  let bestD = Infinity;
  const consider = (px, py) => {
    const d = (px - x) * (px - x) + (py - y) * (py - y);
    if (d < bestD) {
      bestD = d;
      best = { x: px, y: py };
    }
  };
  for (const avenue of AVENUES) consider(avenue, Math.min(Math.max(y, 100), 2150));
  for (const street of STREETS) consider(Math.min(Math.max(x, 150), 3450), street);
  consider(Math.min(Math.max(x, 150), 3450), 2330);
  return best;
}

// A road point a little ahead of the player, for roadblocks and chases.
export function roadPointAhead(x, y, angle, distance) {
  const tx = Math.min(Math.max(x + Math.cos(angle) * distance, 150), 3450);
  const ty = Math.min(Math.max(y + Math.sin(angle) * distance, 100), 2330);
  return nearestRoadPoint(tx, ty);
}

export function buildCity(seed) {
  const random = mulberry32(seed);
  const buildings = [];
  const palms = [];
  const parks = [];
  const lots = [];
  const boats = [];
  const lamps = [];
  const billboards = [];

  // Walk the blocks between consecutive avenues and streets.
  const xs = [120, ...AVENUES, 3300];
  const ys = [100, ...STREETS, 2150];
  for (let bi = 0; bi < xs.length - 1; bi += 1) {
    for (let bj = 0; bj < ys.length - 1; bj += 1) {
      const x0 = xs[bi] + ROAD_W / 2 + 14;
      const x1 = xs[bi + 1] - ROAD_W / 2 - 14;
      const y0 = ys[bj] + ROAD_W / 2 + 14;
      const y1 = ys[bj + 1] - ROAD_W / 2 - 14;
      const cx = (x0 + x1) / 2;
      const cy = (y0 + y1) / 2;
      const downtown = cx > 1200 && cx < 2300 && cy > 650 && cy < 1350;
      const marinaBlock = cx > 2900 && cy > 1750 && cy < 2150;
      // The Bay Stadium takes one whole block: an oval arena, no buildings.
      if (Math.abs(cx - PLACES.stadium.x) < 220 && Math.abs(cy - PLACES.stadium.y) < 220) continue;
      // Coral Park takes one whole block and stays green.
      if (Math.abs(cx - PLACES.park.x) < 200 && Math.abs(cy - PLACES.park.y) < 200) {
        parks.push({ x: x0, y: y0, w: x1 - x0, h: y1 - y0 });
        for (let i = 0; i < 14; i += 1) {
          palms.push({ x: range(random, x0 + 20, x1 - 20), y: range(random, y0 + 20, y1 - 20) });
        }
        continue;
      }
      // Marina blocks hold low warehouses and boat slips, not towers.
      if (marinaBlock) {
        for (let i = 0; i < 2; i += 1) {
          const w = range(random, 90, 150);
          const h = range(random, 60, 100);
          buildings.push({
            x: range(random, x0, Math.max(x0 + 1, x1 - w)),
            y: range(random, y0, Math.max(y0 + 1, y1 - h)),
            w, h,
            color: pick(random, ['#7a8a99', '#9a8a7a', '#6b7c93']),
            tall: false,
            roof: pick(random, ['#5a5148', '#6b5d4f', '#7a6a58']),
          });
        }
        continue;
      }
      if (chance(random, 0.14)) {
        // A parking lot instead of buildings.
        lots.push({ x: x0, y: y0, w: x1 - x0, h: y1 - y0 });
        continue;
      }
      const n = downtown ? rangeInt(random, 1, 2) : rangeInt(random, 2, 4);
      for (let i = 0; i < n; i += 1) {
        const w = downtown ? range(random, 110, 190) : range(random, 70, 150);
        const h = downtown ? range(random, 110, 190) : range(random, 60, 120);
        const bx = range(random, x0, Math.max(x0 + 1, x1 - w));
        const by = range(random, y0, Math.max(y0 + 1, y1 - h));
        buildings.push({
          x: bx, y: by, w, h,
          color: downtown ? pick(random, PALETTE.downtown) : pick(random, PALETTE.building),
          tall: downtown,
          roof: pick(random, ['#5a5148', '#6b5d4f', '#7a6a58', '#4a5a6b']),
          casino: Math.abs(bx + w / 2 - PLACES.casino.x) < 130 && Math.abs(by + h / 2 - PLACES.casino.y) < 130,
        });
      }
    }
  }
  // Palms along the beach road and the avenues.
  for (let x = 180; x < WORLD.width - 100; x += 130) {
    palms.push({ x: x + range(random, -20, 20), y: 2280 + range(random, -8, 8) });
  }
  for (const avenue of AVENUES) {
    for (let y = 300; y < 2100; y += 420) {
      if (chance(random, 0.5)) palms.push({ x: avenue + ROAD_W / 2 + 22, y });
    }
  }
  // Marina boats: little hulls moored along the slips east of the beach road.
  for (let i = 0; i < 9; i += 1) {
    boats.push({
      x: 3060 + i * 42,
      y: 2470 + (i % 2) * 46,
      angle: Math.PI / 2 + range(random, -0.15, 0.15),
      color: pick(random, ['#e8e8e8', '#f39c12', '#4a90d9', '#d64545']),
    });
  }
  // Big neon billboards over the beach road: the bay advertising itself.
  const boardTexts = ['PALMERA BAY', 'GOLDEN PALM', 'SUNSET RUN', 'BAY STADIUM'];
  for (let i = 0; i < 4; i += 1) {
    billboards.push({
      x: 700 + i * 700,
      y: 2240,
      text: boardTexts[i],
      color: pick(random, ['#ff5da2', '#f2c94c', '#4fc3f7', '#58b368']),
    });
  }
  // Streetlamps at every intersection — they glow once dusk falls.
  for (const avenue of AVENUES) {
    for (const street of STREETS) lamps.push({ x: avenue + ROAD_W / 2 + 8, y: street - ROAD_W / 2 - 8 });
  }
  for (let x = 300; x < WORLD.width - 100; x += 320) lamps.push({ x, y: 2330 - ROAD_W / 2 - 8 });
  // The boardwalk: a row of little seaside shops on the sand's edge, each
  // with a striped awning, facing the sea. They sit just north of the
  // beach road, so the road itself stays clear.
  const awnings = ['#d64545', '#f39c12', '#4a90d9', '#8e44ad', '#3d9970', '#e67e22'];
  for (let i = 0; i < 6; i += 1) {
    buildings.push({
      x: 2080 + i * 135,
      y: 2190,
      w: 96,
      h: 40,
      color: pick(random, ['#f5e6c8', '#e8d5a3', '#dfe8f0']),
      tall: false,
      roof: '#8a7a5a',
      boardwalk: true,
      awning: awnings[i % awnings.length],
    });
  }
  // The pier: a wooden walkway out over the sea.
  const pier = { x: 1760, y: SEA_TOP - 40, w: 80, h: 190 };
  return {
    buildings, palms, parks, lots, pier, boats, lamps, billboards, seed,
    // The Bay Wheel: a ferris wheel on the sand by the boardwalk. The
    // renderer turns it slowly, and the minimap marks it like a landmark.
    wheel: { x: 2620, y: 2400, radius: 64, angle: 0 },
  };
}

// Circle (a player or a car centre) against building rectangles.
// Returns the building hit, or null.
export function hitBuilding(city, x, y, r) {
  for (const b of city.buildings) {
    if (x + r > b.x && x - r < b.x + b.w && y + r > b.y && y - r < b.y + b.h) return b;
  }
  return null;
}

// Push a circle out of any building it overlaps (axis-separated, so sliding
// along a wall works instead of sticking).
export function resolveBuildings(city, pos, r) {
  for (const b of city.buildings) {
    const cx = Math.min(Math.max(pos.x, b.x), b.x + b.w);
    const cy = Math.min(Math.max(pos.y, b.y), b.y + b.h);
    const dx = pos.x - cx;
    const dy = pos.y - cy;
    const d2 = dx * dx + dy * dy;
    if (d2 < r * r && d2 > 0.0001) {
      const d = Math.sqrt(d2);
      pos.x = cx + (dx / d) * r;
      pos.y = cy + (dy / d) * r;
    } else if (d2 <= 0.0001) {
      pos.x = b.x - r - 1; // centre inside a building: shove it out the west side
    }
  }
}

export function clampWorld(pos, r) {
  pos.x = Math.min(Math.max(pos.x, r), WORLD.width - r);
  pos.y = Math.min(Math.max(pos.y, r), WORLD.height - r);
}
