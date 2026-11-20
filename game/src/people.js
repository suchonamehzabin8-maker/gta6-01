// Pedestrians and police on foot. Peds stroll the sidewalks, cross the
// street at intersections, flag down the player's taxi, and run when they
// hear gunfire or see a car coming at them too fast. Cops on foot chase the
// player when the wanted level is up and try to arrest them up close.
import { WORLD } from './config.js';
import { pick, range, chance } from './random.js';
import { isRoad, isIntersection, nearestRoadPoint, resolveBuildings, clampWorld } from './city.js';

const PED_NAMES = ['Rosa', 'Kenny', 'Priya', 'Marco', 'Lena', 'Tomas', 'Aisha', 'Ben', 'Cleo', 'Hank', 'Nina', 'Omar'];
const PED_COLORS = ['#e74c3c', '#3498db', '#f1c40f', '#1abc9c', '#e67e22', '#9b59b6', '#ecf0f1', '#fd79a8', '#00cec9', '#fdcb6e'];

export function makePed(x, y, random) {
  return {
    x, y,
    angle: range(random, 0, Math.PI * 2),
    speed: range(random, 28, 52),
    name: pick(random, PED_NAMES),
    color: pick(random, PED_COLORS),
    kind: 'ped',
    role: 'stroll', // 'stroll' | 'jogger' | 'vendor'
    flee: 0,
    wait: range(random, 0, 3),
    taxi: chance(random, 0.25),
    dead: false,
    panic: 0,
    crossing: false,
    goal: null,
    hp: 1,
  };
}

// A jogger: fast, on the beach road, running laps of the bay front.
// Joggers never hail taxis and never wait — they are always moving.
export function makeJogger(x, y, random) {
  const ped = makePed(x, y, random);
  ped.role = 'jogger';
  ped.speed = range(random, 110, 135);
  ped.wait = 0;
  ped.taxi = false;
  ped.goal = { x: x < 1800 ? 3400 : 200, y: 2330 };
  return ped;
}

// A street vendor: stands at a stall all day, selling whatever the bay
// is buying. Vendors never stroll and never hail taxis.
export function makeVendor(x, y, random) {
  const ped = makePed(x, y, random);
  ped.role = 'vendor';
  ped.speed = 0;
  ped.wait = 999;
  ped.taxi = false;
  return ped;
}

export function spawnPeds(random, count) {
  const peds = [];
  for (let i = 0; i < count; i += 1) {
    const x = range(random, 150, WORLD.width - 150);
    const y = range(random, 150, 2350);
    peds.push(makePed(x, y, random));
  }
  // Joggers on the beach road, both directions.
  for (let i = 0; i < 6; i += 1) {
    peds.push(makeJogger(range(random, 200, 3400), 2330 + range(random, -20, 20), random));
  }
  // Vendors at their stalls: the pier, the boardwalk and the park gate.
  const stalls = [
    { x: 1750, y: 2470 },
    { x: 2400, y: 2380 },
    { x: 2100, y: 560 },
  ];
  for (const stall of stalls) peds.push(makeVendor(stall.x, stall.y, random));
  return peds;
}

// A Syndicate goon: the Bayfront Brawl's muscle. Three hits to drop, fast
// on foot, and they punch hard up close. They only exist while that
// mission's fight step is running.
export function makeGoon(x, y, random) {
  return {
    x, y,
    angle: range(random, 0, Math.PI * 2),
    speed: 205,
    name: pick(random, ['Vic', 'Rocco', 'Sal', 'Big Lou', 'Tino', 'Fats']),
    color: '#3a3f4a',
    kind: 'goon',
    dead: false,
    hp: 3,
    punchCooldown: 0,
  };
}

export function spawnGoons(x, y, count, random) {
  const goons = [];
  for (let i = 0; i < count; i += 1) {
    goons.push(makeGoon(x + range(random, -90, 90), y + range(random, -70, 70), random));
  }
  return goons;
}

// Goons chase the player and punch when they get close. `onHit` is called
// with the damage when a punch lands, so the main loop owns the hurt.
export function updateGoons(goons, dt, player, city, onHit) {
  for (const goon of goons) {
    if (goon.dead) continue;
    if (goon.punchCooldown > 0) goon.punchCooldown -= dt;
    const d = Math.hypot(player.x - goon.x, player.y - goon.y);
    goon.angle = Math.atan2(player.y - goon.y, player.x - goon.x);
    if (d > 36) {
      goon.x += Math.cos(goon.angle) * goon.speed * dt;
      goon.y += Math.sin(goon.angle) * goon.speed * dt;
    } else if (goon.punchCooldown <= 0) {
      goon.punchCooldown = 1.1;
      if (onHit) onHit(8);
    }
    resolveBuildings(city, goon, 12);
    clampWorld(goon, 14);
  }
}

export function makeCop(x, y) {
  return { x, y, angle: 0, speed: 235, kind: 'cop', arrest: 0, dead: false, hp: 2 };
}

// Pick a new place to stroll to: a point on a sidewalk, usually across the
// street, so the ped walks to an intersection and crosses there.
function pickStrollGoal(ped, random) {
  const onAvenue = chance(random, 0.5);
  const dir = chance(random, 0.5) ? 1 : -1;
  if (onAvenue) {
    const avenue = pick(random, [300, 700, 1100, 1500, 1900, 2300, 2700, 3100]);
    return { x: avenue + dir * 62, y: Math.min(Math.max(ped.y + range(random, -400, 400), 150), 2100) };
  }
  const street = pick(random, [250, 550, 850, 1150, 1450, 1750, 2050]);
  return { x: Math.min(Math.max(ped.x + range(random, -400, 400), 150), 3450), y: street + dir * 62 };
}

export function updatePeds(peds, dt, random, city, danger, cars) {
  for (const ped of peds) {
    if (ped.dead) continue;
    if (ped.panic > 0) ped.panic -= dt;
    // Gunfire nearby sends peds running away from the shots.
    if (danger && Math.hypot(ped.x - danger.x, ped.y - danger.y) < 260) {
      ped.panic = 2.5;
      ped.angle = Math.atan2(ped.y - danger.y, ped.x - danger.x);
    }
    // A car barrelling at a ped on the road makes them sprint for the sidewalk.
    if (cars && ped.panic <= 0) {
      for (const car of cars) {
        if (Math.abs(car.speed) < 120) continue;
        const dx = ped.x - car.x;
        const dy = ped.y - car.y;
        const ahead = dx * Math.cos(car.angle) + dy * Math.sin(car.angle);
        const side = Math.abs(-dx * Math.sin(car.angle) + dy * Math.cos(car.angle));
        if (ahead > 0 && ahead < 130 && side < 40) {
          ped.panic = 1.5;
          ped.angle = Math.atan2(dy, dx);
          break;
        }
      }
    }
    let speed = ped.speed;
    if (ped.role === 'vendor' && ped.panic <= 0) {
      // A vendor stands at the stall all day (gunfire still scares them
      // off — the panic path above handles that).
      continue;
    }
    if (ped.role === 'jogger' && ped.panic <= 0) {
      // Joggers run laps of the beach road, turning at either end.
      if (!ped.goal) ped.goal = { x: ped.x < 1800 ? 3400 : 200, y: 2330 };
      ped.angle = Math.atan2(ped.goal.y - ped.y, ped.goal.x - ped.x);
      if (Math.hypot(ped.goal.x - ped.x, ped.goal.y - ped.y) < 40) {
        ped.goal = { x: ped.goal.x > 1800 ? 200 : 3400, y: 2330 };
      }
      ped.x += Math.cos(ped.angle) * ped.speed * dt;
      ped.y += Math.sin(ped.angle) * ped.speed * dt;
      clampWorld(ped, 14);
      continue;
    }
    if (ped.panic > 0) {
      speed = 165; // sprint
    } else if (ped.wait > 0) {
      ped.wait -= dt;
      continue;
    } else {
      // Strolling: head for the goal; when it is across the road, walk to
      // the nearest intersection first and cross there.
      if (!ped.goal) ped.goal = pickStrollGoal(ped, random);
      const gx = ped.goal.x;
      const gy = ped.goal.y;
      const acrossRoad = isRoad((ped.x + gx) / 2, (ped.y + gy) / 2) && !isRoad(ped.x, ped.y);
      if (acrossRoad && !ped.crossing) {
        const ix = nearestRoadPoint(ped.x, ped.y);
        // Walk to the intersection, then straight across.
        ped.angle = Math.atan2(ix.y - ped.y, ix.x - ped.x);
        if (Math.hypot(ix.x - ped.x, ix.y - ped.y) < 60) ped.crossing = true;
      } else {
        ped.angle = Math.atan2(gy - ped.y, gx - ped.x);
        if (Math.hypot(gx - ped.x, gy - ped.y) < 30) {
          ped.goal = null;
          ped.crossing = false;
          if (chance(random, 0.5)) ped.wait = range(random, 1, 4);
        }
      }
      if (chance(random, dt * 0.06)) {
        ped.goal = null;
        ped.wait = range(random, 1, 3);
      }
    }
    ped.x += Math.cos(ped.angle) * speed * dt;
    ped.y += Math.sin(ped.angle) * speed * dt;
    resolveBuildings(city, ped, 12);
    clampWorld(ped, 14);
  }
}

// A cop on foot runs at the player and, up close, starts an arrest timer.
export function updateCops(cops, dt, player, city) {
  let arrested = false;
  for (const cop of cops) {
    if (cop.dead) continue;
    const d = Math.hypot(player.x - cop.x, player.y - cop.y);
    cop.angle = Math.atan2(player.y - cop.y, player.x - cop.x);
    if (d > 34) {
      cop.x += Math.cos(cop.angle) * cop.speed * dt;
      cop.y += Math.sin(cop.angle) * cop.speed * dt;
      cop.arrest = 0;
    } else {
      cop.arrest += dt;
      if (cop.arrest > 1.6) arrested = true;
    }
    resolveBuildings(city, cop, 12);
    clampWorld(cop, 14);
  }
  return arrested;
}
