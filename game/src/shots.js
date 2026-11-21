// Screenshot scenes — deterministic staged states for ?shot=. Each scene
// freezes the world (no time advance, fixed G.time) so a re-take is
// byte-identical, and every number on the HUD is set explicitly.
import { forceStorm, updateWeather } from './weather.js';
import { makeVehicle } from './vehicles.js';
import { startMission } from './missions.js';
import { clamp } from './random.js';

// 97 MPH on the speedometer: mph = speed * 0.22.
const MPH97 = 441;
const MPH90 = 409;

export function stageShot(G, name) {
  const p = G.player;
  G.messages = [];
  G.photo = false;
  G.mode = 'playing';
  G.time = 12.5; // fixed, so wheel spin / rain pulse never change the shot
  G.clock = 17.5;
  if (name === 'title') {
    G.mode = 'title';
    p.x = G.city.spawn.x;
    p.y = G.city.spawn.y;
    G.camera.x = p.x;
    G.camera.y = p.y;
    return;
  }
  if (name === 'chase') {
    // A four-star getaway downtown in a bay storm.
    forceStorm(G.weather);
    G.camera.x = 1700;
    G.camera.y = 1050;
    updateWeather(G.weather, 2, G.rng, G.camera);
    const car = makeVehicle('car', 1700, 1050, '#d64545', G.rng);
    car.parked = false;
    car.angle = 0;
    car.speed = MPH97;
    G.vehicles.push(car);
    p.vehicle = car;
    p.onFoot = false;
    p.x = car.x; p.y = car.y; p.angle = 0;
    p.cash = 2450;
    p.rep = 34;
    G.wanted.heat = 92;
    G.wanted.stars = 4;
    // Three cruisers, a roadblock and a spike strip ahead of the player.
    const spots = [[1450, 1000], [1900, 1150], [1750, 850]];
    for (const [x, y] of spots) {
      const c = makeVehicle('car', x, y, '#1e3a5f', G.rng);
      c.parked = false;
      c.cruiser = true;
      c.angle = Math.PI;
      c.speed = 300;
      G.wanted.cruisers.push(c);
    }
    G.wanted.heli = { x: 1700, y: 800, angle: 0, t: 2 };
    G.wanted.roadblocks.push({ x: 2100, y: 1050, angle: Math.PI / 2, t: 40 });
    G.wanted.spikes.push({ x: 1950, y: 1050, angle: 0, t: 30 });
    // A mission in progress so the objective shows.
    startMission(G, 3); // Getaway
    G.missions.step = 0;
    return;
  }
  if (name === 'pier') {
    // On foot at the pier for The Drop.
    G.camera.x = 1845;
    G.camera.y = 2470;
    p.onFoot = true;
    p.vehicle = null;
    p.x = 1845;
    p.y = 2470;
    p.angle = Math.PI / 2;
    p.cash = 1250;
    p.rep = 22;
    startMission(G, 1); // The Drop
    return;
  }
  if (name === 'race') {
    // Sunset Grand Prix, checkpoint 2 of 9, on the beach road.
    G.camera.x = 1500;
    G.camera.y = 2250;
    const car = makeVehicle('car', 1500, 2250, '#3d8bfd', G.rng);
    car.parked = false;
    car.angle = 0;
    car.speed = MPH90;
    G.vehicles.push(car);
    p.vehicle = car;
    p.onFoot = false;
    p.x = car.x; p.y = car.y; p.angle = 0;
    p.cash = 3100;
    p.rep = 48;
    startMission(G, 4); // Sunset Grand Prix
    G.missions.raceCp = 1;
    return;
  }
}
