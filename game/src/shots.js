// Palmera Bay — Sunset Run: deterministic screenshot scenes.
// ?shot=chase|play|race|title stages one fixed moment of the game, so the
// screenshots show the city at its best and re-take identically. The scene
// sets positions, heat, weather and the clock directly — no gameplay runs
// while staging, so nothing random can move between two takes.

import { WORLD } from './config.js';
import { makeCar, makeBike } from './vehicles.js';
import { makePerson } from './people.js';
import { currentMission } from './missions.js';

export function shotList() {
  return [
    { name: '1-chase.jpg', query: '?shot=chase&seed=1' },
    { name: '2-pier.jpg', query: '?shot=play&seed=1' },
    { name: '3-race.jpg', query: '?shot=race&seed=1' },
    { name: '4-title.jpg', query: '?shot=title&seed=1' },
  ];
}

function placePlayerInCar(G, x, y, angle, speed, color) {
  const car = makeCar(x, y, angle, { driver: 'player', color });
  car.speed = speed;
  G.vehicles.push(car);
  G.player.vehicle = car;
  G.player.x = x;
  G.player.y = y;
  G.player.angle = angle;
  G.camera.x = x;
  G.camera.y = y;
  return car;
}

function setWanted(G, stars) {
  const heatFor = [0, 60, 260, 460, 660, 920];
  G.wanted.heat = heatFor[stars];
  G.wanted.stars = stars;
}

function addCruiser(G, x, y, angle) {
  const c = makeCar(x, y, angle, { driver: 'police', color: '#222831', model: 'cruiser' });
  c.police = true;
  c.speed = 380;
  G.wanted.cruisers.push(c);
  G.vehicles.push(c);
  return c;
}

export function setupShot(G, name) {
  // Freeze the clock in golden hour for every scene except the race's dusk.
  G.clock = 17.6;
  G.mode = 'play';
  if (name === 'chase') {
    // A 4-star getaway downtown in a bay storm: cruisers, a roadblock,
    // spike strips and the helicopter overhead.
    G.weather.phase = 'storm';
    G.weather.intensity = 0.95;
    G.weather.nextChange = 9999;
    placePlayerInCar(G, 1900, 1100, 0, 540, '#d94f3d');
    G.speedMph = 97; // staged speed: the HUD reads this in shot mode
    setWanted(G, 4);
    addCruiser(G, 1650, 1100, 0);
    addCruiser(G, 2150, 1050, Math.PI);
    addCruiser(G, 1900, 850, Math.PI / 2);
    G.wanted.heli = { x: 1900, y: 900, angle: 0.6, light: 0.4 };
    G.wanted.roadblocks = [{ kind: 'roadblock', x: 2300, y: 1100, angle: Math.PI / 2, w: 90, h: 26 }];
    G.wanted.strips = [{ kind: 'spike', x: 2150, y: 1100, angle: Math.PI / 2, w: 80, h: 14, used: false }];
    G.story.index = 3;
    G.story.active = true;
    G.story.step = 1;
    G.cash = 1840;
    G.rep = 42;
  } else if (name === 'play') {
    // On foot on the boardwalk with the package, a bike waiting, the Bay
    // Wheel behind — close enough to see the pier, far enough from the
    // target that the mission does not complete while staging.
    G.player.x = 3180;
    G.player.y = 1150;
    G.player.angle = 0;
    G.camera.x = 3180;
    G.camera.y = 1150;
    const bike = makeBike(3200, 1300, 0, { driver: 'parked' });
    G.vehicles.push(bike);
    G.story.index = 1;
    G.story.active = true;
    G.story.step = 0;
    G.cash = 560;
    G.rep = 18;
    // A couple of pedestrians for life.
    G.people.push(makePerson(3180, 1100, 'walker'));
    G.people.push(makePerson(3300, 1350, 'jogger'));
  } else if (name === 'race') {
    // Checkpoint 2 of 9 down the beach road, past the boardwalk and the
    // Bay Wheel, at 90 MPH.
    G.clock = 18.4;
    placePlayerInCar(G, 3080, 760, Math.PI / 2, 500, '#3d7dd9');
    G.speedMph = 90; // staged speed: the HUD reads this in shot mode
    G.story.index = 4;
    G.story.active = true;
    G.story.step = 0;
    G.story.raceCp = 2;
    G.story.timer = 62;
    G.cash = 920;
    G.rep = 30;
    addCruiser(G, 3080, 500, Math.PI / 2);
    G.people.push(makePerson(3120, 980, 'jogger'));
  } else {
    // Title: the game idles behind the menu, twelve missions listed.
    G.mode = 'title';
    G.camera.x = 1900;
    G.camera.y = 1300;
    G.cash = 120;
    G.rep = 0;
  }
  // The objective line and minimap marker for the staged mission.
  const m = currentMission(G.story);
  G.objective = m ? `${m.name}: ${m.steps[G.story.step]?.label || ''}` : '';
  G.missionTarget = null;
  if (name === 'chase') G.missionTarget = { x: 760, y: 560 };
  if (name === 'play') G.missionTarget = { x: 3300, y: 1222 };
  if (name === 'race') G.missionTarget = { x: 3080, y: 980 };
}
