// Stunt jumps: wooden ramps the bay's kids built where the roads run
// straight — the beach road, the docks, the airfield and the stadium lot.
// Hit one fast and the car flies; the longer it stays up and the further
// it travels, the bigger the payout, and beating your best air time pays
// a bonus on top. Land on a building and the landing hurts. The ramps are
// fixed to the city, so the same seed always puts them in the same spots.
import { STUNTS } from './config.js';
import { hitBuilding } from './city.js';

// The ramps: a spot, the direction a car should be travelling to catch
// the lip, and a name the HUD can shout about.
export const RAMPS = [
  { x: 1200, y: 2330, angle: 0, name: 'Beach Road Ramp' },
  { x: 260, y: 1750, angle: Math.PI / 2, name: 'Docks Ramp' },
  { x: 3350, y: 1150, angle: Math.PI, name: 'Airfield Ramp' },
  { x: 2900, y: 2050, angle: -Math.PI / 2, name: 'Stadium Ramp' },
];

export function createStunts() {
  return {
    bestAir: 0, // best air time this session, seconds
    bestDistance: 0, // best air distance this session, metres
    jumps: 0, // jumps landed this session
    earned: 0, // dollars earned from jumps this session
    popup: '', // text for the HUD popup, '' when nothing to show
    popupTimer: 0,
    lastRamp: -1, // the ramp of the jump in progress, -1 when grounded
  };
}

// The ramp under a car right now, if it is lined up with the lip.
function rampUnder(car) {
  for (let i = 0; i < RAMPS.length; i += 1) {
    const r = RAMPS[i];
    if (Math.hypot(car.x - r.x, car.y - r.y) > 46) continue;
    let diff = Math.abs(car.angle - r.angle);
    while (diff > Math.PI) diff = Math.PI * 2 - diff;
    if (diff < 0.7) return i;
  }
  return -1;
}

// Advance the stunt system one step. `car` is the player's car (or null
// on foot). `game` is the live game, for cash, messages and the city.
export function updateStunts(stunts, car, dt, game) {
  if (stunts.popupTimer > 0) stunts.popupTimer -= dt;
  if (!car || car.wreck) return;

  // A flying car: keep it moving, let gravity pull it back down, and
  // score the flight when it lands.
  if (car.air > 0) {
    car.airTime = (car.airTime || 0) + dt;
    car.airVel -= STUNTS.gravity * dt;
    car.air += car.airVel * dt;
    car.x += Math.cos(car.angle) * car.speed * dt;
    car.y += Math.sin(car.angle) * car.speed * dt;
    if (car.air <= 0) {
      car.air = 0;
      const airTime = car.airTime || 0;
      const airDist = (car.airDistance || 0) / 10; // metres
      car.airTime = 0;
      car.airDistance = 0;
      const beatBest = airTime > stunts.bestAir;
      let payout = Math.round(airTime * STUNTS.airScorePerSecond + airDist * STUNTS.airScorePerMetre);
      if (beatBest) payout += STUNTS.bestBonus;
      if (airTime > 0.5 && payout > 0) {
        stunts.jumps += 1;
        stunts.earned += payout;
        game.progress.cash += payout;
        stunts.bestAir = Math.max(stunts.bestAir, airTime);
        stunts.bestDistance = Math.max(stunts.bestDistance, airDist);
        stunts.popup = `AIR ${airTime.toFixed(1)}s — ${Math.round(airDist)}m — +$${payout}${beatBest ? '  NEW BEST!' : ''}`;
        stunts.popupTimer = 3;
        if (game.playSfx) game.playSfx('stunt');
      }
      // Landing on a building hurts — the ramp spots are on open road,
      // so a bad line is the only way this happens.
      if (hitBuilding(game.city, car.x, car.y, 20)) {
        car.health = Math.max(0, car.health - 30);
        if (game.playSfx) game.playSfx('crash');
      }
    }
    return;
  }

  // Grounded and fast over a ramp lip: take off.
  const ramp = rampUnder(car);
  if (ramp >= 0 && Math.abs(car.speed) >= STUNTS.minSpeed) {
    car.air = 1;
    car.airVel = STUNTS.launchBoost;
    car.airTime = 0;
    car.airDistance = 0;
    stunts.lastRamp = ramp;
  }
  if (car.air > 0) car.airDistance = (car.airDistance || 0) + Math.abs(car.speed) * dt;
}
