// The player, Kai Mercer: on foot (walk, run, aim, shoot) and in a car.
// Entering and leaving cars lives here; driving itself is in vehicles.js.
import { PLAYER } from './config.js';
import { collideCircle } from './city.js';

export function createPlayer(x, y) {
  return {
    x, y,
    angle: -Math.PI / 2, // facing up the street
    aimAngle: -Math.PI / 2,
    health: PLAYER.health,
    state: 'foot', // foot | car
    car: null,
    ammo: PLAYER.magazine,
    reloading: false,
    reloadLeft: 0,
    fireLeft: 0, // cooldown between shots
    moving: false,
  };
}

/** On-foot movement: `dir` is the normalised input direction, `run` sprints. */
export function updateOnFoot(player, dir, run, dt, city) {
  const speed = run ? PLAYER.runSpeed : PLAYER.walkSpeed;
  player.moving = dir.x !== 0 || dir.y !== 0;
  if (player.moving) {
    player.angle = Math.atan2(dir.y, dir.x);
    player.x += dir.x * speed * dt;
    player.y += dir.y * speed * dt;
    const fixed = collideCircle(city, player.x, player.y, PLAYER.radius);
    player.x = fixed.x;
    player.y = fixed.y;
  }
  if (player.fireLeft > 0) player.fireLeft -= dt;
  if (player.reloading) {
    player.reloadLeft -= dt;
    if (player.reloadLeft <= 0) {
      player.reloading = false;
      player.ammo = PLAYER.magazine;
    }
  }
}

/** The nearest car the player can steal, within reach, or null. */
export function nearestEnterableCar(player, cars) {
  let best = null;
  let bestD = PLAYER.stealRange;
  for (const car of cars) {
    if (car.state === 'wreck' || car.state === 'player') continue;
    const d = Math.hypot(car.x - player.x, car.y - player.y);
    if (d < bestD) {
      bestD = d;
      best = car;
    }
  }
  return best;
}

export function enterCar(player, car) {
  player.state = 'car';
  player.car = car;
  car.state = 'player';
  car.speed = 0;
  player.x = car.x;
  player.y = car.y;
}

export function exitCar(player, city) {
  const car = player.car;
  if (!car) return;
  car.state = 'parked';
  car.speed = 0;
  // Step out on the driver's side (left of the car's heading).
  const side = car.angle - Math.PI / 2;
  let x = car.x + Math.cos(side) * 34;
  let y = car.y + Math.sin(side) * 34;
  const fixed = collideCircle(city, x, y, PLAYER.radius);
  player.x = fixed.x;
  player.y = fixed.y;
  player.state = 'foot';
  player.car = null;
}

/** Fire the pistol toward `aimAngle`. Returns true when a shot went off. */
export function tryShoot(player, aimAngle, bullets) {
  if (player.state !== 'foot') return false;
  if (player.reloading || player.fireLeft > 0 || player.ammo <= 0) return false;
  player.fireLeft = PLAYER.fireInterval;
  player.ammo -= 1;
  player.aimAngle = aimAngle;
  const mx = player.x + Math.cos(aimAngle) * 20;
  const my = player.y + Math.sin(aimAngle) * 20;
  bullets.push({
    x: mx, y: my,
    vx: Math.cos(aimAngle) * PLAYER.bulletSpeed,
    vy: Math.sin(aimAngle) * PLAYER.bulletSpeed,
    life: PLAYER.gunRange / PLAYER.bulletSpeed,
    damage: PLAYER.gunDamage,
    from: 'player',
  });
  return true;
}

export function startReload(player) {
  if (player.state === 'foot' && !player.reloading && player.ammo < PLAYER.magazine) {
    player.reloading = true;
    player.reloadLeft = PLAYER.reloadTime;
  }
}

/** Damage the player; returns true when it kills them. */
export function damagePlayer(player, amount) {
  player.health -= amount;
  if (player.health <= 0) {
    player.health = 0;
    return true;
  }
  return false;
}

export function healPlayer(player, amount) {
  player.health = Math.min(PLAYER.health, player.health + amount);
}
