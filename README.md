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
- Start at 2,000 points; collect money bags, silver bars, gold bars, and diamond rings for 2,000–5,000 points. A perfect run earns 114,000 points.
- Jump logs, holes, snakes, fire, and scorpions. Swing across pits, wait for shifting ground, and time crossings over crocodile heads and closed jaws. Some pits have a cobra on the far bank, leaving only a narrow strip to land on.
- Logs drain points; accidental falls into tunnels cost 100 points. Fatal hazards cost a life and return Harry to the left side of the current scene.
- Climb ladders into tunnels, where each screen advances three surface scenes. Some passages have walls.
- Base camp's tent hides a tic-tac-toe table. Stand in the tent's open flap and press Up to go inside; the expedition clock stops while you play against the jungle.
- Open the trail map to see explored scenes and collected treasure. The field guide explains hazards and controls.
- Best score and sound preference stay in local browser storage. Expedition progress resets when the page reloads.

The rules are based on the [original instruction manual](https://www.atariage.com/2600/manuals_old/pitfall.html). This is an unofficial recreation with newly arranged scenes, new physics, original drawn artwork, and synthesized sounds; it does not use cartridge code or original game assets.

## Controls

| Action | Keyboard |
| --- | --- |
| Move | Left / Right arrows or A / D |
| Jump; release a vine | Space or Z |
| Climb a ladder | Up / Down arrows or W / S |
| Grab a vine | Jump close to its lower end |
| Release a vine | Down arrow, S, or another jump press |
| Pause / resume | P or Escape |
| Enter the tent | Up arrow or W at the tent flap in scene 001 |
| Tic-tac-toe | Arrows or WASD to choose, Space / Enter to mark (or click a square); Escape or **Back to the jungle** to leave |
| Toggle sound | M |

Phones and tablets have touch buttons with simultaneous movement and jumping. Opening the guide or map pauses play; losing window focus or switching tabs also pauses. Sound initializes only after interaction. Fullscreen is available on supported desktop browsers, and reduced-motion preferences disable ambient scenery movement.

## Validation

```sh
npm test
npm run typecheck
npm run build
npm run test:browser
```

Engine tests cover world generation, scoring, jumping, vine crossings in both directions, crocodile jaws, shifting pits, ladders, tunnels, hazards, timer behavior, victory, and restarts. Playwright uses a locally installed Google Chrome and starts a local Nuxt server when needed. It checks desktop keyboard play, mobile multi-touch input, layout overflow, sound persistence, pause/resume, dialogs, and runtime errors. Screenshots are saved under the ignored `test-results/` directory.

## Project structure

- `app/game/engine.ts`: browser-independent game rules and physics.
- `app/game/tictactoe.ts`: the tent's tic-tac-toe rules and the computer's random moves.
- `app/game/renderer.ts`: Canvas artwork; static scenery is cached.
- `app/game/audio.ts`: procedural sound effects, with no downloaded audio assets.
- `app/app.vue`: game loop, keyboard and pointer input, interface, accessibility, preferences, and dialogs.
- `app/assets/main.css`: responsive field-guide design.

Build production with `npm run build` and run it with `node .output/server/index.mjs`, or create a static export with `npm run generate`. Display fonts load from Google Fonts; local fallback fonts keep the game usable when that service is unavailable.
