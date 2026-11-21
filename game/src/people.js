// People — pedestrians, joggers, vendors, foot police and Syndicate goons.
// Everyone walks the same way (a target, a speed, a little wobble); what
// differs is what they want when they get there.
import { clamp, dist, angleTo } from './random.js';
import { WORLD } from './config.js';
import { nearestRoadPoint, circleHitsBuilding } from './city.js';

const PED_COLORS = ['#e8b4b8', '#a8c8e8', '#f2cc8f', '#c9e4a8', '#e0a0d0', '#9fc6c0'];

export function makePed(city, rng, opts = {}) {
  const spot = nearestRoadPoint(city, rng.range(120, WORLD.w - 120), rng.range(120, WORLD.h - 120));
  return {
    kind: opts.kind || 'ped',
    x: spot.x + rng.range(-24, 24),
    y: spot.y + rng.range(-24, 24),
    angle: rng.range(0, Math.PI * 2),
    speed: opts.speed || rng.range(42, 70),
    color: rng.pick(PED_COLORS),
    tx: spot.x, ty: spot.y,
    wait: 0,
    hp: opts.hp || 40,
    state: 'walk',
    name: opts.name || null,
    fleeT: 0,
    taxi: false,
    fare: null,
  };
}

export function spawnPeds(city, rng, count = 34) {
  const peds = [];
  for (let i = 0; i < count; i++) peds.push(makePed(city, rng));
  return peds;
}

export function spawnJoggers(city, rng) {
  // Joggers stick to the beach road.
  const out = [];
  for (let i = 0; i < 6; i++) {
    const j = makePed(city, rng, { kind: 'jogger', speed: 150 });
    j.x = rng.range(500, 3200);
    j.y = 2250 + rng.range(-8, 8);
    j.tx = j.x + (rng.chance(0.5) ? 900 : -900);
    j.ty = 2250;
    out.push(j);
  }
  return out;
}

export function spawnGoons(city, rng) {
  // Four Syndicate goons waiting at the stadium for the Bayfront Brawl.
  const spots = [
    [2320, 520], [2480, 560], [2400, 700], [2560, 480],
  ];
  return spots.map(([x, y], i) => ({
    kind: 'goon', x, y, angle: 0, speed: 105, color: '#2f3542',
    tx: x, ty: y, wait: 0, hp: 90, state: 'idle',
    name: ['Rico', 'Vex', 'Tank', 'Smoke'][i], fleeT: 0, taxi: false, fare: null,
  }));
}

function pickWalkTarget(G, p) {
  const spot = nearestRoadPoint(G.city, p.x + (G.rng.next() - 0.5) * 700, p.y + (G.rng.next() - 0.5) * 700);
  p.tx = spot.x; p.ty = spot.y;
}

export function updatePeople(G, dt) {
  const p = G.player;
  for (const ped of G.peds) {
    if (ped.hp <= 0) continue;
    const dPlayer = dist(ped.x, ped.y, p.x, p.y);
    // Flee gunfire, wrecks and a fast car.
    const scared = G.combat.shotsFiredRecently > 0 && dPlayer < 320;
    if (scared) ped.fleeT = 1.6;
    if (ped.fleeT > 0) {
      ped.fleeT -= dt;
      const away = Math.atan2(ped.y - p.y, ped.x - p.x);
      ped.x += Math.cos(away) * ped.speed * 2.1 * dt;
      ped.y += Math.sin(away) * ped.speed * 2.1 * dt;
      ped.angle = away;
      continue;
    }
    if (ped.kind === 'goon' && G.missions.active === 10) {
      // Goons hunt the player during the Brawl.
      if (dPlayer < 520) {
        ped.state = 'chase';
        const a = angleTo(ped.x, ped.y, p.x, p.y);
        ped.angle = a;
        ped.x += Math.cos(a) * ped.speed * dt;
        ped.y += Math.sin(a) * ped.speed * dt;
        if (dPlayer < 30) {
          p.hp -= 14 * dt;
          if (G.rng.chance(dt * 2)) G.messages.push({ text: `${ped.name} lands a hit!`, t: 1.2, color: '#ff8a80' });
        }
        continue;
      }
      ped.state = 'idle';
    }
    if (ped.kind === 'jogger') {
      const a = angleTo(ped.x, ped.y, ped.tx, ped.ty);
      ped.angle = a;
      ped.x += Math.cos(a) * ped.speed * dt;
      ped.y += Math.sin(a) * ped.speed * dt;
      if (dist(ped.x, ped.y, ped.tx, ped.ty) < 30) {
        ped.tx = ped.x + (ped.tx > ped.x ? 900 : -900);
        ped.tx = clamp(ped.tx, 420, 3300);
      }
      continue;
    }
    // Ordinary walkers: stroll to the target, pause, pick another.
    if (ped.wait > 0) { ped.wait -= dt; continue; }
    const d = dist(ped.x, ped.y, ped.tx, ped.ty);
    if (d < 24) {
      if (G.rng.chance(0.4)) ped.wait = G.rng.range(1, 4);
      else pickWalkTarget(G, ped);
      continue;
    }
    const a = angleTo(ped.x, ped.y, ped.tx, ped.ty);
    ped.angle = a;
    const nx = ped.x + Math.cos(a) * ped.speed * dt;
    const ny = ped.y + Math.sin(a) * ped.speed * dt;
    if (!circleHitsBuilding(G.city, nx, ny, 10)) {
      ped.x = nx; ped.y = ny;
    } else {
      pickWalkTarget(G, ped);
    }
    ped.x = clamp(ped.x, 20, WORLD.w - 20);
    ped.y = clamp(ped.y, 20, WORLD.h - 20);
  }
  // The dead leave the street.
  G.peds = G.peds.filter(ped => ped.hp > 0);
}

// Foot police: walk a beat, chase the player when the heat is up, and arrest
// on contact. They are people too, so they share the update above for walking.
export function spawnFootCops(city, rng, count = 4) {
  const cops = [];
  for (let i = 0; i < count; i++) {
    const c = makePed(city, rng, { kind: 'cop', speed: 120, hp: 60 });
    c.color = '#1e3a5f';
    cops.push(c);
  }
  return cops;
}

export function updateFootCops(G, dt) {
  const p = G.player;
  for (const cop of G.cops) {
    if (cop.hp <= 0) continue;
    const d = dist(cop.x, cop.y, p.x, p.y);
    if (G.wanted.stars >= 1 && d < 420) {
      const a = angleTo(cop.x, cop.y, p.x, p.y);
      cop.angle = a;
      const sp = d < 60 ? 0 : cop.speed;
      cop.x += Math.cos(a) * sp * dt;
      cop.y += Math.sin(a) * sp * dt;
      if (d < 26 && p.onFoot) {
        // Arrest: the run ends busted.
        G.mode = 'busted';
        G.audio.badJingle();
      }
    } else if (cop.wait > 0) {
      cop.wait -= dt;
    } else {
      const dd = dist(cop.x, cop.y, cop.tx, cop.ty);
      if (dd < 24) {
        if (G.rng.chance(0.5)) cop.wait = G.rng.range(2, 5);
        else pickWalkTarget(G, cop);
      } else {
        const a = angleTo(cop.x, cop.y, cop.tx, cop.ty);
        cop.angle = a;
        cop.x += Math.cos(a) * cop.speed * 0.6 * dt;
        cop.y += Math.sin(a) * cop.speed * 0.6 * dt;
      }
    }
  }
  G.cops = G.cops.filter(c => c.hp > 0);
}
