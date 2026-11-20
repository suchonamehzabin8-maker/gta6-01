// Palmera Bay — Sunset Run: cars, bikes and traffic.
// Arcade physics for the player's ride, road-following AI for the traffic,
// damage that turns a smashed car into a wreck nobody can drive.

import { WORLD, CAR, BIKE, TRAFFIC } from './config.js';
import { clamp, lerp, angleDiff, wrapAngle, rrange, pick } from './random.js';
import { collideBuildings, onRoad, nearestRoadPoint } from './city.js';

const CAR_COLORS = ['#d94f3d', '#3d7dd9', '#e8b93d', '#7ed67e', '#c9c9c9', '#8a5ad9', '#e87ab5', '#3dc9c9'];
const TAXI_COLOR = '#f2c230';

let nextId = 1;

export function makeCar(x, y, angle, opts = {}) {
  return {
    id: nextId++,
    kind: opts.kind || 'car',
    x, y, angle,
    speed: 0,
    steer: 0,
    color: opts.color || CAR_COLORS[0],
    health: 100,
    wreck: false,
    driver: opts.driver || null, // 'player' | 'traffic' | 'parked' | null
    tyres: 4,
    wheelie: 0,
    lean: 0,
    route: null,
    stopped: 0,
    model: opts.model || 'sedan',
  };
}

export function makeBike(x, y, angle, opts = {}) {
  const bike = makeCar(x, y, angle, { ...opts, kind: 'bike' });
  bike.color = opts.color || '#e83d3d';
  return bike;
}

// Parked cars dotted along the roads, plus moving traffic.
export function spawnWorldVehicles(city, rng) {
  const list = [];
  for (let i = 0; i < 14; i++) {
    const p = nearestRoadPoint(city, rrange(rng, 200, WORLD.w - 300), rrange(rng, 200, WORLD.h - 200));
    const along = p.horizontal ? 0 : Math.PI / 2;
    const side = (rng() < 0.5 ? -1 : 1) * 26;
    const x = p.x + (p.horizontal ? 0 : side);
    const y = p.y + (p.horizontal ? side : 0);
    list.push(makeCar(x, y, along + (rng() < 0.5 ? 0 : Math.PI), { driver: 'parked', color: pick(rng, CAR_COLORS) }));
  }
  for (let i = 0; i < TRAFFIC.count; i++) {
    list.push(spawnTrafficCar(city, rng));
  }
  // A taxi waiting at the first stand.
  const stand = city.taxiStands[0];
  const taxi = makeCar(stand.x + 40, stand.y, 0, { driver: 'parked', color: TAXI_COLOR, model: 'taxi' });
  taxi.taxi = true;
  list.push(taxi);
  // Two bikes parked by the boardwalk.
  list.push(makeBike(3200, 700, 0, { driver: 'parked' }));
  list.push(makeBike(3200, 760, 0, { driver: 'parked' }));
  return list;
}

export function spawnTrafficCar(city, rng) {
  const p = nearestRoadPoint(city, rrange(rng, 200, WORLD.w - 300), rrange(rng, 200, WORLD.h - 200));
  const car = makeCar(p.x, p.y, p.horizontal ? (rng() < 0.5 ? 0 : Math.PI) : (rng() < 0.5 ? Math.PI / 2 : -Math.PI / 2), {
    driver: 'traffic',
    color: pick(rng, CAR_COLORS),
  });
  car.route = { horizontal: p.horizontal, dir: rng() < 0.5 ? 1 : -1 };
  car.speed = rrange(rng, 110, 170);
  return car;
}

// --- Player driving ----------------------------------------------------------

export function driveVehicle(v, input, dt, city, weather, handbrake) {
  if (v.wreck) return;
  const grip = weather ? (1 - 0.28 * weather.intensity) : 1;
  const bike = v.kind === 'bike';
  const tune = bike ? BIKE : CAR;
  const maxSpeed = (v.tyres < 4 ? tune.maxSpeed * 0.45 : tune.maxSpeed) * grip;
  const accel = tune.accel * grip;
  if (input.up) v.speed += accel * dt;
  if (input.down) v.speed -= (v.speed > 0 ? CAR.brake : 320) * dt;
  if (!input.up && !input.down) v.speed -= Math.sign(v.speed) * 180 * dt;
  v.speed = clamp(v.speed, -tune.maxReverse, maxSpeed);
  if (Math.abs(v.speed) < 4 && !input.up && !input.down) v.speed = 0;

  const steerInput = (input.left ? -1 : 0) + (input.right ? 1 : 0);
  const steerAuthority = clamp(Math.abs(v.speed) / 120, 0, 1) * (v.speed < 0 ? -1 : 1);
  const gripNow = handbrake ? CAR.handbrakeGrip : CAR.grip;
  v.angle += steerInput * tune.turnRate * steerAuthority * dt * gripNow;
  if (handbrake && Math.abs(v.speed) > 200) {
    v.angle += steerInput * 1.4 * dt;
    v.speed *= 1 - 0.9 * dt;
  }
  const nx = v.x + Math.cos(v.angle) * v.speed * dt;
  const ny = v.y + Math.sin(v.angle) * v.speed * dt;
  const before = { x: v.x, y: v.y };
  v.x = clamp(nx, 30, WORLD.w - 30);
  v.y = clamp(ny, 30, WORLD.h - 30);
  if (collideBuildings(city, v, bike ? 16 : 26)) {
    const impact = Math.abs(v.speed);
    if (impact > 240) {
      damageVehicle(v, impact * 0.06);
      v.speed *= -0.25;
      if (bike && impact > BIKE.throwOffSpeed) v.thrownOff = true;
    } else {
      v.speed *= 0.4;
    }
    if (v.x === before.x && v.y === before.y) { /* fully blocked */ }
  }
  // Water is a wall for cars.
  if (v.x > 3330) { v.x = 3330; v.speed *= 0.3; }
  if (bike) {
    const targetLean = clamp(steerInput * Math.abs(v.speed) / 500, -0.5, 0.5);
    v.lean = lerp(v.lean, targetLean, dt * 6);
    v.wheelie = (input.up && Math.abs(v.speed) > 60 && Math.abs(v.speed) < 200) ? 1 : Math.max(0, v.wheelie - dt * 2);
  }
}

export function damageVehicle(v, amt) {
  if (v.wreck) return;
  v.health -= amt;
  if (v.health <= 0) {
    v.health = 0;
    v.wreck = true;
    v.speed = 0;
  }
}

// --- Traffic AI ---------------------------------------------------------------

export function updateTrafficCar(v, dt, city, vehicles, rng) {
  if (v.wreck || v.driver !== 'traffic') return;
  const wet = 0.9;
  const cruise = TRAFFIC.cruiseSpeed * wet;
  // Slow down for the car ahead on the same road.
  let blocked = false;
  for (const o of vehicles) {
    if (o === v || o.wreck) continue;
    const dx = o.x - v.x;
    const dy = o.y - v.y;
    const ahead = dx * Math.cos(v.angle) + dy * Math.sin(v.angle);
    const side = Math.abs(-dx * Math.sin(v.angle) + dy * Math.cos(v.angle));
    if (ahead > 0 && ahead < TRAFFIC.minGap && side < 30) { blocked = true; break; }
  }
  const target = blocked ? 0 : cruise;
  v.speed += (target - v.speed) * Math.min(1, dt * 1.5);
  if (blocked) {
    v.blockedT = (v.blockedT || 0) + dt;
    // Stuck behind something that never moves (a parked car, a wreck):
    // turn around instead of waiting forever.
    if (v.blockedT > 3) {
      v.angle = wrapAngle(v.angle + Math.PI);
      v.route.dir *= -1;
      v.blockedT = 0;
    }
  } else {
    v.blockedT = 0;
  }
  v.x += Math.cos(v.angle) * v.speed * dt;
  v.y += Math.sin(v.angle) * v.speed * dt;
  // At an intersection, sometimes turn onto the cross road.
  const nearX = city.roadsX.find((rx) => Math.abs(v.x - rx) < 8);
  const nearY = city.roadsY.find((ry) => Math.abs(v.y - ry) < 8);
  if (v.route.horizontal && nearX !== undefined && rng() < 0.01) {
    v.route = { horizontal: false, dir: rng() < 0.5 ? 1 : -1 };
    v.angle = v.route.dir > 0 ? Math.PI / 2 : -Math.PI / 2;
    v.y = nearY ?? v.y;
  } else if (!v.route.horizontal && nearY !== undefined && rng() < 0.01) {
    v.route = { horizontal: true, dir: rng() < 0.5 ? 1 : -1 };
    v.angle = v.route.dir > 0 ? 0 : Math.PI;
    v.x = nearX ?? v.x;
  }
  // Keep inside the city; turn around at the edges.
  if (v.x < 80 || v.x > WORLD.w - 80 || v.y < 80 || v.y > WORLD.h - 80) {
    v.angle = wrapAngle(v.angle + Math.PI);
    v.route.dir *= -1;
  }
  if (v.x > 3300) { v.x = 3300; v.angle = wrapAngle(v.angle + Math.PI); }
}

export function nearestVehicle(vehicles, x, y, maxD) {
  let best = null;
  let bestD = maxD * maxD;
  for (const v of vehicles) {
    if (v.wreck) continue;
    const dx = v.x - x;
    const dy = v.y - y;
    const d = dx * dx + dy * dy;
    if (d < bestD) { bestD = d; best = v; }
  }
  return best;
}

export function makeRoadblock(x, y, angle) {
  return { kind: 'roadblock', x, y, angle, w: 90, h: 26 };
}

export function makeSpikeStrip(x, y, angle) {
  return { kind: 'spike', x, y, angle, w: 80, h: 14, used: false };
}
