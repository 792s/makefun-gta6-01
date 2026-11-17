// The renderer: Solmara from above, drawn procedurally on one canvas — the
// streets, the beach, the buildings, the cars, the people — plus the title,
// pause and busted/wasted screens. The HUD lives in hud.js.
import { PALETTE, WORLD } from './config.js';
import { ROAD_HALF } from './city.js';
import { currentMarker } from './missions.js';
import { drawHUD } from './hud.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_HELP = 'help';
export const SCREEN_OVER = 'over';

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  let width = 0;
  let height = 0;
  const buttons = [];

  function resize() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  resize();
  window.addEventListener('resize', resize);

  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function drawGround(state) {
    const cam = state.camera;
    // Grass base across the whole visible area.
    ctx.fillStyle = PALETTE.grass;
    ctx.fillRect(cam.x - width, cam.y - height, width * 2, height * 2);
    // A few darker grass patches for texture (fixed by seed, drawn cheaply).
    ctx.fillStyle = PALETTE.grassDark;
    for (let i = 0; i < 40; i += 1) {
      const px = ((i * 733) % WORLD.width) - 100;
      const py = ((i * 389) % 2000) + 50;
      ctx.beginPath();
      ctx.ellipse(px, py, 90 + (i % 5) * 20, 50 + (i % 3) * 15, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    // Sand, then the sea.
    ctx.fillStyle = PALETTE.sand;
    ctx.fillRect(0, WORLD.sandY, WORLD.width, WORLD.waterY - WORLD.sandY);
    ctx.fillStyle = PALETTE.water;
    ctx.fillRect(0, WORLD.waterY, WORLD.width, WORLD.height - WORLD.waterY);
    // Waves: light bands rolling toward the sand.
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.lineWidth = 3;
    for (let w = 0; w < 3; w += 1) {
      const wy = WORLD.waterY + 18 + w * 22 + Math.sin(state.time * 1.2 + w) * 4;
      ctx.beginPath();
      for (let x = 0; x <= WORLD.width; x += 40) {
        const y = wy + Math.sin(x / 90 + state.time + w * 2) * 4;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
  }

  function drawRoads(state) {
    // Sidewalks first (a pale border around each road), then asphalt.
    for (const rx of state.city.roadsX) {
      ctx.fillStyle = PALETTE.sidewalk;
      ctx.fillRect(rx - ROAD_HALF - 12, 100, ROAD_W + 24, 2200);
      ctx.fillStyle = PALETTE.asphalt;
      ctx.fillRect(rx - ROAD_HALF, 100, ROAD_W, 2200);
    }
    for (const ry of state.city.roadsY) {
      ctx.fillStyle = PALETTE.sidewalk;
      ctx.fillRect(100, ry - ROAD_HALF - 12, 3050, ROAD_W + 24);
      ctx.fillStyle = PALETTE.asphalt;
      ctx.fillRect(100, ry - ROAD_HALF, 3050, ROAD_W);
    }
    // Centre dashes.
    ctx.strokeStyle = PALETTE.line;
    ctx.lineWidth = 3;
    ctx.setLineDash([22, 26]);
    for (const rx of state.city.roadsX) {
      ctx.beginPath();
      ctx.moveTo(rx, 110);
      ctx.lineTo(rx, 2290);
      ctx.stroke();
    }
    for (const ry of state.city.roadsY) {
      ctx.beginPath();
      ctx.moveTo(110, ry);
      ctx.lineTo(3140, ry);
      ctx.stroke();
    }
    ctx.setLineDash([]);
  }

  function drawBuildings(state) {
    for (const b of state.city.buildings) {
      // Shadow, offset by the building's height: taller reads taller.
      ctx.fillStyle = 'rgba(0, 0, 0, 0.22)';
      ctx.fillRect(b.x + 6 * b.height, b.y + 8 * b.height, b.w, b.h);
      ctx.fillStyle = PALETTE.wall;
      ctx.fillRect(b.x, b.y, b.w, b.h);
      ctx.fillStyle = b.color;
      ctx.fillRect(b.x + 5, b.y + 5, b.w - 10, b.h - 10);
      if (b.detail) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
        ctx.fillRect(b.x + b.w / 2 - 10, b.y + b.h / 2 - 8, 20, 16);
      }
      if (b.warehouse) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
        ctx.fillRect(b.x + 10, b.y + b.h - 22, b.w - 20, 14);
      }
    }
    for (const c of state.city.containers) {
      ctx.save();
      ctx.translate(c.x, c.y);
      ctx.rotate(c.angle);
      ctx.fillStyle = c.color;
      ctx.fillRect(-c.w / 2, -c.h / 2, c.w, c.h);
      ctx.strokeStyle = 'rgba(0,0,0,0.3)';
      ctx.lineWidth = 2;
      ctx.strokeRect(-c.w / 2, -c.h / 2, c.w, c.h);
      ctx.restore();
    }
    for (const t of state.city.trees) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
      ctx.beginPath();
      ctx.ellipse(t.x + 4, t.y + 5, t.r, t.r * 0.8, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#3d7a34';
      ctx.beginPath();
      ctx.arc(t.x, t.y, t.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#4d9440';
      ctx.beginPath();
      ctx.arc(t.x - 3, t.y - 3, t.r * 0.6, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawCar(car, time) {
    ctx.save();
    ctx.translate(car.x, car.y);
    ctx.rotate(car.angle);
    // Shadow.
    ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
    roundRect(-24 + 3, -12 + 4, 48, 24, 7);
    ctx.fill();
    // Body.
    const isPolice = car.type === 'police';
    ctx.fillStyle = car.state === 'wreck' ? '#3a3a3a' : car.color;
    roundRect(-24, -12, 48, 24, 7);
    ctx.fill();
    if (isPolice) {
      ctx.fillStyle = '#e8e4d2';
      roundRect(-4, -12, 22, 24, 6);
      ctx.fill();
    }
    // Windshield and roof.
    ctx.fillStyle = 'rgba(160, 220, 240, 0.85)';
    ctx.fillRect(8, -9, 8, 18);
    ctx.fillStyle = car.state === 'wreck' ? '#2a2a2a' : shade(car.color, -28);
    roundRect(-8, -9, 14, 18, 3);
    ctx.fill();
    // Headlights.
    ctx.fillStyle = '#fff8c0';
    ctx.fillRect(22, -9, 3, 5);
    ctx.fillRect(22, 4, 3, 5);
    // Police light bar, flashing red and blue.
    if (isPolice && car.state !== 'wreck') {
      const phase = Math.floor(time * 6) % 2 === 0;
      ctx.fillStyle = phase ? '#ff2e2e' : '#2e5bff';
      ctx.fillRect(-2, -10, 6, 7);
      ctx.fillStyle = phase ? '#2e5bff' : '#ff2e2e';
      ctx.fillRect(-2, 3, 6, 7);
      // A glow around a flashing bar, so the chase reads at a glance.
      ctx.fillStyle = phase ? 'rgba(255, 46, 46, 0.25)' : 'rgba(46, 91, 255, 0.25)';
      ctx.beginPath();
      ctx.arc(0, 0, 40, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawPerson(x, y, angle, shirt, skin, dead) {
    ctx.save();
    ctx.translate(x, y);
    if (dead) {
      ctx.rotate(angle + Math.PI / 2);
      ctx.fillStyle = shirt;
      ctx.beginPath();
      ctx.ellipse(0, 0, 13, 7, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      return;
    }
    ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
    ctx.beginPath();
    ctx.ellipse(2, 3, 10, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.rotate(angle);
    ctx.fillStyle = shirt;
    ctx.beginPath();
    ctx.arc(0, 0, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = skin;
    ctx.beginPath();
    ctx.arc(4, 0, 5.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawWorld(state) {
    const cam = state.camera;
    ctx.save();
    ctx.translate(width / 2, height / 2);
    ctx.scale(cam.zoom, cam.zoom);
    ctx.translate(-cam.x, -cam.y);
    drawGround(state);
    drawRoads(state);
    drawBuildings(state);
    // Skid marks.
    ctx.strokeStyle = 'rgba(20, 20, 20, 0.5)';
    ctx.lineWidth = 4;
    for (const s of state.skids) {
      ctx.globalAlpha = Math.min(1, s.life / 2);
      ctx.beginPath();
      ctx.moveTo(s.x1, s.y1);
      ctx.lineTo(s.x2, s.y2);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    // Health pickups.
    for (const p of state.pickups) {
      ctx.fillStyle = '#fff';
      ctx.fillRect(p.x - 10, p.y - 10, 20, 20);
      ctx.fillStyle = '#e74c3c';
      ctx.fillRect(p.x - 3, p.y - 8, 6, 16);
      ctx.fillRect(p.x - 8, p.y - 3, 16, 6);
    }
    // The mission marker: a beam of light and a pulsing ring.
    const marker = currentMarker(state);
    if (marker) {
      const pulse = 1 + Math.sin(state.time * 4) * 0.12;
      ctx.fillStyle = 'rgba(255, 217, 77, 0.25)';
      ctx.fillRect(marker.x - 6, marker.y - 120, 12, 120);
      ctx.strokeStyle = '#ffd94d';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(marker.x, marker.y, 30 * pulse, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = '#ffd94d';
      ctx.beginPath();
      ctx.moveTo(marker.x, marker.y - 46);
      ctx.lineTo(marker.x + 10, marker.y - 30);
      ctx.lineTo(marker.x - 10, marker.y - 30);
      ctx.closePath();
      ctx.fill();
    }
    // Cars, people, bullets, particles.
    for (const car of state.cars) drawCar(car, state.time);
    for (const ped of state.peds) {
      drawPerson(ped.x, ped.y, ped.angle, ped.shirt, ped.skin, ped.state === 'down');
    }
    for (const cop of state.cops) {
      drawPerson(cop.x, cop.y, cop.angle, '#2c3e70', '#e0ac69', false);
    }
    for (const e of state.missions.enemies) {
      if (e.health > 0) drawPerson(e.x, e.y, e.angle, '#a93226', '#c68642', false);
      else drawPerson(e.x, e.y, e.angle, '#a93226', '#c68642', true);
    }
    const player = state.player;
    if (player.state === 'foot') {
      drawPerson(player.x, player.y, player.aimAngle, '#17a2a2', '#e0ac69', false);
      // The gun, a short line toward the aim.
      ctx.strokeStyle = '#222';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(player.x, player.y);
      ctx.lineTo(player.x + Math.cos(player.aimAngle) * 20, player.y + Math.sin(player.aimAngle) * 20);
      ctx.stroke();
      // A faint aim line, so shooting reads.
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(player.x + Math.cos(player.aimAngle) * 24, player.y + Math.sin(player.aimAngle) * 24);
      ctx.lineTo(player.x + Math.cos(player.aimAngle) * 90, player.y + Math.sin(player.aimAngle) * 90);
      ctx.stroke();
    }
    ctx.strokeStyle = '#fff3a0';
    ctx.lineWidth = 2;
    for (const b of state.bullets) {
      ctx.beginPath();
      ctx.moveTo(b.x - b.vx * 0.012, b.y - b.vy * 0.012);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }
    for (const p of state.particles) {
      ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  function drawButton(id, label, x, y, w, h, enabled) {
    buttons.push({ id, x, y, w, h, enabled });
    ctx.fillStyle = enabled ? 'rgba(255, 217, 77, 0.92)' : 'rgba(120, 120, 120, 0.6)';
    roundRect(x, y, w, h, 8);
    ctx.fill();
    ctx.fillStyle = enabled ? '#1a1a1a' : '#ddd';
    ctx.font = 'bold 19px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, x + w / 2, y + h / 2 + 1);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
  }

  function drawTitle(state, ui) {
    ctx.fillStyle = 'rgba(10, 20, 30, 0.55)';
    ctx.fillRect(0, 0, width, height);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffd94d';
    ctx.font = '900 84px system-ui, sans-serif';
    ctx.fillText('SOLMARA', width / 2, height * 0.16);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 26px system-ui, sans-serif';
    ctx.fillText('HEAT ON THE COAST', width / 2, height * 0.16 + 92);
    ctx.font = '17px system-ui, sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.fillText('An original open-world crime story. Steal cars, outrun the law, finish the job.', width / 2, height * 0.16 + 132);
    const bw = 300;
    const bh = 52;
    const bx = width / 2 - bw / 2;
    let by = height * 0.16 + 180;
    drawButton('new', 'NEW GAME', bx, by, bw, bh, true);
    by += bh + 14;
    drawButton('continue', 'CONTINUE', bx, by, bw, bh, ui.hasSave);
    by += bh + 14;
    drawButton('help', 'HOW TO PLAY', bx, by, bw, bh, true);
    ctx.font = '15px system-ui, sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.fillText('WASD move / drive  ·  E enter a car  ·  Mouse aim, click shoot  ·  P pause', width / 2, by + bh + 26);
    ctx.textAlign = 'left';
  }

  function drawHelp() {
    ctx.fillStyle = 'rgba(10, 20, 30, 0.82)';
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = '#ffd94d';
    ctx.font = 'bold 34px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('HOW TO PLAY', width / 2, 60);
    ctx.textAlign = 'left';
    ctx.fillStyle = '#fff';
    ctx.font = '18px system-ui, sans-serif';
    const lines = [
      'W A S D / arrows — walk, or drive (W accelerate, S brake / reverse)',
      'Shift — run on foot, handbrake in a car',
      'E — steal / enter the nearest car, or get out of one',
      'Mouse — aim. Click (hold) — shoot. R — reload.',
      'P / Esc — pause.  M — mute.',
      '',
      'Follow the yellow marker: it is your next job. Finish all four',
      'missions to clear the story — or just cruise Solmara and see',
      'how long you can stay ahead of the law.',
      'Crimes raise your wanted level. Break line of sight and the',
      'heat cools off, one star at a time. Walk into your apartment',
      'to save your progress.',
    ];
    lines.forEach((line, i) => ctx.fillText(line, width / 2 - 330, 130 + i * 30));
    drawButton('back', 'BACK', width / 2 - 100, 130 + lines.length * 30 + 16, 200, 48, true);
  }

  function drawPaused() {
    ctx.fillStyle = 'rgba(10, 20, 30, 0.6)';
    ctx.fillRect(0, 0, width, height);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 48px system-ui, sans-serif';
    ctx.fillText('PAUSED', width / 2, height / 2 - 80);
    ctx.font = '19px system-ui, sans-serif';
    ctx.fillText('P / Esc — resume    ·    M — mute    ·    Q — quit to title', width / 2, height / 2 - 10);
    ctx.textAlign = 'left';
  }

  function drawOver(state, kind) {
    ctx.fillStyle = kind === 'busted' ? 'rgba(20, 40, 120, 0.72)' : 'rgba(120, 20, 20, 0.72)';
    ctx.fillRect(0, 0, width, height);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#fff';
    ctx.font = '900 72px system-ui, sans-serif';
    ctx.fillText(kind === 'busted' ? 'BUSTED' : 'WASTED', width / 2, height / 2 - 90);
    ctx.font = '20px system-ui, sans-serif';
    ctx.fillText(kind === 'busted'
      ? 'The Solmara PD caught up with you. They took $100.'
      : 'Kai went down. The hospital took $100.', width / 2, height / 2 + 10);
    ctx.fillText('Press ENTER to get back on your feet.', width / 2, height / 2 + 48);
    ctx.textAlign = 'left';
  }

  return {
    get width() {
      return width;
    },
    get height() {
      return height;
    },
    get buttons() {
      return buttons;
    },
    draw(state, screen, ui) {
      buttons.length = 0;
      ctx.clearRect(0, 0, width, height);
      drawWorld(state);
      if (screen === SCREEN_PLAY || screen === SCREEN_PAUSED) {
        drawHUD(ctx, state, width, height);
      }
      if (screen === SCREEN_TITLE) drawTitle(state, ui);
      else if (screen === SCREEN_HELP) drawHelp();
      else if (screen === SCREEN_PAUSED) drawPaused();
      else if (screen === SCREEN_OVER) drawOver(state, ui.overKind);
    },
  };
}

/** Darken a hex colour by `amount` (0-255). */
function shade(hex, amount) {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.max(0, Math.min(255, (n >> 16) + amount));
  const g = Math.max(0, Math.min(255, ((n >> 8) & 0xff) + amount));
  const b = Math.max(0, Math.min(255, (n & 0xff) + amount));
  return `rgb(${r},${g},${b})`;
}
