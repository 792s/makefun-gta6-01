// Saving: progress lives in localStorage — money, missions done, where Kai
// stands, how much health he has. Saved at the safehouse and after every
// mission, loaded from the title screen's Continue.
import { SAVE_KEY } from './config.js';

export function saveGame(state) {
  try {
    const data = {
      money: state.money,
      missionsDone: state.missions.done,
      x: state.player.x,
      y: state.player.y,
      health: state.player.health,
      time: state.time,
    };
    window.localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    return true;
  } catch {
    // Storage can be off (private windows): the save then lasts this visit only.
    return false;
  }
}

export function loadGame() {
  try {
    const raw = window.localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (typeof data.money !== 'number' || typeof data.missionsDone !== 'number') return null;
    return data;
  } catch {
    return null;
  }
}

export function hasSave() {
  return loadGame() !== null;
}

export function clearSave() {
  try {
    window.localStorage.removeItem(SAVE_KEY);
  } catch {
    // Nothing to clear.
  }
}
