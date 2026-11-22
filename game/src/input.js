// Input: keyboard (WASD / arrows, Shift to sneak) plus click-to-start.
export function createInput() {
  const input = { up: false, down: false, left: false, right: false, sneak: false };
  const keys = {};
  function sync() {
    input.up = !!(keys.ArrowUp || keys.KeyW);
    input.down = !!(keys.ArrowDown || keys.KeyS);
    input.left = !!(keys.ArrowLeft || keys.KeyA);
    input.right = !!(keys.ArrowRight || keys.KeyD);
    input.sneak = !!(keys.ShiftLeft || keys.ShiftRight);
  }
  window.addEventListener('keydown', (e) => {
    keys[e.code] = true;
    sync();
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
    if (e.code === 'KeyM') input.onMute && input.onMute();
    if (e.code === 'KeyR') input.onRestart && input.onRestart();
    if (e.code === 'Enter' || e.code === 'Space') input.onConfirm && input.onConfirm();
  });
  window.addEventListener('keyup', (e) => { keys[e.code] = false; sync(); });
  window.addEventListener('blur', () => { for (const k of Object.keys(keys)) keys[k] = false; sync(); });
  return input;
}
