// Audio: synthesised WebAudio cues only — no external sound files.
// Footsteps, crystal chime, suspicion tick, alarm sting, victory arpeggio.
export function createAudio() {
  const audio = { ctx: null, muted: false, master: null };
  audio.ensure = function ensure() {
    if (audio.ctx) { if (audio.ctx.state === 'suspended') audio.ctx.resume(); return; }
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      audio.ctx = new Ctx();
      audio.master = audio.ctx.createGain();
      audio.master.gain.value = 0.16;
      audio.master.connect(audio.ctx.destination);
    } catch (e) { audio.ctx = null; }
  };
  audio.tone = function tone(freq, dur, type, vol, slideTo) {
    if (!audio.ctx || audio.muted) return;
    try {
      const t = audio.ctx.currentTime;
      const osc = audio.ctx.createOscillator();
      const g = audio.ctx.createGain();
      osc.type = type || 'sine';
      osc.frequency.setValueAtTime(freq, t);
      if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
      g.gain.setValueAtTime(vol || 0.5, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + dur);
      osc.connect(g); g.connect(audio.master);
      osc.start(t); osc.stop(t + dur + 0.02);
    } catch (e) { /* audio is a cue, never a crash */ }
  };
  audio.footstep = function footstep(sneaking) {
    audio.tone(sneaking ? 140 : 95, 0.07, 'triangle', sneaking ? 0.12 : 0.3, 70);
  };
  audio.pickup = function pickup() {
    audio.tone(660, 0.12, 'sine', 0.5);
    setTimeout(() => audio.tone(990, 0.18, 'sine', 0.5), 90);
  };
  audio.suspicionTick = function suspicionTick() { audio.tone(520, 0.09, 'square', 0.14, 620); };
  audio.alarm = function alarm() {
    audio.tone(220, 0.3, 'sawtooth', 0.5, 440);
    setTimeout(() => audio.tone(440, 0.3, 'sawtooth', 0.5, 220), 220);
  };
  audio.win = function win() {
    [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => audio.tone(f, 0.25, 'sine', 0.5), i * 130));
  };
  audio.toggleMute = function toggleMute() { audio.muted = !audio.muted; return audio.muted; };
  return audio;
}
