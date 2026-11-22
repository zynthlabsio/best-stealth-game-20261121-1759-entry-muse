// World: parses a wing tile map, answers collision and line-of-sight queries.
import { TILE, COLS, ROWS } from './config.js';

export function buildWorld(wing) {
  const grid = wing.map.map((row) => row.split(''));
  const crystals = [];
  let start = { x: TILE * 1.5, y: TILE * 1.5 };
  let exit = { x: TILE * 30.5, y: TILE * 12.5 };
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      const c = grid[y][x];
      if (c === 'P') { start = { x: (x + 0.5) * TILE, y: (y + 0.5) * TILE }; grid[y][x] = '.'; }
      if (c === 'E') { exit = { x: (x + 0.5) * TILE, y: (y + 0.5) * TILE }; grid[y][x] = '.'; }
      if (c === '*') { crystals.push({ tx: x, ty: y, x: (x + 0.5) * TILE, y: (y + 0.5) * TILE, taken: false }); grid[y][x] = '.'; }
    }
  }
  return { grid, crystals, start, exit, wing };
}

export function tileAt(world, px, py) {
  const tx = Math.floor(px / TILE);
  const ty = Math.floor(py / TILE);
  if (tx < 0 || ty < 0 || tx >= COLS || ty >= ROWS) return '#';
  return world.grid[ty][tx];
}

export function isSolidTile(ch) { return ch === '#' || ch === 'K'; }
export function blocksSight(ch) { return ch === '#' || ch === 'K'; }
export function isCoverTile(ch) { return ch === 'D'; }

// Circle-vs-solid-tiles collision: returns the position after sliding along walls.
export function moveWithCollision(world, x, y, dx, dy, radius) {
  let nx = x + dx;
  if (circleHitsSolid(world, nx, y, radius)) nx = x;
  let ny = y + dy;
  if (circleHitsSolid(world, nx, ny, radius)) ny = y;
  return { x: nx, y: ny };
}

export function circleHitsSolid(world, x, y, radius) {
  const x0 = Math.floor((x - radius) / TILE), x1 = Math.floor((x + radius) / TILE);
  const y0 = Math.floor((y - radius) / TILE), y1 = Math.floor((y + radius) / TILE);
  for (let ty = y0; ty <= y1; ty++) {
    for (let tx = x0; tx <= x1; tx++) {
      const ch = (tx < 0 || ty < 0 || tx >= COLS || ty >= ROWS) ? '#' : world.grid[ty][tx];
      if (!isSolidTile(ch)) continue;
      const cx = Math.max(tx * TILE, Math.min(x, (tx + 1) * TILE));
      const cy = Math.max(ty * TILE, Math.min(y, (ty + 1) * TILE));
      const ddx = x - cx, ddy = y - cy;
      if (ddx * ddx + ddy * ddy < radius * radius) return true;
    }
  }
  return false;
}

// Sampled line of sight: true when no sight-blocking tile lies between two points.
export function hasLineOfSight(world, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay;
  const dist = Math.hypot(dx, dy);
  const steps = Math.max(1, Math.ceil(dist / 8));
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    if (blocksSight(tileAt(world, ax + dx * t, ay + dy * t))) return false;
  }
  return true;
}

export function isHidden(world, x, y) {
  return isCoverTile(tileAt(world, x, y));
}
