// Guards ("wardens"): patrol waypoints, vision cones, suspicion that builds and decays.
import { TILE } from './config.js';
import { hasLineOfSight, isHidden, moveWithCollision } from './world.js';

export function createGuard(patrol, wing) {
  const sx = (patrol.start[0] + 0.5) * TILE;
  const sy = (patrol.start[1] + 0.5) * TILE;
  return {
    x: sx, y: sy,
    waypoints: patrol.waypoints.map(([wx, wy]) => ({ x: (wx + 0.5) * TILE, y: (wy + 0.5) * TILE })),
    wpIndex: 1, pauseLeft: 0, pause: patrol.pause || 0.8,
    angle: -Math.PI / 2, speed: wing.guardSpeed, range: wing.guardRange,
    suspicion: 0, state: 'patrol', // patrol | suspicious | alerted
    alertTimer: 0, lastSeen: null, stepPhase: 0,
  };
}

function angleTo(g, x, y) { return Math.atan2(y - g.y, x - g.x); }

function angleDiff(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

// Can this guard currently see the player? Hidden in a drape only at very close range.
export function guardSeesPlayer(world, guard, player, wing) {
  const dx = player.x - guard.x, dy = player.y - guard.y;
  const dist = Math.hypot(dx, dy);
  if (dist > guard.range) return { seen: false, dist };
  const hidden = isHidden(world, player.x, player.y);
  if (hidden && dist > 46) return { seen: false, dist, hidden: true };
  const facing = angleDiff(angleTo(guard, player.x, player.y), guard.angle);
  if (Math.abs(facing) > 0.62 && dist > 34) return { seen: false, dist };
  if (!hasLineOfSight(world, guard.x, guard.y, player.x, player.y)) return { seen: false, dist };
  return { seen: true, dist, facing };
}

export function updateGuard(world, guard, player, dt, wing, now) {
  const seen = guardSeesPlayer(world, guard, player, wing);
  // Suspicion builds while seen (faster up close, slower while the player sneaks),
  // and decays when the player breaks line of sight.
  if (seen.seen) {
    const closeness = 1 + (1 - Math.min(1, seen.dist / guard.range)) * 1.4;
    const sneakFactor = player.sneaking ? 0.55 : 1;
    guard.suspicion += wing.suspicionRate * closeness * sneakFactor * dt;
    guard.lastSeen = { x: player.x, y: player.y, t: now };
  } else {
    guard.suspicion -= 26 * dt;
  }
  guard.suspicion = Math.max(0, Math.min(100, guard.suspicion));
  guard.state = guard.suspicion >= 100 ? 'alerted' : guard.suspicion >= 35 ? 'suspicious' : 'patrol';

  if (guard.state === 'alerted') {
    // Charge at the last seen spot, then sweep: the alarm is the wing restart.
    guard.alertTimer += dt;
    if (guard.lastSeen) {
      const target = guard.lastSeen;
      const d = Math.hypot(target.x - guard.x, target.y - guard.y);
      if (d > 12) {
        const sp = guard.speed * 1.7;
        const nx = (target.x - guard.x) / d * sp * dt;
        const ny = (target.y - guard.y) / d * sp * dt;
        const moved = moveWithCollision(world, guard.x, guard.y, nx, ny, 13);
        guard.x = moved.x; guard.y = moved.y;
        guard.angle = angleTo(guard, target.x, target.y);
      }
    }
    return guard;
  }

  // Patrol: walk to the next waypoint, pause, turn to face the walk direction.
  if (guard.pauseLeft > 0) {
    guard.pauseLeft -= dt;
    return guard;
  }
  const target = guard.waypoints[guard.wpIndex % guard.waypoints.length];
  const dx = target.x - guard.x, dy = target.y - guard.y;
  const dist = Math.hypot(dx, dy);
  if (dist < 8) {
    guard.wpIndex = (guard.wpIndex + 1) % guard.waypoints.length;
    guard.pauseLeft = guard.pause;
    return guard;
  }
  const step = Math.min(dist, guard.speed * dt);
  const moved = moveWithCollision(world, guard.x, guard.y, dx / dist * step, dy / dist * step, 13);
  guard.x = moved.x; guard.y = moved.y;
  const want = Math.atan2(dy, dx);
  guard.angle += Math.max(-3.2 * dt, Math.min(3.2 * dt, angleDiff(want, guard.angle)));
  guard.stepPhase += dt * (guard.speed / 26);
  return guard;
}
