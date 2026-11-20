// The wanted system: crimes add heat, heat becomes stars, stars bring
// police. Police cruisers spawn on nearby roads and ram the player's car (or
// chase on foot when the player is out of it). Heat decays; hiding out of
// police sight decays it much faster. At 3 stars the PD sets roadblocks ahead
// of you; at 4 stars a police helicopter joins the hunt, circling overhead
// with a searchlight that keeps you visible. At 5 stars the whole bay is
// after you.
import { WANTED, HELI, SPIKES } from './config.js';
import { makeCar, makeRoadblock, clampAngle } from './vehicles.js';
import { makeCop } from './people.js';
import { nearestRoadPoint, isRoad, roadPointAhead } from './city.js';

export function createWanted() {
  return {
    heat: 0,
    stars: 0,
    copTimer: 0,
    hiddenTimer: 0,
    lastCrime: 0,
    roadblockTimer: 0,
    spikeTimer: 0,
    spikes: [], // {x, y, angle} mats of steel teeth across the road
    heli: { x: 0, y: 0, angle: 0, active: false, sweep: 0 },
  };
}

export function addHeat(wanted, amount, now) {
  wanted.heat = Math.min(500, wanted.heat + amount);
  wanted.lastCrime = now;
  if (wanted.heat <= 0) {
    wanted.stars = 0;
  } else {
    wanted.stars = Math.min(WANTED.maxStars, Math.floor(wanted.heat / 100) + 1);
  }
}

export function clearWanted(wanted) {
  wanted.heat = 0;
  wanted.stars = 0;
  wanted.heli.active = false;
  wanted.spikes = [];
}

// Spike strips: at four stars the PD drops a mat of steel teeth across
// the road ahead of you. Drive over one and your tyres are gone — the car
// crawls and pulls to one side until a garage fixes it. The strips fade
// once the heat is gone. `onSpike` is called the moment a car is spiked.
export function updateSpikes(wanted, dt, playerCar, onSpike) {
  // New strips only drop while the heat is at four stars — but a strip
  // already on the road stays dangerous until the heat is fully gone, so
  // the collision check below runs whatever the current star count is.
  if (wanted.stars >= SPIKES.stars) {
    wanted.spikeTimer -= dt;
    if (wanted.spikeTimer <= 0 && wanted.spikes.length < SPIKES.maxStrips) {
      wanted.spikeTimer = SPIKES.interval;
      const heading = playerCar ? playerCar.angle : 0;
      const spot = roadPointAhead(playerCar ? playerCar.x : 1500, playerCar ? playerCar.y : 1250, heading, 480);
      wanted.spikes.push({ x: spot.x, y: spot.y, angle: heading });
    }
  } else {
    wanted.spikeTimer = 2;
  }
  if (!playerCar || playerCar.spiked) return;
  for (const strip of wanted.spikes) {
    // The strip lies across the road: close along it and within its
    // length, while moving, is a hit.
    const dx = playerCar.x - strip.x;
    const dy = playerCar.y - strip.y;
    const along = Math.abs(dx * Math.cos(strip.angle) + dy * Math.sin(strip.angle));
    const across = Math.abs(-dx * Math.sin(strip.angle) + dy * Math.cos(strip.angle));
    if (along < 14 && across < SPIKES.stripLength / 2 && Math.abs(playerCar.speed) > 60) {
      playerCar.spiked = true;
      playerCar.spikePull = Math.random() < 0.5 ? -1 : 1;
      if (onSpike) onSpike();
      break;
    }
  }
}

// The police helicopter: flies in from the edge of the map, then circles
// the player at a distance, sweeping its searchlight. It never lands, and
// it leaves when the heat drops below 4 stars.
export function updateHeli(wanted, dt, player) {
  const heli = wanted.heli;
  if (wanted.stars < WANTED.heliStars) {
    // Heat gone: fly on past the player and switch off once far away.
    if (heli.active) {
      heli.x += Math.cos(heli.angle) * HELI.speed * dt;
      heli.y += Math.sin(heli.angle) * HELI.speed * dt;
      if (Math.hypot(heli.x - player.x, heli.y - player.y) > 1400) heli.active = false;
    }
    return;
  }
  if (!heli.active) {
    // Fly in from the north-west of the player, already pointed at them.
    heli.active = true;
    heli.x = player.x - 900;
    heli.y = player.y - 700;
    heli.angle = Math.atan2(player.y - heli.y, player.x - heli.x);
  }
  heli.sweep += dt * HELI.searchlightSweep;
  // Close in when far away; once near, drift into a lazy circle instead
  // of flying straight over the player.
  const d = Math.hypot(player.x - heli.x, player.y - heli.y);
  const inbound = Math.atan2(player.y - heli.y, player.x - heli.x);
  const circling = inbound + (Math.PI / 2) * 0.6;
  const heading = d > HELI.followDistance + 60 ? inbound : circling;
  heli.angle += clampAngle(heading - heli.angle) * Math.min(1, dt * 1.6);
  heli.x += Math.cos(heli.angle) * HELI.speed * dt;
  heli.y += Math.sin(heli.angle) * HELI.speed * dt;
}

// Police cruiser AI: steer toward the player, ram them, recover from walls.
// A ram is a single hit with a cooldown — without one, a cruiser touching
// the player's car every frame would pin it to a standstill.
export function updatePoliceCars(cars, dt, player, playerCar, wanted) {
  for (const car of cars) {
    if (car.driver !== 'police') continue;
    car.ramCooldown = Math.max(0, (car.ramCooldown || 0) - dt);
    // Chase along the roads: when the cruiser itself is off the road, aim
    // at the player's nearest road point instead of cutting across blocks.
    const chase = isRoad(car.x, car.y)
      ? { x: player.x, y: player.y }
      : nearestRoadPoint(player.x, player.y);
    const want = Math.atan2(chase.y - car.y, chase.x - car.x);
    const turn = clampAngle(want - car.angle);
    car.angle += Math.max(-2.4 * dt, Math.min(2.4 * dt, turn));
    const dist = Math.hypot(chase.x - car.x, chase.y - car.y);
    const cruise = dist > 260 ? 520 : 380;
    car.speed = Math.min(car.speed + 500 * dt, cruise);
    car.x += Math.cos(car.angle) * car.speed * dt;
    car.y += Math.sin(car.angle) * car.speed * dt;
    car.siren += dt;
    // Ram: one hit slows the player's car, then the cruiser backs off.
    if (playerCar && car.ramCooldown <= 0 && Math.hypot(playerCar.x - car.x, playerCar.y - car.y) < 52) {
      playerCar.speed *= 0.75;
      car.speed *= 0.7;
      car.ramCooldown = 0.9;
    }
  }
}

// Bring in one more cruiser, spawning on a road a little way from the
// player so it arrives with its siren already going.
function spawnPoliceCar(cars, player, random) {
  const px = player.x + (random() < 0.5 ? -420 : 420);
  const py = player.y + (random() < 0.5 ? -320 : 320);
  const spot = nearestRoadPoint(px, py);
  const car = makeCar(spot.x, spot.y, Math.atan2(player.y - spot.y, player.x - spot.x), null, 'police');
  car.driver = 'police';
  car.speed = 200;
  cars.push(car);
}

// Drop a roadblock across the road ahead of the player's travel.
function dropRoadblock(cars, player, playerCar) {
  const heading = playerCar ? playerCar.angle : player.angle;
  const spot = roadPointAhead(player.x, player.y, heading, 520);
  for (const blockCar of makeRoadblock(spot.x, spot.y, heading)) cars.push(blockCar);
}

export function updateWanted(wanted, dt, now, player, playerCar, cars, cops, random, onSpike) {
  updateHeli(wanted, dt, player);
  if (wanted.stars === 0) return;
  // Is any police close enough to see the player? The helicopter's
  // searchlight counts as being seen, so heat never decays while it is up.
  let seen = wanted.heli.active;
  for (const car of cars) {
    if (car.driver === 'police' && Math.hypot(car.x - player.x, car.y - player.y) < 520) seen = true;
  }
  for (const cop of cops) {
    if (!cop.dead && Math.hypot(cop.x - player.x, cop.y - player.y) < 380) seen = true;
  }
  wanted.hiddenTimer = seen ? 0 : wanted.hiddenTimer + dt;
  const decay = wanted.hiddenTimer > 5 ? WANTED.decayHiddenPerSec : WANTED.decayPerSec;
  wanted.heat = Math.max(0, wanted.heat - decay * dt);
  wanted.stars = wanted.heat <= 0
    ? 0
    : Math.min(WANTED.maxStars, Math.floor(wanted.heat / 100) + 1);

  // Cruisers to match the wanted level, up to six on the road at once.
  wanted.copTimer -= dt;
  const wantCars = Math.min(2 + wanted.stars, 6);
  const policeCars = cars.filter((c) => c.driver === 'police').length;
  if (wanted.copTimer <= 0 && policeCars < wantCars) {
    wanted.copTimer = WANTED.copSpawnInterval;
    spawnPoliceCar(cars, player, random);
  }
  // Foot cops join the chase at 2 stars and up, when the player is on foot.
  const wantCops = wanted.stars >= 2 ? Math.min(wanted.stars, 4) : 0;
  const liveCops = cops.filter((c) => !c.dead).length;
  if (!playerCar && wanted.copTimer <= 0 && liveCops < wantCops) {
    const spawn = nearestRoadPoint(player.x + 300, player.y - 200);
    cops.push(makeCop(spawn.x, spawn.y));
  }
  // Roadblocks at 3 stars and up: cruisers parked across the road ahead of
  // the player's direction of travel, refreshed every so often.
  wanted.roadblockTimer -= dt;
  const blockers = cars.filter((c) => c.driver === 'roadblock').length;
  if (wanted.stars >= WANTED.roadblockStars && wanted.roadblockTimer <= 0 && blockers < 4) {
    wanted.roadblockTimer = WANTED.roadblockInterval;
    dropRoadblock(cars, player, playerCar);
  }
  // Spike strips at 4 stars and up: steel teeth across the road ahead of
  // the player's direction of travel. `onSpike` warns the player the
  // moment the tyres go, so the garage run can start.
  updateSpikes(wanted, dt, playerCar, onSpike);
  // Old roadblocks and spike strips fade away once the heat is gone.
  if (wanted.stars === 0) {
    for (let i = cars.length - 1; i >= 0; i -= 1) {
      if (cars[i].driver === 'roadblock') cars.splice(i, 1);
    }
    wanted.spikes = [];
  }
}
