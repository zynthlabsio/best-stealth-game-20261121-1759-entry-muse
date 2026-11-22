// Render: draws the whole game on one canvas — floor, cover, cones, actors, HUD, screens.
import { TILE, COLS, ROWS } from './config.js';
import { tileAt, blocksSight } from './world.js';

// Vision cone as a polygon: march each ray until a wall/crate stops it.
export function conePolygon(world, guard) {
  const pts = [{ x: guard.x, y: guard.y }];
  const half = 0.62;
  const steps = 26;
  for (let i = 0; i <= steps; i++) {
    const a = guard.angle - half + (2 * half * i) / steps;
    let r = guard.range;
    for (let d = 10; d < guard.range; d += 10) {
      if (blocksSight(tileAt(world, guard.x + Math.cos(a) * d, guard.y + Math.sin(a) * d))) { r = d; break; }
    }
    pts.push({ x: guard.x + Math.cos(a) * r, y: guard.y + Math.sin(a) * r });
  }
  return pts;
}

function drawCone(ctx, world, guard) {
  const pts = conePolygon(world, guard);
  const hot = guard.suspicion >= 100;
  const warm = guard.suspicion >= 35;
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
  ctx.closePath();
  ctx.fillStyle = hot ? 'rgba(255,60,50,0.34)' : warm ? 'rgba(255,170,40,0.30)' : 'rgba(255,214,90,0.20)';
  ctx.fill();
  ctx.strokeStyle = hot ? 'rgba(255,80,60,0.55)' : 'rgba(255,214,90,0.35)';
  ctx.lineWidth = 1.5;
  ctx.stroke();
}

function drawTile(ctx, ch, x, y, t) {
  const px = x * TILE, py = y * TILE;
  if (ch === '#') {
    ctx.fillStyle = '#232033';
    ctx.fillRect(px, py, TILE, TILE);
    ctx.fillStyle = '#322e4a';
    ctx.fillRect(px, py, TILE, 5);
    ctx.fillStyle = '#1a1826';
    ctx.fillRect(px + 3, py + 10, TILE - 6, 2);
    return;
  }
  // Floor: two-tone flagstones with a faint ember fleck.
  ctx.fillStyle = (x + y) % 2 === 0 ? '#191624' : '#1d1929';
  ctx.fillRect(px, py, TILE, TILE);
  ctx.strokeStyle = 'rgba(0,0,0,0.25)';
  ctx.strokeRect(px + 0.5, py + 0.5, TILE - 1, TILE - 1);
  if (ch === 'D') {
    // Shadow drape: tall purple cover Mira can hide inside.
    ctx.fillStyle = 'rgba(88,52,140,0.55)';
    ctx.fillRect(px + 2, py + 2, TILE - 4, TILE - 4);
    ctx.strokeStyle = '#b48ce8';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(px + 10, py + 4); ctx.lineTo(px + 8, py + TILE - 4);
    ctx.moveTo(px + 20, py + 4); ctx.lineTo(px + 22, py + TILE - 4);
    ctx.moveTo(px + 30, py + 4); ctx.lineTo(px + 28, py + TILE - 4);
    ctx.stroke();
    ctx.fillStyle = '#d9c2ff';
    ctx.font = 'bold 11px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillText('HIDE', px + TILE / 2, py + TILE / 2 + 4);
  }
  if (ch === 'K') {
    ctx.fillStyle = '#5a3d24';
    ctx.fillRect(px + 3, py + 3, TILE - 6, TILE - 6);
    ctx.strokeStyle = '#8a6238';
    ctx.lineWidth = 2;
    ctx.strokeRect(px + 5, py + 5, TILE - 10, TILE - 10);
    ctx.beginPath();
    ctx.moveTo(px + 5, py + 5); ctx.lineTo(px + TILE - 5, py + TILE - 5);
    ctx.moveTo(px + TILE - 5, py + 5); ctx.lineTo(px + 5, py + TILE - 5);
    ctx.stroke();
  }
}

function drawCrystal(ctx, c, t) {
  if (c.taken) return;
  const pulse = 1 + Math.sin(t * 3 + c.x) * 0.12;
  ctx.save();
  ctx.translate(c.x, c.y);
  ctx.shadowColor = '#ffb347';
  ctx.shadowBlur = 18;
  ctx.fillStyle = '#ffc95e';
  ctx.beginPath();
  ctx.moveTo(0, -13 * pulse); ctx.lineTo(9 * pulse, 0); ctx.lineTo(0, 13 * pulse); ctx.lineTo(-9 * pulse, 0);
  ctx.closePath(); ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#fff3c4';
  ctx.beginPath();
  ctx.moveTo(0, -7 * pulse); ctx.lineTo(4 * pulse, 0); ctx.lineTo(0, 7 * pulse); ctx.lineTo(-4 * pulse, 0);
  ctx.closePath(); ctx.fill();
  ctx.restore();
}

function drawExit(ctx, exit, ready, t) {
  const glow = ready ? '#37e08a' : '#3f7d5c';
  ctx.save();
  ctx.translate(exit.x, exit.y);
  ctx.shadowColor = glow;
  ctx.shadowBlur = ready ? 26 : 10;
  ctx.fillStyle = ready ? 'rgba(55,224,138,0.9)' : 'rgba(63,125,92,0.8)';
  ctx.fillRect(-19, -19, 38, 38);
  ctx.shadowBlur = 0;
  ctx.strokeStyle = '#d8ffe9';
  ctx.lineWidth = 2.5;
  ctx.strokeRect(-19, -19, 38, 38);
  ctx.fillStyle = '#0b2e1c';
  ctx.font = 'bold 12px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.fillText('EXIT', 0, 4);
  if (ready) {
    ctx.fillStyle = '#d8ffe9';
    ctx.font = 'bold 11px Georgia, serif';
    ctx.fillText('OPEN', 0, -26 - Math.sin(t * 3) * 3);
  }
  ctx.restore();
}

function drawMira(ctx, player, t) {
  ctx.save();
  ctx.translate(player.x, player.y);
  const flap = Math.sin(player.stepPhase * 2.2) * (player.moving ? 0.5 : 0.12);
  // Moth wings: pale ember wings that flutter as she moves.
  ctx.fillStyle = player.hidden ? 'rgba(240,214,160,0.85)' : '#f2d8a0';
  ctx.beginPath();
  ctx.ellipse(-9, -4 - flap * 4, 10, 7 + flap * 3, -0.6, 0, Math.PI * 2);
  ctx.ellipse(9, -4 - flap * 4, 10, 7 + flap * 3, 0.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#e8a04c';
  ctx.beginPath();
  ctx.ellipse(-9, -4 - flap * 4, 4, 3, -0.6, 0, Math.PI * 2);
  ctx.ellipse(9, -4 - flap * 4, 4, 3, 0.6, 0, Math.PI * 2);
  ctx.fill();
  // Body and head.
  ctx.fillStyle = '#3a2a1c';
  ctx.beginPath(); ctx.ellipse(0, 2, 6, 9, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#ffe9b8';
  ctx.beginPath(); ctx.arc(0, -8, 5, 0, Math.PI * 2); ctx.fill();
  // Antennae.
  ctx.strokeStyle = '#3a2a1c';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(-2, -12); ctx.quadraticCurveTo(-7, -20, -10, -18);
  ctx.moveTo(2, -12); ctx.quadraticCurveTo(7, -20, 10, -18);
  ctx.stroke();
  ctx.restore();
}

function drawGuard(ctx, guard, t) {
  ctx.save();
  ctx.translate(guard.x, guard.y);
  const bob = Math.sin(guard.stepPhase) * 1.5;
  // Warden: heavy maroon cloak, brass helm, lantern glow.
  ctx.fillStyle = guard.state === 'alerted' ? '#a1121c' : '#6e1423';
  ctx.beginPath(); ctx.arc(0, bob * 0.3, 14, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#d8a24a';
  ctx.beginPath(); ctx.arc(0, -3 + bob * 0.3, 8, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#1c1c26';
  ctx.fillRect(-8, -6 + bob * 0.3, 16, 3);
  // Facing tick.
  ctx.strokeStyle = '#ffd65a';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(Math.cos(guard.angle) * 20, Math.sin(guard.angle) * 20);
  ctx.stroke();
  ctx.restore();
  // Suspicion arc + mark above the warden.
  if (guard.suspicion > 2) {
    const s = guard.suspicion / 100;
    ctx.save();
    ctx.translate(guard.x, guard.y - 26);
    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.lineWidth = 4;
    ctx.beginPath(); ctx.arc(0, 0, 9, -Math.PI / 2, Math.PI * 1.5); ctx.stroke();
    ctx.strokeStyle = guard.suspicion >= 100 ? '#ff3c32' : guard.suspicion >= 35 ? '#ffaa28' : '#ffd65a';
    ctx.beginPath(); ctx.arc(0, 0, 9, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * s); ctx.stroke();
    ctx.fillStyle = guard.suspicion >= 100 ? '#ff3c32' : '#ffd65a';
    ctx.font = 'bold 15px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillText(guard.suspicion >= 100 ? '!' : guard.suspicion >= 35 ? '?' : '', 0, -13);
    ctx.restore();
  }
}

function drawHud(ctx, state) {
  const { wing, player, guards, timeLeft } = state;
  ctx.save();
  ctx.fillStyle = 'rgba(8,7,16,0.88)';
  ctx.fillRect(0, 0, 1280, 46);
  ctx.fillStyle = '#f2d8a0';
  ctx.font = 'bold 19px Georgia, serif';
  ctx.textAlign = 'left';
  ctx.fillText('EMBERVEIL', 18, 30);
  ctx.fillStyle = '#b9b2cc';
  ctx.font = '15px Georgia, serif';
  ctx.fillText(wing.name, 170, 29);
  // Crystals.
  ctx.fillStyle = '#ffc95e';
  ctx.font = 'bold 17px Georgia, serif';
  ctx.textAlign = 'right';
  ctx.fillText('◆ '.repeat(player.crystals) + '◇ '.repeat(3 - player.crystals) + `  ${player.crystals}/3 crystals`, 700, 30);
  // Suspicion meter (worst warden).
  const worst = Math.max(0, ...guards.map((g) => g.suspicion));
  ctx.textAlign = 'left';
  ctx.fillStyle = '#b9b2cc';
  ctx.font = '13px Georgia, serif';
  ctx.fillText('SPOTTED', 760, 29);
  ctx.fillStyle = '#2c2740';
  ctx.fillRect(830, 17, 180, 13);
  ctx.fillStyle = worst >= 100 ? '#ff3c32' : worst >= 35 ? '#ffaa28' : '#ffd65a';
  ctx.fillRect(830, 17, 180 * (worst / 100), 13);
  ctx.fillStyle = '#b9b2cc';
  ctx.font = '15px Georgia, serif';
  ctx.fillText(player.sneaking ? 'SNEAKING — slow, quiet' : player.hidden ? 'HIDDEN in the drape' : 'exposed — stay out of the cones', 1030, 29);
  ctx.restore();
}

function overlay(ctx, title, lines, accent, footer) {
  ctx.save();
  ctx.fillStyle = 'rgba(6,5,12,0.72)';
  ctx.fillRect(0, 0, 1280, 800);
  ctx.textAlign = 'center';
  ctx.fillStyle = accent || '#f2d8a0';
  ctx.font = 'bold 64px Georgia, serif';
  ctx.fillText(title, 640, 300);
  ctx.fillStyle = '#e8e2f2';
  ctx.font = '20px Georgia, serif';
  let y = 360;
  for (const line of lines) { ctx.fillText(line, 640, y); y += 34; }
  if (footer) {
    ctx.fillStyle = '#b9b2cc';
    ctx.font = '17px Georgia, serif';
    ctx.fillText(footer, 640, y + 40);
  }
  ctx.restore();
}

export function render(ctx, state, t) {
  const { world, player, guards, screen } = state;
  ctx.clearRect(0, 0, 1280, 800);
  ctx.fillStyle = '#14121f';
  ctx.fillRect(0, 0, 1280, 800);
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) drawTile(ctx, world.grid[y][x], x, y, t);
  }
  drawExit(ctx, world.exit, player.exitReady, t);
  for (const c of world.crystals) drawCrystal(ctx, c, t);
  // Vision cones under the actors.
  for (const g of guards) drawCone(ctx, world, g);
  // Soft light around Mira.
  const light = ctx.createRadialGradient(player.x, player.y, 10, player.x, player.y, 220);
  light.addColorStop(0, 'rgba(255,220,150,0.10)');
  light.addColorStop(1, 'rgba(255,220,150,0)');
  ctx.fillStyle = light;
  ctx.fillRect(player.x - 220, player.y - 220, 440, 440);
  drawMira(ctx, player, t);
  for (const g of guards) drawGuard(ctx, g, t);
  drawHud(ctx, state);
  if (screen === 'title') {
    overlay(ctx, 'EMBERVEIL', [
      'Mira the moth-thief slips through the lantern-lit halls.',
      'Lift all three glow-crystals in each wing, then reach the green EXIT unseen.',
      'Hide in the purple drapes. Watch the wardens’ golden cones —',
      'when one turns amber, break line of sight before it turns red.',
    ], '#f2d8a0', 'Click or press Enter to begin  •  WASD / arrows move  •  Shift sneaks  •  M mutes');
  } else if (screen === 'intro') {
    overlay(ctx, state.wing.name, [state.wing.brief], '#f2d8a0', 'Click or press Enter to slip in');
  } else if (screen === 'caught') {
    overlay(ctx, 'SPOTTED!', [
      'A warden raised the alarm and the wing resets.',
      'Patience beats speed: let the cone pass, then move.',
    ], '#ff5a4a', 'Click or press Enter to try the wing again');
  } else if (screen === 'wingclear') {
    overlay(ctx, 'WING CLEAR', [
      `All three crystals lifted — ${state.score} points banked.`,
      'The next wing is darker, and its wardens are quicker.',
    ], '#37e08a', 'Click or press Enter for the next wing');
  } else if (screen === 'victory') {
    overlay(ctx, 'THE VAULT IS YOURS', [
      'Mira vanishes into the ember-light with every crystal in the house.',
      `Final score: ${state.score}  •  Crystals 9/9  •  Times spotted: ${state.spottedCount}`,
      'Emberveil — an original stealth game, built for make.fun.',
    ], '#f2d8a0', 'Click or press Enter to play again');
  }
}
