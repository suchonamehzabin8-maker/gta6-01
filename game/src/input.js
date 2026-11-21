// Keyboard and mouse, one place. The game reads keys by code ('KeyW',
// 'Space', ...) and asks for edges (pressed this frame) for one-shot actions.
// Safe to construct with no canvas in Node: it simply reports nothing down.
export function createInput(canvas) {
  const keys = new Set();
  const pressed = new Set();
  const mouse = { x: 0, y: 0, down: false, downEdge: false, wheel: 0 };
  const input = {
    keys, pressed, mouse,
    down(code) { return keys.has(code); },
    hit(code) { return pressed.has(code); },
    // Call at the end of each frame so edges last exactly one frame.
    endFrame() {
      pressed.clear();
      mouse.downEdge = false;
      mouse.wheel = 0;
    },
    // Feed a synthetic key event (used by tests and the shot stager).
    feed(code, isDown) {
      if (isDown) {
        if (!keys.has(code)) pressed.add(code);
        keys.add(code);
      } else keys.delete(code);
    },
  };
  if (typeof window !== 'undefined' && canvas) {
    window.addEventListener('keydown', e => {
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
      if (!keys.has(e.code)) pressed.add(e.code);
      keys.add(e.code);
    });
    window.addEventListener('keyup', e => keys.delete(e.code));
    window.addEventListener('blur', () => { keys.clear(); mouse.down = false; });
    canvas.addEventListener('mousemove', e => {
      const r = canvas.getBoundingClientRect();
      mouse.x = e.clientX - r.left;
      mouse.y = e.clientY - r.top;
    });
    canvas.addEventListener('mousedown', e => {
      if (e.button === 0) { mouse.down = true; mouse.downEdge = true; }
    });
    window.addEventListener('mouseup', () => { mouse.down = false; });
    canvas.addEventListener('wheel', e => {
      e.preventDefault();
      mouse.wheel += e.deltaY > 0 ? 1 : -1;
    }, { passive: false });
    canvas.addEventListener('contextmenu', e => e.preventDefault());
  }
  return input;
}
