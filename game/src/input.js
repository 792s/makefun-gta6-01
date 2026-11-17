// Keyboard and mouse: held keys for movement, one-shot actions for the
// things that happen once per press, and the mouse position for aiming.
export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_ENTER = 4;
export const ACTION_RELOAD = 8;
export const ACTION_MUTE = 16;
export const ACTION_RADIO = 32;
export const ACTION_GARAGE = 64;
export const ACTION_NITRO = 128;
export const ACTION_PHOTO = 256;

const KEYMAP = {
  KeyW: 'up', ArrowUp: 'up',
  KeyS: 'down', ArrowDown: 'down',
  KeyA: 'left', ArrowLeft: 'left',
  KeyD: 'right', ArrowRight: 'right',
  ShiftLeft: 'run', ShiftRight: 'run',
};

export function createInput(canvas) {
  const held = { up: false, down: false, left: false, right: false, run: false };
  let actions = 0;
  const mouse = { x: 0, y: 0, down: false, clicked: false };

  function onKeyDown(event) {
    const name = KEYMAP[event.code];
    if (name) {
      held[name] = true;
      event.preventDefault();
      return;
    }
    if (event.repeat) return;
    if (event.code === 'Space' || event.code === 'Enter') actions |= ACTION_CONFIRM;
    else if (event.code === 'KeyP' || event.code === 'Escape') actions |= ACTION_PAUSE;
    else if (event.code === 'KeyE') actions |= ACTION_ENTER;
    else if (event.code === 'KeyR') actions |= ACTION_RELOAD;
    else if (event.code === 'KeyM') actions |= ACTION_MUTE;
    else if (event.code === 'KeyV') actions |= ACTION_RADIO;
    else if (event.code === 'KeyG') actions |= ACTION_GARAGE;
    else if (event.code === 'KeyN') actions |= ACTION_NITRO;
    else if (event.code === 'KeyF') actions |= ACTION_PHOTO;
  }
  function onKeyUp(event) {
    const name = KEYMAP[event.code];
    if (name) held[name] = false;
  }
  function onMouseMove(event) {
    const rect = canvas.getBoundingClientRect();
    mouse.x = event.clientX - rect.left;
    mouse.y = event.clientY - rect.top;
  }
  function onMouseDown(event) {
    if (event.button === 0) {
      mouse.down = true;
      mouse.clicked = true;
    }
  }
  function onMouseUp(event) {
    if (event.button === 0) mouse.down = false;
  }
  function onBlur() {
    held.up = held.down = held.left = held.right = held.run = false;
    mouse.down = false;
  }

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('blur', onBlur);
  canvas.addEventListener('mousemove', onMouseMove);
  canvas.addEventListener('mousedown', onMouseDown);
  window.addEventListener('mouseup', onMouseUp);

  return {
    /** Normalised movement direction from the held keys. */
    direction() {
      const x = (held.right ? 1 : 0) - (held.left ? 1 : 0);
      const y = (held.down ? 1 : 0) - (held.up ? 1 : 0);
      if (x === 0 && y === 0) return { x: 0, y: 0 };
      const len = Math.hypot(x, y);
      return { x: x / len, y: y / len };
    },
    get run() {
      return held.run;
    },
    get mouse() {
      return mouse;
    },
    /** The actions pressed since the last call, then cleared. With a mask,
     * only those bits are taken and cleared; the rest stay for the next call,
     * so the menu and the world can each take what they handle. */
    takeActions(mask) {
      if (mask === undefined) {
        const value = actions;
        actions = 0;
        return value;
      }
      const value = actions & mask;
      actions &= ~mask;
      return value;
    },
    /** Whether the mouse was clicked since the last call, then cleared. */
    takeClick() {
      const value = mouse.clicked;
      mouse.clicked = false;
      return value;
    },
  };
}
