// Palmera Bay — Sunset Run: the people of the bay.
// Pedestrians who stroll the sidewalks, joggers on the beach road, vendors
// at their stalls, foot cops who try to arrest you, and the Bay Syndicate's
// goons — four of them, three punches each, waiting at the stadium.

import { WORLD } from './config.js';
import { rrange, pick, chance, angleTo, clamp } from './random.js';
import { nearestRoadPoint } from './city.js';

let nextId = 1;

export function makePerson(x, y, kind, opts = {}) {
  return {
    id: nextId++,
    kind, // 'walker' | 'jogger' | 'vendor' | 'cop' | 'goon'
    x, y,
    angle: opts.angle ?? 0,
    speed: 0,
    hp: kind === 'goon' ? 3 : 1,
    state: 'idle', // idle | walk | flee | chase | attack | down
    stateT: 0,
    target: null,
    color: opts.color || '#e8e8e8',
    panic: 0,
  };
}

export function spawnCrowd(city, rng) {
  const people = [];
  for (let i = 0; i < 34; i++) {
    const p = nearestRoadPoint(city, rrange(rng, 150, WORLD.w - 400), rrange(rng, 150, WORLD.h - 150));
    const side = (rng() < 0.5 ? -1 : 1) * 44;
    const x = p.x + (p.horizontal ? 0 : side);
    const y = p.y + (p.horizontal ? side : 0);
    const w = makePerson(x, y, 'walker', { color: pick(rng, ['#e8e8e8', '#d9a05a', '#7aa8d9', '#c96a7a', '#8ad98a']) });
    w.state = 'walk';
    w.angle = p.horizontal ? (rng() < 0.5 ? 0 : Math.PI) : (rng() < 0.5 ? Math.PI / 2 : -Math.PI / 2);
    w.speed = rrange(rng, 40, 75);
    people.push(w);
  }
  // Joggers run the beach road.
  for (let i = 0; i < 6; i++) {
    const j = makePerson(3080, rrange(rng, 400, 2200), 'jogger', { color: pick(rng, ['#e85a5a', '#5ad9c9', '#f2e85a']) });
    j.state = 'walk';
    j.angle = rng() < 0.5 ? Math.PI / 2 : -Math.PI / 2;
    j.speed = rrange(rng, 130, 170);
    people.push(j);
  }
  // Vendors stand at their boardwalk stalls.
  for (const v of city.vendors) {
    const person = makePerson(v.x + 8, v.y + 30, 'vendor', { color: '#f2e8c9' });
    person.state = 'idle';
    people.push(person);
  }
  return people;
}

export function makeGoons(city) {
  const s = city.stadium;
  const goons = [];
  const spots = [
    [s.x + 90, s.y + 80], [s.x + 330, s.y + 80],
    [s.x + 90, s.y + 180], [s.x + 330, s.y + 180],
  ];
  for (const [x, y] of spots) {
    const g = makePerson(x, y, 'goon', { color: '#3a3a3a' });
    g.state = 'idle';
    goons.push(g);
  }
  return goons;
}

export function updatePeople(people, dt, city, player, danger, rng) {
  // danger: {x, y, radius} of the latest gunfire or wreck, or null.
  // rng is the game's seeded stream: pedestrian turns must be deterministic
  // so a staged screenshot scene re-takes identically.
  const rand = rng || Math.random;
  for (const p of people) {
    if (p.state === 'down') continue;
    p.stateT += dt;
    if (p.kind === 'vendor') continue; // vendors hold their stalls
    if (danger && p.kind !== 'cop' && p.kind !== 'goon') {
      const dx = p.x - danger.x;
      const dy = p.y - danger.y;
      const d2 = dx * dx + dy * dy;
      if (d2 < danger.radius * danger.radius) {
        p.state = 'flee';
        p.panic = 2.5;
        p.angle = Math.atan2(dy, dx);
      }
    }
    if (p.state === 'flee') {
      p.panic -= dt;
      p.speed = 260;
      if (p.panic <= 0) { p.state = 'walk'; p.speed = 55; }
    } else if (p.state === 'chase' && p.target) {
      const a = angleTo(p.x, p.y, p.target.x, p.target.y);
      p.angle = a;
      p.speed = p.kind === 'cop' ? 250 : 200;
      const d = Math.hypot(p.target.x - p.x, p.target.y - p.y);
      if (d < 30) p.state = 'attack';
    } else if (p.state === 'attack' && p.target) {
      p.speed = 0;
      const d = Math.hypot(p.target.x - p.x, p.target.y - p.y);
      if (d > 60) p.state = 'chase';
    } else if (p.state === 'walk') {
      // Stroll along, turning at intersections now and then.
      if (rand() < dt * 0.08) {
        p.angle += (rand() < 0.5 ? -1 : 1) * Math.PI / 2;
      }
    }
    if (p.speed > 0) {
      p.x += Math.cos(p.angle) * p.speed * dt;
      p.y += Math.sin(p.angle) * p.speed * dt;
      p.x = clamp(p.x, 40, WORLD.w - 40);
      p.y = clamp(p.y, 40, WORLD.h - 40);
    }
    // Joggers stay on the beach road.
    if (p.kind === 'jogger') {
      p.x = clamp(p.x, 3040, 3120);
      if (p.y < 380 || p.y > 2350) p.angle = -p.angle;
    }
  }
}

// A foot cop gives chase while the player is wanted and on foot nearby.
export function copsChase(people, player, stars) {
  for (const p of people) {
    if (p.kind !== 'cop' || p.state === 'down') continue;
    const d = Math.hypot(player.x - p.x, player.y - p.y);
    if (stars >= 1 && d < 520) {
      p.state = 'chase';
      p.target = player;
    } else if (p.state === 'chase' && d > 700) {
      p.state = 'walk';
      p.target = null;
    }
  }
}

export function spawnCop(city, x, y) {
  const cop = makePerson(x, y, 'cop', { color: '#2a4a8a' });
  cop.state = 'chase';
  return cop;
}

export function nearestPerson(people, x, y, maxD, kinds = null) {
  let best = null;
  let bestD = maxD * maxD;
  for (const p of people) {
    if (p.state === 'down') continue;
    if (kinds && !kinds.includes(p.kind)) continue;
    const dx = p.x - x;
    const dy = p.y - y;
    const d = dx * dx + dy * dy;
    if (d < bestD) { bestD = d; best = p; }
  }
  return best;
}
