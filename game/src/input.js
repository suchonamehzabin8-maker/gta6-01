// Palmera Bay — Sunset Run: keyboard and mouse.
// Tracks held keys, the mouse position over the canvas, clicks and the
// wheel. The game polls this each frame; nothing here draws anything.

export function createInput(canvas) {
  const input = {
    keys: new Set(),
    mouse: { x: 0, y: 0, down: false },
    wheel: 0,
    pressed: new Set(), // keys pressed since the last poll
    clicked: false,
  };

  const keyName = (e) => e.code;

  window.addEventListener('keydown', (e) => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
      e.preventDefault();
    }
    if (!e.repeat) input.pressed.add(keyName(e));
    input.keys.add(keyName(e));
  });
  window.addEventListener('keyup', (e) => {
    input.keys.delete(keyName(e));
  });
  canvas.addEventListener('mousemove', (e) => {
    const r = canvas.getBoundingClientRect();
    input.mouse.x = e.clientX - r.left;
    input.mouse.y = e.clientY - r.top;
  });
  canvas.addEventListener('mousedown', (e) => {
    if (e.button === 0) {
      input.mouse.down = true;
      input.clicked = true;
    }
  });
  window.addEventListener('mouseup', () => {
    input.mouse.down = false;
  });
  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    input.wheel += Math.sign(e.deltaY);
  }, { passive: false });
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  return input;
}

export function held(input, ...codes) {
  return codes.some((c) => input.keys.has(c));
}

// True once for the frame the key went down; call after polling.
export function wasPressed(input, ...codes) {
  return codes.some((c) => input.pressed.has(c));
}

export function endFrame(input) {
  input.pressed.clear();
  input.clicked = false;
  input.wheel = 0;
}

// Movement axes from WASD/arrows: {x, y} in screen space, y down.
export function moveAxes(input) {
  return {
    x: (held(input, 'KeyD', 'ArrowRight') ? 1 : 0) - (held(input, 'KeyA', 'ArrowLeft') ? 1 : 0),
    y: (held(input, 'KeyS', 'ArrowDown') ? 1 : 0) - (held(input, 'KeyW', 'ArrowUp') ? 1 : 0),
  };
}
