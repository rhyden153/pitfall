# Pitfall! — The jungle is calling

A playable browser tribute to David Crane's 1982 Atari adventure, built with Nuxt 4, Vue, TypeScript, Canvas, and Web Audio. The interface takes its cues from an explorer's field guide, with illustrated jungle scenery.

## Play locally

Use Node.js 24 or newer:

```sh
npm install
npm run dev
```

Open the local URL printed by Nuxt and select **Start expedition**, or press Space. For Windows environments that restrict Nuxt's worker process:

```sh
npm run dev -- --host 127.0.0.1 --port 3000 --no-fork
```

## The expedition

- Explore 255 deterministic, circular jungle scenes with surface and underground routes.
- Find 32 treasures (eight of each kind) within 20 real-time minutes and three lives.
- Start at 2,000 points; collect money bags, silver bars, gold bars, and diamond rings for 2,000–5,000 points. A perfect run earns 114,000 points, or 231,000 with every cavern relic.
- Jump logs, holes, snakes, fire, and scorpions. Swing across pits, wait for shifting ground, and time crossings over crocodile heads and closed jaws. Some pits have a cobra on the far bank, leaving only a narrow strip to land on.
- Logs drain points; accidental falls into tunnels cost 100 points. Fatal hazards cost a life and return Harry to the left side of the current scene.
- Climb ladders into tunnels, where each screen advances three surface scenes. Some passages are blocked by a red brick wall, always east of the ladder and holes, so a fall through a hole can't land beyond it. Some have a narrow, bottomless pit in the floor to jump.
- Eight tunnels hide a ladder shaft down to a deep cavern. Each one is a single tunnel screen west of the ladder three scenes east of it, and a hint on the surface says so until the cavern is found. The view scrolls down to follow Harry. Each cavern has an underground river patrolled by two electric eels (one near the surface, one along the bed), a bottomless chasm crossed by jumping to a stone pillar, and a golden idol worth 6,000 bonus points on the riverbed or the pillar. Idols don't count toward the 32 treasures; the scoreboard tracks them separately. Harry has nine seconds of air underwater, shown as bubbles above him, and it refills at the surface. A fall or a shock in a cavern costs a life and restarts Harry at the foot of the ladder he came down.
- A ladder on each deep cavern's middle ledge leads further down, to the lost caverns: two more levels of eight chambers, one below each deep cavern, each level a screen below the last. Each level runs east and west beneath the whole jungle and loops around, so the caverns also make a long way round between distant scenes; ladders join the levels, and the view follows Harry down the shafts. The chambers are new arrangements of cavern hazards: bat roosts where bats swing like pendulums (high at both ends of their flight, swooping to Harry's height through the middle), rat runs, flooded galleries and an eel lake, waterfalls, crystal grottoes, stepping stones and a broken bridge over bottomless chasms, and a sunken temple. Every chamber holds a relic: an emerald (3,000) on the first level, a jade mask (5,000) on the second, and the crystal skull (10,000) in the temple. Relics, like idols, are bonus loot outside the 32 treasures, and the scoreboard counts all 24. After a fall, Harry restarts where he came into the chamber.
- Two background tracks are synthesized live in the browser. Above ground and in camp, a bouncy marimba tune plays over congas, a shaker and a plucked bass, easing into a calmer stretch with kalimba and bird calls. Underground, a slow, dark piece plays: a cold drone, a broken music-box lullaby echoing off the walls, a faint heartbeat, dripping water, moaning wind, and the odd distant groan. They crossfade halfway down a cavern shaft, dip under the death tune and the victory fanfare, stop while the expedition is paused or over, and follow the sound toggle. Both tunes are original.
- Base camp's tent hides a tic-tac-toe table. Stand in the tent's open flap and press Up to go inside; the expedition clock stops while you play against the jungle.
- Open the trail map to see explored scenes, collected treasure, caverns found, and idols taken, with a map of the cavern chambers found and the relics taken below it. The field guide explains hazards and controls.
- Best score and sound preference stay in local browser storage. Expedition progress resets when the page reloads.

The rules are based on the [original instruction manual](https://www.atariage.com/2600/manuals_old/pitfall.html). This is an unofficial recreation with newly arranged scenes, new physics, original drawn artwork, and synthesized sounds; it does not use cartridge code or original game assets.

## Controls

| Action | Keyboard |
| --- | --- |
| Move | Left / Right arrows or A / D |
| Jump; release a vine | Space or Z |
| Climb a ladder | Up / Down arrows or W / S |
| Swim | Arrows or WASD; holding jump also swims up, and Harry drifts up when left alone |
| Leave the river | Swim into a bank at the surface, or jump at the surface |
| Grab a vine | Jump close to its lower end |
| Release a vine | Down arrow, S, or another jump press |
| Pause / resume | P or Escape |
| Enter the tent | Up arrow or W at the tent flap in scene 001 |
| Tic-tac-toe | Arrows or WASD to choose, Space / Enter to mark (or click a square); Escape or **Back to the jungle** to leave |
| Toggle sound and music | M |
| Toggle fullscreen | F |

Phones and tablets have touch buttons with simultaneous movement and jumping. Opening the guide or map pauses play; losing window focus or switching tabs also pauses. Sound initializes only after interaction. Fullscreen is available on supported desktop browsers, and reduced-motion preferences disable ambient scenery movement.

## Validation

```sh
npm test
npm run typecheck
npm run build
npm run test:browser
```

Engine tests cover world generation, scoring, jumping, vine crossings in both directions, crocodile jaws, shifting pits, ladders, tunnels, deep caverns (swimming, air, eels, the chasm, and idols), the lost caverns (ladders lining up between levels, connectivity, a scripted crossing of every chamber in both directions, bats, rats, relics, and restarts), tunnel pits, hazards, timer behavior, victory, and restarts. Playwright uses a locally installed Google Chrome and starts a local Nuxt server when needed. It checks desktop keyboard play, mobile multi-touch input, layout overflow, sound persistence, pause/resume, dialogs, and runtime errors. Screenshots are saved under the ignored `test-results/` directory.

## Project structure

- `app/game/engine.ts`: browser-independent game rules and physics.
- `app/game/tictactoe.ts`: the tent's tic-tac-toe rules and the computer's random moves.
- `app/game/renderer.ts`: Canvas artwork; static scenery is cached.
- `app/game/audio.ts`: procedural music and sound effects, with no downloaded audio assets. Each song is written out as note and rhythm patterns at the top of the file.
- `app/app.vue`: game loop, keyboard and pointer input, interface, accessibility, preferences, and dialogs.
- `app/assets/main.css`: responsive field-guide design.

Build production with `npm run build` and run it with `node .output/server/index.mjs`, or create a static export with `npm run generate`. Display fonts load from Google Fonts; local fallback fonts keep the game usable when that service is unavailable.
