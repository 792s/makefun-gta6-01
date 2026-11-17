// The story: four missions for Kai Mercer, each a chain of steps with an
// objective the HUD shows and a marker on the minimap. A mission starts when
// the player reaches its start marker; the first starts with a new game.
import { MISSION_PAY } from './config.js';
import { createCar } from './vehicles.js';
import { addHeat } from './police.js';

export const MISSIONS = [
  {
    name: 'First Pickup',
    intro: "VERA: Kai. A package is waiting at the docks. Pick it up, bring it to my office. No drama.",
    start: 'safehouse',
    startText: 'Meet Vera — go to your apartment',
    steps: [
      { type: 'goto', target: 'docksPickup', text: 'Pick up the package at the docks' },
      { type: 'goto', target: 'veraOffice', text: "Deliver the package to Vera's office" },
    ],
  },
  {
    name: 'The Red Comet',
    intro: "EDDIE: A Comet GT is parked uptown, red, unlocked, begging for it. Bring it to my garage. Cops will notice.",
    start: 'eddiesGarage',
    startText: "Eddie has a job — go to Eddie's Garage",
    steps: [
      { type: 'goto', target: 'cometSpot', text: 'Find the red Comet GT uptown' },
      { type: 'enterCar', target: 'comet', text: 'Steal the Comet GT' },
      { type: 'goto', target: 'eddiesGarage', text: "Drive the Comet to Eddie's Garage" },
    ],
  },
  {
    name: 'Dockside Trouble',
    intro: "VERA: A rival crew is sitting on my crate at the docks. Clear them out, take the crate, come home.",
    start: 'docksPickup',
    startText: 'Vera needs muscle — go to the docks',
    steps: [
      { type: 'clear', target: 'docksPickup', text: 'Clear the rival crew at the docks' },
      { type: 'goto', target: 'docksPickup', text: 'Grab the crate' },
      { type: 'goto', target: 'safehouse', text: 'Bring the crate home to the safehouse' },
    ],
  },
  {
    name: 'Heat Wave',
    intro: "VERA: The PD knows your face now. Lose them — all of them — then get to the safehouse. Don't lead them here.",
    start: 'veraOffice',
    startText: 'Vera has one last job — go to her office',
    steps: [
      { type: 'escape', text: 'Lose the cops (get your wanted level to zero)' },
      { type: 'goto', target: 'safehouse', text: 'Reach the safehouse, clean' },
    ],
  },
];

/** The mission object for the current run: which mission, which step. */
export function createMissionState() {
  return {
    active: null, // { index, step } or null
    done: 0, // missions completed
    cometCar: null,
    enemies: [],
  };
}

/** Start a mission: set up its first step (spawn the Comet, the crew, the heat). */
export function startMission(state, index) {
  const mission = MISSIONS[index];
  state.missions.active = { index, step: 0 };
  state.missions.enemies = [];
  state.missions.cometCar = null;
  if (index === 1) {
    // The Comet GT waits at its parking spot.
    const spot = state.city.locations.cometSpot;
    const car = createCar(spot.x, spot.y, 0, 'sports', state.rng, { state: 'parked', color: '#d42a2a' });
    state.cars.push(car);
    state.missions.cometCar = car;
  }
  if (index === 2) {
    // The rival crew holds the docks.
    const base = state.city.locations.docksPickup;
    const spots = [
      { x: base.x - 60, y: base.y - 80 },
      { x: base.x + 40, y: base.y - 40 },
      { x: base.x - 30, y: base.y + 70 },
      { x: base.x + 80, y: base.y + 30 },
      { x: base.x - 90, y: base.y + 10 },
    ];
    state.missions.enemies = spots.map((p) => ({
      x: p.x, y: p.y, angle: 0, health: 100, shootTimer: 1 + Math.random(),
    }));
  }
  if (index === 3) {
    // The heat is already on.
    addHeat(state.wanted, 55);
  }
  return { type: 'missionStart', name: mission.name, intro: mission.intro };
}

/** The current objective text, or the free-roam hint. */
export function currentObjective(state) {
  const active = state.missions.active;
  if (active) {
    const mission = MISSIONS[active.index];
    return mission.steps[active.step].text;
  }
  if (state.missions.done < MISSIONS.length) {
    return MISSIONS[state.missions.done].startText;
  }
  return 'Solmara is yours. Free roam — cause trouble or lie low.';
}

/** The marker the HUD and minimap point at, or null. */
export function currentMarker(state) {
  const active = state.missions.active;
  if (active) {
    const mission = MISSIONS[active.index];
    const step = mission.steps[active.step];
    if (step.type === 'enterCar' && state.missions.cometCar) {
      return { x: state.missions.cometCar.x, y: state.missions.cometCar.y };
    }
    if (step.type === 'escape') return null;
    if (step.target && state.city.locations[step.target]) {
      const loc = state.city.locations[step.target];
      return { x: loc.x, y: loc.y };
    }
    return null;
  }
  if (state.missions.done < MISSIONS.length) {
    const mission = MISSIONS[state.missions.done];
    const loc = state.city.locations[mission.start];
    return loc ? { x: loc.x, y: loc.y } : null;
  }
  return null;
}

function playerPos(state) {
  const p = state.player;
  if (p.state === 'car' && p.car) return { x: p.car.x, y: p.car.y };
  return { x: p.x, y: p.y };
}

/**
 * One step for the mission system: start a mission at its marker, advance
 * steps, pay out on completion. Returns events for the world.
 */
export function updateMissions(state, dt) {
  const events = [];
  const pos = playerPos(state);
  const active = state.missions.active;

  // No mission running: walk into the next start marker to begin it.
  if (!active) {
    if (state.missions.done < MISSIONS.length) {
      const mission = MISSIONS[state.missions.done];
      const loc = state.city.locations[mission.start];
      if (loc && Math.hypot(pos.x - loc.x, pos.y - loc.y) < 70) {
        events.push(startMission(state, state.missions.done));
      }
    }
    return events;
  }

  const mission = MISSIONS[active.index];
  const step = mission.steps[active.step];
  let done = false;

  if (step.type === 'goto') {
    const loc = state.city.locations[step.target];
    if (loc && Math.hypot(pos.x - loc.x, pos.y - loc.y) < 70) done = true;
  } else if (step.type === 'enterCar') {
    if (state.player.state === 'car' && state.player.car === state.missions.cometCar) {
      done = true;
      // Stealing the Comet in broad daylight draws the law.
      if (addHeat(state.wanted, 30)) events.push({ type: 'starsUp', stars: state.wanted.stars });
      events.push({ type: 'toast', text: 'The cops saw that. Lose them or outrun them.' });
    }
  } else if (step.type === 'clear') {
    if (state.missions.enemies.every((e) => e.health <= 0)) done = true;
  } else if (step.type === 'escape') {
    if (state.wanted.stars === 0) done = true;
  }

  if (!done) return events;

  active.step += 1;
  if (active.step < mission.steps.length) {
    events.push({ type: 'toast', text: mission.steps[active.step].text });
    return events;
  }

  // Mission complete: pay out.
  const pay = MISSION_PAY[active.index];
  state.money += pay;
  state.missions.done += 1;
  state.missions.active = null;
  state.missions.enemies = [];
  events.push({ type: 'missionComplete', name: mission.name, pay });
  return events;
}

/** Mission enemies shoot at the player when close and alive. */
export function updateEnemies(state, dt) {
  const events = [];
  const p = state.player;
  for (const e of state.missions.enemies) {
    if (e.health <= 0) continue;
    const dist = Math.hypot(p.x - e.x, p.y - e.y);
    e.angle = Math.atan2(p.y - e.y, p.x - e.x);
    if (p.state === 'foot' && dist < 420) {
      e.shootTimer -= dt;
      if (e.shootTimer <= 0) {
        e.shootTimer = 0.9 + Math.random() * 0.6;
        events.push({ type: 'enemyShoot', enemy: e });
      }
    }
  }
  return events;
}
