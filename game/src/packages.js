// Hidden packages: ten parcels stashed around Solmara — on sidewalks, at
// the park's edge, in the sand by the sea, in the gap by the docks. Walk
// over one on foot and it is yours: a hundred dollars, no questions asked.
// They only show themselves when Kai gets close, so the hunt is the game.
const PACKAGE_REWARD = 100;
const PACKAGE_RANGE = 40;
const REVEAL_RANGE = 600;
// The parcel at index 6 is the golden one: five times the money, and the
// only one worth crossing town for on its own.
const GOLDEN_SPOT_INDEX = 6;
const GOLDEN_REWARD = 500;

const SPOTS = [
  { x: 356, y: 500 },
  { x: 756, y: 900 },
  { x: 1156, y: 1300 },
  { x: 1556, y: 1700 },
  { x: 1956, y: 500 },
  { x: 2356, y: 2100 },
  { x: 2756, y: 1500 },
  { x: 2880, y: 1000 },
  { x: 900, y: 2240 },
  { x: 2100, y: 2260 },
  { x: 1300, y: 500 },
  { x: 2000, y: 700 },
  { x: 2500, y: 1300 },
  { x: 3050, y: 2200 },
  { x: 600, y: 1800 },
];

/** Ten parcels, none found yet. */
export function createPackages() {
  return {
    spots: SPOTS.map((spot, i) => ({ x: spot.x, y: spot.y, found: false, golden: i === GOLDEN_SPOT_INDEX })),
    found: 0,
    lastFindAt: -1e9,
    streak: 0,
  };
}

export function packageCount(state) {
  return state.packages.spots.length;
}

/** "Packages 3/10" once the hunt has started, null before that. */
export function packagesLabel(state) {
  if (state.packages.found === 0) return null;
  return `Packages ${state.packages.found}/${state.packages.spots.length}`;
}

/**
 * One fixed step: walking over a parcel on foot picks it up. Returns
 * events for sound and toasts.
 */
export function updatePackages(state, dt) {
  void dt;
  const events = [];
  const player = state.player;
  if (player.state !== 'foot') return events;
  for (const spot of state.packages.spots) {
    if (spot.found) continue;
    if (Math.hypot(spot.x - player.x, spot.y - player.y) < PACKAGE_RANGE) {
      spot.found = true;
      state.packages.found += 1;
      // A hot streak pays: find another within a minute and the bonus grows.
      const gap = state.time - state.packages.lastFindAt;
      state.packages.streak = gap < 60 ? state.packages.streak + 1 : 1;
      state.packages.lastFindAt = state.time;
      const bonus = (state.packages.streak - 1) * 25;
      const reward = spot.golden ? GOLDEN_REWARD : PACKAGE_REWARD + bonus;
      state.money += reward;
      events.push({ type: 'cash' });
      events.push({
        type: 'toast',
        text: spot.golden
          ? `Golden package found! +$${reward} (${state.packages.found}/${state.packages.spots.length})`
          : `Hidden package found! +$${reward}${bonus > 0 ? ` (streak x${state.packages.streak})` : ''} (${state.packages.found}/${state.packages.spots.length})`,
      });
    }
  }
  return events;
}

/** The parcels, glowing faintly — only when Kai is close enough to spot one. */
export function drawPackages(ctx, state) {
  const player = state.player;
  for (const spot of state.packages.spots) {
    if (spot.found) continue;
    if (Math.hypot(spot.x - player.x, spot.y - player.y) > REVEAL_RANGE) continue;
    const pulse = 0.5 + Math.sin(state.time * 3 + spot.x) * 0.2;
    ctx.fillStyle = spot.golden
      ? `rgba(255, 217, 77, ${pulse * 0.5})`
      : `rgba(255, 217, 77, ${pulse * 0.25})`;
    ctx.beginPath();
    ctx.arc(spot.x, spot.y, spot.golden ? 30 : 22, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#8b5a2b';
    ctx.fillRect(spot.x - 9, spot.y - 7, 18, 14);
    ctx.fillStyle = '#ffd94d';
    ctx.fillRect(spot.x - 2, spot.y - 7, 4, 14);
    ctx.fillRect(spot.x - 9, spot.y - 2, 18, 4);
    if (spot.golden) {
      ctx.fillStyle = '#ffd94d';
      ctx.font = 'bold 16px system-ui, sans-serif';
      ctx.fillText('$', spot.x - 5, spot.y - 18);
    }
  }
}
