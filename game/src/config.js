// Palmera Bay — Sunset Run: shared tuning and world constants.
// One place for every number the other modules agree on, so a tweak here
// retunes the whole game instead of hunting through files.

export const WORLD = {
  w: 3600,
  h: 2600,
  roadW: 64,
  // Vertical avenues and horizontal streets; the grid they make is the city.
  roadsX: [300, 700, 1100, 1500, 1900, 2300, 2700, 3100],
  roadsY: [300, 700, 1100, 1500, 1900, 2300],
  // The bay: sand starts here, open water here. The pier reaches past both.
  sandX: 3150,
  waterX: 3340,
  seed: 20261124,
};

export const PLAYER = {
  walkSpeed: 235,
  runSpeed: 300,
  radius: 14,
  maxHealth: 100,
  punchDamage: 34,
  punchRange: 46,
  punchArc: 1.1,
  punchCooldown: 0.45,
};

export const CAR = {
  accel: 520,
  brake: 900,
  reverseAccel: 320,
  maxSpeed: 560,
  maxReverse: 160,
  turnRate: 2.6,
  grip: 0.92,
  handbrakeGrip: 0.35,
  radius: 26,
};

export const BIKE = {
  accel: 640,
  brake: 950,
  maxSpeed: 640,
  turnRate: 3.1,
  radius: 16,
  throwOffSpeed: 430,
};

export const TRAFFIC = {
  count: 26,
  cruiseSpeed: 150,
  minGap: 90,
  spawnMargin: 120,
};

export const HEAT = {
  // Heat points -> wanted stars.
  thresholds: [40, 250, 450, 650, 900],
  decayPerSec: 6,
  hiddenDecayPerSec: 22,
  stealCar: 60,
  shoot: 45,
  killCop: 260,
  hitPed: 90,
  killPed: 150,
  max: 1000,
};

export const PRICES = {
  repairPerHealth: 4,
  repaint: 60,
  tyreFix: 40,
};

export const WEAPONS = {
  pistol: { name: 'Pistol', damage: 34, rate: 0.28, spread: 0.05, speed: 900, range: 520, pellets: 1, ammo: Infinity, auto: false },
  smg: { name: 'Spray Gun', damage: 16, rate: 0.09, spread: 0.14, speed: 950, range: 460, pellets: 1, ammo: 240, auto: true },
  boomstick: { name: 'Boomstick', damage: 22, rate: 0.85, spread: 0.32, speed: 780, range: 380, pellets: 6, ammo: 36, auto: false },
};

export const COLORS = {
  grass: '#7fae5a',
  grassDark: '#6f9e4e',
  park: '#5da24a',
  sand: '#e8d39a',
  water: '#2e7fa8',
  waterDeep: '#1f6391',
  road: '#3a3f46',
  roadLine: '#e8d44f',
  sidewalk: '#9aa0a3',
  downtown: '#8a7f9e',
  building: ['#b5674e', '#c98a5a', '#7d8aa8', '#a87d9e', '#6f9e8a', '#b5a05a', '#8a6f5a', '#5a7fa8'],
  glass: '#9fd8e8',
  pierWood: '#8a6f4d',
  boardwalk: '#c9a06a',
  awning: ['#e85a5a', '#5aa8e8', '#e8b45a', '#7ed67e'],
  neonPink: '#ff5ad0',
  neonCyan: '#4fe8ff',
  neonGold: '#ffd94f',
};

export const KEYS = {
  up: ['KeyW', 'ArrowUp'],
  down: ['KeyS', 'ArrowDown'],
  left: ['KeyA', 'ArrowLeft'],
  right: ['KeyD', 'ArrowRight'],
};
