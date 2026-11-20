// The story: Mara Vega, a getaway driver fresh out of a job gone wrong, owes
// the Bay Syndicate one last score. Twelve missions, each a chain of
// objectives, plus two free-roam activities (taxi fares and hidden sunset
// tokens). Everything here is invented for this game.
import { PLACES } from './city.js';

export const STORY = [
  {
    id: 'wheels',
    name: 'First Wheels',
    pay: 250,
    briefing: 'Mara: "My ride got impounded. Steal a car — any car — and bring it to my garage."',
    steps: [
      { type: 'steal', text: 'Steal a car (walk up to one and press E)' },
      { type: 'reach', place: 'garage', inCar: true, text: 'Drive to Mara\'s Garage' },
    ],
    done: 'Mara: "Not bad. The Syndicate wants its money back — and I need a driver."',
  },
  {
    id: 'drop',
    name: 'The Drop',
    pay: 500,
    briefing: 'Dante: "A package is waiting at the Old Docks. Take it to the pier. No cops, no questions."',
    steps: [
      { type: 'reach', place: 'docks', text: 'Pick up the package at the Old Docks' },
      { type: 'reach', place: 'pier', time: 75, text: 'Deliver to Palmera Pier — fast' },
    ],
    done: 'Dante: "Clean. The Syndicate is watching you, kid. In a good way."',
  },
  {
    id: 'shakedown',
    name: 'Shakedown',
    pay: 750,
    briefing: 'Mara: "Three shops owe the Syndicate. Walk in, collect, walk out. Try not to make a scene."',
    steps: [
      { type: 'collect', places: ['shop1', 'shop2', 'shop3'], text: 'Collect from the shops (0/3)' },
    ],
    done: 'Mara: "Every dollar accounted for. You\'re good at this."',
  },
  {
    id: 'getaway',
    name: 'Getaway',
    pay: 1200,
    briefing: 'Dante: "The bank job went loud. Lose the cops and get to the safehouse — do NOT get arrested."',
    steps: [
      { type: 'reach', place: 'bank', addHeat: 60, text: 'Reach Bay Trust Bank' },
      { type: 'escape', place: 'safehouse', text: 'Escape the police and reach the Safehouse' },
    ],
    done: 'Dante: "You drove like the devil himself. The Syndicate owes YOU now."',
  },
  {
    id: 'race',
    name: 'Sunset Grand Prix',
    pay: 1500,
    briefing: 'Mara: "A street race down the beach road. Beat the pack and the pot is yours."',
    steps: [
      { type: 'race', text: 'Race! Hit every checkpoint before the rivals' },
    ],
    done: 'Mara: "Champion of Palmera Bay! The whole city saw that."',
  },
  {
    id: 'bigone',
    name: 'The Big One',
    pay: 3000,
    briefing: 'Dante: "Last job: the Syndicate\'s armored van is at the airfield. Take it to the docks. This is the big one."',
    steps: [
      { type: 'reach', place: 'airport', text: 'Reach Palmera Airfield' },
      { type: 'reach', place: 'docks', time: 90, text: 'Deliver the van to the Old Docks — fast' },
    ],
    done: 'Mara: "We did it. The debt is paid. Palmera Bay is ours now."',
  },
  {
    id: 'marina',
    name: 'Marina Heist',
    pay: 2000,
    briefing: 'Mara: "The Syndicate stashed three crates on the marina slips — cash, guns, and something that ticks. Grab all three and bring them to the docks before the tide turns."',
    steps: [
      { type: 'reach', place: 'marina', text: 'Reach the Marina District' },
      { type: 'collect', places: ['marina', 'lighthouse', 'pier'], text: 'Grab the 3 crates (0/3)' },
      { type: 'reach', place: 'docks', time: 100, text: 'Deliver the crates to the Old Docks — fast' },
    ],
    done: 'Dante: "Three crates, zero alarms. The marina crew thinks you\'re a ghost."',
  },
  {
    id: 'showdown',
    name: 'Sunset Showdown',
    pay: 5000,
    briefing: 'Dante: "The Golden Palm Casino. The Syndicate\'s boss is cashing out tonight — walk in, take the ledger, and walk out with every cop in the bay on your tail. Lose them all and meet me at the safehouse."',
    steps: [
      { type: 'reach', place: 'casino', addHeat: 400, text: 'Reach the Golden Palm Casino' },
      { type: 'escape', place: 'safehouse', text: 'Lose the 5-star heat and reach the Safehouse' },
    ],
    done: 'Mara: "Five stars and you still walked away. Palmera Bay is yours — all of it."',
  },
  {
    id: 'longcon',
    name: 'The Long Con',
    pay: 4000,
    briefing: 'Mara: "One last errand before we vanish: wake the Flamingo Motel, collect from two more shops, and meet me at the lighthouse before the sun comes up. The whole bay in one run — don\'t stop for anyone."',
    steps: [
      { type: 'reach', place: 'motel', text: 'Wake the Flamingo Motel' },
      { type: 'collect', places: ['shop2', 'shop3'], text: 'Collect from the last shops (0/2)' },
      { type: 'reach', place: 'lighthouse', time: 150, text: 'Reach the Palmera Lighthouse — fast' },
    ],
    done: 'Mara: "The Long Con, done in one run. Legends don\'t retire — they disappear."',
  },
  {
    id: 'storm',
    name: 'Storm Runner',
    pay: 2500,
    hook: 'storm',
    briefing: 'Dante: "A storm is rolling in off the sea, and the Syndicate\'s money is sitting at the docks in the rain. Get it to the pier, then the marina, before the streets flood. Wet roads, bad grip — drive like it matters."',
    steps: [
      { type: 'reach', place: 'docks', text: 'Reach the Old Docks in the storm' },
      { type: 'reach', place: 'pier', time: 90, text: 'Deliver to Palmera Pier — fast' },
      { type: 'reach', place: 'marina', time: 120, text: 'Finish at the Marina District — fast' },
    ],
    done: 'Dante: "Through a bay storm with the money dry. You\'re the storm now, kid."',
  },
  {
    id: 'brawl',
    name: 'Bayfront Brawl',
    pay: 3500,
    hook: 'brawl',
    briefing: 'Mara: "The Syndicate\'s rivals took the stadium — four goons holding the pitch, and they want a fight. Take all four down on foot, then walk out to the safehouse. Fists or boomstick, your call."',
    steps: [
      { type: 'reach', place: 'stadium', text: 'Reach Bay Stadium' },
      { type: 'defeat', place: 'stadium', count: 4, text: 'Take down the goons (0/4)' },
      { type: 'reach', place: 'safehouse', text: 'Walk out to the Safehouse' },
    ],
    done: 'Mara: "Four goons, one Mara. The stadium is ours again."',
  },
  {
    id: 'courier',
    name: 'Midnight Courier',
    pay: 3000,
    briefing: 'Dante: "The last job, and it runs at night: wake the motel, grab a parcel from Sunrise Mart, and get it to the lighthouse before the sun comes up. Three stops, one run, no headlights-off heroics — the PD is out tonight."',
    steps: [
      { type: 'reach', place: 'motel', time: 60, text: 'Wake the Flamingo Motel — fast' },
      { type: 'reach', place: 'shop1', time: 75, text: 'Grab the parcel at Sunrise Mart — fast' },
      { type: 'reach', place: 'lighthouse', time: 120, text: 'Deliver to the Palmera Lighthouse — fast' },
    ],
    done: 'Dante: "Midnight Courier, done before dawn. Twelve jobs, zero debts. Palmera Bay is yours."',
  },
];

export const RACE_POINTS = [
  { x: 1900, y: 2330 },
  { x: 2600, y: 2330 },
  { x: 3100, y: 2050 },
  { x: 3100, y: 1150 },
  { x: 2700, y: 550 },
  { x: 1900, y: 250 },
  { x: 1100, y: 550 },
  { x: 700, y: 1450 },
  { x: 1100, y: 2330 },
];

export const TOKENS = [
  { x: 420, y: 380 }, { x: 980, y: 220 }, { x: 1680, y: 420 }, { x: 2520, y: 320 },
  { x: 3200, y: 700 }, { x: 560, y: 1020 }, { x: 1250, y: 1980 }, { x: 2050, y: 1680 },
  { x: 2900, y: 1450 }, { x: 3300, y: 1750 }, { x: 1850, y: 2520 }, { x: 900, y: 2300 },
];

export function createProgress() {
  return {
    missionIndex: 0,
    missionDone: STORY.map(() => false),
    cash: 0,
    rep: 0,
    tokens: 0,
    fares: 0,
    racesWon: 0,
    storyComplete: false,
    crates: 0,
    bestWanted: 0,
  };
}

export function createMissionState() {
  return {
    active: null,
    step: 0,
    timer: 0,
    collected: 0,
    checkpoint: 0,
    defeated: 0, // goons taken down, for 'defeat' steps
    message: '',
    messageTimer: 0,
  };
}

export function startMission(progress, state, index) {
  state.active = index;
  state.step = 0;
  state.timer = 0;
  state.collected = 0;
  state.checkpoint = 0;
  state.defeated = 0;
  state.message = STORY[index].briefing;
  state.messageTimer = 6;
  return STORY[index];
}

// The current objective's target point (for the HUD arrow and minimap).
export function missionTarget(state) {
  if (state.active === null) return null;
  const mission = STORY[state.active];
  const step = mission.steps[state.step];
  if (!step) return null;
  if (step.type === 'reach' || step.type === 'escape') return PLACES[step.place];
  if (step.type === 'collect') return PLACES[step.places[Math.min(state.collected, step.places.length - 1)]];
  if (step.type === 'defeat') return PLACES[step.place];
  if (step.type === 'race') return RACE_POINTS[Math.min(state.checkpoint, RACE_POINTS.length - 1)];
  return null;
}

// The current objective's text, with the running count filled in for
// collect steps (the step's own text carries the "(0/3)" it starts with).
export function missionObjectiveText(state) {
  if (state.active === null) return 'Press N for the next mission — free roam';
  const mission = STORY[state.active];
  const step = mission.steps[state.step];
  if (!step) return mission.name;
  let text = step.text;
  if (step.type === 'collect') {
    text = text.replace(/\(\d+\/\d+\)/, `(${state.collected}/${step.places.length})`);
  }
  if (step.type === 'defeat') {
    text = text.replace(/\(\d+\/\d+\)/, `(${state.defeated}/${step.count})`);
  }
  if (step.type === 'race') text = `Race! Checkpoint ${state.checkpoint + 1}/${RACE_POINTS.length}`;
  return `${mission.name} — ${text}`;
}

// Advance the mission state machine. `g` is the live game context.
// Returns 'complete' | 'failed' | null.
export function updateMission(state, progress, g, dt) {
  if (state.active === null) return null;
  const mission = STORY[state.active];
  const step = mission.steps[state.step];
  if (!step) return 'complete';
  if (state.messageTimer > 0) state.messageTimer -= dt;
  if (step.time) {
    state.timer += dt;
    if (state.timer > step.time) {
      state.active = null;
      return 'failed';
    }
  }
  const px = g.player.x;
  const py = g.player.y;
  const near = (place, r = 70) => Math.hypot(px - PLACES[place].x, py - PLACES[place].y) < r;
  const advance = () => {
    state.step += 1;
    state.timer = 0;
    if (state.step >= mission.steps.length) {
      progress.cash += mission.pay;
      progress.rep += 10;
      progress.missionDone[state.active] = true;
      state.message = `${mission.done}  (+$${mission.pay})`;
      state.messageTimer = 6;
      if (state.active === STORY.length - 1) progress.storyComplete = true;
      state.active = null;
      return 'complete';
    }
    return null;
  };

  if (step.type === 'steal') {
    if (g.playerCar) return advance();
  } else if (step.type === 'reach') {
    const inCarOk = !step.inCar || g.playerCar;
    if (near(step.place) && inCarOk) {
      if (step.addHeat) g.onCrime && g.onCrime(step.addHeat);
      return advance();
    }
  } else if (step.type === 'collect') {
    const place = step.places[state.collected];
    if (place && near(place, 60) && !g.playerCar) {
      state.collected += 1;
      progress.cash += 150;
      if (mission.id === 'marina') progress.crates += 1;
      state.message = `Collected $150 — ${state.collected}/${step.places.length} stops`;
      state.messageTimer = 3;
      if (state.collected >= step.places.length) return advance();
    }
  } else if (step.type === 'escape') {
    if (near(step.place, 80) && g.wanted.stars === 0) return advance();
  } else if (step.type === 'defeat') {
    // Count the goons already on the ground; the main loop spawns them
    // when this step starts and keeps them in g.goons.
    const goons = g.goons || [];
    state.defeated = goons.filter((goon) => goon.dead).length;
    if (state.defeated >= step.count) return advance();
  } else if (step.type === 'race') {
    const cp = RACE_POINTS[state.checkpoint];
    if (cp && Math.hypot(px - cp.x, py - cp.y) < 90) {
      state.checkpoint += 1;
      if (state.checkpoint >= RACE_POINTS.length) {
        progress.racesWon += 1;
        return advance();
      }
    }
  }
  return null;
}

// Taxi: a fare is a pedestrian who wants a ride to a random place.
export function createTaxi() {
  return { passenger: null, dest: null, fare: 0, timer: 0 };
}
