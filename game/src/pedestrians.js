// Pedestrians: the city's people. They stroll the sidewalks, cross at
// corners, and run when a gun goes off or a car comes at them too fast.
import { PEDS } from './config.js';
import { collideCircle, randomSidewalkPoint } from './city.js';

const SHIRTS = ['#e74c3c', '#3498db', '#f1c40f', '#2ecc71', '#9b59b6', '#e67e22', '#ecf0f1', '#1abc9c'];
const SKINS = ['#f1c27d', '#e0ac69', '#c68642', '#8d5524', '#ffdbac'];

let nextId = 1;

export function createPed(x, y, rng) {
  return {
    id: nextId++,
    x, y,
    angle: rng.range(0, Math.PI * 2),
    speed: 0,
    state: 'walk', // walk | flee | down
    shirt: rng.pick(SHIRTS),
    skin: rng.pick(SKINS),
    target: null,
    downTime: 0,
  };
}

export function spawnPeds(city, rng, count) {
  const peds = [];
  for (let i = 0; i < count; i += 1) {
    const p = randomSidewalkPoint(rng, city);
    peds.push(createPed(p.x, p.y, rng));
  }
  return peds;
}

/**
 * One step for every pedestrian. `danger` is a list of {x, y, radius} the
 * peds run from (gunfire, a speeding car, a police chase).
 */
export function updatePeds(peds, dt, city, rng, danger) {
  for (const ped of peds) {
    if (ped.state === 'down') {
      ped.downTime += dt;
      continue;
    }
    // Flee the nearest danger, if any is close.
    let fleeX = 0;
    let fleeY = 0;
    for (const d of danger) {
      const dx = ped.x - d.x;
      const dy = ped.y - d.y;
      const dist = Math.hypot(dx, dy);
      if (dist < d.radius && dist > 1) {
        fleeX += (dx / dist) * (1 - dist / d.radius);
        fleeY += (dy / dist) * (1 - dist / d.radius);
      }
    }
    if (fleeX !== 0 || fleeY !== 0) {
      ped.state = 'flee';
      const len = Math.hypot(fleeX, fleeY);
      ped.angle = Math.atan2(fleeY / len, fleeX / len);
      ped.speed = PEDS.fleeSpeed;
    } else {
      if (ped.state === 'flee') ped.state = 'walk';
      // Stroll: pick a sidewalk point, walk to it, pick another.
      if (!ped.target || Math.hypot(ped.target.x - ped.x, ped.target.y - ped.y) < 24) {
        ped.target = randomSidewalkPoint(rng, city);
      }
      ped.angle = Math.atan2(ped.target.y - ped.y, ped.target.x - ped.x);
      ped.speed = PEDS.walkSpeed * rng.range(0.85, 1.15);
      // Keep the stroll local: retarget if the point is too far.
      if (Math.hypot(ped.target.x - ped.x, ped.target.y - ped.y) > 900) {
        ped.target = randomSidewalkPoint(rng, city);
      }
    }
    ped.x += Math.cos(ped.angle) * ped.speed * dt;
    ped.y += Math.sin(ped.angle) * ped.speed * dt;
    const fixed = collideCircle(city, ped.x, ped.y, 10);
    ped.x = fixed.x;
    ped.y = fixed.y;
  }
}

/** A ped knocked down (by a car or a bullet): down, not moving. */
export function knockDown(ped) {
  ped.state = 'down';
  ped.downTime = 0;
  ped.speed = 0;
}
