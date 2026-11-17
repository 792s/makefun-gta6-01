// The Solmara PD: the wanted level, the patrol cars that chase the player,
// and the officers who try to bust them on foot.
import { POLICE } from './config.js';
import { createCar, driveCar, steerToward } from './vehicles.js';
import { enemyShoot } from './combat.js';
import { collideCircle, randomRoadPoint } from './city.js';

// How many patrol cars each wanted level sends.
const CARS_PER_STAR = [0, 1, 2, 3, 4, 6];
// How many officers on foot each level sends (they come out of the cars).
const COPS_PER_STAR = [0, 1, 2, 2, 3, 4];

export function createWanted() {
  return { stars: 0, heat: 0, unseenTime: 0 };
}

export function starsForHeat(heat) {
  let stars = 0;
  for (let i = 0; i < POLICE.starHeat.length; i += 1) {
    if (heat >= POLICE.starHeat[i]) stars = i;
  }
  return stars;
}

/** Add heat from a crime. Returns true when the wanted level went up. */
export function addHeat(wanted, amount) {
  wanted.heat = Math.min(100, wanted.heat + amount);
  const stars = starsForHeat(wanted.heat);
  if (stars > wanted.stars) {
    wanted.stars = stars;
    wanted.unseenTime = 0;
    return true;
  }
  return false;
}

export function clearWanted(wanted) {
  wanted.stars = 0;
  wanted.heat = 0;
  wanted.unseenTime = 0;
}

function spawnPoliceCar(state, city, rng) {
  // A road point 400-700 away from the player, never on top of them.
  for (let tries = 0; tries < 12; tries += 1) {
    const p = randomRoadPoint(rng, city);
    const d = Math.hypot(p.x - state.player.x, p.y - state.player.y);
    if (d > 400 && d < 800) {
      const angle = Math.atan2(state.player.y - p.y, state.player.x - p.x);
      const car = createCar(p.x, p.y, angle, 'police', rng, { state: 'police' });
      state.cars.push(car);
      return car;
    }
  }
  return null;
}

function deployCop(state, car) {
  const cop = {
    x: car.x, y: car.y,
    angle: 0, speed: 0,
    state: 'chase',
    bustTimer: 0,
    shootTimer: 1,
    car,
  };
  state.cops.push(cop);
  return cop;
}

/**
 * One step for the whole wanted system: decay when unseen, spawn and drive
 * patrol cars, deploy and move officers. Returns events for the world.
 */
export function updatePolice(state, dt, city, rng) {
  const events = [];
  const { wanted, player } = state;
  const playerPos = player.state === 'car' && player.car
    ? { x: player.car.x, y: player.car.y }
    : { x: player.x, y: player.y };

  // Does any police see the player? (Within sight range of a car or a cop.)
  let seen = false;
  for (const car of state.cars) {
    if (car.state !== 'police') continue;
    if (Math.hypot(car.x - playerPos.x, car.y - playerPos.y) < POLICE.sightRange) seen = true;
  }
  for (const cop of state.cops) {
    if (Math.hypot(cop.x - playerPos.x, cop.y - playerPos.y) < POLICE.sightRange) seen = true;
  }

  // Cool down: unseen for long enough and a star drops.
  if (wanted.stars > 0) {
    if (seen) wanted.unseenTime = 0;
    else {
      wanted.unseenTime += dt;
      if (wanted.unseenTime >= POLICE.coolDown) {
        wanted.unseenTime = 0;
        wanted.stars -= 1;
        wanted.heat = wanted.stars === 0 ? 0 : POLICE.starHeat[wanted.stars];
        events.push({ type: 'starsDown', stars: wanted.stars });
      }
    }
  }

  // Keep the right number of patrol cars out.
  const policeCars = state.cars.filter((c) => c.state === 'police');
  const wantCars = CARS_PER_STAR[wanted.stars] || 0;
  if (policeCars.length < wantCars && wanted.stars > 0) {
    spawnPoliceCar(state, city, rng);
  }
  // Cars too far away give up and leave (their drivers go home).
  for (let i = state.cars.length - 1; i >= 0; i -= 1) {
    const car = state.cars[i];
    if (car.state !== 'police') continue;
    const d = Math.hypot(car.x - playerPos.x, car.y - playerPos.y);
    if ((wanted.stars === 0 && d > 300) || d > 1600) {
      state.cars.splice(i, 1);
    }
  }

  // Drive the patrol cars at the player.
  for (const car of state.cars) {
    if (car.state !== 'police') continue;
    // Predict where the player will be, so the chase cuts corners.
    const lead = player.state === 'car' && player.car ? 0.6 : 0.25;
    const pvx = player.state === 'car' && player.car
      ? Math.cos(player.car.angle) * player.car.speed : 0;
    const pvy = player.state === 'car' && player.car
      ? Math.sin(player.car.angle) * player.car.speed : 0;
    const tx = playerPos.x + pvx * lead;
    const ty = playerPos.y + pvy * lead;
    const dist = Math.hypot(tx - car.x, ty - car.y);
    const { throttle, steer } = steerToward(car, tx, ty, POLICE.chaseSpeed);
    const hit = driveCar(car, throttle, steer, false, dt, city);
    if (hit > 0.25) events.push({ type: 'crash', x: car.x, y: car.y, strength: hit });
    // On foot and close: an officer gets out to make the arrest.
    if (player.state === 'foot' && dist < 120 && state.cops.length < (COPS_PER_STAR[wanted.stars] || 0)) {
      deployCop(state, car);
      events.push({ type: 'copOut', x: car.x, y: car.y });
    }
  }

  // Officers on foot chase the player and try to bust them.
  for (let i = state.cops.length - 1; i >= 0; i -= 1) {
    const cop = state.cops[i];
    const dist = Math.hypot(playerPos.x - cop.x, playerPos.y - cop.y);
    if (wanted.stars === 0 || dist > 900) {
      state.cops.splice(i, 1);
      continue;
    }
    if (player.state === 'foot') {
      cop.angle = Math.atan2(playerPos.y - cop.y, playerPos.x - cop.x);
      const speed = 265;
      cop.x += Math.cos(cop.angle) * speed * dt;
      cop.y += Math.sin(cop.angle) * speed * dt;
      const fixed = collideCircle(city, cop.x, cop.y, 12);
      cop.x = fixed.x;
      cop.y = fixed.y;
      // Close enough, long enough: busted.
      if (dist < POLICE.bustRange) {
        cop.bustTimer += dt;
        if (cop.bustTimer >= POLICE.bustTime) {
          events.push({ type: 'busted' });
          return events;
        }
      } else {
        cop.bustTimer = Math.max(0, cop.bustTimer - dt * 2);
      }
      // At 3 stars and up, officers shoot.
      if (wanted.stars >= 3 && dist < 420 && dist > 60) {
        cop.shootTimer -= dt;
        if (cop.shootTimer <= 0) {
          cop.shootTimer = 1.15;
          enemyShoot(cop, player, state.bullets);
          events.push({ type: 'gunshot', x: cop.x, y: cop.y });
        }
      }
    } else {
      // The player drove off: the officer runs back toward their car.
      if (cop.car) {
        cop.angle = Math.atan2(cop.car.y - cop.y, cop.car.x - cop.x);
        cop.x += Math.cos(cop.angle) * 240 * dt;
        cop.y += Math.sin(cop.angle) * 240 * dt;
        if (Math.hypot(cop.car.x - cop.x, cop.car.y - cop.y) < 30) {
          state.cops.splice(i, 1);
        }
      }
    }
  }
  return events;
}
