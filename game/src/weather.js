// Weather over Palmera Bay — storms gather, break, and clear on their own
// schedule. Pure state + update; the renderer reads the phases and the rain
// drops, and the driving model reads the grip.
import { clamp, lerp } from './random.js';

export const PHASES = ['clear', 'gathering', 'storm', 'clearing'];

export function createWeather() {
  return {
    phase: 'clear',
    phaseT: 0,
    // Seconds until the next phase change; seeded by the game, not fixed.
    nextIn: 55,
    intensity: 0, // 0 clear .. 1 full storm
    rain: [], // {x, y, len, speed} in screen-ish world space around camera
    flashes: [], // {t} lightning flashes, t counts down
    thunderAt: -1, // world time at which the thunder should sound
    lightningX: 0,
    sky: 'CLEAR',
  };
}

export function forceStorm(w) {
  w.phase = 'storm';
  w.phaseT = 0;
  w.nextIn = 40;
  w.intensity = 1;
  w.sky = 'BAY STORM';
}

// Advance the storm machine. rng is the game's seeded source so a staged
// scene can force a storm and a live game still varies.
export function updateWeather(w, dt, rng, cam) {
  w.phaseT += dt;
  if (w.phaseT >= w.nextIn) {
    w.phaseT = 0;
    const order = { clear: 'gathering', gathering: 'storm', storm: 'clearing', clearing: 'clear' };
    w.phase = order[w.phase];
    w.nextIn = w.phase === 'clear' ? rng.range(45, 110)
      : w.phase === 'gathering' ? rng.range(10, 18)
      : w.phase === 'storm' ? rng.range(25, 45)
      : rng.range(8, 14);
  }
  const target = w.phase === 'storm' ? 1 : w.phase === 'gathering' ? 0.45 : w.phase === 'clearing' ? 0.25 : 0;
  w.intensity = clamp(w.intensity + (target - w.intensity) * dt * 0.35, 0, 1);
  w.sky = w.intensity > 0.85 ? 'BAY STORM' : w.intensity > 0.4 ? 'RAIN' : w.intensity > 0.12 ? 'CLOUDY' : 'CLEAR';

  // Lightning: a flash, then thunder a beat later.
  if (w.phase === 'storm' && rng.chance(dt * 0.22)) {
    w.flashes.push({ t: 0.22 });
    w.lightningX = (cam ? cam.x : 0) + rng.range(-500, 500);
    w.thunderAt = w.phaseT + rng.range(0.4, 1.4);
  }
  for (const f of w.flashes) f.t -= dt;
  w.flashes = w.flashes.filter(f => f.t > 0);

  // Rain streaks drift around the camera so the storm is visible anywhere.
  const want = Math.floor(w.intensity * 220);
  while (w.rain.length < want) {
    w.rain.push({
      x: (cam ? cam.x : 0) + rng.range(-700, 700),
      y: (cam ? cam.y : 0) + rng.range(-420, 420),
      len: rng.range(14, 30),
      speed: rng.range(700, 1100),
    });
  }
  if (w.rain.length > want) w.rain.length = want;
  for (const d of w.rain) {
    d.y += d.speed * dt;
    d.x -= d.speed * 0.18 * dt;
    if (cam && (d.y > cam.y + 460 || d.x < cam.x - 720)) {
      d.y = cam.y - 430;
      d.x = cam.x + rng.range(-700, 700);
    }
  }
}

// Wet roads: grip multiplier for driving, 1.0 dry to 0.82 in a full storm.
export function wetGrip(w) {
  return lerp(1, 0.82, w.intensity);
}
// Traffic slows a little when it rains.
export function trafficFactor(w) {
  return lerp(1, 0.78, w.intensity);
}
