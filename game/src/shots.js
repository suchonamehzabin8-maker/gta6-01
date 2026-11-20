// Fixed scenes for screenshots: ?shot=chase|play|race|title. Each one stages
// the real game — the same world, rules and HUD a player sees — then plays it
// forward a few seconds with a simple autopilot, so the frame is what real
// play looks like and the same seed always gives the same frame. The chase
// scene stages a bay storm too, so the rain and the wet roads show.
import { STEP } from './config.js';
import { SCREEN_TITLE, SCREEN_PLAY } from './render.js';
import { PLACES } from './city.js';
import { makeCar } from './vehicles.js';
import { addHeat, clearWanted } from './wanted.js';
import { startMission } from './missions.js';
import { forceStorm } from './weather.js';

// Drive toward a point: steer, throttle, brake when close. The input shape
// matches the real keyboard input (pressed/keys included) so the game loop
// never trips on a missing field while a shot is staging.
function makeShotInput() {
  return {
    up: false, down: false, left: false, right: false, handbrake: false,
    firing: false, mouseX: 640, mouseY: 360, mouseClicked: false,
    pressed: {}, keys: {},
  };
}

function autopilotDrive(game, target) {
  const car = game.playerCar;
  if (!car) return;
  const want = Math.atan2(target.y - car.y, target.x - car.x);
  let diff = want - car.angle;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  game.shotInput = makeShotInput();
  game.shotInput.up = Math.abs(diff) < 1.2;
  game.shotInput.left = diff < -0.08;
  game.shotInput.right = diff > 0.08;
}

export function stageShot(name, game) {
  game.screen = SCREEN_PLAY;
  game.resetWorld();
  const g = game;
  // Staged shots should show the scene, not a random taxi fare: keep the
  // taxi timer far in the future while the scene plays out.
  g.taxi.timer = 9999;
  if (name === 'title') {
    game.screen = SCREEN_TITLE;
    return;
  }
  if (name === 'race') {
    // Sunset Grand Prix: on the beach road, rivals alongside, checkpoint 1 ahead.
    startMission(g.progress, g.mission, 4);
    g.player.x = 1500;
    g.player.y = 2330;
    g.player.angle = 0;
    const car = makeCar(1500, 2330, 0, { name: 'Coral GT', color: '#f39c12', speed: 1.15 });
    car.driver = 'player';
    g.cars.push(car);
    g.playerCar = car;
    for (let i = 0; i < 3; i += 1) {
      const rival = makeCar(1440 - i * 70, 2330 + (i % 2 ? 30 : -30), 0, { name: 'Rival', color: ['#d64545', '#4a90d9', '#8e44ad'][i], speed: 1.0 });
      rival.driver = 'rival';
      rival.raceIndex = 0;
      g.cars.push(rival);
    }
    for (let i = 0; i < 90; i += 1) {
      autopilotDrive(g, { x: 2600, y: 2330 });
      g.step(STEP, g.shotInput);
    }
    // The frame should show the race, not the wanted heat from a
    // pedestrian the autopilot bumped on the way.
    clearWanted(g.wanted);
    g.message = '';
    g.messageTimer = 0;
    return;
  }
  if (name === 'play') {
    // On foot at the pier, mid-mission: package run, peds and traffic around.
    startMission(g.progress, g.mission, 1);
    g.player.x = PLACES.pier.x - 60;
    g.player.y = PLACES.pier.y - 160;
    g.player.angle = Math.PI / 2;
    g.camera.x = g.player.x;
    g.camera.y = g.player.y - 150; // frame more land, less empty sea
    for (let i = 0; i < 120; i += 1) {
      g.step(STEP, makeShotInput());
    }
    g.camera.y = g.player.y - 150;
    return;
  }
  // Default: 'chase' — the cover. A four-star getaway downtown: police
  // cruisers on the tail, roadblocks ahead, and the helicopter overhead.
  // The escape runs straight east along the 1150 street, so the car keeps
  // its speed instead of clipping building corners on a diagonal.
  startMission(g.progress, g.mission, 3);
  g.mission.step = 1; // escape step: reach the safehouse
  g.player.x = 1500;
  g.player.y = 1150;
  g.player.angle = 0;
  const car = makeCar(1500, 1150, 0, { name: 'Neon Coupe', color: '#8e44ad', speed: 1.2 });
  car.driver = 'player';
  g.cars.push(car);
  g.playerCar = car;
  addHeat(g.wanted, 330, 0); // four stars: cruisers, roadblocks, helicopter
  // No spike strips in this scene: the cover shot is a fast getaway, and
  // a strip ahead would slow the car to a crawl before the frame is taken.
  g.wanted.spikeTimer = 9999;
  // A bay storm rolls in over the chase: the rain shows, the roads are wet
  // and slick, and the helicopter's searchlight cuts through the downpour.
  // The storm is staged at full strength so the frame shows it, and the
  // 200 steps below keep it stormy to the end of the scene.
  forceStorm(g.weather);
  g.weather.phase = 'storm';
  g.weather.intensity = 1;
  g.weather.wet = 1;
  g.weather.timer = 30;
  // 200 steps at full speed carries the car to about x=3200 — still
  // flying east when the frame is taken, never turning back on itself.
  for (let i = 0; i < 200; i += 1) {
    autopilotDrive(g, { x: 3400, y: 1150 });
    g.step(STEP, g.shotInput);
    if (g.wanted.stars < 4) addHeat(g.wanted, 40, 0);
  }
  // The frame should show the chase, not a stray toast from the staging
  // (a pedestrian bumped on the way, or a spike warning).
  g.message = '';
  g.messageTimer = 0;
}
