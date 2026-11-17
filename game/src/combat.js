// Bullets: fired by the player and by mission enemies. They fly straight,
// spark off buildings, and hurt whatever they hit first.
import { PLAYER } from './config.js';
import { collideCircle } from './city.js';

/**
 * Move every bullet and resolve hits. `targets` is { peds, enemies, cars,
 * player } (any may be null). Returns events: {type: 'spark'|'hitPed'|
 * 'hitEnemy'|'hitCar'|'hitPlayer', x, y, target}.
 */
export function updateBullets(bullets, dt, city, targets) {
  const events = [];
  for (let i = bullets.length - 1; i >= 0; i -= 1) {
    const b = bullets[i];
    b.life -= dt;
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    let dead = b.life <= 0;
    // A building stops a bullet with a spark.
    if (!dead) {
      const fixed = collideCircle(city, b.x, b.y, 2);
      if (fixed.x !== b.x || fixed.y !== b.y) {
        events.push({ type: 'spark', x: b.x, y: b.y });
        dead = true;
      }
    }
    if (!dead && b.from === 'player') {
      // Enemies first, then pedestrians, then cars.
      if (targets.enemies) {
        for (const e of targets.enemies) {
          if (e.health <= 0) continue;
          if (Math.hypot(e.x - b.x, e.y - b.y) < 16) {
            e.health -= b.damage;
            events.push({ type: 'hitEnemy', x: b.x, y: b.y, target: e });
            dead = true;
            break;
          }
        }
      }
      if (!dead && targets.peds) {
        for (const p of targets.peds) {
          if (p.state === 'down') continue;
          if (Math.hypot(p.x - b.x, p.y - b.y) < 13) {
            events.push({ type: 'hitPed', x: b.x, y: b.y, target: p });
            dead = true;
            break;
          }
        }
      }
      if (!dead && targets.cars) {
        for (const c of targets.cars) {
          if (c.state === 'wreck') continue;
          if (Math.hypot(c.x - b.x, c.y - b.y) < 26) {
            c.health -= b.damage;
            events.push({ type: 'hitCar', x: b.x, y: b.y, target: c });
            if (c.health <= 30) c.smoking = true;
            if (c.health <= 0) c.state = 'wreck';
            dead = true;
            break;
          }
        }
      }
    }
    if (!dead && b.from === 'enemy' && targets.player) {
      const p = targets.player;
      if (p.state === 'foot' && Math.hypot(p.x - b.x, p.y - b.y) < PLAYER.radius) {
        events.push({ type: 'hitPlayer', x: b.x, y: b.y, damage: b.damage });
        dead = true;
      }
    }
    if (dead) bullets.splice(i, 1);
  }
  return events;
}

/** An enemy gunman fires at the player (mission 3). */
export function enemyShoot(enemy, player, bullets) {
  const angle = Math.atan2(player.y - enemy.y, player.x - enemy.x);
  // Enemies miss a little: their aim wobbles.
  const wobble = (Math.random() - 0.5) * 0.22;
  bullets.push({
    x: enemy.x + Math.cos(angle) * 18,
    y: enemy.y + Math.sin(angle) * 18,
    vx: Math.cos(angle + wobble) * PLAYER.bulletSpeed * 0.9,
    vy: Math.sin(angle + wobble) * PLAYER.bulletSpeed * 0.9,
    life: 0.6,
    damage: 9,
    from: 'enemy',
  });
}
