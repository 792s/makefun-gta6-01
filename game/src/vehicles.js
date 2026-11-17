// Cars: arcade driving physics shared by the player, the traffic and the
// police, plus the traffic AI that drives the city's cars along its roads.
import { ROAD_HALF, collideCircle } from './city.js';
import { CAR as CAR_TUNE, TRAFFIC } from './config.js';

export const CAR_TYPES = {
  sedan: { name: 'Sundown Sedan', accel: 1.0, maxSpeed: 1.0, colors: ['#c94f4f', '#4f7ec9', '#e8e4d2', '#7a7a7a', '#d9a441'] },
  van: { name: 'Mule Van', accel: 0.8, maxSpeed: 0.85, colors: ['#e8e4d2', '#8a9ba8', '#b8a88a'] },
  sports: { name: 'Comet GT', accel: 1.35, maxSpeed: 1.25, colors: ['#d42a2a', '#f5d90a', '#222222'] },
  convertible: { name: 'Breeze', accel: 1.05, maxSpeed: 1.05, colors: ['#e87fb0', '#7fd4e8', '#f5f5f5'] },
  truck: { name: 'Hauler', accel: 0.7, maxSpeed: 0.8, colors: ['#5b8db8', '#c9c2b0'] },
  taxi: { name: 'Cab', accel: 1.0, maxSpeed: 1.0, colors: ['#f5c90a'] },
  police: { name: 'PD Interceptor', accel: 1.3, maxSpeed: 1.15, colors: ['#1a1a1a'] },
};

let nextId = 1;

export function createCar(x, y, angle, type, rng, opts = {}) {
  const spec = CAR_TYPES[type] || CAR_TYPES.sedan;
  return {
    id: nextId++,
    x, y, angle,
    speed: 0,
    type,
    name: spec.name,
    color: opts.color || (rng ? rng.pick(spec.colors) : spec.colors[0]),
    state: opts.state || 'parked', // parked | traffic | player | police | wreck
    health: CAR_TUNE.health,
    // Traffic AI state: which road it follows and which way.
    road: opts.road || null,
    dir: opts.dir || 1,
    lane: opts.lane || 0,
    wait: 0,
    // Skid / smoke emitters read these.
    skidding: false,
    smoking: false,
  };
}

/**
 * One physics step for a car the driver steers: throttle -1..1 (reverse to
 * forward), steer -1..1 (left to right), handbrake on/off. Returns how hard
 * it hit something this step (0 when it did not), for crash sound and damage.
 */
export function driveCar(car, throttle, steer, handbrake, dt, city) {
  const spec = CAR_TYPES[car.type] || CAR_TYPES.sedan;
  const accel = CAR_TUNE.accel * spec.accel;
  const maxSpeed = CAR_TUNE.maxSpeed * spec.maxSpeed;
  const maxReverse = CAR_TUNE.maxReverse;

  if (throttle > 0) car.speed += accel * throttle * dt;
  else if (throttle < 0) {
    if (car.speed > 5) car.speed -= CAR_TUNE.brake * dt; // braking
    else car.speed += CAR_TUNE.reverseAccel * throttle * dt; // reversing
  }
  // Drag and rolling resistance.
  car.speed -= car.speed * CAR_TUNE.drag * dt;
  if (handbrake) car.speed -= car.speed * 2.2 * dt;
  car.speed = Math.max(-maxReverse, Math.min(maxSpeed, car.speed));

  // Steering only bites while moving; the handbrake lets the tail out.
  const grip = handbrake ? 0.55 : 1;
  const speedRatio = Math.max(-1, Math.min(1, car.speed / maxSpeed));
  car.angle += steer * CAR_TUNE.steerRate * speedRatio * grip * dt * (car.speed < 0 ? -1 : 1);
  car.skidding = handbrake && Math.abs(car.speed) > 180;

  const vx = Math.cos(car.angle) * car.speed;
  const vy = Math.sin(car.angle) * car.speed;
  const beforeX = car.x;
  const beforeY = car.y;
  car.x += vx * dt;
  car.y += vy * dt;
  const fixed = collideCircle(city, car.x, car.y, CAR_TUNE.radius);
  const hitX = fixed.x - car.x;
  const hitY = fixed.y - car.y;
  car.x = fixed.x;
  car.y = fixed.y;
  const hit = Math.hypot(hitX, hitY);
  if (hit > 0.5) {
    const impact = Math.min(1, Math.abs(car.speed) / 400);
    car.speed *= 0.35;
    car.health -= impact * 22;
    if (car.health <= 30) car.smoking = true;
    if (car.health <= 0) car.state = 'wreck';
    return impact;
  }
  // A nudge against a building at parking speed is not a crash.
  void beforeX;
  void beforeY;
  return 0;
}

/** Push overlapping cars apart and trade some speed, so pile-ups resolve. */
export function collideCars(cars) {
  for (let i = 0; i < cars.length; i += 1) {
    for (let j = i + 1; j < cars.length; j += 1) {
      const a = cars[i];
      const b = cars[j];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const d = Math.hypot(dx, dy);
      const min = CAR_TUNE.radius * 2 - 6;
      if (d >= min || d < 0.001) continue;
      const push = (min - d) / 2;
      const nx = dx / d;
      const ny = dy / d;
      a.x -= nx * push;
      a.y -= ny * push;
      b.x += nx * push;
      b.y += ny * push;
      const exchange = (a.speed - b.speed) * 0.4;
      a.speed -= exchange;
      b.speed += exchange;
      if (Math.abs(exchange) > 60) {
        a.health -= 6;
        b.health -= 6;
        if (a.health <= 30) a.smoking = true;
        if (b.health <= 30) b.smoking = true;
      }
    }
  }
}

/** Lane offset for right-hand traffic on a road of `axis` going `dir`. */
function laneOffset(axis, dir) {
  if (axis === 'v') return dir > 0 ? -24 : 24; // southbound left, northbound right
  return dir > 0 ? 24 : -24; // eastbound below, westbound above
}

/** The next intersection along a traffic car's road, or null past the end. */
function nextIntersection(car, city) {
  if (car.road.axis === 'v') {
    const ys = city.roadsY.filter((y) => (car.dir > 0 ? y > car.y + 20 : y < car.y - 20));
    if (ys.length === 0) return null;
    const y = car.dir > 0 ? Math.min(...ys) : Math.max(...ys);
    return { x: car.road.at, y };
  }
  const xs = city.roadsX.filter((x) => (car.dir > 0 ? x > car.x + 20 : x < car.x - 20));
  if (xs.length === 0) return null;
  const x = car.dir > 0 ? Math.min(...xs) : Math.max(...xs);
  return { x, y: car.road.at };
}

/** Steer a car toward a point, arcade style: returns {throttle, steer}. */
export function steerToward(car, tx, ty, targetSpeed) {
  const wanted = Math.atan2(ty - car.y, tx - car.x);
  let diff = wanted - car.angle;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  const steer = Math.max(-1, Math.min(1, diff * 2.2));
  const throttle = car.speed < targetSpeed ? 1 : 0.2;
  return { throttle, steer };
}

/** One AI step for a traffic car: follow its road, turn at intersections, avoid the car ahead. */
export function updateTraffic(car, dt, city, cars, rng) {
  if (car.state !== 'traffic') return;
  if (car.wait > 0) {
    car.wait -= dt;
    driveCar(car, 0, 0, true, dt, city);
    return;
  }
  // A car close ahead in this lane: brake.
  const aheadX = car.x + Math.cos(car.angle) * TRAFFIC.lookAhead;
  const aheadY = car.y + Math.sin(car.angle) * TRAFFIC.lookAhead;
  let blocked = false;
  for (const other of cars) {
    if (other === car || other.state === 'wreck') continue;
    if (Math.hypot(other.x - aheadX, other.y - aheadY) < CAR_TUNE.radius + 14) {
      blocked = true;
      break;
    }
  }
  const target = nextIntersection(car, city);
  if (!target) {
    // End of the road: turn around.
    car.dir *= -1;
    car.lane = laneOffset(car.road.axis, car.dir);
    return;
  }
  // Aim at the lane's line through the intersection.
  const tx = car.road.axis === 'v' ? car.road.at + car.lane : target.x;
  const ty = car.road.axis === 'h' ? car.road.at + car.lane : target.y;
  const dist = Math.hypot(target.x - car.x, target.y - car.y);
  const { throttle, steer } = steerToward(car, tx, ty, TRAFFIC.cruiseSpeed);
  driveCar(car, blocked ? -0.6 : throttle, steer, false, dt, city);
  if (dist < 46) {
    // At the intersection: mostly straight on, sometimes turn.
    const roll = rng.next();
    if (roll < 0.62) {
      // Straight on: keep road and direction.
    } else {
      const turnLeft = roll < 0.81;
      if (car.road.axis === 'v') {
        const newDir = turnLeft ? (car.dir > 0 ? 1 : -1) : (car.dir > 0 ? -1 : 1);
        car.road = { axis: 'h', at: target.y };
        car.dir = newDir;
      } else {
        const newDir = turnLeft ? (car.dir > 0 ? -1 : 1) : (car.dir > 0 ? 1 : -1);
        car.road = { axis: 'v', at: target.x };
        car.dir = newDir;
      }
      car.lane = laneOffset(car.road.axis, car.dir);
    }
  }
}

export function spawnTraffic(city, rng, count) {
  const cars = [];
  const types = ['sedan', 'sedan', 'van', 'taxi', 'convertible', 'truck', 'sedan'];
  for (let i = 0; i < count; i += 1) {
    const vertical = rng.chance(0.5);
    const road = vertical
      ? { axis: 'v', at: rng.pick(city.roadsX.slice(0, -1)) }
      : { axis: 'h', at: rng.pick(city.roadsY.slice(0, -1)) };
    const dir = rng.chance(0.5) ? 1 : -1;
    const lane = laneOffset(road.axis, dir);
    const x = vertical ? road.at + lane : rng.range(200, 2800);
    const y = vertical ? rng.range(200, 2000) : road.at + lane;
    const angle = vertical ? (dir > 0 ? Math.PI / 2 : -Math.PI / 2) : (dir > 0 ? 0 : Math.PI);
    const car = createCar(x, y, angle, rng.pick(types), rng, { state: 'traffic', road, dir, lane });
    car.speed = TRAFFIC.cruiseSpeed * rng.range(0.7, 1);
    cars.push(car);
  }
  return cars;
}

export function spawnParked(city, rng, count) {
  const cars = [];
  const types = ['sedan', 'sedan', 'van', 'convertible', 'taxi', 'sedan'];
  for (let i = 0; i < count; i += 1) {
    const vertical = rng.chance(0.5);
    const side = rng.chance(0.5) ? 1 : -1;
    let x;
    let y;
    let angle;
    if (vertical) {
      const rx = rng.pick(city.roadsX.slice(0, -1));
      x = rx + side * (ROAD_HALF - 14);
      y = rng.range(180, 2050);
      angle = side > 0 ? Math.PI / 2 : -Math.PI / 2;
    } else {
      const ry = rng.pick(city.roadsY.slice(0, -1));
      x = rng.range(180, 2800);
      y = ry + side * (ROAD_HALF - 14);
      angle = side > 0 ? 0 : Math.PI;
    }
    // Keep parked cars off intersections.
    const onCrossing = city.roadsX.some((rx) => Math.abs(x - rx) < ROAD_HALF + 20)
      && city.roadsY.some((ry) => Math.abs(y - ry) < ROAD_HALF + 20);
    if (onCrossing) continue;
    cars.push(createCar(x, y, angle, rng.pick(types), rng, { state: 'parked' }));
  }
  return cars;
}
