# gta6-01 — STATUS

## Bounty
- Slug: `gta6-01` — "Make GTA 6", $1,666 total (1st $500, 2nd $250, 3rd $150, 4th–10th $38, 11th–25th $10, 26th–50th $6, 51st–100th $4), **escrowed** (funded).
- Entries close: **2026-11-24T15:00:00Z** (21:00 Dhaka, 24 Nov 2026). Result due 2026-12-10.
- Harness: program/v1 + house AI judge (pairwise, no ties) on a dossier. Judged on (1) complete open world shown in the game's own screenshots, (2) depth and fun, (3) feel and polish, (4) look and originality, (5) source structure. Final heat: 3 Swiss rounds + playoff of the top 100; top 10 held for finalist review (team plays the game in desktop Chrome).
- Deliverables: public GitHub repo (owner suchonamehzabin8-maker), `main.ts` at root, OSI licence, README with make.fun badges, About homepage https://make.fun/bounty/gta6-01 + topics makefun, ai-agents, bounties, games. This competition takes **recording_ids, not a transcript bundle** — transcripts are built from the kit's sealed `record` sessions; `handed_over_places: none`, `strict_transcripts: true`.

## What was built
- **Palmera Bay — Sunset Run** — a top-down open-world crime game, original in every respect (city, characters, story, art, sound; nothing from Rockstar's GTA series).
  - City: seeded 3600x2600 Palmera Bay — road grid, downtown towers, Coral Park, beach, pier, marina, lighthouse with a rotating beam, airfield, Old Docks, Flamingo Motel, neon billboards, the boardwalk with striped-awning shops and the Bay Wheel ferris wheel; a day/night cycle from golden hour to night, when streetlamps and the casino sign light up.
  - On foot, by car and by bike: WASD movement, mouse-aim shooting, punching, car and bike stealing (E), arcade driving with handbrake; traffic AI that follows roads and stops at intersections, parked cars, pedestrians who flee gunfire and wrecks and hail taxis, joggers on the beach road, vendors at their stalls.
  - Weather: storms roll in on their own schedule — gathering clouds, a downpour with rain streaks, lightning and delayed thunder, then clearing. Wet roads cut grip and slow traffic; the HUD names the sky.
  - Wanted: heat → 1–5 stars; police cruisers that chase along roads and ram, foot cops who arrest; roadblocks at 3 stars; a police helicopter with a sweeping searchlight at 4 stars; spike strips at 4 stars that pop tyres until a garage fixes them; heat decays faster when hidden.
  - Cars take damage: they smoke, then become wrecks nobody can drive; bullets damage cars too. Bikes lean into corners, wheelie on hard launches, and throw the rider off on a hard wall hit.
  - Garages: Mara's Garage and Sunset Spray repair and repaint (G in the green ring), priced by damage; a paint-only job is cheaper.
  - Stunts: four wooden ramps; air time and distance pay cash, beating your best pays a bonus.
  - Combat: pistol, spray gun (SMG) stashed at the docks, marina and airfield, and the boomstick (shotgun) at the stadium and the boardwalk — hold the mouse to spray; switch with 1/2/3 or the mouse wheel.
  - Story: 12 missions as Mara Vega (First Wheels, The Drop, Shakedown, Getaway, Sunset Grand Prix race, The Big One, Marina Heist, Sunset Showdown at 5 stars, The Long Con, Storm Runner in a bay storm, Bayfront Brawl against four goons, Midnight Courier against the clock), with briefings, timed objectives, pay and rep; plus taxi fares and 12 hidden sunset tokens. Progress saves in localStorage.
  - Radio: three live-synthesised stations (Sunset FM, Neon Nights, Coral Chill), C to switch, playing while you drive.
  - HUD: live minimap (roads, police, roadblocks, helicopter, mission marker, tokens, garages, ramps, goons), wanted stars, cash/rep/clock, health/ammo, mission objective + timer, weather and radio, off-screen mission arrow, speedometer; title, pause (with session stats), wasted, busted and story-complete screens; photo mode (P) hides the HUD; synthesised WebAudio sound (car and bike engines, sirens, helicopter rotor, shots, rain, thunder, jingles), mute with M.
- `main.ts` (Node 22, stdlib only) copies `game/` + `screenshots/` to the output and writes `dossier.json` with the vendored `vendor/makefun-game.ts` (byte-identical to the kit starter's copy). It also refuses a screenshot over the 256 KiB cap with a clear message.
- `serve.ts` answers `GET /health` with `{"ok":true}` and logs each request.
- Screenshots (all taken in headless Chromium from the running game via `?shot=` scenes, then JPEG): `1-chase.jpg` 4-star getaway downtown in a bay storm with cruisers, roadblocks, spike strips and the helicopter (1280x720), `2-pier.jpg` on-foot package run at the pier, `3-race.jpg` beach-road race past the boardwalk and the Bay Wheel, `4-title.jpg` title screen — all ≤ 256 KiB, long side 1280, short side 720.
- GTA VI facts used only for context in the README (launched 19 Nov 2026, PS5/Xbox, Leonida/Vice City, Lucia Caminos + Jason Duval, a score gone wrong); no Rockstar names, art or map in the game itself.

## Recorded rebuild (round 5, this session)
The round-4 submission was rejected on one check: transcripts_witnessed — 10 counted files were "never seen with their final content in the working tree the recordings watched (changed outside the recording)". The round-4 recording died mid-session (network failure while sealing) and the round-4 agent kept editing after it died, so those edits are unwitnessed and can never be witnessed afterwards. Meanwhile thinking_reproduces PASSED at 96.3% authored — the rewrite itself was excellent. This round is only about the witnessing: every counted file's final content is written in this session, while the round-5 recording is alive. The agent checks the recording is alive repeatedly and stops all edits at once if it dies.
- Every counted file rewritten in this session: `main.ts`, `serve.ts`, `game/index.html`, all `game/src/*.js` modules, `README.md`, `STATUS.md`, `shots.json`. Exceptions: `vendor/makefun-game.ts` (kit starter, byte-identical) and `LICENSE` (standard MIT text). All 4 screenshots re-taken in this session.

## Local checks
- (To be filled in after the kit check, logic tests, Chromium scenes and determinism run.)

## Verification (round 5, final — 2026-11-21)

- Kit check (node 22.18.0, from the kit): 4 passed, 0 failed, 17 skipped — "ok: every check run here passes".
- Logic smoke tests (node 22, direct module tests): 34 passed, 0 failed — city determinism, weather, all 12 missions, wanted/stars, mission flow, tokens, garage, stunts, traffic/people, combat, shot staging.
- Determinism: `MAKEFUN_OUTPUT_DIR` runs of main.ts into two directories produce byte-identical trees (`diff -r` clean); dossier.json written with cover = 1-chase.jpg.
- Screenshots (headless Chromium 157, CDP, JPEG q85, all <= 256 KiB): 1-chase.jpg 72,293 bytes, 2-pier.jpg 64,272, 3-race.jpg 70,467, 4-title.jpg 76,340. Chase re-taken and byte-identical. All four scenes viewed: no visual errors.
- Interactive playtest (headless Chromium): N starts the story (First Wheels — steal a car, bring it to the Flamingo Motel); E steals the car by the spawn and the mission advances to "Drive to the Flamingo Motel"; driving reaches speed 640; on-foot walking works; radio (C), photo mode (P), pause (Esc) all work; mouse click fires the pistol (shotsFiredRecently rises, cooldown engages). Zero console errors.

## Spawn fix (round 5)

- The first spawn (940, 1180) sat inside a building footprint next to Mara's Garage, so collision rejected every on-foot step and the player could not move at all (found by live playtest: A/D rotated, W/S only reset the facing angle). The spawn is now (1050, 1050): clear open ground by Mara's Garage, a car parked 42 px away, movement verified in every direction.
