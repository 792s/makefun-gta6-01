// Street racing, time-trial style: find a checkered flag, sit on it, beat
// the clock through the checkpoints. No rivals, no rubber-banding — the par
// time is the rival, and gold pays best. Leave the car mid-race and the
// race is off; the flags stay where they are for another try.
import { isNight } from './daynight.js';

const CHECKPOINT_RANGE = 70;
const START_RANGE = 80;

const ROUTES = [
  {
    name: 'Beach Sprint',
    start: { x: 300, y: 2220 },
    points: [
      { x: 1100, y: 2220 },
      { x: 1900, y: 2220 },
      { x: 2700, y: 2220 },
    ],
  },
  {
    name: 'Downtown Loop',
    start: { x: 1100, y: 700 },
    points: [
      { x: 1900, y: 700 },
      { x: 1900, y: 1500 },
      { x: 1100, y: 1500 },
      { x: 1100, y: 700 },
    ],
  },
  {
    name: 'Docks Dash',
    start: { x: 2700, y: 300 },
    points: [
      { x: 2700, y: 1100 },
      { x: 3050, y: 1100 },
      { x: 3050, y: 1900 },
      { x: 2300, y: 1900 },
    ],
  },
  {
    name: 'Harbor Cruise',
    start: { x: 2850, y: 2300 },
    points: [
      { x: 2850, y: 2300 },
      { x: 1300, y: 2300 },
      { x: 1300, y: 420 },
      { x: 2850, y: 420 },
    ],
  },
  {
    name: 'Park Circuit',
    start: { x: 600, y: 700 },
    points: [
      { x: 600, y: 700 },
      { x: 1100, y: 700 },
      { x: 1100, y: 1200 },
      { x: 600, y: 1200 },
    ],
  },
];

/** A par time for each route, from its length at a brisk 380 units a second. */
function routePar(route) {
  let length = 0;
  let from = route.start;
  for (const point of route.points) {
    length += Math.hypot(point.x - from.x, point.y - from.y);
    from = point;
  }
  return length / 380 + 6;
}

for (const route of ROUTES) route.par = routePar(route);

/** No race running, no best times yet. */
export function createRaces() {
  return {
    active: null,
    best: {},
    wins: 0,
    golds: 0,
    nightWins: 0,
  };
}

export function raceRoutes() {
  return ROUTES;
}

function playerPos(state) {
  const player = state.player;
  if (player.state === 'car' && player.car) return { x: player.car.x, y: player.car.y };
  return { x: player.x, y: player.y };
}

function medalFor(time, par) {
  if (time <= par) return { medal: 'GOLD', pay: 400 };
  if (time <= par * 1.25) return { medal: 'SILVER', pay: 250 };
  if (time <= par * 1.6) return { medal: 'BRONZE', pay: 150 };
  return { medal: 'FINISH', pay: 50 };
}

/** "0:23.4" for the race clock. */
export function formatRaceTime(seconds) {
  const whole = Math.floor(seconds);
  const tenths = Math.floor((seconds - whole) * 10);
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}.${tenths}`;
}

function beginCountdown(state, route) {
  state.races.active = {
    route,
    checkpoint: 0,
    countdown: 3.2,
    time: 0,
    lastCount: 4,
  };
  return { type: 'toast', text: `${route.name} — get ready…` };
}

function finishRace(state, race) {
  const { medal, pay: basePay } = medalFor(race.time, race.route.par);
  // Midnight races pay double: fewer witnesses, braver drivers.
  const night = state.daynight && isNight(state.daynight);
  const pay = night ? basePay * 2 : basePay;
  const previous = state.races.best[race.route.name];
  const isBest = previous === undefined || race.time < previous;
  if (isBest) state.races.best[race.route.name] = race.time;
  state.races.wins += 1;
  if (medal === 'GOLD') state.races.golds += 1;
  if (night) state.races.nightWins += 1;
  state.money += pay;
  state.races.active = null;
  return [
    { type: 'cash' },
    {
      type: 'toast',
      text: `${race.route.name}: ${medal} in ${formatRaceTime(race.time)} — +$${pay}${night ? ' (midnight double!)' : ''}${isBest ? ' (new best!)' : ''}`,
    },
  ];
}

/**
 * One fixed step for the race game. Returns events for sound and toasts.
 * A race only starts and runs while Kai is in a car.
 */
export function updateRaces(state, dt) {
  const events = [];
  const player = state.player;
  const inCar = player.state === 'car' && player.car;
  const race = state.races.active;
  if (!inCar) {
    if (race) {
      state.races.active = null;
      events.push({ type: 'toast', text: 'Out of the car — race cancelled.' });
    }
    return events;
  }
  const pos = playerPos(state);
  if (!race) {
    for (const route of ROUTES) {
      if (Math.hypot(pos.x - route.start.x, pos.y - route.start.y) < START_RANGE) {
        events.push(beginCountdown(state, route));
        break;
      }
    }
    return events;
  }
  if (race.countdown > 0) {
    race.countdown -= dt;
    const count = Math.ceil(race.countdown);
    if (count < race.lastCount && count > 0) {
      race.lastCount = count;
      events.push({ type: 'toast', text: `${count}…` });
    }
    if (race.countdown <= 0) {
      race.countdown = 0;
      events.push({ type: 'toast', text: 'GO!' });
    }
    return events;
  }
  race.time += dt;
  const target = race.route.points[race.checkpoint];
  if (Math.hypot(pos.x - target.x, pos.y - target.y) < CHECKPOINT_RANGE) {
    race.checkpoint += 1;
    if (race.checkpoint >= race.route.points.length) {
      events.push(...finishRace(state, race));
    } else {
      events.push({
        type: 'toast',
        text: `Checkpoint ${race.checkpoint}/${race.route.points.length} — ${formatRaceTime(race.time)}`,
      });
    }
  }
  return events;
}

/** The flag or checkpoint the race points at, or null. */
export function raceMarker(state) {
  const race = state.races.active;
  if (race) {
    if (race.countdown > 0) return race.route.start;
    return race.route.points[race.checkpoint];
  }
  const pos = playerPos(state);
  let nearest = null;
  let nearestD = 400;
  for (const route of ROUTES) {
    const d = Math.hypot(pos.x - route.start.x, pos.y - route.start.y);
    if (d < nearestD) {
      nearestD = d;
      nearest = route.start;
    }
  }
  return nearest;
}

/** One HUD line while a race runs, null on the street. */
export function raceStatus(state) {
  const race = state.races.active;
  if (!race) return null;
  if (race.countdown > 0) return `${race.route.name}: ${Math.ceil(race.countdown)}…`;
  return `${race.route.name}: ${race.checkpoint}/${race.route.points.length} — ${formatRaceTime(race.time)}`;
}

/** Checkered flags and numbered checkpoint rings, in world space. */
export function drawRaceMarkers(ctx, state) {
  const race = state.races.active;
  const pos = playerPos(state);
  for (const route of ROUTES) {
    if (Math.hypot(pos.x - route.start.x, pos.y - route.start.y) > 500) continue;
    drawFlag(ctx, route.start.x, route.start.y, route.name);
  }
  if (!race) return;
  const target = race.countdown > 0 ? race.route.start : race.route.points[race.checkpoint];
  const pulse = 1 + Math.sin(state.time * 5) * 0.12;
  ctx.strokeStyle = '#ff5e3a';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(target.x, target.y, 30 * pulse, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = '#ff5e3a';
  ctx.font = 'bold 16px system-ui, sans-serif';
  ctx.fillText(`${race.checkpoint + 1}`, target.x - 5, target.y - 36);
}

function drawFlag(ctx, x, y, name) {
  ctx.save();
  ctx.translate(x, y);
  ctx.strokeStyle = '#888';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(0, -64);
  ctx.stroke();
  for (let row = 0; row < 3; row += 1) {
    for (let col = 0; col < 4; col += 1) {
      ctx.fillStyle = (row + col) % 2 === 0 ? '#111' : '#fff';
      ctx.fillRect(2 + col * 8, -62 + row * 8, 8, 8);
    }
  }
  ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
  ctx.font = 'bold 11px system-ui, sans-serif';
  ctx.fillText(name, -30, 18);
  ctx.restore();
}
