// Palmera Bay — Sunset Run: stunt jumps.
// Four wooden ramps around the bay. Hit one fast and you fly: air time and
// distance pay cash, and beating your best jump pays a bonus.

export function rampNear(city, x, y, maxD = 70) {
  for (const r of city.ramps) {
    const dx = x - r.x;
    const dy = y - r.y;
    if (dx * dx + dy * dy < maxD * maxD) return r;
  }
  return null;
}

export function createStunts() {
  return {
    air: null, // {t, dist, startX, startY, speed} while airborne
    best: 0, // best jump score so far
    bestDist: 0,
    lastPayout: 0,
  };
}

// Called when the player's vehicle crosses a ramp fast enough.
export function startJump(stunts, ramp, vehicle) {
  const speed = Math.abs(vehicle.speed);
  if (speed < 260) return false;
  stunts.air = {
    t: 0,
    dist: 0,
    speed,
    x: vehicle.x,
    y: vehicle.y,
  };
  return true;
}

// While airborne the car keeps its heading and covers ground. Returns a
// payout event on landing, or null while still flying.
export function updateAir(stunts, vehicle, dt) {
  if (!stunts.air) return null;
  const air = stunts.air;
  air.t += dt;
  const step = air.speed * dt;
  air.dist += step;
  vehicle.x += Math.cos(vehicle.angle) * step;
  vehicle.y += Math.sin(vehicle.angle) * step;
  // Air time scales with launch speed, capped so jumps stay snappy.
  const airTime = Math.min(1.6, 0.5 + air.speed / 700);
  if (air.t >= airTime) {
    const score = Math.round(air.dist * 0.6 + air.t * 120);
    const isBest = score > stunts.best;
    let payout = 20 + Math.round(air.dist * 0.4);
    if (isBest) {
      stunts.best = score;
      stunts.bestDist = air.dist;
      payout += 100;
    }
    stunts.lastPayout = payout;
    stunts.air = null;
    return { payout, score, isBest, dist: air.dist };
  }
  return null;
}

export function isAirborne(stunts) {
  return stunts.air !== null;
}
