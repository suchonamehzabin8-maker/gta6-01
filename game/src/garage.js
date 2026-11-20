// Spray & Go: the bay's garages. Mara's Garage on the west side and the
// Sunset Spray shop by the park both fix a hurt car — for a price that
// grows with the damage — and a fresh coat of paint rides along with any
// repair. A car with popped tyres (spike strips) pulls to one side and
// crawls until a garage fixes it, so a garage is also the only cure for
// that. Drive into the bay, press G, and the crew gets to work.
import { GARAGE } from './config.js';
import { PLACES } from './city.js';

// The two bays, in world coordinates. `place` names the city place they
// sit on, so the minimap and the mission arrow can find them.
export const GARAGE_BAYS = [
  { place: 'garage', x: PLACES.garage.x, y: PLACES.garage.y, name: "Mara's Garage" },
  { place: 'spray', x: PLACES.spray.x, y: PLACES.spray.y, name: 'Sunset Spray' },
];

export function createGarage() {
  return {
    paintIndex: 0, // which colour the next repaint uses
    fixing: 0, // seconds left on the current repair job, 0 when idle
    fixingCar: null,
    fixedTotal: 0, // dollars spent on repairs this session
    repaints: 0, // paint jobs done this session
  };
}

// The bay a car is sitting in right now, or null when it is not in one.
export function bayForCar(garage, car) {
  if (!car) return null;
  for (const bay of GARAGE_BAYS) {
    if (Math.hypot(car.x - bay.x, car.y - bay.y) < GARAGE.bayRadius) return bay;
  }
  return null;
}

// What a repair would cost for this car: by the damage, with a floor.
export function repairCost(car) {
  if (!car) return 0;
  const missing = Math.max(0, 100 - car.health);
  return Math.max(GARAGE.repairMin, Math.round(missing * GARAGE.repairPerHealth));
}

// The prompt the HUD shows when the player's car is in a bay.
export function garagePrompt(garage, car) {
  const bay = bayForCar(garage, car);
  if (!bay) return '';
  if (garage.fixing > 0) return 'Crew is on it…';
  const cost = repairCost(car);
  const hurt = car.health < 100 || car.spiked;
  if (!hurt) return `${bay.name} — press G for a fresh coat ($${GARAGE.repaintOnly})`;
  return `${bay.name} — press G to repair + repaint ($${cost})`;
}

// Start a repair (or a paint-only job) when the player presses G in a bay.
// Returns a message for the HUD, or '' when nothing happened.
export function startGarageJob(garage, game) {
  const car = game.playerCar;
  const bay = bayForCar(garage, car);
  if (!bay || garage.fixing > 0) return '';
  const cost = repairCost(car);
  const hurt = car.health < 100 || car.spiked;
  const price = hurt ? cost : GARAGE.repaintOnly;
  if (game.progress.cash < price) {
    return `Not enough cash — the job costs $${price}.`;
  }
  game.progress.cash -= price;
  garage.fixing = hurt ? 2.2 : 1.2;
  garage.fixingCar = car;
  garage.pendingPaint = true;
  garage.pendingPrice = price;
  return hurt ? `Repairing… $${price} (fresh paint included)` : `Painting… $${price}`;
}

// Advance the repair job; when it finishes, the car is whole again, with
// a new coat of paint and straight tyres.
export function updateGarage(garage, dt, game) {
  if (garage.fixing <= 0) return;
  garage.fixing -= dt;
  if (garage.fixing > 0) return;
  const car = garage.fixingCar;
  garage.fixingCar = null;
  if (!car || car.wreck) return;
  const wasHurt = car.health < 100 || car.spiked;
  car.health = 100;
  car.smoke = 0;
  car.spiked = false;
  car.spikePull = 0;
  garage.paintIndex = (garage.paintIndex + 1) % GARAGE.paints.length;
  car.color = GARAGE.paints[garage.paintIndex];
  if (wasHurt) {
    garage.fixedTotal += garage.pendingPrice || 0;
    game.message = `Fixed and repainted — ${car.name} looks brand new.`;
  } else {
    garage.repaints += 1;
    game.message = `Fresh paint — ${car.name} in ${car.color}.`;
  }
  game.messageTimer = 3;
  if (game.saveGame) game.saveGame(game);
}
