// Bay weather: storms roll in off the sea on their own schedule, and the
// whole game feels them. Rain slicks the roads — cars grip worse and
// traffic slows — lightning flashes the sky, and thunder follows a beat
// later. Everything is driven by the game's seeded generator, so the same
// seed always gives the same sky, and the same screenshot scenes always
// show the same weather. A mission can force a storm (Storm Runner), and
// the chase screenshot stages one on purpose.
import { WEATHER } from './config.js';
import { mulberry32, range, gauss } from './random.js';

// Phases: clear sky, clouds gathering, the downpour, then clearing.
export function createWeather(seed) {
  return {
    phase: 'clear',
    // The first storm is a while off, so the game opens in golden light.
    timer: range(mulberry32(seed + 77), WEATHER.clearMin, WEATHER.clearMax),
    intensity: 0, // 0 is dry, 1 is a full bay storm
    streaks: [],
    streakSeed: mulberry32(seed + 913),
    flash: 0, // lightning flash, 1 just after a strike, fading fast
    flashTimer: 8,
    thunderIn: -1, // seconds until the thunderclap, -1 when none is coming
    wet: 0, // how soaked the roads are: rises in rain, dries slowly after
    gust: 0, // wind slant on the rain, -1 (west) to 1 (east)
  };
}

// Force a storm right now, for the Storm Runner mission and the chase
// screenshot: clouds gather for a few seconds, then the downpour.
export function forceStorm(weather) {
  if (weather.phase === 'storm') return;
  weather.phase = 'gathering';
  weather.timer = 5;
}

// How much grip the rain takes off the roads right now, 0 (dry) to 1.
export function weatherGripLoss(weather) {
  return weather.intensity * WEATHER.gripLoss;
}

// How much traffic slows in the rain, as a speed multiplier.
export function weatherTrafficFactor(weather) {
  return 1 - weather.intensity * (1 - WEATHER.trafficSlow);
}

// Advance the sky by one step. `random` is the game's seeded generator.
export function updateWeather(weather, dt, random) {
  weather.timer -= dt;
  if (weather.flash > 0) weather.flash = Math.max(0, weather.flash - dt * 2.2);
  if (weather.thunderIn > 0) {
    weather.thunderIn -= dt;
    if (weather.thunderIn <= 0) {
      weather.thunderPending = true;
      weather.thunderIn = -1;
    }
  }

  if (weather.phase === 'clear') {
    weather.intensity = Math.max(0, weather.intensity - dt * 0.05);
    // The roads dry slowly after a storm.
    weather.wet = Math.max(0, weather.wet - dt * 0.01);
    if (weather.timer <= 0) {
      weather.phase = 'gathering';
      weather.timer = WEATHER.gatherSeconds;
      weather.gust = range(random, -1, 1);
    }
  } else if (weather.phase === 'gathering') {
    // Clouds thicken and the first drops fall.
    weather.intensity = Math.min(0.35, weather.intensity + dt * 0.06);
    if (weather.timer <= 0) {
      weather.phase = 'storm';
      weather.timer = range(random, WEATHER.stormMin, WEATHER.stormMax);
      weather.flashTimer = range(random, 2, 6);
    }
  } else if (weather.phase === 'storm') {
    weather.intensity = Math.min(WEATHER.maxIntensity, weather.intensity + dt * 0.15);
    weather.wet = Math.min(1, weather.wet + dt * 0.08);
    weather.flashTimer -= dt;
    if (weather.flashTimer <= 0) {
      // Lightning: the flash now, the thunder a little later, the way a
      // real storm staggers them. The gap grows with the storm's mood.
      weather.flash = 1;
      weather.thunderIn = 0.6 + Math.abs(gauss(random)) * 1.6;
      weather.flashTimer = range(random, WEATHER.lightningEveryMin, WEATHER.lightningEveryMax);
    }
    if (weather.timer <= 0) {
      weather.phase = 'clearing';
      weather.timer = WEATHER.clearingSeconds;
    }
  } else {
    // The rain eases off; the roads stay wet a while longer.
    weather.intensity = Math.max(0, weather.intensity - dt * 0.12);
    weather.wet = Math.max(0, weather.wet - dt * 0.015);
    if (weather.timer <= 0) {
      weather.phase = 'clear';
      weather.timer = range(random, WEATHER.clearMin, WEATHER.clearMax);
    }
  }

  // Keep the streak pool full while it rains, and let it thin out as the
  // sky clears. Streaks live in viewport space (1280x720) and fall with a
  // wind slant.
  const want = Math.round(weather.intensity * WEATHER.streaks);
  const gen = weather.streakSeed;
  while (weather.streaks.length < want) {
    weather.streaks.push({
      x: gen() * 1280,
      y: gen() * 720 - 40,
      len: 14 + gen() * 22,
      speed: WEATHER.streakSpeed * (0.8 + gen() * 0.5),
    });
  }
  if (weather.streaks.length > want) weather.streaks.length = want;
  const slant = weather.gust * 0.35;
  for (const s of weather.streaks) {
    s.y += s.speed * dt;
    s.x += s.speed * slant * dt;
    if (s.y > 720) {
      s.y = -40;
      s.x = gen() * 1280;
    }
    if (s.x > 1280) s.x = 0;
    if (s.x < 0) s.x = 1280;
  }
}

// A short word for the HUD: what the sky is doing right now.
export function weatherWord(weather) {
  if (weather.phase === 'storm') return weather.intensity > 0.8 ? 'BAY STORM' : 'RAIN';
  if (weather.phase === 'gathering') return 'CLOUDS GATHERING';
  if (weather.phase === 'clearing') return 'RAIN EASING';
  return 'CLEAR';
}
