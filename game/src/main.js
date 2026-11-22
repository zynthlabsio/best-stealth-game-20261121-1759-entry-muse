// Emberveil — main loop, screen flow, scoring and the alarm/restart rules.
import { WINGS } from './config.js';
import { buildWorld } from './world.js';
import { createGuard, updateGuard } from './guards.js';
import { createPlayer, updatePlayer } from './player.js';
import { createAudio } from './audio.js';
import { createInput } from './input.js';
import { render } from './render.js';
import { stageShot } from './shots.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const audio = createAudio();
const input = createInput();

const state = {
  wingIndex: 0,
  wing: WINGS[0],
  world: null,
  player: null,
  guards: [],
  screen: 'title', // title | intro | playing | caught | wingclear | victory
  score: 0,
  spottedCount: 0,
  wingTime: 0,
  alarmAt: 0,
  lastTickSecond: -1,
};

function loadWing(index) {
  state.wingIndex = index;
  state.wing = WINGS[index];
  state.world = buildWorld(state.wing);
  state.player = createPlayer(state.world.start);
  state.guards = state.wing.patrols.map((p) => createGuard(p, state.wing));
  state.wingTime = 0;
  state.alarmAt = 0;
  state.screen = 'intro';
}

function restartWing() {
  loadWing(state.wingIndex);
  state.screen = 'playing';
}

function advance() {
  if (state.screen === 'title') { loadWing(0); state.screen = 'playing'; return; }
  if (state.screen === 'intro') { state.screen = 'playing'; return; }
  if (state.screen === 'caught') { restartWing(); return; }
  if (state.screen === 'wingclear') {
    if (state.wingIndex + 1 < WINGS.length) { loadWing(state.wingIndex + 1); state.screen = 'playing'; }
    else { state.screen = 'victory'; }
    return;
  }
  if (state.screen === 'victory') { state.score = 0; state.spottedCount = 0; loadWing(0); state.screen = 'playing'; }
}

input.onConfirm = () => { audio.ensure(); if (state.screen !== 'playing') advance(); };
input.onRestart = () => { if (state.screen === 'playing' || state.screen === 'caught') restartWing(); };
input.onMute = () => { const m = audio.toggleMute(); state.muted = m; };
canvas.addEventListener('click', () => { audio.ensure(); if (state.screen !== 'playing') advance(); });

let last = performance.now();
let lastStepSound = 0;

function frame(now) {
  const dt = Math.min(0.12, (now - last) / 1000); // generous cap: slow machines still move
  last = now;
  const t = now / 1000;

  if (state.screen === 'playing') {
    state.wingTime += dt;
    const before = state.player.crystals;
    updatePlayer(state.world, state.player, input, dt);
    if (state.player.crystals > before) {
      audio.pickup();
      state.score += 100;
    }
    // Footstep cues: a soft tick each stride, louder when running.
    if (state.player.moving && now - lastStepSound > (state.player.sneaking ? 520 : 340)) {
      lastStepSound = now;
      audio.footstep(state.player.sneaking);
    }
    let alarmed = false;
    for (const g of state.guards) {
      const prev = g.suspicion;
      updateGuard(state.world, g, state.player, dt, state.wing, t);
      if (prev < 35 && g.suspicion >= 35) audio.suspicionTick();
      if (g.suspicion >= 100) alarmed = true;
    }
    if (alarmed && state.alarmAt === 0) {
      state.alarmAt = t;
      audio.alarm();
      state.spottedCount += 1;
    }
    if (state.alarmAt > 0 && t - state.alarmAt > 0.9) {
      state.screen = 'caught';
      state.alarmAt = 0;
    }
    if (state.player.won) {
      audio.win();
      state.score += 250 + Math.max(0, 300 - Math.floor(state.wingTime) * 2);
      if (state.wingIndex + 1 < WINGS.length) state.screen = 'wingclear';
      else state.screen = 'victory';
    }
  }
  render(ctx, state, t);
  requestAnimationFrame(frame);
}

// Screenshot staging: ?shot=start|play|end&seed=1 renders a real game state.
const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
if (shot) {
  loadWing(shot === 'end' ? 2 : 0);
  stageShot(state, shot);
  state.screen = shot === 'start' ? 'title' : shot === 'play' ? 'playing' : 'victory';
  render(ctx, state, 1.2);
  window.__shotReady = true;
} else {
  loadWing(0);
  state.screen = 'title';
  requestAnimationFrame(frame);
}

// Play-test hooks (used by the headless autopilot, not by the game itself).
window.__emberveil = state;
window.__emberveilAdvance = advance;
window.__emberveilRestart = restartWing;
