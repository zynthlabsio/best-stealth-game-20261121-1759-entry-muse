// Player: Mira the moth-thief — movement, sneaking, crystal pickup, exit check.
import { PLAYER_SPEED, PLAYER_SNEAK_SPEED } from './config.js';
import { isHidden, moveWithCollision } from './world.js';

export function createPlayer(start) {
  return {
    x: start.x, y: start.y, radius: 13,
    vx: 0, vy: 0, sneaking: false, hidden: false,
    moving: false, stepPhase: 0, facing: -Math.PI / 2,
    crystals: 0, caught: false, won: false,
  };
}

export function updatePlayer(world, player, input, dt) {
  let mx = 0, my = 0;
  if (input.left) mx -= 1;
  if (input.right) mx += 1;
  if (input.up) my -= 1;
  if (input.down) my += 1;
  player.sneaking = !!input.sneak;
  const len = Math.hypot(mx, my);
  player.moving = len > 0;
  if (len > 0) {
    mx /= len; my /= len;
    const speed = player.sneaking ? PLAYER_SNEAK_SPEED : PLAYER_SPEED;
    const moved = moveWithCollision(world, player.x, player.y, mx * speed * dt, my * speed * dt, player.radius);
    player.x = moved.x; player.y = moved.y;
    player.facing = Math.atan2(my, mx);
    player.stepPhase += dt * (speed / 14);
  }
  player.hidden = isHidden(world, player.x, player.y);
  // Crystal pickup: walk over a glow-crystal to lift it.
  for (const c of world.crystals) {
    if (!c.taken && Math.hypot(c.x - player.x, c.y - player.y) < 26) {
      c.taken = true;
      player.crystals += 1;
      player.justPicked = c;
    }
  }
  // Exit opens only once every crystal is lifted.
  const allTaken = world.crystals.every((c) => c.taken);
  const atExit = Math.hypot(world.exit.x - player.x, world.exit.y - player.y) < 30;
  player.won = allTaken && atExit;
  player.exitReady = allTaken;
  return player;
}
