// Palmera Bay — Sunset Run: bay weather.
// Storms roll in on their own schedule — gathering clouds, a downpour with
// rain streaks, lightning and delayed thunder, then clearing. Wet roads cut
// grip and slow the traffic. A mission can force a storm.

export function createWeather() {
  return {
    phase: 'clear', // clear | clouds | storm | clearing
    t: 0, // seconds in this phase
    intensity: 0, // 0..1, how hard it is raining right now
    lightning: 0, // flash timer, >0 while the sky is lit
    thunderIn: -1, // seconds until the thunder sound, -1 = none queued
    forced: false, // a mission is holding the storm
    nextChange: 45,
    seed: 7,
  };
}

const PHASE_LEN = { clear: 55, clouds: 18, storm: 40, clearing: 16 };

export function updateWeather(w, dt, rng) {
  w.t += dt;
  w.seed += dt;
  if (w.lightning > 0) w.lightning -= dt;
  if (w.thunderIn > 0) {
    w.thunderIn -= dt;
    if (w.thunderIn <= 0) {
      w.thunderIn = -1;
      w.thunderDue = true;
    }
  }
  if (w.forced) {
    if (w.phase !== 'storm') {
      w.phase = 'storm';
      w.t = 0;
    }
    w.intensity = Math.min(1, w.intensity + dt * 0.25);
    maybeBolt(w, rng);
    return;
  }
  const target = w.phase === 'storm' ? 1 : w.phase === 'clouds' ? 0.35 : 0;
  w.intensity += (target - w.intensity) * Math.min(1, dt * 0.2);
  if (w.phase === 'storm') maybeBolt(w, rng);
  if (w.t >= w.nextChange) {
    w.t = 0;
    if (w.phase === 'clear') {
      w.phase = 'clouds';
      w.nextChange = PHASE_LEN.clouds;
    } else if (w.phase === 'clouds') {
      w.phase = 'storm';
      w.nextChange = PHASE_LEN.storm;
    } else if (w.phase === 'storm') {
      w.phase = 'clearing';
      w.nextChange = PHASE_LEN.clearing;
    } else {
      w.phase = 'clear';
      w.nextChange = PHASE_LEN.clear * (0.7 + rng() * 0.8);
    }
  }
}

function maybeBolt(w, rng) {
  if (w.intensity > 0.5 && rng() < 0.012) {
    w.lightning = 0.28;
    w.thunderIn = 0.6 + rng() * 2.2;
  }
}

// Grip multiplier for wet roads: 1 when dry, down to 0.72 in a full storm.
export function gripOf(w) {
  return 1 - 0.28 * w.intensity;
}

export function isRaining(w) {
  return w.intensity > 0.15;
}

export function skyName(w) {
  if (w.phase === 'storm') return 'BAY STORM';
  if (w.phase === 'clouds') return 'CLOUDS';
  if (w.phase === 'clearing') return 'CLEARING';
  return 'CLEAR';
}

export function forceStorm(w, on) {
  w.forced = on;
  if (!on && w.phase === 'storm') {
    w.phase = 'clearing';
    w.t = 0;
    w.nextChange = PHASE_LEN.clearing;
  }
}

// Rain streaks for the renderer: deterministic from the frame counter, so a
// screenshot scene draws the same rain every time it is staged.
export function rainStreaks(frame, count, width, height, intensity) {
  const out = [];
  const n = Math.floor(count * intensity);
  for (let i = 0; i < n; i++) {
    const h1 = (i * 2654435761 + frame * 97) >>> 0;
    const h2 = (i * 40503 + frame * 13) >>> 0;
    out.push({
      x: (h1 % 10000) / 10000 * width,
      y: (h2 % 10000) / 10000 * height,
      len: 14 + (h1 % 12),
    });
  }
  return out;
}
