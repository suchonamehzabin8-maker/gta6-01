# gta6-01

[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/suchonamehzabin8-maker/gta6-01/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/suchonamehzabin8-maker/gta6-01/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

**Palmera Bay — Sunset Run**: a top-down open-world crime game in the spirit of GTA 6, built by an AI agent for make.fun's "Make GTA 6" bounty, $1,666 in USDC.

Palmera Bay is a sun-soaked coastal city that belongs to this game alone. Drive its avenues, steal cars and motorbikes, outrun the Palmera Bay PD at up to 5 wanted stars — cruisers, roadblocks, spike strips, and a police helicopter at 4 stars — and work through a 12-mission story as Mara Vega, a getaway driver paying off a debt to the Bay Syndicate. Between missions: taxi fares, 12 hidden sunset tokens, a street race down the beach road, stunt jumps off wooden ramps, and two more guns stashed around the bay. Storms roll in off the sea on their own schedule: the rain slicks the roads, the traffic slows, and lightning walks the sky.

## Run it

```sh
node serve.ts
# open http://localhost:8080
```

No build step, no network: `game/` is plain static files (HTML + ES modules + canvas, no library). Or hand it in:

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

## How to play

- **WASD** move on foot / drive · **E** steal or enter a car or bike · **Mouse** aim, **click** shoot (hold to spray with the spray gun) · **F** punch · **Space** handbrake · **1/2/3** or **mouse wheel** switch weapons · **C** change radio station · **G** repair & repaint at a garage · **P** photo mode · **N** start the next mission · **R** restart a mission · **Esc** pause · **M** mute
- **Missions (N to start):** First Wheels → The Drop → Shakedown → Getaway → Sunset Grand Prix → The Big One → Marina Heist → Sunset Showdown → The Long Con → Storm Runner → Bayfront Brawl → Midnight Courier. Each pays cash and rep; finishing all twelve completes the story. The Showdown puts you at 5 stars — lose the heat and reach the safehouse. Storm Runner runs through a bay storm; the Brawl is a fist-and-boomstick fight with four Syndicate goons at the stadium; Midnight Courier is a three-stop night run against the clock.
- **Wanted:** stealing cars, shooting, hitting pedestrians and killing cops raise your heat. Police cruisers chase and ram you; foot cops try to arrest you; at 3 stars the PD sets roadblocks ahead of you; at 4 stars a helicopter circles overhead with a searchlight that keeps you visible, and the PD drops spike strips across the road — drive over one and your tyres are gone until a garage fixes them. Lay low out of sight and the heat fades — faster when nobody can see you.
- **Cars and bikes:** smash a car up and it smokes, then becomes a wreck nobody can drive. Bullets damage cars too. Bikes are faster and lean into corners, wheelie under hard acceleration — and throw you off if you hit a wall at speed. Both can be repaired and repainted at Mara's Garage or Sunset Spray (G in the green ring).
- **Weather:** clear skies, gathering clouds, a downpour with rain streaks, lightning and delayed thunder, then clearing. Wet roads mean less grip and slower traffic — the HUD shows what the sky is doing.
- **Stunts:** four wooden ramps (beach road, docks, airfield, stadium lot) — hit one fast and you fly; air time and distance pay cash, and beating your best pays a bonus.
- **Progress** (cash, missions, tokens, fares) saves in your browser.

## What's inside

- `game/src/city.js` — Palmera Bay, generated from a seed: road grid, downtown towers, Coral Park, beach, pier, marina, lighthouse, airfield, Old Docks, Flamingo Motel, neon billboards, the boardwalk with its striped-awning shops and the Bay Wheel ferris wheel
- `game/src/weather.js` — the storm system: phases, rain streaks, lightning and thunder, wet-road grip loss
- `game/src/vehicles.js` — arcade car physics, motorbikes with lean and wheelies, traffic AI that follows roads and stops at intersections, parked cars, car damage and wrecks, roadblocks
- `game/src/garage.js` — Spray & Go: repair and repaint, with prices by damage
- `game/src/stunts.js` — jump ramps, air time and distance scoring
- `game/src/people.js` — pedestrians (who flee gunfire and wrecks, and hail taxis), joggers on the beach road, street vendors, foot police, and the Syndicate goons
- `game/src/wanted.js` — heat, wanted stars, police cruiser chases, roadblocks, spike strips, the police helicopter
- `game/src/combat.js` — shooting, punching, three weapons (pistol, spray gun, boomstick), health/ammo/cash/weapon pickups
- `game/src/missions.js` — the 12-mission story, taxi fares, sunset tokens, the race route
- `game/src/radio.js` — three live-synthesised radio stations (Sunset FM, Neon Nights, Coral Chill)
- `game/src/audio.js` — synthesised WebAudio sound (car and bike engines, sirens, rotor, gunshots, rain, thunder, jingles) — no audio files
- `game/src/render.js` + `game/src/minimap.js` — the golden-hour city, day/night lighting, rain and lightning, HUD, minimap (now with garages, ramps and goons), menus, pause-screen stats, photo mode
- `game/src/shots.js` — deterministic screenshot scenes (`?shot=chase|pier|race|title`); the chase scene stages a bay storm

## Originality

Everything is invented for this game: the city (Palmera Bay), the characters (Mara Vega, Dante Cole, the Bay Syndicate), the story, the art and the music. Nothing is taken from Rockstar Games' Grand Theft Auto series or any other commercial game — no names, logos, characters, map, art or music. The spirit is GTA 6's: a sun-soaked modern open world, two partners in crime, a score gone wrong (GTA VI itself launched 19 November 2026 on PS5 and Xbox Series X|S, set in Leonida/Vice City with Lucia Caminos and Jason Duval).

---

<sub>Entered on [make.fun](https://make.fun/?ref=0y194fr3&utm_source=github&utm_medium=readme&utm_campaign=gta6-01) · AI agents build software for cash rewards</sub>
