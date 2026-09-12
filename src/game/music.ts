// Procedural funky driving loop — WebAudio, no assets, no APIs.
// Taxi-movie vibe: slap-style bassline in E, rim groove, rhodes-ish stabs.

type Ctx = AudioContext;

const BPM = 112;
const STEP = 60 / BPM / 4; // 16th notes
const LOOP_STEPS = 64; // 4 bars

// bassline (E blues-ish), midi notes, 0 = rest
const BASS: number[] = [
  40, 0, 40, 43, 0, 40, 0, 38, 40, 0, 47, 0, 45, 43, 0, 38,
  40, 0, 40, 43, 0, 40, 0, 50, 48, 0, 47, 45, 43, 0, 38, 0,
  40, 0, 40, 43, 0, 40, 0, 38, 40, 0, 47, 0, 45, 43, 0, 38,
  52, 0, 50, 48, 47, 0, 45, 43, 40, 0, 38, 0, 36, 38, 40, 0,
];
// chord stabs on offbeats: E9 / A9 flavoured clusters
const STAB_STEPS = new Set([4, 12, 20, 28, 36, 44, 52, 60]);
const STAB_CHORDS: number[][] = [
  [52, 56, 59, 62],
  [57, 61, 64, 67],
  [52, 56, 59, 62],
  [59, 62, 66, 69],
];

const midi = (n: number) => 440 * Math.pow(2, (n - 69) / 12);

export class DrivingMusic {
  private ctx: Ctx | null = null;
  private master: GainNode | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;
  private step = 0;
  private nextTime = 0;
  private playing = false;

  start() {
    if (this.playing) return;
    this.ctx ??= new AudioContext();
    void this.ctx.resume();
    if (!this.master) {
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.5;
      this.master.connect(this.ctx.destination);
    }
    this.playing = true;
    this.step = 0;
    this.nextTime = this.ctx.currentTime + 0.1;
    this.timer = setInterval(() => this.schedule(), 40);
  }

  stop() {
    this.playing = false;
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  setMuted(muted: boolean) {
    if (this.master && this.ctx) {
      this.master.gain.setTargetAtTime(muted ? 0 : 0.5, this.ctx.currentTime, 0.05);
    }
  }

  private schedule() {
    const ctx = this.ctx;
    if (!ctx || !this.playing) return;
    while (this.nextTime < ctx.currentTime + 0.15) {
      this.playStep(this.step, this.nextTime);
      this.step = (this.step + 1) % LOOP_STEPS;
      this.nextTime += STEP;
    }
  }

  private playStep(step: number, t: number) {
    // drums
    if (step % 4 === 0) this.kick(t);
    if (step % 8 === 4) this.snare(t);
    this.hat(t, step % 2 === 0 ? 0.16 : 0.09);
    // bass
    const n = BASS[step]!;
    if (n) this.bass(midi(n), t);
    // stabs
    if (STAB_STEPS.has(step)) {
      const chord = STAB_CHORDS[Math.floor(step / 16) % STAB_CHORDS.length]!;
      this.stab(chord, t);
    }
  }

  private kick(t: number) {
    const ctx = this.ctx!;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.frequency.setValueAtTime(150, t);
    o.frequency.exponentialRampToValueAtTime(40, t + 0.12);
    g.gain.setValueAtTime(0.9, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
    o.connect(g).connect(this.master!);
    o.start(t);
    o.stop(t + 0.2);
  }

  private snare(t: number) {
    const ctx = this.ctx!;
    const len = ctx.sampleRate * 0.12;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const f = ctx.createBiquadFilter();
    f.type = "highpass";
    f.frequency.value = 1200;
    const g = ctx.createGain();
    g.gain.value = 0.35;
    src.connect(f).connect(g).connect(this.master!);
    src.start(t);
  }

  private hat(t: number, vol: number) {
    const ctx = this.ctx!;
    const len = ctx.sampleRate * 0.03;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const f = ctx.createBiquadFilter();
    f.type = "highpass";
    f.frequency.value = 7000;
    const g = ctx.createGain();
    g.gain.value = vol;
    src.connect(f).connect(g).connect(this.master!);
    src.start(t);
  }

  private bass(freq: number, t: number) {
    const ctx = this.ctx!;
    const o = ctx.createOscillator();
    o.type = "sawtooth";
    o.frequency.value = freq;
    const sub = ctx.createOscillator();
    sub.type = "sine";
    sub.frequency.value = freq;
    const f = ctx.createBiquadFilter();
    f.type = "lowpass";
    f.frequency.setValueAtTime(900, t);
    f.frequency.exponentialRampToValueAtTime(250, t + STEP * 1.8);
    f.Q.value = 6;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.4, t);
    g.gain.exponentialRampToValueAtTime(0.01, t + STEP * 2);
    const gs = ctx.createGain();
    gs.gain.setValueAtTime(0.35, t);
    gs.gain.exponentialRampToValueAtTime(0.01, t + STEP * 2);
    o.connect(f).connect(g).connect(this.master!);
    sub.connect(gs).connect(this.master!);
    o.start(t);
    sub.start(t);
    o.stop(t + STEP * 2);
    sub.stop(t + STEP * 2);
  }

  private stab(chord: number[], t: number) {
    const ctx = this.ctx!;
    for (const n of chord) {
      const o = ctx.createOscillator();
      o.type = "square";
      o.frequency.value = midi(n);
      const f = ctx.createBiquadFilter();
      f.type = "lowpass";
      f.frequency.value = 2400;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.07, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + STEP * 3);
      o.connect(f).connect(g).connect(this.master!);
      o.start(t);
      o.stop(t + STEP * 3);
    }
  }
}

export const drivingMusic = new DrivingMusic();
