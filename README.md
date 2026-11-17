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
  with skids, crashes and smoke. Cars take real damage: they smoke at low
  health, catch fire and explode at zero — and a wrecked car is dead, so
  don't lean on your ride. An orange wrench pickup at Eddie's Garage
  repairs a damaged car back to full.
- **A wanted level** — steal a car in front of a cop, hit a pedestrian, or
  shoot up the docks and the Solmara PD responds: patrol cars chase you,
  roadblocks appear, and the heat escalates from 1 to 5 stars. Lose them by
  breaking line of sight, or hide it out.
- **Missions and a story** — five story missions with objectives, dialogue
  and paydays: a pickup at the docks, a stolen Comet GT, a dockside
  shootout, a full-heat escape to the safehouse, and a timed three-stop
  delivery run against the clock ($1,500 if you make it). After the story,
  five more jobs open up: a night-shift medicine run for Dr. Amara, a
  90-second ledger dash for Vera, a final clear-out at the North
  Warehouse for Eddie, a getaway-driver duffel run, and a winner-takes-all
  crown race at Palm Market — and after those, a three-package gamble
  against a 135-second clock, one last word at the docks, a papers run
  home, a final showdown on the beach, a quiet errand, the last
  delivery, the harbor lights, the end of the road, the morning after,
  and the Solmara crown
  ($900 / $1,100 / $2,000 / $1,300 / $2,500 / $1,600 / $3,000 /
  $1,800 / $3,500 / $2,000 / $4,000 / $2,200 / $4,500 / $2,500 / $5,000).
- **A living sky** — a clock runs from nine in the morning through dusk to
  night, with street lamps coming on and the city going dark; rain and fog
  roll in off the sea on their own schedule, and rain brings lightning.
  Clear nights bring shooting stars. The HUD shows the time, the weather,
  and the moon phase at night.
- **A car radio** — six stations sequenced live with WebAudio (synthwave,
  late-night talk, salsa, slow piano, harbor rave, local news). It plays while you drive, ducks under missions,
  and changes with V — the DJs talk back when you switch.
- **Taxi fares** — steal a cab and the city starts hailing you: pick up the
  customer, beat the meter to the marker, keep your five-star rating.
  One fare in five is a VIP: double pay, half the patience, gold marker.
  Five to seven in the evening is rush hour: fares pay half as much again.
  One fare in ten is an airport run: a flat $150 to the docks.
- **Street races** — five checkered-flag time trials (Beach Sprint,
  Downtown Loop, Docks Dash, Harbor Cruise, Park Circuit) with par times and gold / silver / bronze
  payouts. Race after dark and the purse doubles.
- **Eddie's Garage** — spend mission money on your own car: ten paints,
  engine tuning, a reinforced frame, racing tires, and nitro tanks (N while driving).
  Walk into the garage on foot and press G to shop; your ride is saved
  between visits. There is also a full service that repairs the car back
  to showroom shine for $80, and a $100 mystery paint for a colour you
  do not own yet.
- **Hidden packages** — fifteen parcels stashed around Solmara, glowing faintly
  when you get close. Walk over one on foot for $100 — find another
  within a minute and the streak bonus grows. One of them is golden
  and worth $500 on its own.
- **Scenic viewpoints** — six postcard spots (Sunset Beach, the Docks Crane,
  Palm Park, and more). Stand at a glowing camera marker on foot and
  press F to take the shot: $50 a photo, $100 at golden hour. Finish the
  album and there is a $300 bonus on top.
- **Challenges** — ten goals that pay when they are done: a gold medal, three
  fares, five packages, three photos, a race after dark, $500 of fares,
  three race wins, ten packages, all six photos, all twenty missions
  ($150–$500 each).
- **Pedestrian chatter** — Solmara talks back: passers-by near Kai get a
  line in a speech bubble every few seconds, from tourists to fishermen
  to cops.
- **Combat** — aim with the mouse, shoot with a click. Enemies shoot back.
- **HUD with minimap** — wanted stars, health, cash, mission objective,
  speed, car health with a smoking warning, and a live minimap with the
  mission marker. Timed missions show a live countdown in the objective.
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
| V | Change radio station (while driving) |
| N | Fire a nitro tank (your own car, while driving) |
| G | Open Eddie's Garage (on foot, at the garage) |
| F | Take a photo at a scenic viewpoint (on foot) |
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
