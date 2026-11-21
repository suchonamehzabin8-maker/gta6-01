// Palmera Bay — Sunset Run: tuning constants. One place for every number the
// designers reach for, so a balance pass never has to hunt through modules.
export const WORLD = { w: 3600, h: 2600 };
export const SEED = 20261120;

// Roads: the city is a grid; traffic, missions and the race route all use it.
export const ROAD_HALF = 30; // half-width of a road in world units
export const ROADS_V = [300, 700, 1100, 1500, 1900, 2300, 2700, 3100];
export const ROADS_H = [250, 650, 1050, 1450, 1850, 2250];

// The beach band and the water south of it.
export const BEACH_TOP = 2320;
export const WATER_TOP = 2500;

// The player on foot.
export const PLAYER = {
  walkSpeed: 195,
  runSpeed: 265,
  radius: 13,
  maxHp: 100,
  punchDamage: 22,
  punchRange: 34,
  punchCooldown: 0.38,
};

// Arcade driving.
export const CAR = {
  accel: 540,
  reverseAccel: 300,
  maxSpeed: 640,
  maxReverse: 240,
  turnRate: 2.5,
  grip: 0.92,
  radius: 17,
  damageSmoke: 45,
  damageWreck: 100,
};
export const BIKE = {
  accel: 660,
  reverseAccel: 260,
  maxSpeed: 720,
  maxReverse: 200,
  turnRate: 3.1,
  grip: 0.88,
  radius: 12,
};

// Weapons: damage, seconds between shots, spread in radians, pellet count.
export const WEAPONS = {
  pistol: { name: 'Pistol', damage: 34, rate: 0.26, spread: 0.045, pellets: 1, range: 520, infinite: true },
  smg: { name: 'Spray Gun', damage: 15, rate: 0.07, spread: 0.11, pellets: 1, range: 460, infinite: false },
  shotgun: { name: 'Boomstick', damage: 13, rate: 0.85, spread: 0.22, pellets: 6, range: 300, infinite: false },
};
export const WEAPON_ORDER = ['pistol', 'smg', 'shotgun'];

// Wanted: heat thresholds for each star, and how heat behaves.
export const STAR_HEAT = [15, 35, 60, 85, 105];
export const HEAT = {
  max: 120,
  stealCar: 14,
  shoot: 6,
  killCop: 18,
  hitPed: 8,
  decayVisible: 1.6,
  decayHidden: 5.5,
  decayDriving: 2.2,
};

// Money.
export const PRICES = {
  repairPerDamage: 3,
  repaint: 150,
  taxiBase: 60,
  tokenBonus: 250,
};
export const STUNT = { perSecondAir: 120, perMetre: 4, bestBonus: 500 };

// The day runs 24h of clock in ~12 minutes of play; golden hour at 17:30.
export const CLOCK = { start: 17.5, dayLength: 720 };

// Radio stations (the synth patterns live in radio.js).
export const STATIONS = ['Sunset FM', 'Neon Nights', 'Coral Chill'];

// Screenshot scenes, in the order they are named on disk.
export const SHOTS = ['chase', 'pier', 'race', 'title'];
