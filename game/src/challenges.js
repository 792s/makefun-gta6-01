// Challenges: five little goals that pay when they are done, no matter
// which order Kai gets to them. They watch the rest of the game — races,
// fares, packages, photos, night driving — and each one only pays once.
// The HUD counts them once the first one is claimed.
const DEFS = [
  {
    id: 'gold-rush',
    name: 'Gold Rush',
    text: 'Win a GOLD medal in any race',
    reward: 200,
    done(state) { return state.races.golds >= 1; },
  },
  {
    id: 'cab-king',
    name: 'Cab King',
    text: 'Finish 3 taxi fares',
    reward: 150,
    done(state) { return state.taxi.faresDone >= 3; },
  },
  {
    id: 'treasure-hunter',
    name: 'Treasure Hunter',
    text: 'Find 5 hidden packages',
    reward: 200,
    done(state) { return state.packages.found >= 5; },
  },
  {
    id: 'shutterbug',
    name: 'Shutterbug',
    text: 'Take 3 scenic photos',
    reward: 150,
    done(state) { return state.viewpoints.found >= 3; },
  },
  {
    id: 'night-owl',
    name: 'Night Owl',
    text: 'Win a race after dark',
    reward: 250,
    done(state) { return state.races.nightWins >= 1; },
  },
  {
    id: 'high-roller',
    name: 'High Roller',
    text: 'Earn $500 from taxi fares',
    reward: 200,
    done(state) { return state.taxi.earned >= 500; },
  },
  {
    id: 'speed-demon',
    name: 'Speed Demon',
    text: 'Win 3 races',
    reward: 250,
    done(state) { return state.races.wins >= 3; },
  },
  {
    id: 'collector',
    name: 'Collector',
    text: 'Find 10 hidden packages',
    reward: 300,
    done(state) { return state.packages.found >= 10; },
  },
  {
    id: 'photographer',
    name: 'Photographer',
    text: 'Take all 6 scenic photos',
    reward: 300,
    done(state) { return state.viewpoints.found >= 6; },
  },
  {
    id: 'wheelman',
    name: 'Wheelman',
    text: 'Finish all 20 story missions',
    reward: 500,
    done(state) { return state.missions.done >= 20; },
  },
];

/** Five goals, none claimed yet. */
export function createChallenges() {
  return {
    list: DEFS.map((d) => ({ id: d.id, name: d.name, text: d.text, reward: d.reward, claimed: false })),
    claimed: 0,
  };
}

export function challengeCount(state) {
  return state.challenges.list.length;
}

/** "Challenges 2/5" once the first one is claimed, null before that. */
export function challengesLabel(state) {
  if (state.challenges.claimed === 0) return null;
  return `Challenges ${state.challenges.claimed}/${state.challenges.list.length}`;
}

/** The next goal still open, or null when the board is clear. */
export function nextChallenge(state) {
  const open = state.challenges.list.find((c) => !c.claimed);
  return open || null;
}

/**
 * One fixed step: check every open goal against the game. A finished goal
 * pays at once, with a toast that says what it was for. Returns events.
 */
export function updateChallenges(state, dt) {
  void dt;
  const events = [];
  for (let i = 0; i < DEFS.length; i += 1) {
    const def = DEFS[i];
    const entry = state.challenges.list[i];
    if (entry.claimed) continue;
    if (!def.done(state)) continue;
    entry.claimed = true;
    state.challenges.claimed += 1;
    state.money += def.reward;
    events.push({ type: 'cash' });
    events.push({
      type: 'toast',
      text: `Challenge done: ${def.name} — +$${def.reward}`,
    });
  }
  return events;
}
