// Keyboard and mouse, read once per frame. Keys are tracked by `code`, so
// the layout does not matter; the mouse position is in logical viewport
// pixels. `pressed` records keys hit since the last frame was consumed, so a
// single tap (E to steal a car, 1 or 2 to swap weapons, Esc to pause) fires
// exactly once. Holding the mouse keeps an automatic weapon firing, and the
// wheel cycles through the weapons you own.
export function createInput() {
  return {
    keys: {},
    up: false,
    down: false,
    left: false,
    right: false,
    handbrake: false,
    firing: false,
    mouseX: 0,
    mouseY: 0,
    mouseDown: false,
    mouseClicked: false,
    pressed: {}, // keys pressed since the last frame was consumed
    wheel: 0, // wheel ticks since the last frame was consumed
  };
}

export function attachInput(input, canvas) {
  window.addEventListener('keydown', (e) => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
      e.preventDefault();
    }
    if (!input.keys[e.code]) input.pressed[e.code] = true;
    input.keys[e.code] = true;
  });
  window.addEventListener('keyup', (e) => {
    input.keys[e.code] = false;
  });
  window.addEventListener('blur', () => {
    input.keys = {};
    input.mouseDown = false;
  });
  canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    input.mouseX = (e.clientX - rect.left) * (canvas.width / rect.width);
    input.mouseY = (e.clientY - rect.top) * (canvas.height / rect.height);
  });
  canvas.addEventListener('mousedown', () => {
    input.mouseDown = true;
    input.mouseClicked = true;
  });
  window.addEventListener('mouseup', () => {
    input.mouseDown = false;
  });
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    input.wheel += e.deltaY > 0 ? 1 : -1;
  }, { passive: false });
}

export function pollInput(input) {
  const k = input.keys;
  input.up = !!(k.KeyW || k.ArrowUp);
  input.down = !!(k.KeyS || k.ArrowDown);
  input.left = !!(k.KeyA || k.ArrowLeft);
  input.right = !!(k.KeyD || k.ArrowRight);
  input.handbrake = !!k.Space;
  // Hold the mouse to keep firing an automatic weapon; a click fires the pistol.
  input.firing = input.mouseDown || input.mouseClicked;
}

export function wasPressed(input, code) {
  const hit = !!input.pressed[code];
  if (hit) delete input.pressed[code];
  return hit;
}

// Wheel ticks since the last frame, consumed once: positive scrolls down
// through the weapons, negative scrolls up.
export function consumeWheel(input) {
  const ticks = input.wheel || 0;
  input.wheel = 0;
  return ticks;
}

export function endFrameInput(input) {
  input.pressed = {};
  input.mouseClicked = false;
  input.wheel = 0;
}
