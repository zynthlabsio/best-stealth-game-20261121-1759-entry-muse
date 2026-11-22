// Shots: stages real game states for the three screenshots (?shot=start|play|end).
// Every shot is the live game rendered by render.js — never a composed image.
import { TILE } from './config.js';

function findDrape(world) {
  // A drape clear of the HUD bar (row 4 or below) so Mira is fully visible.
  for (let y = 4; y < world.grid.length; y++) {
    for (let x = 0; x < world.grid[y].length; x++) {
      if (world.grid[y][x] === 'D') return { x: (x + 0.5) * TILE, y: (y + 0.5) * TILE };
    }
  }
  return { x: 200, y: 200 };
}

export function stageShot(state, shot) {
  const { world, player, guards } = state;
  if (shot === 'start') {
    state.screen = 'title';
  } else if (shot === 'play') {
    state.screen = 'playing';
    // Mira tucked inside a shadow drape, one crystal already lifted.
    const drape = findDrape(world);
    player.x = drape.x; player.y = drape.y;
    player.hidden = true; player.sneaking = true;
    if (world.crystals[0]) { world.crystals[0].taken = true; player.crystals = 1; }
    // Nearest warden turns toward her, suspicion half-built: the near miss.
    let best = null, bestD = Infinity;
    for (const g of guards) {
      const d = Math.hypot(g.x - player.x, g.y - player.y);
      if (d < bestD) { bestD = d; best = g; }
    }
    if (best) {
      best.suspicion = 55;
      best.state = 'suspicious';
      best.angle = Math.atan2(player.y - best.y, player.x - best.x);
    }
  } else if (shot === 'end') {
    state.screen = 'victory';
    state.score = 1450;
    state.spottedCount = 1;
    for (const c of world.crystals) c.taken = true;
    player.crystals = 3;
  }
  window.__shotReady = true;
}
