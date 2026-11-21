// Vehicles — arcade cars and motorbikes, plus the traffic that fills the
// roads. Physics are deliberately simple (speed, heading, grip, a wall slide)
// so they stay fun at 60 fps and testable in Node.
import { clamp, dist, angleDiff, lerp } from './random.js';
import { CAR, BIKE, ROADS_V, ROADS_H, ROAD_HALF, WORLD } from './config.js';
import { circleHitsBuilding, isOnRoad, nearestRoadPoint } from './city.js';
import { wetGrip, trafficFactor } from './weather.js';

const CAR_COLORS = ['#d64545', '#3d8bfd', '#f2c14e', '#7bc47f', '#e07a5f', '#9b7ede', '#e8e8e8', '#2f3542'];
const BIKE_COLORS = ['#ff5d8f', '#22d3ee', '#facc15', '#a78bfa'];

export function makeVehicle(kind, x, y, color, rng) {
  const stats = kind === 'bike' ? BIKE : CAR;
  return {
    kind, x, y, angle: rng ? rng.range(0, Math.PI * 2) : 0,
    speed: 0, color: color || (kind === 'bike' ? BIKE_COLORS[0] : CAR_COLORS[0]),
    damage: 0, wreck: false, parked: true, traffic: false,
    axis: 'h', dir: 1, targetSpeed: 0, turnAt: 0,
    airborne: 0, airT: 0, airStart: null, wheelie: 0, lean: 0,
    tyresPopped: false, hue: 0,
  };
}

export function spawnParkedCars(city, rng, count = 26) {
  const cars = [];
  for (let i = 0; i < count; i++) {
    const v = ROADS_V[Math.floor(rng.next() * ROADS_V.length)];
    const h = ROADS_H[Math.floor(rng.next() * ROADS_H.length)];
    const alongRoad = rng.chance(0.5);
    const x = alongRoad ? v + (rng.chance(0.5) ? ROAD_HALF - 12 : -(ROAD_HALF - 12)) : rng.range(120, WORLD.w - 120);
    const y = alongRoad ? rng.range(120, WORLD.h - 120) : h + (rng.chance(0.5) ? ROAD_HALF - 12 : -(ROAD_HALF - 12));
    if (circleHitsBuilding(city, x, y, 24)) continue;
    const car = makeVehicle(rng.chance(0.18) ? 'bike' : 'car', x, y, rng.pick(CAR_COLORS), rng);
    car.angle = alongRoad ? (rng.chance(0.5) ? 0 : Math.PI) : (rng.chance(0.5) ? Math.PI / 2 : -Math.PI / 2);
    car.parked = true;
    cars.push(car);
  }
  return cars;
}

export function spawnTrafficCar(city, rng, weather) {
  const vertical = rng.chance(0.5);
  const road = vertical ? rng.pick(ROADS_V) : rng.pick(ROADS_H);
  const along = vertical ? rng.range(120, WORLD.h - 120) : rng.range(120, WORLD.w - 120);
  const car = makeVehicle('car', vertical ? road : along, vertical ? along : road, rng.pick(CAR_COLORS), rng);
  car.traffic = true;
  car.parked = false;
  car.axis = vertical ? 'v' : 'h';
  car.dir = rng.chance(0.5) ? 1 : -1;
  car.angle = vertical ? (car.dir > 0 ? Math.PI / 2 : -Math.PI / 2) : (car.dir > 0 ? 0 : Math.PI);
  car.targetSpeed = rng.range(120, 200) * trafficFactor(weather);
  car.speed = car.targetSpeed;
  return car;
}

// One step of arcade driving. Returns nothing; mutates the vehicle.
export function driveVehicle(G, v, dt, input) {
  if (v.wreck) { v.speed *= (1 - 2.4 * dt); return; }
  const stats = v.kind === 'bike' ? BIKE : CAR;
  const grip = wetGrip(G.weather) * (v.tyresPopped ? 0.55 : 1);
  const fwd = input.forward, back = input.back, left = input.left, right = input.right;
  const handbrake = input.handbrake;

  if (fwd) v.speed += stats.accel * grip * dt * (v.tyresPopped ? 0.5 : 1);
  else if (back) v.speed -= stats.reverseAccel * dt;
  else v.speed -= Math.sign(v.speed) * Math.min(Math.abs(v.speed), 260 * dt);
  const max = v.tyresPopped ? stats.maxSpeed * 0.45 : stats.maxSpeed;
  v.speed = clamp(v.speed, -stats.maxReverse, max);

  const turning = (left ? -1 : 0) + (right ? 1 : 0);
  const steer = turning * stats.turnRate * (handbrake ? 1.6 : 1) * grip;
  const moving = clamp(Math.abs(v.speed) / 140, 0, 1);
  v.angle += steer * moving * Math.sign(v.speed || 1) * dt;
  if (v.kind === 'bike') {
    v.lean = lerp(v.lean, turning * 0.35 * moving, dt * 8);
    v.wheelie = fwd && v.speed > 260 ? lerp(v.wheelie, 1, dt * 4) : lerp(v.wheelie, 0, dt * 6);
  }
  if (handbrake) v.speed *= (1 - 1.6 * dt);

  const nx = v.x + Math.cos(v.angle) * v.speed * dt;
  const ny = v.y + Math.sin(v.angle) * v.speed * dt;
  // Walls: slide along buildings instead of sticking.
  const hit = circleHitsBuilding(G.city, nx, ny, stats.radius);
  if (hit) {
    const hard = Math.abs(v.speed) > 320;
    if (hard) {
      damageVehicle(v, 18);
      if (v.kind === 'bike' && v === G.player.vehicle) throwRider(G);
    }
    // Try sliding on each axis separately.
    if (!circleHitsBuilding(G.city, nx, v.y, stats.radius)) v.x = nx;
    else if (!circleHitsBuilding(G.city, v.x, ny, stats.radius)) v.y = ny;
    else v.speed *= 0.35;
  } else {
    v.x = nx; v.y = ny;
  }
  v.x = clamp(v.x, 24, WORLD.w - 24);
  v.y = clamp(v.y, 24, WORLD.h - 24);
  if (v.airborne > 0) {
    v.airT += dt;
  }
}

export function throwRider(G) {
  const p = G.player;
  if (!p.vehicle) return;
  p.vehicle = null;
  p.onFoot = true;
  p.x = clamp(p.x + (G.rng.next() - 0.5) * 40, 24, WORLD.w - 24);
  p.y = clamp(p.y + (G.rng.next() - 0.5) * 40, 24, WORLD.h - 24);
  p.hp = Math.max(1, p.hp - 12);
  G.messages.push({ text: 'Thrown off the bike!', t: 2.2, color: '#ff8a80' });
}

export function damageVehicle(v, amt) {
  if (v.wreck) return;
  v.damage = clamp(v.damage + amt, 0, 100);
  if (v.damage >= 100) {
    v.wreck = true;
    v.speed = 0;
  }
}

// Traffic: follow the road, slow at intersections, turn sometimes.
export function updateTraffic(G, dt) {
  const city = G.city;
  const player = G.player;
  for (const c of G.traffic) {
    if (c.wreck) continue;
    // Approaching an intersection? Maybe turn.
    const onV = Math.abs(c.x - nearestRoadPoint(city, c.x, c.y).x) < 4;
    const nearCross = c.axis === 'v'
      ? ROADS_H.some(y => Math.abs(c.y - y) < 26)
      : ROADS_V.some(x => Math.abs(c.x - x) < 26);
    if (nearCross && G.rng.chance(dt * 0.5)) {
      c.axis = c.axis === 'v' ? 'h' : 'v';
      c.dir = G.rng.chance(0.5) ? 1 : -1;
      c.angle = c.axis === 'v' ? (c.dir > 0 ? Math.PI / 2 : -Math.PI / 2) : (c.dir > 0 ? 0 : Math.PI);
    }
    // Slow for the car ahead.
    let target = c.targetSpeed;
    for (const o of G.traffic) {
      if (o === c || o.wreck) continue;
      const d = dist(c.x, c.y, o.x, o.y);
      if (d < 70 && Math.abs(angleDiff(c.angle, Math.atan2(o.y - c.y, o.x - c.x))) < 0.6) {
        target = Math.min(target, 40);
      }
    }
    // Slow near the player's vehicle.
    if (player.vehicle && dist(c.x, c.y, player.vehicle.x, player.vehicle.y) < 90) {
      target = Math.min(target, 60);
    }
    c.speed = lerp(c.speed, target, dt * 1.5);
    const nx = c.x + Math.cos(c.angle) * c.speed * dt;
    const ny = c.y + Math.sin(c.angle) * c.speed * dt;
    if (circleHitsBuilding(city, nx, ny, 16)) {
      c.dir *= -1;
      c.angle += Math.PI;
    } else {
      c.x = nx; c.y = ny;
    }
    c.x = clamp(c.x, 30, WORLD.w - 30);
    c.y = clamp(c.y, 30, WORLD.h - 30);
    // Wrap around the far edge so traffic never runs dry.
    if (c.axis === 'v' && (c.y < 60 || c.y > WORLD.h - 60)) c.y = c.y < 60 ? WORLD.h - 80 : 80;
    if (c.axis === 'h' && (c.x < 60 || c.x > WORLD.w - 60)) c.x = c.x < 60 ? WORLD.w - 80 : 80;
  }
  // Keep the streets busy.
  const want = 14;
  if (G.traffic.length < want && G.rng.chance(dt * 0.8)) {
    G.traffic.push(spawnTrafficCar(city, G.rng, G.weather));
  }
}

// Find the nearest stealable vehicle to a point.
export function nearestVehicle(vehicles, x, y, maxD = 60) {
  let best = null, bd = maxD * maxD;
  for (const v of vehicles) {
    if (v.wreck) continue;
    const d2 = (v.x - x) * (v.x - x) + (v.y - y) * (v.y - y);
    if (d2 < bd) { bd = d2; best = v; }
  }
  return best;
}
