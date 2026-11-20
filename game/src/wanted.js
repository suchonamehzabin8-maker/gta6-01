// Palmera Bay — Sunset Run: the wanted system.
// Heat rises with crime and falls when you lay low. Stars bring cruisers
// that chase and ram, foot cops that arrest, roadblocks at 3 stars, and at
// 4 stars a helicopter with a searchlight plus spike strips across the road.

import { WORLD, HEAT } from './config.js';
import { clamp, angleDiff, wrapAngle, rrange } from './random.js';
import { nearestRoadPoint } from './city.js';
import { makeCar, makeRoadblock, makeSpikeStrip } from './vehicles.js';

export function createWanted() {
  return {
    heat: 0,
    stars: 0,
    cruisers: [],
    heli: null, // {x, y, angle, lightAngle}
    roadblocks: [],
    strips: [],
    spawnT: 0,
    blockT: 0,
    stripT: 0,
  };
}

export function starsFor(heat) {
  let stars = 0;
  for (const t of HEAT.thresholds) if (heat >= t) stars++;
  return stars;
}

export function addHeat(w, amt) {
  w.heat = clamp(w.heat + amt, 0, HEAT.max);
  w.stars = starsFor(w.heat);
}

export function updateWanted(w, dt, city, player, vehicles, people, rng, onEvent) {
  // Heat fades; faster when no cruiser can see you.
  const seen = w.cruisers.some((c) => {
    const dx = c.x - player.x;
    const dy = c.y - player.y;
    return dx * dx + dy * dy < 420 * 420;
  }) || (w.heli && Math.hypot(w.heli.x - player.x, w.heli.y - player.y) < 520);
  const decay = seen ? HEAT.decayPerSec : HEAT.hiddenDecayPerSec;
  if (w.heat > 0) {
    w.heat = Math.max(0, w.heat - decay * dt);
    w.stars = starsFor(w.heat);
  }

  // Cruisers: one per star, up to 5, chasing along the roads.
  const want = w.stars;
  w.spawnT -= dt;
  while (w.cruisers.length < want && w.spawnT <= 0) {
    const p = nearestRoadPoint(city, player.x + rrange(rng, -500, 500), player.y + rrange(rng, -500, 500));
    const cruiser = makeCar(p.x, p.y, 0, { driver: 'police', color: '#222831', model: 'cruiser' });
    cruiser.police = true;
    cruiser.speed = 300;
    w.cruisers.push(cruiser);
    vehicles.push(cruiser);
    w.spawnT = 1.2;
  }
  // Despawn extras when the heat drops.
  while (w.cruisers.length > want) {
    const gone = w.cruisers.pop();
    const idx = vehicles.indexOf(gone);
    if (idx !== -1) vehicles.splice(idx, 1);
  }

  for (const c of w.cruisers) {
    if (c.wreck) continue;
    const targetAngle = Math.atan2(player.y - c.y, player.x - c.x);
    c.angle += clamp(angleDiff(c.angle, targetAngle), -2.4 * dt, 2.4 * dt);
    const wantSpeed = Math.min(520, 300 + w.stars * 40);
    c.speed += (wantSpeed - c.speed) * Math.min(1, dt * 0.8);
    c.x += Math.cos(c.angle) * c.speed * dt;
    c.y += Math.sin(c.angle) * c.speed * dt;
    c.x = clamp(c.x, 40, WORLD.w - 40);
    c.y = clamp(c.y, 40, WORLD.h - 40);
    // Ram the player: a hard hit hurts and shakes the car.
    const dx = player.x - c.x;
    const dy = player.y - c.y;
    const d = Math.hypot(dx, dy);
    if (d < 44 && player.vehicle) {
      onEvent({ type: 'rammed', by: c });
      c.speed *= 0.4;
      c.x -= Math.cos(c.angle) * 30;
      c.y -= Math.sin(c.angle) * 30;
    } else if (d < 34 && !player.vehicle) {
      onEvent({ type: 'arrested' });
    }
  }

  // Helicopter at 4 stars: circles overhead, searchlight sweeping.
  if (w.stars >= 4) {
    if (!w.heli) w.heli = { x: player.x, y: player.y - 200, angle: 0, light: 0 };
    const h = w.heli;
    h.angle += dt * 0.7;
    const tx = player.x + Math.cos(h.angle) * 180;
    const ty = player.y + Math.sin(h.angle) * 180 - 60;
    h.x += (tx - h.x) * Math.min(1, dt * 1.2);
    h.y += (ty - h.y) * Math.min(1, dt * 1.2);
    h.light = Math.atan2(player.y - h.y, player.x - h.x);
  } else {
    w.heli = null;
  }

  // Roadblocks at 3 stars: two cruisers parked across the road ahead.
  w.blockT -= dt;
  if (w.stars >= 3 && w.blockT <= 0 && w.roadblocks.length < 2) {
    const ahead = nearestRoadPoint(city, player.x + Math.cos(player.angle || 0) * 420, player.y + Math.sin(player.angle || 0) * 420);
    if (ahead) {
      w.roadblocks.push(makeRoadblock(ahead.x, ahead.y, ahead.horizontal ? 0 : Math.PI / 2));
      w.blockT = 14;
    }
  }
  if (w.stars < 3) w.roadblocks = [];

  // Spike strips at 4 stars: dropped across the road ahead of the player.
  w.stripT -= dt;
  if (w.stars >= 4 && w.stripT <= 0 && w.strips.length < 2) {
    const ahead = nearestRoadPoint(city, player.x + Math.cos(player.angle || 0) * 320, player.y + Math.sin(player.angle || 0) * 320);
    if (ahead) {
      w.strips.push(makeSpikeStrip(ahead.x, ahead.y, ahead.horizontal ? Math.PI / 2 : 0));
      w.stripT = 11;
    }
  }
  if (w.stars < 4) w.strips = [];
}

// A vehicle crossing a live strip loses its tyres.
export function checkSpikeStrips(w, vehicle) {
  if (!vehicle || vehicle.wreck) return false;
  for (const s of w.strips) {
    if (s.used) continue;
    const dx = vehicle.x - s.x;
    const dy = vehicle.y - s.y;
    const along = Math.abs(dx * Math.cos(s.angle) + dy * Math.sin(s.angle));
    const across = Math.abs(-dx * Math.sin(s.angle) + dy * Math.cos(s.angle));
    if (along < s.w / 2 && across < 26) {
      s.used = true;
      vehicle.tyres = 0;
      vehicle.speed *= 0.35;
      return true;
    }
  }
  return false;
}
