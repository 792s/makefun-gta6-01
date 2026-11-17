// The HUD: wanted stars, health, cash, ammo, the mission objective, and the
// live minimap — all drawn on the canvas so the screenshots show the game.
import { WORLD } from './config.js';
import { currentObjective, currentMarker } from './missions.js';
import { dayNightLabel } from './daynight.js';
import { taxiStatus } from './taxi.js';
import { raceStatus } from './races.js';
import { packagesLabel } from './packages.js';
import { viewpointsLabel } from './viewpoints.js';
import { challengesLabel } from './challenges.js';

const STAR = '★';

export function drawHUD(ctx, state, w, h) {
  const player = state.player;
  ctx.save();
  ctx.textBaseline = 'top';

  // --- Top left: the mission objective ---
  ctx.font = 'bold 17px system-ui, sans-serif';
  ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
  const objective = currentObjective(state);
  const objW = ctx.measureText(objective).width + 24;
  ctx.fillRect(14, 14, Math.min(objW, w - 28), 34);
  ctx.fillStyle = '#ffd94d';
  ctx.fillText(objective, 26, 22);

  // --- Under the objective: the clock, the weather, and the side jobs ---
  const sideBits = [
    dayNightLabel(state.daynight),
    taxiStatus(state),
    raceStatus(state),
    packagesLabel(state),
    viewpointsLabel(state),
    challengesLabel(state),
  ].filter(Boolean);
  if (sideBits.length > 0) {
    const sideText = sideBits.join('   ·   ');
    ctx.font = '15px system-ui, sans-serif';
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    const sideW = ctx.measureText(sideText).width + 24;
    ctx.fillRect(14, 54, Math.min(sideW, w - 28), 26);
    ctx.fillStyle = '#cfe8ff';
    ctx.fillText(sideText, 26, 60);
  }

  // --- Top right: wanted stars and cash ---
  ctx.textAlign = 'right';
  ctx.font = 'bold 26px system-ui, sans-serif';
  const stars = STAR.repeat(state.wanted.stars) + '☆'.repeat(5 - state.wanted.stars);
  ctx.fillStyle = state.wanted.stars > 0 ? '#ffdf3d' : 'rgba(255, 255, 255, 0.55)';
  ctx.fillText(stars, w - 18, 16);
  ctx.font = 'bold 20px system-ui, sans-serif';
  ctx.fillStyle = '#7dff8a';
  ctx.fillText(`$${state.money}`, w - 18, 50);
  ctx.textAlign = 'left';

  // --- Bottom left: health, ammo, speed — and the car's health while driving ---
  const barW = 190;
  const barH = 14;
  const inCar = player.state === 'car' && player.car;
  const panelH = inCar ? 80 : 44;
  const panelTop = h - 14 - panelH; // the panel's bottom edge stays put
  ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
  ctx.fillRect(14, panelTop, barW + 44, panelH);
  ctx.fillStyle = '#333';
  ctx.fillRect(22, panelTop + 10, barW, barH);
  ctx.fillStyle = player.health > 30 ? '#4dd964' : '#ff3b30';
  ctx.fillRect(22, panelTop + 10, barW * (player.health / 100), barH);
  ctx.font = 'bold 13px system-ui, sans-serif';
  ctx.fillStyle = '#fff';
  ctx.fillText(`HP ${Math.ceil(player.health)}`, 22, panelTop + 28);
  if (inCar) {
    const car = player.car;
    ctx.fillStyle = '#333';
    ctx.fillRect(22, panelTop + 44, barW, barH);
    ctx.fillStyle = car.health > 30 ? '#ff9f1c' : '#ff3b30';
    ctx.fillRect(22, panelTop + 44, barW * (car.health / 100), barH);
    const mph = Math.round(Math.abs(car.speed) * 0.12);
    ctx.fillStyle = '#fff';
    ctx.fillText(`CAR ${Math.ceil(car.health)}  ${car.name}  ${mph} mph`, 22, panelTop + 62);
  } else if (player.state === 'foot') {
    ctx.fillText(player.reloading ? 'RELOADING…' : `AMMO ${player.ammo} / 12  [R]`, 120, panelTop + 28);
  }
  // Nitro tanks ride below the panel while driving Kai's own car.
  if (inCar && state.garage.nitro > 0) {
    ctx.font = 'bold 13px system-ui, sans-serif';
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.fillRect(14, panelTop + panelH + 4, 128, 22);
    ctx.fillStyle = '#4da3ff';
    ctx.fillText(`NITRO x${state.garage.nitro}  [N]`, 22, panelTop + panelH + 9);
  }

  // --- Top centre: the smoking warning, so a dying car is unmissable ---
  if (inCar && player.car.smoking) {
    ctx.font = 'bold 16px system-ui, sans-serif';
    const warn = 'YOUR CAR IS SMOKING — FIND A WRENCH';
    const ww = ctx.measureText(warn).width + 28;
    ctx.fillStyle = 'rgba(120, 10, 10, 0.75)';
    ctx.fillRect((w - ww) / 2, 56, ww, 30);
    ctx.fillStyle = '#ff6b5e';
    ctx.fillText(warn, (w - ww) / 2 + 14, 64);
  }

  drawMinimap(ctx, state, w - 184, h - 154, 170, 140);

  // --- Dialogue and toast, bottom centre ---
  if (state.dialogue) {
    ctx.font = '16px system-ui, sans-serif';
    const lines = wrapText(ctx, state.dialogue, w * 0.6);
    const boxH = lines.length * 22 + 20;
    const boxW = Math.max(...lines.map((l) => ctx.measureText(l).width)) + 32;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.62)';
    ctx.fillRect((w - boxW) / 2, h - 150 - boxH, boxW, boxH);
    ctx.fillStyle = '#fff';
    lines.forEach((line, i) => ctx.fillText(line, (w - boxW) / 2 + 16, h - 150 - boxH + 10 + i * 22));
  } else if (state.toast) {
    ctx.font = 'bold 16px system-ui, sans-serif';
    const tw = ctx.measureText(state.toast).width + 28;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
    ctx.fillRect((w - tw) / 2, h - 118, tw, 30);
    ctx.fillStyle = '#ffd94d';
    ctx.fillText(state.toast, (w - tw) / 2 + 14, h - 110);
  }
  ctx.restore();
}

function wrapText(ctx, text, maxWidth) {
  const words = text.split(' ');
  const lines = [];
  let line = '';
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines;
}

/** The minimap: the whole city shrunk, with the player, the marker and the law. */
export function drawMinimap(ctx, state, x, y, w, h) {
  const sx = w / WORLD.width;
  const sy = h / WORLD.height;
  ctx.save();
  ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
  ctx.fillRect(x - 6, y - 6, w + 12, h + 12);
  ctx.fillStyle = '#7fae5a';
  ctx.fillRect(x, y, w, h);
  // Water and sand along the south edge.
  ctx.fillStyle = '#e8d39a';
  ctx.fillRect(x, y + (2150 * sy), w, (WORLD.waterY - 2150) * sy);
  ctx.fillStyle = '#2e9db8';
  ctx.fillRect(x, y + (WORLD.waterY * sy), w, h - WORLD.waterY * sy);
  // Roads.
  ctx.strokeStyle = '#3d3f45';
  ctx.lineWidth = 2;
  for (const rx of state.city.roadsX) {
    ctx.beginPath();
    ctx.moveTo(x + rx * sx, y);
    ctx.lineTo(x + rx * sx, y + h);
    ctx.stroke();
  }
  for (const ry of state.city.roadsY) {
    ctx.beginPath();
    ctx.moveTo(x, y + ry * sy);
    ctx.lineTo(x + w, y + ry * sy);
    ctx.stroke();
  }
  // The mission marker.
  const marker = currentMarker(state);
  if (marker) {
    const mx = x + marker.x * sx;
    const my = y + marker.y * sy;
    const pulse = 4 + Math.sin(state.time * 5) * 1.5;
    ctx.fillStyle = '#ffd94d';
    ctx.beginPath();
    ctx.moveTo(mx, my - pulse - 3);
    ctx.lineTo(mx + pulse, my);
    ctx.lineTo(mx, my + pulse + 3);
    ctx.lineTo(mx - pulse, my);
    ctx.closePath();
    ctx.fill();
  }
  // Police cars.
  ctx.fillStyle = '#4da3ff';
  for (const car of state.cars) {
    if (car.state !== 'police') continue;
    ctx.fillRect(x + car.x * sx - 2, y + car.y * sy - 2, 4, 4);
  }
  // Enemies.
  ctx.fillStyle = '#ff3b30';
  for (const e of state.missions.enemies) {
    if (e.health <= 0) continue;
    ctx.fillRect(x + e.x * sx - 2, y + e.y * sy - 2, 4, 4);
  }
  // The player, a white arrow that points where Kai faces.
  const p = state.player;
  ctx.save();
  ctx.translate(x + p.x * sx, y + p.y * sy);
  ctx.rotate(p.angle + Math.PI / 2);
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.moveTo(0, -6);
  ctx.lineTo(4, 5);
  ctx.lineTo(-4, 5);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  ctx.restore();
}
