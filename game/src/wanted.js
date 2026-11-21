// Wanted — heat, stars, and the Palmera Bay PD's answer: cruisers that chase
// and ram, roadblocks at 3 stars, a helicopter and spike strips at 4 stars.
// Heat decays faster when nobody can see you.
import { clamp, dist, angleTo, angleDiff } from './random.js';
import { STAR_HEAT, HEAT, WORLD } from './config.js';
import { makeVehicle, damageVehicle } from './vehicles.js';
import { nearestRoadPoint, isOnRoad } from './city.js';

export function createWanted() {
  return {
    heat: 0,
    stars: 0,
    cruisers: [],
    heli: null,
    roadblocks: [],
    spikes: [],
    spawnT: 0,
    blockT: 0,
    spikeT: 0,
  };
}

export function starsForHeat(heat) {
  let s = 0;
  for (let i = 0; i < STAR_HEAT.length; i++) if (heat >= STAR_HEAT[i]) s = i + 1;
  return s;
}

export function addHeat(G, n) {
  G.wanted.heat = clamp(G.wanted.heat + n, 0, HEAT.max);
}

// Can any cop see the player? Distance to the nearest cruiser/cop/heli,
// plus a little help from being on foot in the open.
export function isHidden(G) {
  const p = G.player;
  let nearest = Infinity;
  for (const c of G.wanted.cruisers) nearest = Math.min(nearest, dist(p.x, p.y, c.x, c.y));
  for (const c of G.cops) nearest = Math.min(nearest, dist(p.x, p.y, c.x, c.y));
  if (G.wanted.heli) nearest = Math.min(nearest, dist(p.x, p.y, G.wanted.heli.x, G.wanted.heli.y));
  return nearest > 520;
}

function spawnCruiser(G) {
  const p = G.player;
  const spot = nearestRoadPoint(G.city, p.x + (G.rng.next() - 0.5) * 1400, p.y + (G.rng.next() - 0.5) * 1400);
  const c = makeVehicle('car', spot.x, spot.y, '#1e3a5f', G.rng);
  c.traffic = false;
  c.parked = false;
  c.cruiser = true;
  c.targetSpeed = 0;
  c.speed = 0;
  G.wanted.cruisers.push(c);
  return c;
}

function spawnRoadblock(G) {
  const p = G.player;
  const ahead = p.vehicle ? p.vehicle : p;
  const a = p.angle;
  const bx = clamp(ahead.x + Math.cos(a) * 420, 80, WORLD.w - 80);
  const by = clamp(ahead.y + Math.sin(a) * 420, 80, WORLD.h - 80);
  const spot = nearestRoadPoint(G.city, bx, by);
  G.wanted.roadblocks.push({ x: spot.x, y: spot.y, angle: a + Math.PI / 2, t: 40 });
  G.messages.push({ text: 'Roadblock ahead!', t: 2, color: '#ff8a80' });
}

function spawnSpikeStrip(G) {
  const p = G.player;
  const ahead = p.vehicle ? p.vehicle : p;
  const a = p.angle;
  const sx = clamp(ahead.x + Math.cos(a) * 300, 80, WORLD.w - 80);
  const sy = clamp(ahead.y + Math.sin(a) * 300, 80, WORLD.h - 80);
  const spot = nearestRoadPoint(G.city, sx, sy);
  G.wanted.spikes.push({ x: spot.x, y: spot.y, angle: a, t: 30 });
}

export function updateWanted(G, dt) {
  const w = G.wanted;
  const p = G.player;
  w.stars = starsForHeat(w.heat);
  // Heat decay: faster hidden, slower while driving in the open.
  const decay = isHidden(G) ? HEAT.decayHidden : (p.vehicle ? HEAT.decayDriving : HEAT.decayVisible);
  w.heat = Math.max(0, w.heat - decay * dt);
  w.stars = starsForHeat(w.heat);

  // Cruisers: up to stars + 1 on the road, chasing along it.
  const wantCruisers = w.stars === 0 ? 0 : Math.min(6, w.stars + 1);
  w.spawnT -= dt;
  if (w.cruisers.length < wantCruisers && w.spawnT <= 0) {
    spawnCruiser(G);
    w.spawnT = 2.5;
  }
  for (const c of w.cruisers) {
    if (c.wreck) continue;
    const target = p.vehicle ? p.vehicle : p;
    const a = angleTo(c.x, c.y, target.x, target.y);
    const d = dist(c.x, c.y, target.x, target.y);
    // Steer toward the player, but stay on roads where possible.
    const wantAngle = a;
    c.angle += clamp(angleDiff(c.angle, wantAngle), -2.4 * dt, 2.4 * dt);
    const maxSpd = 300 + w.stars * 55;
    c.speed = Math.min(maxSpd, c.speed + 320 * dt);
    const nx = c.x + Math.cos(c.angle) * c.speed * dt;
    const ny = c.y + Math.sin(c.angle) * c.speed * dt;
    if (G.city.buildings.some(b => nx >= b.x - 8 && nx <= b.x + b.w + 8 && ny >= b.y - 8 && ny <= b.y + b.h + 8)) {
      c.angle += Math.PI * 0.5 * dt * 4;
    } else {
      c.x = nx; c.y = ny;
    }
    c.x = clamp(c.x, 24, WORLD.w - 24);
    c.y = clamp(c.y, 24, WORLD.h - 24);
    // Ram the player's car.
    if (p.vehicle && d < 34) {
      damageVehicle(p.vehicle, 26 * dt);
      p.vehicle.speed *= 0.94;
      if (G.rng.chance(dt * 3)) G.audio.horn();
    }
    // Or run the player down on foot.
    if (p.onFoot && d < 24) {
      p.hp -= 20 * dt;
    }
  }
  w.cruisers = w.cruisers.filter(c => !c.wreck && dist(c.x, c.y, p.x, p.y) < 2600);

  // Roadblocks at 3 stars and up, refreshed on a timer.
  w.blockT -= dt;
  if (w.stars >= 3 && w.roadblocks.length < 2 && w.blockT <= 0) {
    spawnRoadblock(G);
    w.blockT = 14;
  }
  for (const rb of w.roadblocks) rb.t -= dt;
  w.roadblocks = w.roadblocks.filter(rb => rb.t > 0);

  // Spike strips at 4 stars: drive over one and the tyres are gone.
  w.spikeT -= dt;
  if (w.stars >= 4 && w.spikes.length < 3 && w.spikeT <= 0) {
    spawnSpikeStrip(G);
    w.spikeT = 10;
  }
  for (const s of w.spikes) s.t -= dt;
  w.spikes = w.spikes.filter(s => s.t > 0);
  if (p.vehicle && !p.vehicle.tyresPopped) {
    for (const s of w.spikes) {
      if (dist(p.vehicle.x, p.vehicle.y, s.x, s.y) < 30) {
        p.vehicle.tyresPopped = true;
        G.messages.push({ text: 'Tyres popped! Get to a garage.', t: 2.5, color: '#ff8a80' });
        G.audio.badJingle();
        break;
      }
    }
  }

  // The helicopter circles at 4 stars, keeping the player visible.
  if (w.stars >= 4 && !w.heli) {
    w.heli = { x: p.x, y: p.y - 300, angle: 0, t: 0 };
    G.messages.push({ text: 'Police helicopter overhead!', t: 2, color: '#ff8a80' });
  }
  if (w.heli) {
    if (w.stars < 4) w.heli = null;
    else {
      w.heli.t += dt;
      const a = w.heli.t * 0.55;
      w.heli.x = p.x + Math.cos(a) * 260;
      w.heli.y = p.y + Math.sin(a) * 260 - 60;
      w.heli.angle = a + Math.PI / 2;
    }
  }
  G.audio.setSiren(w.stars >= 1 && w.cruisers.length > 0);
  G.audio.setRotor(!!w.heli);
}
