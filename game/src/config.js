// Palmera Bay — Sunset Run: all the numbers that tune the game, in one file.
// The viewport is a logical 1280x720 that the renderer scales to the window.
// The world is a 3600x2600 coastal city seen from above, and the clock runs
// a full day: the game opens at golden hour and slides into night, when the
// lamps come on and the neon signs take over.
export const VIEW = { width: 1280, height: 720 };
export const WORLD = { width: 3600, height: 2600 };
export const STEP = 1 / 60;
export const SAVE_KEY = 'palmera-bay.save.v3';

export const PLAYER = {
  radius: 13,
  walkSpeed: 215,
  runSpeed: 330,
  health: 100,
  punchDamage: 25,
  punchRange: 36,
  punchArc: 1.15,
};

export const CAR = {
  length: 54,
  width: 26,
  accel: 430,
  brake: 640,
  reverseAccel: 270,
  maxSpeed: 575,
  maxReverse: 185,
  grip: 2.6,
  turnRate: 3.0,
  drag: 0.55,
  // A car that takes this much damage in one hit starts smoking; at zero
  // health it is a wreck and nobody can drive it any more.
  smokeBelowHealth: 45,
};

// Three guns: the pistol Mara carries from the start, the spray gun (SMG)
// stashed around the bay in weapon pickups, and the boomstick — a
// short-barrel shotgun that fires a spread of six pellets at close range.
// It kicks hard and reloads slowly, but up close nothing clears a room
// like it. The boomstick waits at the Bay Stadium and the boardwalk.
export const WEAPONS = {
  pistol: { name: 'Pistol', damage: 34, fireRate: 0.24, bulletSpeed: 920, spread: 0.02, auto: false },
  smg: { name: 'Spray Gun', damage: 13, fireRate: 0.085, bulletSpeed: 1050, spread: 0.11, auto: true },
  shotgun: { name: 'Boomstick', damage: 16, fireRate: 0.95, bulletSpeed: 780, spread: 0.24, auto: false, pellets: 6, falloff: 260 },
};

export const WANTED = {
  maxStars: 5,
  // Heat each crime adds; 100 heat is one star, and stars fall as heat cools.
  stealCar: 45,
  shoot: 30,
  hitPed: 35,
  killCop: 80,
  decayPerSec: 4,
  decayHiddenPerSec: 14,
  copSpawnInterval: 2.2,
  heliStars: 4,
  roadblockStars: 3,
  roadblockInterval: 14,
};

export const HELI = {
  speed: 330,
  followDistance: 150,
  spotlightRadius: 130,
  searchlightSweep: 1.4,
};

// The story, in order: twelve jobs for Mara Vega, each with its pay.
export const MISSIONS = [
  { id: 'wheels', name: 'First Wheels', pay: 250 },
  { id: 'drop', name: 'The Drop', pay: 500 },
  { id: 'shakedown', name: 'Shakedown', pay: 750 },
  { id: 'getaway', name: 'Getaway', pay: 1200 },
  { id: 'race', name: 'Sunset Grand Prix', pay: 1500 },
  { id: 'bigone', name: 'The Big One', pay: 3000 },
  { id: 'marina', name: 'Marina Heist', pay: 2000 },
  { id: 'showdown', name: 'Sunset Showdown', pay: 5000 },
  { id: 'longcon', name: 'The Long Con', pay: 4000 },
  { id: 'storm', name: 'Storm Runner', pay: 2500 },
  { id: 'brawl', name: 'Bayfront Brawl', pay: 3500 },
  { id: 'courier', name: 'Midnight Courier', pay: 3000 },
];

export const PALETTE = {
  sky: '#f7b267',
  sun: '#ffd166',
  sand: '#e8c98a',
  sea: '#2a7f8f',
  seaDeep: '#1f6a7d',
  pier: '#8a6b4f',
  grass: '#7fae5a',
  grassDark: '#6b9c4a',
  road: '#3a3f4a',
  roadLine: '#e8d44d',
  sidewalk: '#b9b3a4',
  block: '#8f8a7d',
  building: ['#c96f4a', '#d99a5b', '#e8b4b8', '#7fb3d5', '#a8c686', '#b388eb', '#e07a5f', '#81b29a'],
  downtown: ['#5d6d7e', '#7d8aa0', '#4a6b8a', '#6b7c93'],
  player: '#ff5d8f',
  playerDark: '#c93a6b',
  cop: '#2f6fd0',
  copCar: '#2f6fd0',
  taxi: '#f4d03f',
  traffic: ['#d64545', '#4a90d9', '#e8e8e8', '#3d9970', '#f39c12', '#8e44ad', '#2c3e50'],
  hud: '#10131a',
  hudPanel: 'rgba(16,19,26,0.82)',
  text: '#f5f1e6',
  muted: '#b8b2a4',
  gold: '#f2c94c',
  red: '#e5534b',
  green: '#58b368',
  blue: '#4fc3f7',
  nightTint: '#0a1030',
  duskTint: '#3a1c5e',
  dawnTint: '#ff9e5e',
  lampGlow: '#ffd98a',
  neon: '#ff5da2',
};

// How the light changes through the day. Each row covers part of the clock:
// the tint colour, how much it darkens the scene, how bright the lamps burn,
// and the phase's name for the HUD. The game opens at 17:40, golden hour.
export const LIGHTING = [
  { from: 5 * 60, to: 7 * 60, tint: '#ffb37a', alpha: 0.10, lamps: 0.15, name: 'dawn' },
  { from: 7 * 60, to: 16 * 60 + 30, tint: '#fff3c9', alpha: 0.00, lamps: 0.0, name: 'day' },
  { from: 16 * 60 + 30, to: 18 * 60 + 30, tint: '#ff8c4a', alpha: 0.14, lamps: 0.25, name: 'golden hour' },
  { from: 18 * 60 + 30, to: 20 * 60, tint: '#5a2a7a', alpha: 0.28, lamps: 0.7, name: 'dusk' },
  { from: 20 * 60, to: 24 * 60, tint: '#0a1030', alpha: 0.42, lamps: 1.0, name: 'night' },
  { from: 0, to: 5 * 60, tint: '#0a1030', alpha: 0.42, lamps: 1.0, name: 'night' },
];

// The in-game clock: one real second is one game minute, starting at 17:40.
export const CLOCK = { startMinutes: 17 * 60 + 40, minutesPerSecond: 1 };

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';
export const FONT_DISPLAY = '"Arial Black", "Segoe UI", system-ui, sans-serif';

// Bay weather: storms roll in off the sea on their own schedule. Rain
// slicks the roads (cars grip worse and traffic slows), lightning flashes
// the sky, and thunder follows a beat later. The clock keeps running
// underneath it all — a storm at golden hour is the best light in the bay.
export const WEATHER = {
  clearMin: 45, // seconds of clear sky before the clouds gather
  clearMax: 110,
  gatherSeconds: 14, // clouds thicken, a few drops first
  stormMin: 35, // the downpour itself
  stormMax: 80,
  clearingSeconds: 10,
  maxIntensity: 1, // 0 is dry, 1 is a full bay storm
  gripLoss: 0.28, // how much grip rain takes off the roads at full storm
  trafficSlow: 0.75, // traffic speed multiplier at full storm
  streaks: 220, // rain streaks drawn across the viewport
  streakSpeed: 900,
  lightningEveryMin: 6, // seconds between flashes, at the storm's peak
  lightningEveryMax: 16,
};

// Motorbikes: two wheels, no roof, no mercy. A bike out-accelerates every
// car in the bay and threads gaps a car cannot, but it leans hard into
// corners, it throws its rider when it hits something solid at speed, and
// the police love chasing one. Four are parked around the bay.
export const BIKE = {
  length: 46,
  width: 14,
  accel: 560,
  brake: 700,
  reverseAccel: 160,
  maxSpeed: 660,
  maxReverse: 120,
  grip: 2.1, // looser than a car: it slides, then bites
  turnRate: 3.9,
  drag: 0.4,
  leanMax: 0.42, // radians of lean into a hard corner
  wheelieSpeed: 420, // above this, hard acceleration lifts the front wheel
  throwSpeed: 320, // hitting a building above this throws the rider off
};

// Spray & Go: Mara's Garage and the Sunset Spray shop on the west side.
// Drive a hurt car into the bay and the crew fixes it — for a price that
// grows with the damage — and a fresh coat of paint is on the house once
// the car is roadworthy again. A spiked car (see SPIKES) has to be fixed
// here before it ever drives straight again.
export const GARAGE = {
  repairPerHealth: 4, // dollars per point of health restored
  repairMin: 40,
  repaintFree: true, // a repaint rides along with any repair
  repaintOnly: 150, // a paint job with no repair
  paints: ['#d64545', '#f39c12', '#4a90d9', '#8e44ad', '#3d9970', '#e8e8e8', '#2c3e50', '#ff5d8f'],
  bayRadius: 90, // how close the car has to be to the bay door
};

// Stunt jumps: wooden ramps the bay's kids built on the beach road, the
// docks, the airfield and the stadium lot. Hit one fast and the car flies;
// the longer it stays up and the further it travels, the bigger the payout.
// Land badly (on a building) and the landing hurts.
export const STUNTS = {
  minSpeed: 300, // slower than this, the ramp is just a bump
  airScorePerSecond: 120, // dollars per second of air
  airScorePerMetre: 2, // dollars per metre travelled in the air
  bestBonus: 250, // extra when a jump beats your best air time
  gravity: 520, // how fast a flying car falls back down
  launchBoost: 300, // upward kick off the ramp lip
};

// Spike strips: at four stars the PD starts dropping them ahead of you.
// A strip is a black mat of steel teeth across the road — drive over one
// and your tyres are gone: top speed nearly halves and the car pulls to
// one side until a garage fixes it. The strips fade once the heat is gone.
export const SPIKES = {
  stars: 4,
  interval: 18, // seconds between drops
  maxStrips: 3,
  speedFactor: 0.45, // top speed left with popped tyres
  pull: 0.9, // sideways pull while spiked, radians per second
  stripLength: 60,
};

// The bay's radio: three stations, all synthesised live, switched with C.
// Sunset FM is the driving bassline; Neon Nights is a faster synthwave
// arpeggio for chases; Coral Chill is slow jazz chords for a night cruise.
// The station shows on the HUD, and the music only plays while you drive.
export const RADIO = {
  stations: ['Sunset FM', 'Neon Nights', 'Coral Chill'],
  stepDur: [0.16, 0.12, 0.24],
};
