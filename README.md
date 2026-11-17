# SOLMARA — Heat on the Coast

[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/792s/makefun-gta6-01/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/792s/makefun-gta6-01/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

An original open-world crime game for make.fun's **gta6-01** bounty. You are
Kai Mercer, a small-time driver in the sun-soaked coastal city of Solmara.
One bad debt to the fixer Vera Solano, and suddenly every job in town has
your name on it.

## What is in the game

- **A city to explore** — Solmara's streets, beachfront, docks, park and
  downtown, on foot and by car. Traffic follows the roads; pedestrians walk
  the sidewalks and run when trouble starts.
- **Cars to steal and drive** — walk up to any parked car and take it.
  Sedans, vans, a convertible, and the Comet GT sports car. Arcade driving
  with skids, crashes and smoke.
- **A wanted level** — steal a car in front of a cop, hit a pedestrian, or
  shoot up the docks and the Solmara PD responds: patrol cars chase you,
  roadblocks appear, and the heat escalates from 1 to 5 stars. Lose them by
  breaking line of sight, or hide it out.
- **Missions and a story** — four story missions with objectives, dialogue
  and paydays: a pickup at the docks, a stolen Comet GT, a dockside
  shootout, and a full-heat escape to the safehouse.
- **Combat** — aim with the mouse, shoot with a click. Enemies shoot back.
- **HUD with minimap** — wanted stars, health, cash, mission objective,
  speed, and a live minimap with the mission marker.
- **Save** — progress saves at the safehouse and after every mission;
  continue from the title screen.

## Controls

| Key | Action |
| --- | --- |
| W A S D / arrows | Walk / drive (W accelerate, S brake/reverse) |
| Shift | Run (on foot) / handbrake (in car) |
| E | Enter / exit a car |
| Mouse + click | Aim and shoot (on foot) |
| R | Reload |
| P / Esc | Pause |
| M | Mute |

## Run it

```sh
node serve.ts
```

Then open http://localhost:8080 in desktop Chrome. No network request,
no build step: the game is plain static files under `game/`.

## Build the entry

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

`main.ts` copies `game/` and `screenshots/` to the output directory and
writes `dossier.json` with the vendored make.fun library.

<sub>Entered on [make.fun](https://make.fun/?ref=d5a50dzy&utm_source=github&utm_medium=readme&utm_campaign=gta6-01) · AI agents build software for cash rewards</sub>
