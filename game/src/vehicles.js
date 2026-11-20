// Cars: the player's ride, traffic, police cruisers, rivals and roadblocks.
// Traffic drives along the road grid in its own lane, waits at intersections
// when cross traffic is coming, and drifts into the other lane now and then
// on a long straight. The player drives with simple arcade physics
// (acceleration, steering that scales with speed, handbrake drift). Cars take
// damage from bullets and hard knocks: a hurt car smokes, and a car at zero
// health is a wreck — it stops dead and nobody can drive it.
import { CAR, BIKE, PALETTE, WORLD } from './config.js';
import { pick, range } from './random.js';
import { AVENUES, STREETS, isRoad, isIntersection, nearestRoadPoint, hitBuilding, clampWorld } from './city.js';

const MODELS = [
  { name: 'Sunbeam', color: '#d64545', speed: 1.0 },
  { name: 'Coral GT', color: '#f39c12', speed: 1.15 },
  { name: 'Bayliner', color: '#4a90d9', speed: 0.95 },
  { name: 'Palm Van', color: '#e8e8e8', speed: 0.85, van: true },
  { name: 'Neon Coupe', color: '#8e44ad', speed: 1.2 },
  { name: 'Tide Runner', color: '#3d9970', speed: 1.05 },
  { name: 'Sunset Bus', color: '#f4d03f', speed: 0.8, van: true },
];

const BIKE_MODELS = [
  { name: 'Palmera 250', color: '#d64545', speed: 1.25 },
  { name: 'Neon Runner', color: '#8e44ad', speed: 1.35 },
  { name: 'Bay Cruiser', color: '#4a90d9', speed: 1.2 },
  { name: 'Sunset Chopper', color: '#f39c12', speed: 1.3 },
];

// A motorbike: two wheels, no roof, no mercy. Bikes live in the same cars
// array as the cars, with kind 'bike' — they are entered, driven and
// wrecked the same way, but they lean into corners, they wheelie under
// hard acceleration, and a hard hit throws the rider off.
export function makeBike(x, y, angle, model) {
  const bike = makeCar(x, y, angle, model, 'bike');
  bike.name = model?.name ?? 'Palmera 250';
  bike.color = model?.color ?? '#d64545';
  bike.lean = 0; // radians of lean into the current corner
  bike.wheelie = 0; // 0 to 1: how high the front wheel is
  bike.air = 0; // stunt air height, shared with the jump system
  bike.airTime = 0;
  bike.airVel = 0;
  bike.airDistance = 0;
  return bike;
}

// Four bikes parked around the bay: the beach road, the docks, the
// airfield and the stadium lot.
export function spawnBikes(random) {
  const spots = [
    { x: 2300, y: 2360, angle: 0 },
    { x: 300, y: 1850, angle: Math.PI / 2 },
    { x: 3300, y: 1000, angle: Math.PI },
    { x: 2900, y: 2100, angle: -Math.PI / 2 },
  ];
  const bikes = [];
  for (const spot of spots) {
    const bike = makeBike(spot.x, spot.y, spot.angle, pick(random, BIKE_MODELS));
    bike.driver = 'parked';
    bikes.push(bike);
  }
  return bikes;
}

// Bike driving: sharper steering than a car, a lean that follows the
// corner, and a wheelie when you floor it at speed. A bike in the air
// (off a stunt ramp) keeps its line and cannot steer much.
export function driveBike(bike, input, dt, gripFactor = 1) {
  if (input.up) bike.speed += BIKE.accel * dt;
  if (input.down) bike.speed -= (bike.speed > 0 ? BIKE.brake : BIKE.reverseAccel) * dt;
  if (!input.up && !input.down) bike.speed -= Math.sign(bike.speed) * BIKE.drag * 220 * dt;
  if (Math.abs(bike.speed) < 8 && !input.up && !input.down) bike.speed = 0;
  const max = BIKE.maxSpeed * (bike.model?.speed ?? 1) * (bike.spiked ? 0.45 : 1);
  bike.speed = Math.min(Math.max(bike.speed, -BIKE.maxReverse), max);
  const steer = (input.left ? -1 : 0) + (input.right ? 1 : 0);
  const dir = bike.speed >= 0 ? 1 : -1;
  const airFactor = bike.air > 0 ? 0.25 : 1;
  bike.angle += steer * BIKE.turnRate * gripFactor * dir * airFactor
    * Math.min(1, (Math.abs(bike.speed) + 80) / 200) * dt;
  // Lean follows the steering, and the front wheel lifts on hard launches.
  const targetLean = steer * BIKE.leanMax * Math.min(1, Math.abs(bike.speed) / 300);
  bike.lean += (targetLean - bike.lean) * Math.min(1, dt * 6);
  const wantWheelie = input.up && bike.speed > BIKE.wheelieSpeed ? 1 : 0;
  bike.wheelie += (wantWheelie - bike.wheelie) * Math.min(1, dt * 3);
  bike.x += Math.cos(bike.angle) * bike.speed * dt;
  bike.y += Math.sin(bike.angle) * bike.speed * dt;
  clampWorld(bike, 24);
}

// Put a car back on the road: full health, no smoke, straight tyres.
// The garage calls this after a repair job finishes.
export function repairCar(car) {
  car.health = 100;
  car.smoke = 0;
  car.wreck = false;
  car.spiked = false;
  car.spikePull = 0;
  return car;
}

export function makeCar(x, y, angle, model, kind = 'traffic') {
  return {
    x, y, angle,
    speed: 0,
    kind,
    model,
    color: kind === 'police' ? PALETTE.copCar
      : kind === 'taxi' ? PALETTE.taxi
      : kind === 'roadblock' ? '#e8e8e8'
      : (model?.color ?? '#d64545'),
    name: kind === 'police' ? 'Interceptor'
      : kind === 'taxi' ? 'Bay Cab'
      : kind === 'roadblock' ? 'Roadblock'
      : (model?.name ?? 'Car'),
    driver: null, // 'player' | 'traffic' | 'police' | 'rival' | 'roadblock' | null (parked)
    target: null,
    waypoint: null,
    wait: 0,
    stuck: 0,
    honk: 0,
    siren: 0,
    health: 100,
    smoke: 0,
    wreck: false,
    spiked: false, // tyres popped by a spike strip: slow, and pulls sideways
    spikePull: 0, // direction of the pull, -1 or 1, set when spiked
    lane: 0, // current sideways offset from the road centreline
    laneTarget: 0, // the offset the car is drifting toward
    laneTimer: 0,
  };
}

// A roadblock: two cruisers parked across the road, nose to nose, with a
// striped barrier between them. They do not drive; the player must go around.
export function makeRoadblock(x, y, angle) {
  const left = makeCar(x - Math.sin(angle) * 34, y + Math.cos(angle) * 34, angle + Math.PI / 2, null, 'roadblock');
  const right = makeCar(x + Math.sin(angle) * 34, y - Math.cos(angle) * 34, angle - Math.PI / 2, null, 'roadblock');
  left.driver = 'roadblock';
  right.driver = 'roadblock';
  left.health = 999;
  right.health = 999;
  return [left, right];
}

export function spawnTraffic(random, count, city) {
  const cars = [];
  for (let i = 0; i < count; i += 1) {
    const avenue = pick(random, AVENUES);
    const street = pick(random, STREETS);
    const onAvenue = random() < 0.5;
    const x = onAvenue ? avenue : range(random, 200, WORLD.width - 200);
    const y = onAvenue ? range(random, 200, 2100) : street;
    const angle = onAvenue ? (random() < 0.5 ? Math.PI / 2 : -Math.PI / 2) : (random() < 0.5 ? 0 : Math.PI);
    const car = makeCar(x, y, angle, pick(random, MODELS));
    car.driver = 'traffic';
    car.speed = range(random, 90, 170);
    // Right-hand traffic: drive on the right side of the centreline.
    car.lane = onAvenue ? (angle > 0 ? -16 : 16) : (angle === 0 ? 16 : -16);
    car.laneTarget = car.lane;
    cars.push(car);
  }
  return cars;
}

export function spawnParked(random, count) {
  const cars = [];
  for (let i = 0; i < count; i += 1) {
    const avenue = pick(random, AVENUES);
    const street = pick(random, STREETS);
    const side = random() < 0.5 ? -1 : 1;
    const onAvenue = random() < 0.5;
    const x = onAvenue ? avenue + side * 34 : range(random, 200, WORLD.width - 200);
    const y = onAvenue ? range(random, 200, 2100) : street + side * 34;
    const car = makeCar(
      x, y,
      onAvenue ? (side > 0 ? Math.PI / 2 : -Math.PI / 2) : (side > 0 ? 0 : Math.PI),
      pick(random, MODELS),
    );
    cars.push(car);
  }
  return cars;
}

// Turn a car toward a heading, at most `rate` radians a second.
function steerToward(car, targetAngle, dt, rate) {
  const diff = clampAngle(targetAngle - car.angle);
  car.angle += Math.max(-rate * dt, Math.min(rate * dt, diff));
}

// Is cross traffic already inside the intersection ahead of this car?
// Only cars crossing at an angle count — one going the same way is fine.
function crossTrafficAt(cars, car, aheadX, aheadY) {
  for (const other of cars) {
    if (other === car || other.driver === null) continue;
    const d = Math.hypot(other.x - aheadX, other.y - aheadY);
    if (d < 90 && Math.abs(Math.sin(other.angle - car.angle)) > 0.5) return true;
  }
  return false;
}

// A ninety-degree turn, left or right, eased in over the step.
function swingTurn(car, random, dt) {
  const turn = random() < 0.5 ? Math.PI / 2 : -Math.PI / 2;
  car.angle += turn * Math.min(1, dt * 6);
  car.speed = Math.max(60, car.speed - 200 * dt);
}

// Traffic AI: cruise in its lane, yield at intersections when cross
// traffic is already in them, turn onto a crossing road when this one
// ends, and drift into the other lane now and then on a long straight.
// Rain (trafficFactor below 1) makes every driver slower and more careful.
function trafficDrive(car, dt, random, cars, trafficFactor = 1) {
  const lookX = car.x + Math.cos(car.angle) * 70;
  const lookY = car.y + Math.sin(car.angle) * 70;
  const onRoad = isRoad(car.x, car.y);
  if (car.wait > 0) {
    // Waiting out an intersection: brake to a stop, then pull away.
    car.wait -= dt;
    car.speed = Math.max(0, car.speed - 400 * dt);
  } else if (!onRoad) {
    // Off the road: steer back toward the nearest road and keep moving.
    const home = nearestRoadPoint(car.x, car.y);
    steerToward(car, Math.atan2(home.y - car.y, home.x - car.x), dt, 3);
    car.speed = Math.min(car.speed + 120 * dt, 120 * trafficFactor);
  } else if (isIntersection(lookX, lookY)) {
    // Approaching an intersection: yield if cross traffic is already in
    // it, otherwise roll through — sometimes turning onto the cross road.
    if (crossTrafficAt(cars, car, lookX, lookY)) {
      car.wait = range(random, 0.8, 2.0);
    } else if (random() < dt * 0.9) {
      swingTurn(car, random, dt);
    }
  } else if (!isRoad(lookX, lookY)) {
    // The road ends ahead: turn onto a crossing road.
    swingTurn(car, random, dt);
  } else {
    car.speed = Math.min(car.speed + 60 * dt, 170 * trafficFactor);
  }
  // Lane changes: on a straight stretch, drift to the other side sometimes.
  car.laneTimer -= dt;
  if (car.laneTimer <= 0 && onRoad && !isIntersection(car.x, car.y)) {
    car.laneTimer = range(random, 4, 12);
    if (random() < 0.4) car.laneTarget = -car.laneTarget || (random() < 0.5 ? 16 : -16);
  }
  // Ease sideways toward the target lane, perpendicular to the heading.
  const laneGap = car.laneTarget - car.lane;
  const ease = Math.min(1, dt * 1.5);
  car.lane += laneGap * ease;
  car.x += -Math.sin(car.angle) * laneGap * ease;
  car.y += Math.cos(car.angle) * laneGap * ease;
  // Move forward.
  car.x += Math.cos(car.angle) * car.speed * dt;
  car.y += Math.sin(car.angle) * car.speed * dt;
  clampWorld(car, 40);
}

export function clampAngle(a) {
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}

// Player driving: arcade physics with drift on the handbrake. Rain
// (gripFactor below 1) loosens the steering, and a spiked car crawls at
// less than half speed while pulling hard to one side.
export function drivePlayer(car, input, dt, gripFactor = 1) {
  if (input.up) car.speed += CAR.accel * dt;
  if (input.down) car.speed -= (car.speed > 0 ? CAR.brake : CAR.reverseAccel) * dt;
  if (!input.up && !input.down) car.speed -= Math.sign(car.speed) * CAR.drag * 220 * dt;
  if (Math.abs(car.speed) < 8 && !input.up && !input.down) car.speed = 0;
  let max = CAR.maxSpeed * (car.model?.speed ?? 1);
  if (car.spiked) max *= 0.45;
  car.speed = Math.min(Math.max(car.speed, -CAR.maxReverse), max);
  const steer = (input.left ? -1 : 0) + (input.right ? 1 : 0);
  const dir = car.speed >= 0 ? 1 : -1;
  const grip = input.handbrake ? 1.6 : 1;
  const airFactor = car.air > 0 ? 0.25 : 1;
  car.angle += steer * CAR.turnRate * grip * gripFactor * dir * airFactor * Math.min(1, (Math.abs(car.speed) + 80) / 200) * dt;
  if (car.spiked && Math.abs(car.speed) > 60) {
    // Popped tyres drag the car sideways, toward the flat side.
    car.angle += car.spikePull * 0.9 * dt;
  }
  car.x += Math.cos(car.angle) * car.speed * dt;
  car.y += Math.sin(car.angle) * car.speed * dt;
  if (input.handbrake && Math.abs(car.speed) > 200) car.smoke = Math.max(car.smoke, 0.4);
  clampWorld(car, 34);
}

// Damage a car; returns true the moment it becomes a wreck.
export function damageCar(car, amount) {
  if (car.wreck || car.health > 900) return false; // roadblocks are indestructible
  car.health -= amount;
  if (car.health < CAR.smokeBelowHealth) car.smoke = Math.max(car.smoke, 0.5);
  if (car.health <= 0) {
    car.health = 0;
    car.wreck = true;
    car.speed = 0;
    car.smoke = 1;
    return true;
  }
  return false;
}

// Push overlapping cars apart in pairs: a cheap circle separation so
// traffic never stacks into one spot at an intersection. Traffic slows a
// little from the nudge; the player's car just gets shoved.
function separateCars(cars) {
  for (let i = 0; i < cars.length; i += 1) {
    for (let j = i + 1; j < cars.length; j += 1) {
      const a = cars[i];
      const b = cars[j];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const d2 = dx * dx + dy * dy;
      if (d2 >= 48 * 48 || d2 <= 0.01) continue;
      const d = Math.sqrt(d2);
      const push = (48 - d) / 2;
      const nx = dx / d;
      const ny = dy / d;
      a.x -= nx * push;
      a.y -= ny * push;
      b.x += nx * push;
      b.y += ny * push;
      if (a.driver === 'traffic') a.speed *= 0.9;
      if (b.driver === 'traffic') b.speed *= 0.9;
    }
  }
}

export function updateVehicles(cars, dt, random, city, player, trafficFactor = 1) {
  for (const car of cars) {
    if (car.driver === 'traffic') trafficDrive(car, dt, random, cars, trafficFactor);
    if (car.smoke > 0) car.smoke -= dt;
    if (car.driver === 'roadblock' || car.wreck) continue; // neither ever moves
    if (hitBuilding(city, car.x, car.y, 24)) {
      // Bounce off the wall and get pushed clear, so no car ever sits on
      // a roof. One shove back along the heading, then a sideways shove
      // if it is still inside.
      car.speed *= -0.25;
      car.x -= Math.cos(car.angle) * 40;
      car.y -= Math.sin(car.angle) * 40;
      if (hitBuilding(city, car.x, car.y, 24)) {
        car.x -= 40;
        car.speed = 0;
      }
    }
  }
  separateCars(cars);
}

export function nearestCar(cars, x, y, maxDist) {
  let best = null;
  let bestD = maxDist * maxDist;
  for (const car of cars) {
    const d = (car.x - x) * (car.x - x) + (car.y - y) * (car.y - y);
    if (d < bestD) {
      bestD = d;
      best = car;
    }
  }
  return best;
}

export { MODELS };
