// The story: five missions for Kai Mercer, each a chain of steps with an
// objective the HUD shows and a marker on the minimap. A mission starts when
// the player reaches its start marker; the first starts with a new game.
// The last one is a race against the clock: three stops, one deadline.
import { MISSION_PAY, MISSION_TIME_LIMIT } from './config.js';
import { createCar } from './vehicles.js';
import { addHeat } from './police.js';

// The story is five missions; after them Solmara keeps calling. Three
// post-story jobs pay for the paint and the nitro.
MISSION_PAY.push(900, 1100, 2000);
MISSION_PAY.push(1300, 2500);
MISSION_PAY.push(1600, 3000);
MISSION_PAY.push(1800, 3500);
MISSION_PAY.push(2000, 4000);
MISSION_PAY.push(2200, 4500);
MISSION_PAY.push(2500, 5000);

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
  {
    name: 'The Long Haul',
    intro: "EDDIE: Three crates, three stops, one very impatient buyer waiting on the beach. Two and a half minutes, Kai — the tide waits for no one.",
    start: 'eddiesGarage',
    startText: "Eddie has one last run — go to Eddie's Garage",
    timeLimit: MISSION_TIME_LIMIT,
    steps: [
      { type: 'timed', target: 'warehouse', text: 'Pick up crate 1 at the North Warehouse' },
      { type: 'timed', target: 'market', text: 'Pick up crate 2 at Palm Market' },
      { type: 'timed', target: 'beach', text: 'Deliver both crates to the buyer at the beach' },
    ],
  },
  {
    name: 'Night Shift',
    intro: "DR. AMARA: The night clinic on the beach is out of medicine, Kai, and the ferry with the next shipment is three days out. Palm Market has a crate with my name on it. Bring it to the beach — quietly.",
    start: 'hospital',
    startText: 'Dr. Amara needs a favour — go to the hospital',
    steps: [
      { type: 'goto', target: 'market', text: 'Pick up the medicine at Palm Market' },
      { type: 'goto', target: 'beach', text: 'Deliver the medicine to the night clinic' },
    ],
  },
  {
    name: 'The Informant',
    intro: "VERA: One of the PD's own wants out, and he is carrying a ledger that names every cop on the docks payroll. Meet him behind the station, get the ledger to my office before they notice he is gone.",
    start: 'park',
    startText: 'Vera has a quiet job — go to Palm Park',
    timeLimit: 90,
    steps: [
      { type: 'goto', target: 'policeStation', text: 'Meet the informant behind the PD' },
      { type: 'timed', target: 'veraOffice', text: "Get the ledger to Vera's office" },
    ],
  },
  {
    name: 'The Last Ferry',
    intro: "EDDIE: The ferry captain will not sail with rats in the hold. The North Warehouse is crawling with the same crew that hit Vera's crate — clear them out, grab the manifest, bring it to the captain on the beach. Last job, Kai. Make it count.",
    start: 'docksPickup',
    startText: "Eddie has one final job — go to the docks",
    steps: [
      { type: 'clear', target: 'warehouse', text: 'Clear the dock rats at the North Warehouse' },
      { type: 'goto', target: 'warehouse', text: 'Grab the manifest' },
      { type: 'goto', target: 'beach', text: 'Hand the manifest to the ferry captain' },
    ],
  },
  {
    name: 'The Getaway Driver',
    intro: "VERA: The take from the harbor job is sitting in a duffel at the docks, and the PD is already circling it. Get there fast, grab it, bring it to my office — and Kai? Do not stop for anyone.",
    start: 'veraOffice',
    startText: 'Vera needs a fast driver — go to her office',
    timeLimit: 75,
    steps: [
      { type: 'timed', target: 'docksPickup', text: 'Grab the duffel at the docks' },
      { type: 'goto', target: 'veraOffice', text: "Bring the take back to Vera's office" },
    ],
  },
  {
    name: 'King of Solmara',
    intro: "EDDIE: Every two-bit wheelman in this town thinks he is faster than you. Palm Market, noon, an audience. Clear the pretenders out of the way, take the crown to the beach, and come home a legend.",
    start: 'eddiesGarage',
    startText: "Eddie has a crown to win — go to Eddie's Garage",
    steps: [
      { type: 'clear', target: 'market', text: 'Clear the pretenders at Palm Market' },
      { type: 'timed', target: 'beach', text: 'Take the crown to the beach' },
      { type: 'goto', target: 'safehouse', text: 'Come home a legend' },
    ],
  },
  {
    name: "The Courier's Gamble",
    intro: "VERA: Three packages, three corners of town, one clock. The buyers do not wait, Kai, and neither do I. Forty-five seconds a stop — miss one and the whole run is worthless.",
    start: 'veraOffice',
    startText: "Vera has a gamble for you — go to her office",
    timeLimit: 135,
    steps: [
      { type: 'timed', target: 'warehouse', text: 'Package 1: the North Warehouse' },
      { type: 'timed', target: 'hospital', text: 'Package 2: the hospital' },
      { type: 'timed', target: 'beach', text: 'Package 3: the buyer at the beach' },
    ],
  },
  {
    name: 'The Last Word',
    intro: "EDDIE: The pretenders came back with friends, Kai, and they are camped at the docks with a grudge and a truck full of trouble. Clear them out, take the truck to my garage, and this town finally learns your name.",
    start: 'eddiesGarage',
    startText: "Eddie needs one last job — go to Eddie's Garage",
    steps: [
      { type: 'clear', target: 'docksPickup', text: 'Clear the crew at the docks' },
      { type: 'goto', target: 'docksPickup', text: 'Take the truck' },
      { type: 'goto', target: 'eddiesGarage', text: "Drive the truck to Eddie's Garage" },
    ],
  },
  {
    name: 'The Long Way Home',
    intro: "VERA: The papers have to be at the hospital, then a courier at the park, then you home — in that order, and the clock is already running. Two minutes, Kai. Do not take the scenic route.",
    start: 'veraOffice',
    startText: "Vera has papers to move — go to her office",
    timeLimit: 120,
    steps: [
      { type: 'timed', target: 'hospital', text: 'Drop the papers at the hospital' },
      { type: 'timed', target: 'park', text: 'Meet the courier at the park' },
      { type: 'goto', target: 'safehouse', text: 'Get home safe' },
    ],
  },
  {
    name: "Solmara's Finest",
    intro: "EDDIE: The beach crew thinks the sand is theirs. Show them it is not, take the boat papers to the docks, and let Vera sign off on the whole thing. Do this one right and the town stops testing you.",
    start: 'eddiesGarage',
    startText: "Eddie has one more for you — go to Eddie's Garage",
    steps: [
      { type: 'clear', target: 'beach', text: 'Clear the beach crew' },
      { type: 'timed', target: 'docksPickup', text: 'Take the boat papers to the docks' },
      { type: 'goto', target: 'veraOffice', text: 'Vera signs off' },
    ],
  },
  {
    name: 'The Quiet Town',
    intro: "VERA: No guns on this one, Kai. An envelope to the park, a prescription from the hospital, and the fisherman at the beach gets it all. A hundred seconds. The town stays quiet if you do.",
    start: 'veraOffice',
    startText: "Vera has a quiet errand — go to her office",
    timeLimit: 100,
    steps: [
      { type: 'timed', target: 'park', text: 'Drop the envelope at the park' },
      { type: 'timed', target: 'hospital', text: 'Pick up the prescription' },
      { type: 'goto', target: 'beach', text: 'Hand it all to the fisherman' },
    ],
  },
  {
    name: 'The Last Delivery',
    intro: "EDDIE: One engine, one warehouse, one market crew that does not want it moved. Clear them out, take the engine north, and park it where it belongs. Then you are done, Kai. The town is yours.",
    start: 'eddiesGarage',
    startText: "Eddie has the last delivery — go to Eddie's Garage",
    steps: [
      { type: 'clear', target: 'market', text: 'Clear the market crew' },
      { type: 'timed', target: 'warehouse', text: 'Take the engine to the North Warehouse' },
      { type: 'goto', target: 'safehouse', text: 'Park it and walk away' },
    ],
  },
  {
    name: 'The Harbor Lights',
    intro: "VERA: The harbor needs light, Kai, and the harbourmaster only trusts me. A flare at the docks, a flare at the beach, and back here before the clock runs out. One hundred and ten seconds. The boats are waiting.",
    start: 'veraOffice',
    startText: "Vera needs the harbor lit — go to her office",
    timeLimit: 110,
    steps: [
      { type: 'timed', target: 'docksPickup', text: 'Light the first flare at the docks' },
      { type: 'timed', target: 'beach', text: 'Light the second flare at the beach' },
      { type: 'goto', target: 'veraOffice', text: 'Tell Vera the harbor is lit' },
    ],
  },
  {
    name: 'The End of the Road',
    intro: "EDDIE: Last one, Kai, and it is the biggest. The warehouse crew has a ledger that says too much about too many people. Clear them out, take the ledger to the market, and walk away from all of it. After this, you are not a driver any more. You are a legend.",
    start: 'eddiesGarage',
    startText: "Eddie has the last job of all — go to Eddie's Garage",
    steps: [
      { type: 'clear', target: 'warehouse', text: 'Clear the warehouse crew' },
      { type: 'timed', target: 'market', text: 'Take the ledger to the market' },
      { type: 'goto', target: 'safehouse', text: 'Walk away from it all' },
    ],
  },
  {
    name: 'The Morning After',
    intro: "VERA: The town is quiet this morning, Kai, and quiet makes me nervous. Check the park, check the hospital, and come home. If anything is wrong, you will know it when you see it.",
    start: 'veraOffice',
    startText: "Vera wants a quiet check — go to her office",
    timeLimit: 90,
    steps: [
      { type: 'timed', target: 'park', text: 'Check the park' },
      { type: 'timed', target: 'hospital', text: 'Check the hospital' },
      { type: 'goto', target: 'safehouse', text: 'Come home' },
    ],
  },
  {
    name: 'The Solmara Crown',
    intro: "EDDIE: Twenty jobs, Kai. Twenty. One more and they stop calling you a driver and start calling you the crown of Solmara. Clear the docks, take the crown to the beach, and come home to a town that finally knows your name.",
    start: 'eddiesGarage',
    startText: "Eddie has the crown — go to Eddie's Garage",
    steps: [
      { type: 'clear', target: 'docksPickup', text: 'Clear the docks for the last time' },
      { type: 'timed', target: 'beach', text: 'Take the crown to the beach' },
      { type: 'goto', target: 'safehouse', text: 'Come home the crown of Solmara' },
    ],
  },
];

/** Format a countdown as m:ss, for the objective line. */
export function formatTimeLeft(seconds) {
  const s = Math.max(0, Math.ceil(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/** The mission object for the current run: which mission, which step. */
export function createMissionState() {
  return {
    active: null, // { index, step } or null
    done: 0, // missions completed
    cometCar: null,
    enemies: [],
    timeLeft: 0, // seconds left on a timed mission, 0 when none runs
  };
}

/** Start a mission: set up its first step (spawn the Comet, the crew, the heat). */
export function startMission(state, index) {
  const mission = MISSIONS[index];
  state.missions.active = { index, step: 0 };
  state.missions.enemies = [];
  state.missions.cometCar = null;
  state.missions.timeLeft = mission.timeLimit || 0;
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
  if (index === 7) {
    // The dock rats hold the North Warehouse.
    const base = state.city.locations.warehouse;
    const spots = [
      { x: base.x - 70, y: base.y - 60 },
      { x: base.x + 50, y: base.y - 90 },
      { x: base.x - 40, y: base.y + 80 },
      { x: base.x + 90, y: base.y + 40 },
      { x: base.x - 100, y: base.y + 20 },
    ];
    state.missions.enemies = spots.map((p) => ({
      x: p.x, y: p.y, angle: 0, health: 100, shootTimer: 1 + Math.random(),
    }));
  }
  if (index === 9) {
    // The pretenders hold Palm Market.
    const base = state.city.locations.market;
    const spots = [
      { x: base.x - 50, y: base.y - 70 },
      { x: base.x + 60, y: base.y - 30 },
      { x: base.x - 80, y: base.y + 50 },
      { x: base.x + 40, y: base.y + 90 },
    ];
    state.missions.enemies = spots.map((p) => ({
      x: p.x, y: p.y, angle: 0, health: 100, shootTimer: 1 + Math.random(),
    }));
  }
  if (index === 11) {
    // The crew came back with friends: six of them at the docks.
    const base = state.city.locations.docksPickup;
    const spots = [
      { x: base.x - 90, y: base.y - 60 },
      { x: base.x + 70, y: base.y - 80 },
      { x: base.x - 50, y: base.y + 70 },
      { x: base.x + 100, y: base.y + 30 },
      { x: base.x - 120, y: base.y + 10 },
      { x: base.x + 30, y: base.y - 110 },
    ];
    state.missions.enemies = spots.map((p) => ({
      x: p.x, y: p.y, angle: 0, health: 100, shootTimer: 1 + Math.random(),
    }));
  }
  if (index === 13) {
    // The beach crew holds the sand.
    const base = state.city.locations.beach;
    const spots = [
      { x: base.x - 80, y: base.y - 40 },
      { x: base.x + 60, y: base.y - 70 },
      { x: base.x - 30, y: base.y + 60 },
      { x: base.x + 90, y: base.y + 30 },
    ];
    state.missions.enemies = spots.map((p) => ({
      x: p.x, y: p.y, angle: 0, health: 100, shootTimer: 1 + Math.random(),
    }));
  }
  if (index === 15) {
    // The market crew does not want the engine moved.
    const base = state.city.locations.market;
    const spots = [
      { x: base.x - 60, y: base.y - 50 },
      { x: base.x + 70, y: base.y - 60 },
      { x: base.x - 90, y: base.y + 40 },
      { x: base.x + 50, y: base.y + 80 },
      { x: base.x - 20, y: base.y - 100 },
    ];
    state.missions.enemies = spots.map((p) => ({
      x: p.x, y: p.y, angle: 0, health: 100, shootTimer: 1 + Math.random(),
    }));
  }
  if (index === 17) {
    // The warehouse crew guards the ledger.
    const base = state.city.locations.warehouse;
    const spots = [
      { x: base.x - 70, y: base.y - 50 },
      { x: base.x + 60, y: base.y - 80 },
      { x: base.x - 40, y: base.y + 70 },
      { x: base.x + 90, y: base.y + 40 },
      { x: base.x - 110, y: base.y + 10 },
    ];
    state.missions.enemies = spots.map((p) => ({
      x: p.x, y: p.y, angle: 0, health: 100, shootTimer: 1 + Math.random(),
    }));
  }
  if (index === 19) {
    // The docks, one last time: seven of them.
    const base = state.city.locations.docksPickup;
    const spots = [
      { x: base.x - 80, y: base.y - 70 },
      { x: base.x + 60, y: base.y - 90 },
      { x: base.x - 50, y: base.y + 80 },
      { x: base.x + 90, y: base.y + 40 },
      { x: base.x - 120, y: base.y + 20 },
      { x: base.x + 20, y: base.y - 120 },
      { x: base.x - 10, y: base.y + 110 },
    ];
    state.missions.enemies = spots.map((p) => ({
      x: p.x, y: p.y, angle: 0, health: 100, shootTimer: 1 + Math.random(),
    }));
  }
  return { type: 'missionStart', name: mission.name, intro: mission.intro };
}

/** The current objective text, or the free-roam hint. */
export function currentObjective(state) {
  const active = state.missions.active;
  if (active) {
    const mission = MISSIONS[active.index];
    let text = mission.steps[active.step].text;
    if (mission.timeLimit) text += ` — ${formatTimeLeft(state.missions.timeLeft)} left`;
    return text;
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

  // A timed mission runs out: the deal is off, the job can be retried.
  if (mission.timeLimit) {
    state.missions.timeLeft -= dt;
    if (state.missions.timeLeft <= 0) {
      state.missions.timeLeft = 0;
      state.missions.active = null;
      state.missions.enemies = [];
      events.push({ type: 'missionFailed', name: mission.name });
      return events;
    }
  }

  if (step.type === 'goto' || step.type === 'timed') {
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
