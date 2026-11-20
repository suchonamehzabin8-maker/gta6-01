// Palmera Bay — Sunset Run: the game loop and wiring. Fixed 60 Hz steps,
// screens (title / play / pause / wasted / busted / complete), saving, and
// every interaction: steal a car, drive, shoot, punch, taxi fares, tokens,
// missions, the wanted system and the police helicopter.
import { VIEW, WORLD, STEP, SAVE_KEY, PLAYER, CAR, CLOCK, MISSIONS } from './config.js';
import { buildCity, resolveBuildings, clampWorld, PLACES, isRoad } from './city.js';
import { mulberry32, pick, range } from './random.js';
import {
  spawnTraffic, spawnParked, nearestCar, drivePlayer, driveBike, updateVehicles,
  makeCar, makeBike, spawnBikes, repairCar, clampAngle, damageCar,
} from './vehicles.js';
import { spawnPeds, updatePeds, updateCops, updateGoons, spawnGoons, makeCop } from './people.js';
import { createWanted, addHeat, clearWanted, updateWanted, updatePoliceCars } from './wanted.js';
import {
  createCombat, shoot, punch, updateBullets, updatePickups, dropPickup,
  dropWeaponPickup, dropShotgunPickup, switchWeapon, currentWeapon,
} from './combat.js';
import {
  STORY, RACE_POINTS, TOKENS, createProgress, createMissionState, startMission,
  updateMission, missionTarget, missionObjectiveText, createTaxi,
} from './missions.js';
import {
  createAudio, ensureAudio, setEngine, setBikeEngine, setSiren, setRotor,
  setRain, thunder, playTone, sfx, toggleMute,
} from './audio.js';
import { createWeather, updateWeather, forceStorm, weatherGripLoss, weatherTrafficFactor } from './weather.js';
import { createGarage, garagePrompt, startGarageJob, updateGarage } from './garage.js';
import { createStunts, updateStunts } from './stunts.js';
import { createRadio, nextStation, updateRadio } from './radio.js';
import { createInput, attachInput, pollInput, wasPressed, consumeWheel, endFrameInput } from './input.js';
import {
  drawGame, SCREEN_TITLE, SCREEN_PLAY, SCREEN_PAUSE,
  SCREEN_OVER, SCREEN_BUSTED, SCREEN_COMPLETE,
} from './render.js';
import { stageShot } from './shots.js';

const SEED = 20261120;

function loadSave() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch { return null; }
}

function saveGame(game) {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify({
      cash: game.progress.cash,
      rep: game.progress.rep,
      tokens: game.progress.tokens,
      missions: game.progress.missionDone,
      fares: game.progress.fares,
      racesWon: game.progress.racesWon,
      bestCash: game.bestCash,
      tokensTaken: game.tokens.map((t) => t.taken),
    }));
  } catch { /* private mode: the game still plays, it just forgets */ }
}

function createStats() {
  return {
    distance: 0, // metres driven this session
    shots: 0,
    carsStolen: 0,
    bestWanted: 0,
    wrecks: 0,
    arrests: 0,
  };
}

export function createGame() {
  const game = {
    screen: SCREEN_TITLE,
    time: 0,
    clockMinutes: CLOCK.startMinutes,
    seed: SEED,
    city: null,
    random: mulberry32(SEED),
    player: {
      x: 1500, y: 1250, angle: 0, health: PLAYER.health,
      moving: false, onFoot: true,
    },
    playerCar: null,
    cars: [],
    peds: [],
    cops: [],
    wanted: createWanted(),
    combat: createCombat(),
    progress: createProgress(),
    mission: createMissionState(),
    taxi: createTaxi(),
    tokens: TOKENS.map((t) => ({ ...t, taken: false })),
    audio: createAudio(),
    input: createInput(),
    camera: { x: 1500, y: 1250 },
    message: '',
    messageTimer: 0,
    bestCash: 0,
    stats: createStats(),
    shotInput: null,
    // The new systems, all created fresh per game: the bay's weather, the
    // Spray & Go garages, the stunt-jump tracker, the radio, and the
    // goons that only exist while the Bayfront Brawl's fight is running.
    weather: createWeather(SEED),
    garage: createGarage(),
    stunts: createStunts(),
    radio: createRadio(),
    goons: [],
    photoMode: false,
    garagePrompt: '',
    // Render helpers, refreshed every step:
    missionTarget: null,
    objectiveText: 'Press N for the next mission — free roam',
    stepTimer: 0,
    missionListText: '',
    raceActive: false,
    racePoints: RACE_POINTS,
    raceCheckpoint: 0,
  };
  game.resetWorld = () => resetWorld(game);
  game.step = (dt, input) => stepGame(game, dt, input);
  game.start = () => beginPlay(game);
  // Helpers the new systems call back through: the garage saves after a
  // repair, and the stunt system plays its sound through the game.
  game.saveGame = () => saveGame(game);
  game.playSfx = (name) => sfx(game.audio, name);
  return game;
}

function resetWorld(game) {
  game.random = mulberry32(SEED);
  game.city = buildCity(SEED);
  game.cars = [];
  game.peds = spawnPeds(game.random, 46);
  game.cops = [];
  game.wanted = createWanted();
  game.combat = createCombat();
  game.weather = createWeather(SEED);
  game.garage = createGarage();
  game.stunts = createStunts();
  game.radio = createRadio();
  game.goons = [];
  game.photoMode = false;
  game.garagePrompt = '';
  game.player = {
    x: 1500, y: 1250, angle: 0, health: PLAYER.health,
    moving: false, onFoot: true,
  };
  game.playerCar = null;
  game.tokens = TOKENS.map((t) => ({ ...t, taken: false }));
  game.taxi = createTaxi();
  game.mission = createMissionState();
  game.stats = createStats();
  game.clockMinutes = CLOCK.startMinutes;
  game.camera = { x: game.player.x, y: game.player.y };
  game.message = '';
  game.messageTimer = 0;
  // spawnTraffic/spawnParked return the cars they place; collect them here.
  // Four motorbikes join them, parked around the bay.
  game.cars = [...spawnTraffic(game.random, 18, game.city), ...spawnParked(game.random, 14), ...spawnBikes(game.random)];
  // Weapon stashes: the spray gun waits at the docks, the marina and the
  // airfield for a player who explores.
  dropWeaponPickup(game.combat, PLACES.docks.x + 60, PLACES.docks.y + 40);
  dropWeaponPickup(game.combat, PLACES.marina.x - 40, PLACES.marina.y + 60);
  dropWeaponPickup(game.combat, PLACES.airport.x + 80, PLACES.airport.y - 40);
  // The boomstick waits at the stadium and the boardwalk — the brawl's
  // neighbourhood, and the beach's.
  dropShotgunPickup(game.combat, PLACES.stadium.x - 120, PLACES.stadium.y + 60);
  dropShotgunPickup(game.combat, PLACES.boardwalk.x + 40, PLACES.boardwalk.y - 40);
  // Health and ammo scattered around the bay.
  dropPickup(game.combat, PLACES.motel.x + 30, PLACES.motel.y + 50, 'health', 50);
  dropPickup(game.combat, PLACES.motel.x - 60, PLACES.motel.y + 20, 'ammo', 60);
  dropPickup(game.combat, PLACES.park.x + 40, PLACES.park.y + 40, 'health', 50);
  dropPickup(game.combat, PLACES.stadium.x + 120, PLACES.stadium.y - 60, 'ammo', 60);
  // Restore a previous save's progress (cash, missions, tokens).
  const save = loadSave();
  if (save) {
    game.progress.cash = save.cash || 0;
    game.progress.rep = save.rep || 0;
    game.progress.tokens = save.tokens || 0;
    game.progress.fares = save.fares || 0;
    game.progress.racesWon = save.racesWon || 0;
    game.bestCash = save.bestCash || 0;
    if (Array.isArray(save.missions)) {
      save.missions.forEach((done, i) => {
        if (done) game.progress.missionDone[i] = true;
      });
    }
    if (Array.isArray(save.tokensTaken)) {
      save.tokensTaken.forEach((taken, i) => {
        if (taken && game.tokens[i]) game.tokens[i].taken = true;
      });
    }
  }
  refreshMissionList(game);
}

function refreshMissionList(game) {
  game.missionListText = STORY.map((m, i) => (game.progress.missionDone[i] ? `✓ ${m.name}` : m.name)).join('  •  ');
}

function showMessage(game, text, seconds = 4) {
  game.message = text;
  game.messageTimer = seconds;
}

// A mission's hook runs when it starts: the Storm Runner calls a storm
// down over the bay, and the Bayfront Brawl's goons are spawned when its
// fight step begins (see stepGame, after updateMission).
function runMissionHook(game, mission) {
  if (mission.hook === 'storm') {
    forceStorm(game.weather);
    showMessage(game, 'A storm is rolling in off the sea…', 3);
  }
}

function beginPlay(game) {
  game.screen = SCREEN_PLAY;
  ensureAudio(game.audio);
  showMessage(game, 'Mara: "Welcome to Palmera Bay. Press N when you want work."', 5);
}

function damagePlayer(game, amount) {
  game.player.health -= amount;
  if (game.player.health <= 0) {
    game.player.health = 0;
    game.screen = SCREEN_OVER;
    sfx(game.audio, 'fail');
  }
}

// Rival racers: steer toward the next checkpoint, rubber-banding a little so
// the pack stays close without ever catching a perfect line.
function updateRaceCars(game, dt) {
  if (!game.raceActive) return;
  for (const car of game.cars) {
    if (car.driver !== 'rival') continue;
    const cp = RACE_POINTS[Math.min(car.raceIndex || 0, RACE_POINTS.length - 1)];
    const d = Math.hypot(cp.x - car.x, cp.y - car.y);
    if (d < 90) {
      car.raceIndex = (car.raceIndex || 0) + 1;
      continue;
    }
    const want = Math.atan2(cp.y - car.y, cp.x - car.x);
    car.angle += clampAngle(want - car.angle) * Math.min(1, dt * 2.2);
    const target = 430 + (game.playerCar ? 30 : 0);
    car.speed = Math.min(car.speed + 420 * dt, target);
    car.x += Math.cos(car.angle) * car.speed * dt;
    car.y += Math.sin(car.angle) * car.speed * dt;
    clampWorld(car, 34);
  }
}

function hitBuildingPoint(city, x, y) {
  for (const b of city.buildings) {
    if (x > b.x - 4 && x < b.x + b.w + 4 && y > b.y - 4 && y < b.y + b.h + 4) return true;
  }
  return false;
}

function stepGame(game, dt, input) {
  if (game.screen !== SCREEN_PLAY) return;
  game.time += dt;
  game.clockMinutes = (game.clockMinutes + CLOCK.minutesPerSecond * dt) % (24 * 60);
  const p = game.player;
  const wanted = game.wanted;
  const combat = game.combat;
  const random = game.random;
  input = input || game.input;

  // --- Input: aim, weapons, pause, mute.
  const scaleX = game.canvasWidth ? game.canvasWidth / VIEW.width : 1;
  const scaleY = game.canvasHeight ? game.canvasHeight / VIEW.height : 1;
  if (!game.playerCar && input.mouseX != null && input.mouseY != null) {
    const wx = game.camera.x + (input.mouseX / scaleX - VIEW.width / 2);
    const wy = game.camera.y + (input.mouseY / scaleY - VIEW.height / 2);
    if (Math.hypot(wx - p.x, wy - p.y) > 40) {
      p.angle = Math.atan2(wy - p.y, wx - p.x);
    }
  }
  if (wasPressed(input, 'Digit1')) {
    if (switchWeapon(combat, 'pistol')) showMessage(game, 'Pistol ready.', 1.5);
  }
  if (wasPressed(input, 'Digit2')) {
    if (switchWeapon(combat, 'smg')) showMessage(game, 'Spray gun ready — hold the mouse to spray.', 2);
    else showMessage(game, 'No spray gun yet — check the docks, marina or airfield.', 2.5);
  }
  if (wasPressed(input, 'Digit3')) {
    if (switchWeapon(combat, 'shotgun')) showMessage(game, 'Boomstick ready — close range, big boom.', 2);
    else showMessage(game, 'No boomstick yet — check the stadium or the boardwalk.', 2.5);
  }
  // The mouse wheel cycles through the weapons you own.
  const wheelTicks = consumeWheel(input);
  if (wheelTicks !== 0) {
    const order = ['pistol', 'smg', 'shotgun'];
    const names = { pistol: 'Pistol', smg: 'Spray gun', shotgun: 'Boomstick' };
    const owned = order.filter((w) => combat.owned[w]);
    if (owned.length > 1) {
      const idx = owned.indexOf(combat.weapon);
      const dir = wheelTicks > 0 ? 1 : owned.length - 1;
      const next = owned[(idx + dir) % owned.length];
      if (next !== combat.weapon) {
        combat.weapon = next;
        showMessage(game, `${names[next]} ready.`, 1.5);
      }
    }
  }
  if (wasPressed(input, 'KeyC')) {
    const station = nextStation(game.radio);
    showMessage(game, `Radio: ${station}`, 2);
  }
  if (wasPressed(input, 'KeyG')) {
    const reply = startGarageJob(game.garage, game);
    if (reply) {
      showMessage(game, reply, 2.5);
      if (reply.startsWith('Repairing') || reply.startsWith('Painting')) sfx(game.audio, 'spray');
    }
  }
  if (wasPressed(input, 'KeyP')) {
    game.photoMode = !game.photoMode;
    showMessage(game, game.photoMode ? 'Photo mode — HUD hidden, press P to exit.' : 'Photo mode off.', 2);
  }
  if (wasPressed(input, 'KeyM')) {
    const muted = toggleMute(game.audio);
    showMessage(game, muted ? 'Sound off.' : 'Sound on.', 1.5);
  }
  if (wasPressed(input, 'Escape')) {
    game.screen = SCREEN_PAUSE;
    return;
  }
  if (wasPressed(input, 'KeyR') && game.mission.active !== null) {
    const idx = game.mission.active;
    startMission(game.progress, game.mission, idx);
    game.goons = [];
    runMissionHook(game, STORY[idx]);
    showMessage(game, `Restarted: ${STORY[idx].name}`, 2);
  }
  if (wasPressed(input, 'KeyN')) {
    const next = game.progress.missionDone.findIndex((done) => !done);
    if (next === -1) {
      showMessage(game, 'All missions done — the city is yours. Free roam!', 4);
    } else if (game.mission.active === null) {
      startMission(game.progress, game.mission, next);
      game.goons = [];
      runMissionHook(game, STORY[next]);
      showMessage(game, STORY[next].briefing, 6);
      sfx(game.audio, 'pickup');
    } else {
      showMessage(game, `Finish "${STORY[game.mission.active].name}" first (R restarts it).`, 3);
    }
  }

  // --- Enter / exit a car.
  if (wasPressed(input, 'KeyE')) {
    if (game.playerCar) {
      const car = game.playerCar;
      car.driver = 'parked';
      game.playerCar = null;
      p.x = car.x + Math.cos(car.angle + Math.PI / 2) * 40;
      p.y = car.y + Math.sin(car.angle + Math.PI / 2) * 40;
      p.onFoot = true;
    } else {
      const car = nearestCar(game.cars, p.x, p.y, 70);
      if (car && !car.wreck && car.driver !== 'roadblock') {
        const wasParked = car.driver === 'parked';
        car.driver = 'player';
        game.playerCar = car;
        p.onFoot = false;
        game.stats.carsStolen += 1;
        if (!wasParked) {
          addHeat(wanted, 45, game.time);
          showMessage(game, 'Stolen! The PD noticed.', 2.5);
          sfx(game.audio, 'horn');
        }
      }
    }
  }

  // --- Movement.
  if (game.playerCar) {
    const car = game.playerCar;
    const beforeX = car.x;
    const beforeY = car.y;
    // Rain takes grip off the roads: steering loosens while it pours.
    const gripFactor = 1 - weatherGripLoss(game.weather);
    if (car.kind === 'bike') driveBike(car, input, dt, gripFactor);
    else drivePlayer(car, input, dt, gripFactor);
    game.stats.distance += Math.hypot(car.x - beforeX, car.y - beforeY);
    // Stunt ramps: a fast car (or bike) over a lip takes off.
    updateStunts(game.stunts, car, dt, game);
    // The player's position follows the car while driving: missions,
    // tokens, the taxi, the cops and the minimap all read the player's
    // position, and without this they would all see the spot where the
    // player got in — a reach objective could never complete from a car.
    p.x = car.x;
    p.y = car.y;
    p.angle = car.angle;
    // Hitting a building at speed damages the car — and throws a rider
    // clean off a bike.
    if (hitBuildingPoint(game.city, car.x, car.y) && Math.abs(car.speed) > 260) {
      if (car.kind === 'bike') {
        damagePlayer(game, 15);
        game.playerCar = null;
        p.x = car.x + 40;
        p.y = car.y + 40;
        p.onFoot = true;
        car.speed = 0;
        showMessage(game, 'Thrown off the bike!', 3);
        sfx(game.audio, 'crash');
      } else {
        damageCar(car, 18);
        sfx(game.audio, 'crash');
      }
    }
    // Running over a pedestrian is a crime.
    for (const ped of game.peds) {
      if (ped.dead) continue;
      if (Math.hypot(ped.x - car.x, ped.y - car.y) < 34 && Math.abs(car.speed) > 120) {
        ped.dead = true;
        addHeat(wanted, 35, game.time);
        showMessage(game, 'You hit a pedestrian! The PD is coming.', 2.5);
        sfx(game.audio, 'crash');
      }
    }
    // Wrecked while driving: the car dies under you and you are on foot.
    if (car.wreck) {
      game.playerCar = null;
      p.x = car.x + 40;
      p.y = car.y + 40;
      p.onFoot = true;
      game.stats.wrecks += 1;
      showMessage(game, 'Your car is a wreck — on foot now!', 3);
      sfx(game.audio, 'wreck');
    }
    if (car.kind === 'bike') {
      setBikeEngine(game.audio, car.speed, true);
      setEngine(game.audio, 0, false);
    } else {
      setEngine(game.audio, car.speed, true);
      setBikeEngine(game.audio, 0, false);
    }
  } else {
    // On foot: WASD, Shift to run, buildings block you.
    const run = !!(input.keys && (input.keys.ShiftLeft || input.keys.ShiftRight));
    const speed = run ? PLAYER.runSpeed : PLAYER.walkSpeed;
    let mx = (input.right ? 1 : 0) - (input.left ? 1 : 0);
    let my = (input.down ? 1 : 0) - (input.up ? 1 : 0);
    const len = Math.hypot(mx, my);
    p.moving = len > 0;
    if (len > 0) {
      mx /= len;
      my /= len;
      p.x += mx * speed * dt;
      p.y += my * speed * dt;
      resolveBuildings(game.city, p, PLAYER.radius);
      clampWorld(p, PLAYER.radius);
    }
    // Fast traffic that hits you on foot hurts.
    for (const car of game.cars) {
      if (car.driver !== 'traffic' && car.driver !== 'police') continue;
      if (Math.hypot(car.x - p.x, car.y - p.y) < 30 && Math.abs(car.speed) > 80) {
        damagePlayer(game, 10);
        p.x += (p.x - car.x) * 0.2;
        p.y += (p.y - car.y) * 0.2;
        sfx(game.audio, 'crash');
      }
    }
    setEngine(game.audio, 0, false);
    setBikeEngine(game.audio, 0, false);
  }

  // --- Combat on foot.
  if (!game.playerCar) {
    const weapon = currentWeapon(combat);
    const wantFire = weapon.auto ? input.firing : input.mouseClicked;
    if (wantFire && combat.ammo > 0) {
      const fired = shoot(combat, p.x + Math.cos(p.angle) * 20, p.y + Math.sin(p.angle) * 20, p.angle, (heat) => addHeat(wanted, heat, game.time));
      if (fired) {
        game.stats.shots += 1;
        sfx(game.audio, weapon.auto ? 'smg' : combat.weapon === 'shotgun' ? 'shotgun' : 'shot');
      }
    } else if (wantFire && combat.ammo === 0) {
      showMessage(game, 'Out of ammo — find a blue pickup.', 1.5);
    }
    if (wasPressed(input, 'KeyF')) {
      // Punching checks the crowd and the brawl's goons alike.
      const hit = punch(combat, p, [...game.peds, ...game.goons], game.cops, (heat) => addHeat(wanted, heat, game.time));
      if (hit) sfx(game.audio, hit.kind === 'goon' ? 'punch' : 'crash');
    }
  }
  updateBullets(combat, dt, game.city, [...game.peds, ...game.goons], game.cops, game.cars, p,
    (victim) => {
      // A bullet put someone down.
      if (victim.kind === 'cop') {
        addHeat(wanted, 80, game.time);
        showMessage(game, 'You shot a cop! Five stars coming.', 3);
      } else if (victim.kind === 'goon') {
        // Syndicate muscle, not a civilian: no heat, no cash — just one
        // fewer goon in the brawl.
        showMessage(game, 'Goon down!', 1.5);
      } else {
        addHeat(wanted, 35, game.time);
        dropPickup(combat, victim.x, victim.y, 'cash', 40);
      }
    },
    (wreckedCar) => {
      game.stats.wrecks += 1;
      showMessage(game, 'Car wrecked!', 2);
      sfx(game.audio, 'wreck');
      if (wreckedCar === game.playerCar) {
        game.playerCar = null;
        p.x = wreckedCar.x + 40;
        p.y = wreckedCar.y + 40;
        p.onFoot = true;
      }
    });
  updatePickups(combat, dt, p, (pickup) => {
    if (pickup.kind === 'health') {
      p.health = Math.min(PLAYER.health, p.health + pickup.value);
      showMessage(game, `+${pickup.value} health`, 1.5);
    } else if (pickup.kind === 'ammo') {
      combat.ammo = Math.min(combat.maxAmmo, combat.ammo + pickup.value);
      showMessage(game, `+${pickup.value} ammo`, 1.5);
    } else if (pickup.kind === 'cash') {
      game.progress.cash += pickup.value;
      showMessage(game, `+$${pickup.value}`, 1.5);
    } else if (pickup.kind === 'weapon') {
      if (pickup.value === 'shotgun') {
        // The boomstick: a new gun the first time, shells after that.
        if (!combat.owned.shotgun) {
          combat.owned.shotgun = true;
          combat.weapon = 'shotgun';
          combat.ammo = Math.min(combat.maxAmmo, combat.ammo + 12);
          showMessage(game, 'Picked up the BOOMSTICK — close range, big boom (3 to switch).', 4);
        } else {
          combat.ammo = Math.min(combat.maxAmmo, combat.ammo + 12);
          showMessage(game, '+12 boomstick shells', 1.5);
        }
      } else if (!combat.owned.smg) {
        combat.owned.smg = true;
        combat.weapon = 'smg';
        combat.ammo = Math.min(combat.maxAmmo, combat.ammo + 60);
        showMessage(game, 'Picked up the SPRAY GUN — hold the mouse to spray (2 to switch).', 4);
      } else {
        combat.ammo = Math.min(combat.maxAmmo, combat.ammo + 60);
        showMessage(game, '+60 spray gun ammo', 1.5);
      }
      sfx(game.audio, 'weapon');
    }
    sfx(game.audio, 'pickup');
  });

  // --- World systems.
  // The sky: storms roll in on their own schedule, and the rain takes
  // grip off the roads and slows the traffic. Thunder follows lightning.
  updateWeather(game.weather, dt, random);
  if (game.weather.thunderPending) {
    game.weather.thunderPending = false;
    thunder(game.audio);
  }
  setRain(game.audio, game.weather.intensity);
  // The garages: repair and repaint the player's car while it sits in a
  // bay, and the HUD prompt follows the car.
  updateGarage(game.garage, dt, game);
  game.garagePrompt = garagePrompt(game.garage, game.playerCar);
  // Rain makes every driver slower and more careful.
  updateVehicles(game.cars, dt, random, game.city, p, weatherTrafficFactor(game.weather));
  updateRaceCars(game, dt);
  updatePoliceCars(game.cars, dt, p, game.playerCar, wanted);
  // Danger for pedestrians: wrecks and fast cars make them scatter.
  const danger = [];
  for (const car of game.cars) {
    if (car.wreck || Math.abs(car.speed) > 300) danger.push(car);
  }
  updatePeds(game.peds, dt, random, game.city, danger, game.cars);
  // The brawl's goons only fight on foot — a car is not a fair fight.
  if (!game.playerCar) updateGoons(game.goons, dt, p, game.city, (dmg) => damagePlayer(game, dmg));
  const arrested = updateCops(game.cops, dt, p, game.city);
  if (arrested && !game.playerCar) {
    game.screen = SCREEN_BUSTED;
    game.progress.cash = Math.max(0, game.progress.cash - 200);
    game.stats.arrests += 1;
    clearWanted(wanted);
    game.cops = [];
    sfx(game.audio, 'busted');
    saveGame(game);
    return;
  }
  updateWanted(wanted, dt, game.time, p, game.playerCar, game.cars, game.cops, random,
    () => showMessage(game, 'Spike strip! Your tyres are gone — find a garage!', 3));
  if (wanted.stars > game.stats.bestWanted) game.stats.bestWanted = wanted.stars;

  // --- Missions, taxi, tokens.
  const missionResult = updateMission(game.mission, game.progress, {
    player: p,
    playerCar: game.playerCar,
    wanted,
    goons: game.goons,
    onCrime: (heat) => addHeat(wanted, heat, game.time),
  }, dt);
  if (missionResult === 'complete') {
    game.goons = [];
    sfx(game.audio, 'mission');
    refreshMissionList(game);
    saveGame(game);
    if (game.progress.storyComplete) {
      game.screen = SCREEN_COMPLETE;
      saveGame(game);
      return;
    }
  } else if (missionResult === 'failed') {
    sfx(game.audio, 'fail');
    showMessage(game, 'Too slow — mission failed. Press N to try again.', 5);
  }
  // The Bayfront Brawl's fight step: the goons walk in when the step
  // starts, and the step counts them as they go down.
  if (game.mission.active !== null) {
    const step = STORY[game.mission.active].steps[game.mission.step];
    if (step && step.type === 'defeat' && game.goons.length === 0) {
      game.goons = spawnGoons(PLACES[step.place].x, PLACES[step.place].y, step.count, random);
      showMessage(game, 'The goons are here — take them all down!', 3);
    }
  }
  game.raceActive = game.mission.active !== null && STORY[game.mission.active].id === 'race';
  game.raceCheckpoint = game.mission.checkpoint;

  // Taxi: stand near a waving pedestrian to pick them up, then drive them
  // to the marker before the timer runs out.
  updateTaxi(game, dt);

  // Sunset tokens: walk or drive over one to collect $100.
  for (const t of game.tokens) {
    if (t.taken) continue;
    if (Math.hypot(t.x - p.x, t.y - p.y) < 34) {
      t.taken = true;
      game.progress.tokens += 1;
      game.progress.cash += 100;
      showMessage(game, `Sunset token ${game.progress.tokens}/12 — +$100`, 2.5);
      sfx(game.audio, 'pickup');
      saveGame(game);
    }
  }

  // --- Audio: engine, siren, helicopter rotor, and the radio — three
  // live-synthesised stations that play while you drive.
  const sirenOn = wanted.stars > 0;
  setSiren(game.audio, sirenOn);
  const heliOn = wanted.heli.active;
  setRotor(game.audio, heliOn);
  if (heliOn && !game._heliHeard) {
    game._heliHeard = true;
    sfx(game.audio, 'heli');
  }
  if (!heliOn) game._heliHeard = false;
  updateRadio(game.radio, game.audio, !!game.playerCar && Math.abs(game.playerCar.speed) > 60, playTone);

  // --- Camera: follow the player (or the car) with a soft lag.
  const focusX = game.playerCar ? game.playerCar.x : p.x;
  const focusY = game.playerCar ? game.playerCar.y : p.y;
  game.camera.x += (focusX - game.camera.x) * Math.min(1, dt * 5);
  game.camera.y += (focusY - game.camera.y) * Math.min(1, dt * 5);

  // --- Health slowly recovers once the police have lost you.
  if (wanted.stars === 0 && p.health < PLAYER.health) {
    p.health = Math.min(PLAYER.health, p.health + 2 * dt);
  }

  // --- Render helpers.
  game.missionTarget = missionTarget(game.mission);
  game.objectiveText = missionObjectiveText(game.mission);
  const step = game.mission.active !== null ? STORY[game.mission.active].steps[game.mission.step] : null;
  game.stepTimer = step && step.time ? Math.max(0, step.time - game.mission.timer) : 0;
  if (game.messageTimer > 0) game.messageTimer -= dt;
  else if (game.mission.messageTimer > 0) {
    game.message = game.mission.message;
    game.messageTimer = game.mission.messageTimer;
    game.mission.messageTimer = 0;
  }
  if (game.progress.cash > game.bestCash) {
    game.bestCash = game.progress.cash;
    saveGame(game);
  }
}

// Taxi fares: a pedestrian waves near the road; stop close and they get in.
function updateTaxi(game, dt) {
  const taxi = game.taxi;
  const p = game.player;
  if (!taxi.passenger) {
    taxi.timer -= dt;
    if (taxi.timer <= 0) {
      taxi.timer = range(game.random, 25, 45);
      const cand = pick(game.random, game.peds.filter((ped) => !ped.dead && ped.wait > 0));
      if (cand && isRoad(cand.x, cand.y)) {
        taxi.passenger = cand;
        taxi.dest = pick(game.random, Object.values(PLACES));
        taxi.fare = 60 + Math.round(Math.hypot(taxi.dest.x - cand.x, taxi.dest.y - cand.y) / 12);
        taxi.timer = 60;
        showMessage(game, `${cand.name} wants a taxi — pick them up!`, 3);
      }
    }
    return;
  }
  taxi.timer -= dt;
  if (taxi.timer <= 0 || taxi.passenger.dead) {
    showMessage(game, 'The fare gave up and walked away.', 2.5);
    taxi.passenger = null;
    return;
  }
  if (game.playerCar && Math.hypot(taxi.passenger.x - p.x, taxi.passenger.y - p.y) < 60) {
    // Passenger hops in; now drive to the destination marker.
    taxi.passenger.inTaxi = true;
    const dest = taxi.dest;
    if (Math.hypot(dest.x - p.x, dest.y - p.y) < 80) {
      game.progress.cash += taxi.fare;
      game.progress.fares += 1;
      showMessage(game, `Fare complete — +$${taxi.fare}`, 3);
      sfx(game.audio, 'mission');
      taxi.passenger.inTaxi = false;
      taxi.passenger = null;
      saveGame(game);
    }
  }
}

// Boot the game in a browser page: canvas, input, fixed-step loop, and the
// ?shot= staging hook the kit uses for screenshots.
export function bootGame(canvas) {
  const game = createGame();
  game.canvasWidth = canvas.width;
  game.canvasHeight = canvas.height;
  game.resetWorld();
  const ctx = canvas.getContext('2d');
  attachInput(game.input, canvas);
  const params = new URLSearchParams(window.location.search);
  const shot = params.get('shot');
  if (shot) {
    stageShot(shot, game);
    drawGame(ctx, game);
    window.__shotReady = true;
    return game;
  }
  const saved = loadSave();
  if (saved && saved.bestCash) game.bestCash = saved.bestCash;
  let last = performance.now();
  let acc = 0;
  function frame(now) {
    const elapsed = Math.min(0.1, (now - last) / 1000);
    last = now;
    acc += elapsed;
    pollInput(game.input);
    // Screens that wait for a key.
    if (game.screen === SCREEN_TITLE && (wasPressed(game.input, 'Enter') || game.input.mouseClicked)) {
      beginPlay(game);
    } else if ((game.screen === SCREEN_OVER || game.screen === SCREEN_BUSTED || game.screen === SCREEN_COMPLETE)
      && wasPressed(game.input, 'Enter')) {
      if (game.screen === SCREEN_OVER) {
        game.player.health = PLAYER.health;
        game.player.x = 1500;
        game.player.y = 1250;
        game.playerCar = null;
        game.screen = SCREEN_PLAY;
      } else if (game.screen === SCREEN_BUSTED) {
        game.player.x = 1500;
        game.player.y = 1250;
        game.screen = SCREEN_PLAY;
      } else {
        game.screen = SCREEN_PLAY;
      }
    } else if (game.screen === SCREEN_PAUSE) {
      if (wasPressed(game.input, 'Escape')) game.screen = SCREEN_PLAY;
      else if (wasPressed(game.input, 'KeyQ')) {
        game.screen = SCREEN_TITLE;
        game.resetWorld();
      }
    }
    while (acc >= STEP) {
      stepGame(game, STEP, game.input);
      acc -= STEP;
    }
    drawGame(ctx, game);
    endFrameInput(game.input);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  return game;
}

// The kit's entry point historically called this `startGame(canvas)`, so the
// boot function is exported under that name too.
export const startGame = bootGame;

// Expose the game for the kit's checks and for debugging in the console.
if (typeof window !== 'undefined') {
  window.PalmeraBay = { createGame, bootGame, startGame: bootGame, STORY, MISSIONS };
}
