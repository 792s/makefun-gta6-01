// The cab game: steal a taxi, and Solmara starts hailing you. A fare is a
// little loop of its own — find the customer waving on the sidewalk, get
// them to the marker before the meter runs out, get paid, keep your rating
// up. Walk away from the cab mid-fare and the customer walks away from you.
import { randomRoadPoint, randomSidewalkPoint } from './city.js';

const PICKUP_RANGE = 70;
const DROPOFF_RANGE = 70;
const FARE_COOLDOWN = 8;
const BASE_FARE = 40;

/** The cab ledger: no fare running, a clean five-star rating. */
export function createTaxi() {
  return {
    active: null,
    cooldown: 5,
    faresDone: 0,
    earned: 0,
    rating: 5,
    vipFares: 0,
  };
}

function taxiCar(state) {
  const player = state.player;
  if (player.state !== 'car' || !player.car) return null;
  return player.car.type === 'taxi' ? player.car : null;
}

function playerPos(state) {
  const player = state.player;
  if (player.state === 'car' && player.car) return { x: player.car.x, y: player.car.y };
  return { x: player.x, y: player.y };
}

function farRoadPoint(state, from, minDist, maxDist) {
  for (let tries = 0; tries < 10; tries += 1) {
    const point = randomRoadPoint(state.rng, state.city);
    const dist = Math.hypot(point.x - from.x, point.y - from.y);
    if (dist >= minDist && dist <= maxDist) return { point, dist };
  }
  const fallback = randomRoadPoint(state.rng, state.city);
  return { point: fallback, dist: Math.hypot(fallback.x - from.x, fallback.y - from.y) };
}

function hailFare(state) {
  const pos = playerPos(state);
  const spot = randomSidewalkPoint(state.rng, state.city);
  const vip = state.rng.next() < 0.2;
  // One fare in ten is an airport run: a flat $150 to the docks, and the
  // traveller is not in a hurry — but the road is long.
  const special = state.rng.next() < 0.1;
  state.taxi.active = {
    phase: 'pickup',
    customer: { x: spot.x, y: spot.y, shirt: vip ? '#ffd94d' : '#f1c40f', skin: '#e0ac69' },
    dest: null,
    dist: 0,
    timeLeft: 0,
    timeLimit: 0,
    vip,
    special,
  };
  return {
    type: 'toast',
    text: special
      ? 'Airport run! A traveller needs the docks — flat $150, gold marker'
      : vip
        ? 'VIP fare! A suit is waving you down — gold marker, double pay, no dawdling'
        : 'Taxi fare: a customer is waving you down — go to the green marker',
  };
}

function startDropoff(state, fare) {
  const pos = playerPos(state);
  // An airport run always ends at the docks, wherever the customer is.
  const dest = fare.special
    ? { point: state.city.locations.docksPickup, dist: Math.hypot(state.city.locations.docksPickup.x - pos.x, state.city.locations.docksPickup.y - pos.y) }
    : farRoadPoint(state, pos, 400, 1200);
  const { point, dist } = dest;
  fare.phase = 'dropoff';
  fare.dest = point;
  fare.dist = dist;
  // A VIP is in a hurry: a tighter meter, double the fare at the end.
  fare.timeLimit = fare.special ? dist / 180 + 30 : fare.vip ? dist / 180 + 18 : dist / 220 + 25;
  fare.timeLeft = fare.timeLimit;
  return {
    type: 'toast',
    text: fare.special
      ? `Airport run — to the docks, ${Math.ceil(fare.timeLeft)}s, flat $150`
      : fare.vip
        ? `VIP aboard — double fare, but they are in a hurry: ${Math.ceil(fare.timeLeft)}s`
        : `Fare aboard — drop them at the marker, ${Math.ceil(fare.timeLeft)}s on the meter`,
  };
}

function finishFare(state, fare) {
  const timeBonus = Math.round((fare.timeLeft / fare.timeLimit) * 30);
  let pay = fare.special ? 150 + timeBonus : BASE_FARE + Math.round(fare.dist / 25) + timeBonus;
  if (fare.vip) {
    pay *= 2;
    state.taxi.vipFares += 1;
  }
  // Rush hour, five to seven in the evening: the city pays half as much
  // again, because everyone is late and nobody argues about the meter.
  const rush = isRushHour(state);
  if (rush) pay = Math.round(pay * 1.5);
  state.money += pay;
  state.taxi.faresDone += 1;
  state.taxi.earned += pay;
  state.taxi.rating = Math.min(5, state.taxi.rating + 0.1);
  state.taxi.active = null;
  state.taxi.cooldown = FARE_COOLDOWN;
  return [
    { type: 'cash' },
    {
      type: 'toast',
      text: fare.vip
        ? `VIP fare paid: +$${pay} (tip $${timeBonus}). Rating ${state.taxi.rating.toFixed(1)}★`
        : rush
          ? `Rush-hour fare paid: +$${pay} (tip $${timeBonus}). Rating ${state.taxi.rating.toFixed(1)}★`
          : `Fare paid: +$${pay} (tip $${timeBonus}). Rating ${state.taxi.rating.toFixed(1)}★`,
    },
  ];
}

/** Five to seven in the evening, Solmara time: the meter runs hot. */
export function isRushHour(state) {
  const minutes = state.daynight ? state.daynight.minutes : 0;
  return minutes >= 17 * 60 && minutes < 19 * 60;
}

function failFare(state, reason) {
  state.taxi.rating = Math.max(1, state.taxi.rating - 0.3);
  state.taxi.active = null;
  state.taxi.cooldown = FARE_COOLDOWN;
  return [{ type: 'toast', text: `${reason} Rating ${state.taxi.rating.toFixed(1)}★` }];
}

/**
 * One fixed step for the cab game. Returns events for sound and toasts.
 * Only runs when Kai is driving a taxi; anywhere else the meter stays off.
 */
export function updateTaxi(state, dt) {
  const events = [];
  const cab = taxiCar(state);
  const fare = state.taxi.active;
  if (state.taxi.cooldown > 0) state.taxi.cooldown -= dt;
  if (!cab) {
    if (fare) {
      state.taxi.active = null;
      state.taxi.cooldown = FARE_COOLDOWN;
      events.push({ type: 'toast', text: 'You left the cab — the fare cancelled.' });
      state.taxi.rating = Math.max(1, state.taxi.rating - 0.1);
    }
    return events;
  }
  if (!fare) {
    if (state.taxi.cooldown <= 0) events.push(hailFare(state));
    return events;
  }
  const pos = playerPos(state);
  if (fare.phase === 'pickup') {
    if (Math.hypot(pos.x - fare.customer.x, pos.y - fare.customer.y) < PICKUP_RANGE) {
      events.push(startDropoff(state, fare));
    }
    return events;
  }
  fare.timeLeft -= dt;
  if (fare.timeLeft <= 0) {
    events.push(...failFare(state, 'Too slow — the customer got out and walked.'));
    return events;
  }
  if (Math.hypot(pos.x - fare.dest.x, pos.y - fare.dest.y) < DROPOFF_RANGE) {
    events.push(...finishFare(state, fare));
  }
  return events;
}

/** Where the HUD and the minimap point for the cab game, or null. */
export function taxiMarker(state) {
  const fare = state.taxi.active;
  if (!fare) return null;
  if (fare.phase === 'pickup') return { x: fare.customer.x, y: fare.customer.y };
  return fare.dest;
}

/** One HUD line while a fare runs, null when the meter is off. */
export function taxiStatus(state) {
  const fare = state.taxi.active;
  if (!fare) return null;
  const tag = fare.special ? 'TAXI AIRPORT' : fare.vip ? 'TAXI VIP' : 'TAXI';
  if (fare.phase === 'pickup') return `${tag}: pick up the customer`;
  return `${tag}: drop-off in ${Math.max(0, Math.ceil(fare.timeLeft))}s`;
}

/** The green ring and the waiting customer, drawn in world space. */
export function drawTaxiMarkers(ctx, state) {
  const fare = state.taxi.active;
  if (!fare) return;
  const target = fare.phase === 'pickup' ? fare.customer : fare.dest;
  const pulse = 1 + Math.sin(state.time * 4) * 0.12;
  const ring = fare.vip ? '#ffd94d' : '#2ecc71';
  ctx.fillStyle = fare.vip ? 'rgba(255, 217, 77, 0.22)' : 'rgba(46, 204, 113, 0.22)';
  ctx.fillRect(target.x - 6, target.y - 110, 12, 110);
  ctx.strokeStyle = ring;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(target.x, target.y, 28 * pulse, 0, Math.PI * 2);
  ctx.stroke();
  if (fare.phase === 'pickup') {
    ctx.fillStyle = fare.customer.shirt;
    ctx.beginPath();
    ctx.arc(fare.customer.x, fare.customer.y, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = fare.customer.skin;
    ctx.beginPath();
    ctx.arc(fare.customer.x + 4, fare.customer.y, 5.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#2ecc71';
    ctx.font = 'bold 20px system-ui, sans-serif';
    ctx.fillText('$', fare.customer.x - 6, fare.customer.y - 18);
  }
}
