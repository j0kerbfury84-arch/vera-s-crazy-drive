import { useCallback, useEffect, useRef, useState } from "react";
import veraAsset from "@/assets/vera.png.asset.json";
import instructorAsset from "@/assets/instructor.png.asset.json";
import {
  drawSprite,
  SPRITE_LABEL,
  SPRITE_POINTS,
  SPRITE_TYPES,
  type SpriteType,
} from "@/game/draw";
import {
  BUILDING_LINES,
  CONFIDENT_LINES,
  CRASH_LINES,
  INSTRUCTOR_CHECKPOINT,
  INSTRUCTOR_CRASH,
  LOSE_LINES,
  PANIC_LINES,
  WIN_LINES,
  pick,
} from "@/game/lines";

const SEG_LEN = 200;
const ROAD_W = 2200;
const DRAW_DIST = 160;
const CAM_HEIGHT = 1100;
const CAM_DEPTH = 1 / Math.tan(((100 / 2) * Math.PI) / 180);
const TOTAL_SEGMENTS = 1400;
const CHECKPOINT_EVERY = 175;
const GAME_TIME = 60;
const MAX_SPEED = SEG_LEN * 62;

type Seg = {
  index: number;
  curve: number;
  y: number;
  sprites: { type: SpriteType; offset: number; hit: boolean }[];
  checkpoint: number | null;
};

type Fly = {
  type: SpriteType;
  x: number;
  y: number;
  vx: number;
  vy: number;
  rot: number;
  rotv: number;
  size: number;
  life: number;
};

type Phase = "intro" | "playing" | "over";

function buildRoad(): Seg[] {
  const segs: Seg[] = [];
  let curve = 0;
  let y = 0;
  let hold = 0;
  let target = 0;
  let hillT = 0;
  for (let i = 0; i < TOTAL_SEGMENTS; i++) {
    if (hold-- <= 0) {
      hold = 40 + Math.floor(Math.random() * 70);
      target = (Math.random() - 0.5) * 7;
      if (Math.random() < 0.25) target = 0;
    }
    curve += (target - curve) * 0.06;
    hillT += 0.012;
    y = Math.sin(hillT) * 1400 + Math.sin(hillT * 2.7) * 600;

    const sprites: Seg["sprites"] = [];
    const checkpoint =
      i > 0 && i % CHECKPOINT_EVERY === 0 ? Math.floor(i / CHECKPOINT_EVERY) : null;
    if (i > 40 && !checkpoint && Math.random() < 0.22) {
      const type = SPRITE_TYPES[Math.floor(Math.random() * SPRITE_TYPES.length)]!;
      const offset = (Math.random() * 1.7 - 0.85) * (Math.random() < 0.5 ? 1 : 1);
      sprites.push({ type, offset, hit: false });
    }
    segs.push({ index: i, curve, y, sprites, checkpoint });
  }
  return segs;
}

export default function DrivingGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [phase, setPhase] = useState<Phase>("intro");
  const [score, setScore] = useState(0);
  const [victims, setVictims] = useState(0);
  const [timeLeft, setTimeLeft] = useState(GAME_TIME);
  const [progress, setProgress] = useState(0);
  const [veraLine, setVeraLine] = useState("Relax. I know what I'm doing.");
  const [instLine, setInstLine] = useState("Start the engine... slowly!");
  const [shake, setShake] = useState(0);
  const [result, setResult] = useState<{ won: boolean; text: string } | null>(null);

  const input = useRef({ left: false, right: false, gas: false, brake: false });
  const state = useRef({
    pos: 0,
    speed: 0,
    playerX: 0,
    score: 0,
    victims: 0,
    time: GAME_TIME,
    road: [] as Seg[],
    fly: [] as Fly[],
    running: false,
    lastConfident: 0,
    lastPanic: 0,
  });

  const say = useCallback((vera: string, inst?: string) => {
    setVeraLine(vera);
    if (inst) setInstLine(inst);
  }, []);

  const start = useCallback(() => {
    const s = state.current;
    s.road = buildRoad();
    s.pos = 0;
    s.speed = 0;
    s.playerX = 0;
    s.score = 0;
    s.victims = 0;
    s.time = GAME_TIME;
    s.fly = [];
    s.running = true;
    setScore(0);
    setVictims(0);
    setTimeLeft(GAME_TIME);
    setProgress(0);
    setResult(null);
    setPhase("playing");
    say("Okay... breathe, Vera. Breathe.", "Mirror, signal... GO!");
  }, [say]);

  // keyboard
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (["arrowup", "arrowdown", "arrowleft", "arrowright", " "].includes(k)) e.preventDefault();
      if (k === "arrowleft" || k === "a") input.current.left = true;
      if (k === "arrowright" || k === "d") input.current.right = true;
      if (k === "arrowup" || k === "w") input.current.gas = true;
      if (k === "arrowdown" || k === "s" || k === " ") input.current.brake = true;
      if (k === "enter" && phase !== "playing") start();
    };
    const up = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (k === "arrowleft" || k === "a") input.current.left = false;
      if (k === "arrowright" || k === "d") input.current.right = false;
      if (k === "arrowup" || k === "w") input.current.gas = false;
      if (k === "arrowdown" || k === "s" || k === " ") input.current.brake = false;
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, [phase, start]);

  // main loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    let raf = 0;
    let last = performance.now();
    let uiTick = 0;
    if (state.current.road.length === 0) state.current.road = buildRoad();

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = canvas.clientWidth * dpr;
      canvas.height = canvas.clientHeight * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    const loop = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      const s = state.current;
      const W = canvas.clientWidth;
      const H = canvas.clientHeight;

      if (s.running) {
        update(dt, W);
        uiTick += dt;
        if (uiTick > 0.1) {
          uiTick = 0;
          setScore(s.score);
          setVictims(s.victims);
          setTimeLeft(Math.max(0, s.time));
          setProgress(Math.min(1, s.pos / (TOTAL_SEGMENTS * SEG_LEN)));
        }
      }
      render(ctx, W, H);
      raf = requestAnimationFrame(loop);
    };

    const finish = (won: boolean) => {
      const s = state.current;
      s.running = false;
      if (won) s.score += 1000;
      setScore(s.score);
      const line = won ? pick(WIN_LINES) : pick(LOSE_LINES);
      say(line, won ? "You... passed? I'm resigning." : "TEST FAILED. Obviously.");
      setResult({ won, text: line });
      setPhase("over");
    };

    const crash = (type: SpriteType, screenX: number, screenY: number, size: number) => {
      const s = state.current;
      s.score += SPRITE_POINTS[type];
      s.victims += 1;
      s.speed *= 0.62;
      s.fly.push({
        type,
        x: screenX,
        y: screenY,
        vx: (screenX - canvas.clientWidth / 2) * 2.2 + (Math.random() - 0.5) * 200,
        vy: -420 - Math.random() * 220,
        rot: 0,
        rotv: (Math.random() - 0.5) * 14,
        size,
        life: 1.1,
      });
      setShake(1);
      say(pick(CRASH_LINES), `${SPRITE_LABEL[type]}! ${pick(INSTRUCTOR_CRASH)}`);
    };

    const update = (dt: number, W: number) => {
      const s = state.current;
      s.time -= dt;
      if (s.time <= 0) {
        s.time = 0;
        finish(false);
        return;
      }

      const speedPct = s.speed / MAX_SPEED;
      const baseIdx = Math.floor(s.pos / SEG_LEN) % s.road.length;
      const seg = s.road[baseIdx]!;

      if (input.current.gas) s.speed += MAX_SPEED * 0.55 * dt;
      else if (input.current.brake) s.speed -= MAX_SPEED * 1.1 * dt;
      else s.speed -= MAX_SPEED * 0.25 * dt;
      s.speed = Math.max(0, Math.min(MAX_SPEED, s.speed));

      const steer = dt * 2.4 * Math.max(0.25, speedPct);
      if (input.current.left) s.playerX -= steer;
      if (input.current.right) s.playerX += steer;
      // centrifugal force — Vera never expects it
      s.playerX -= dt * speedPct * seg.curve * 0.45;

      // buildings block the car
      if (Math.abs(s.playerX) > 0.98) {
        s.playerX = Math.sign(s.playerX) * 0.9;
        s.speed *= 0.35;
        setShake(1);
        s.score += 25;
        say(pick(BUILDING_LINES), "That's a BUILDING, Vera!");
      }

      const prevPos = s.pos;
      s.pos += s.speed * dt;

      // checkpoints
      const from = Math.floor(prevPos / SEG_LEN);
      const to = Math.floor(s.pos / SEG_LEN);
      for (let i = from + 1; i <= to; i++) {
        const sg = s.road[i];
        if (sg?.checkpoint) {
          s.score += 150;
          s.time += 4;
          say(pick(CONFIDENT_LINES), `Checkpoint ${sg.checkpoint}. ${pick(INSTRUCTOR_CHECKPOINT)}`);
        }
      }

      if (s.pos >= (TOTAL_SEGMENTS - 2) * SEG_LEN) {
        finish(true);
        return;
      }

      // collisions with current segment sprites
      const cur = s.road[Math.floor(s.pos / SEG_LEN)];
      if (cur) {
        for (const sp of cur.sprites) {
          if (sp.hit) continue;
          if (Math.abs(sp.offset - s.playerX) < 0.35 && s.speed > MAX_SPEED * 0.08) {
            sp.hit = true;
            crash(sp.type, W / 2 + (sp.offset - s.playerX) * W * 0.35, canvas.clientHeight * 0.7, 90);
          }
        }
      }

      // random panic / confidence chatter
      s.lastPanic += dt;
      if (s.lastPanic > 6) {
        s.lastPanic = 0;
        if (speedPct > 0.7) say(pick(PANIC_LINES));
        else if (Math.random() < 0.5) say(pick(CONFIDENT_LINES));
      }

      for (const f of s.fly) {
        f.life -= dt;
        f.x += f.vx * dt;
        f.y += f.vy * dt;
        f.vy += 900 * dt;
        f.rot += f.rotv * dt;
        f.size *= 1 + dt * 2.2;
      }
      s.fly = s.fly.filter((f) => f.life > 0);
      setShake((v) => Math.max(0, v - dt * 3));
    };

    const project = (
      camX: number,
      camY: number,
      camZ: number,
      worldX: number,
      worldY: number,
      worldZ: number,
      W: number,
      H: number,
    ) => {
      const dz = Math.max(worldZ - camZ, 1);
      const scale = CAM_DEPTH / dz;
      return {
        x: W / 2 + (scale * (worldX - camX) * W) / 2,
        y: H / 2 - (scale * (worldY - camY) * H) / 2,
        w: (scale * ROAD_W * W) / 2,
        scale,
      };
    };

    const render = (ctx: CanvasRenderingContext2D, W: number, H: number) => {
      const s = state.current;
      const road = s.road;
      if (!road.length) return;

      ctx.clearRect(0, 0, W, H);
      // sky
      const sky = ctx.createLinearGradient(0, 0, 0, H * 0.55);
      sky.addColorStop(0, "#173a6b");
      sky.addColorStop(0.6, "#3b7fc4");
      sky.addColorStop(1, "#f2b56b");
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, W, H * 0.6);
      ctx.fillStyle = "#ffd98a";
      ctx.beginPath();
      ctx.arc(W * 0.68, H * 0.34, Math.min(W, H) * 0.09, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#2f6b3f";
      ctx.fillRect(0, H * 0.5, W, H * 0.5);

      const baseIndex = Math.floor(s.pos / SEG_LEN);
      const base = road[baseIndex % road.length]!;
      const camY = CAM_HEIGHT + base.y;
      const camZ = s.pos;

      let x = 0;
      let dx = -(base.curve * ((s.pos % SEG_LEN) / SEG_LEN));
      let maxY = H;

      type P = { sx: number; sy: number; sw: number; scale: number; seg: Seg };
      const drawn: P[] = [];

      for (let n = 0; n < DRAW_DIST; n++) {
        const idx = baseIndex + n;
        if (idx >= road.length) break;
        const seg = road[idx]!;
        const p = project(
          s.playerX * ROAD_W - x,
          camY,
          camZ,
          0,
          seg.y,
          idx * SEG_LEN,
          W,
          H,
        );
        x += dx;
        dx += seg.curve;
        if (p.y >= maxY || p.scale <= 0) continue;
        drawn.push({ sx: p.x, sy: p.y, sw: p.w, scale: p.scale, seg });
        maxY = p.y;
      }

      // road ribbon back-to-front
      for (let i = drawn.length - 1; i > 0; i--) {
        const b = drawn[i]!;
        const t = drawn[i - 1]!;
        const dark = Math.floor(b.seg.index / 3) % 2 === 0;
        // grass
        ctx.fillStyle = dark ? "#2f6b3f" : "#356f45";
        ctx.fillRect(0, b.sy, W, t.sy - b.sy + 1);
        const poly = (x1: number, w1: number, y1: number, x2: number, w2: number, y2: number) => {
          ctx.beginPath();
          ctx.moveTo(x1 - w1, y1);
          ctx.lineTo(x1 + w1, y1);
          ctx.lineTo(x2 + w2, y2);
          ctx.lineTo(x2 - w2, y2);
          ctx.closePath();
          ctx.fill();
        };
        // rumble / sidewalk
        ctx.fillStyle = dark ? "#c9c4b8" : "#e6e1d5";
        poly(b.sx, b.sw * 1.22, b.sy, t.sx, t.sw * 1.22, t.sy);
        ctx.fillStyle = dark ? "#3d3f46" : "#44464e";
        poly(b.sx, b.sw, b.sy, t.sx, t.sw, t.sy);
        if (Math.floor(b.seg.index / 4) % 2 === 0) {
          ctx.fillStyle = "#f5d76e";
          poly(b.sx, b.sw * 0.02, b.sy, t.sx, t.sw * 0.02, t.sy);
        }
        if (b.seg.checkpoint) {
          ctx.fillStyle = "rgba(245,215,110,0.75)";
          poly(b.sx, b.sw, b.sy, t.sx, t.sw, t.sy);
        }
      }

      // buildings + sprites front-to-back reversed for painter order
      for (let i = drawn.length - 1; i >= 0; i--) {
        const d = drawn[i]!;
        const unit = d.sw / 1; // half road width in px
        const bh = unit * 2.6;
        if (bh > 3) {
          const seed = (d.seg.index * 9301 + 49297) % 233280;
          const rnd = seed / 233280;
          const colorL = ["#8d6e63", "#7e8aa2", "#a4705d", "#6f7f8f"][d.seg.index % 4]!;
          const colorR = ["#94705f", "#6d7f96", "#8a7ba0", "#7d6e5f"][(d.seg.index + 2) % 4]!;
          const hL = bh * (0.6 + rnd * 0.8);
          const hR = bh * (0.6 + (1 - rnd) * 0.8);
          ctx.fillStyle = colorL;
          ctx.fillRect(d.sx - d.sw * 1.25 - unit * 1.4, d.sy - hL, unit * 1.4, hL);
          ctx.fillStyle = colorR;
          ctx.fillRect(d.sx + d.sw * 1.25, d.sy - hR, unit * 1.4, hR);
        }
        for (const sp of d.seg.sprites) {
          if (sp.hit) continue;
          const h = d.sw * 0.55;
          drawSprite(ctx, sp.type, d.sx + sp.offset * d.sw, d.sy, h);
        }
        if (d.seg.checkpoint && d.sw > 4) {
          const pulse = 0.6 + 0.4 * Math.sin(performance.now() / 160);
          ctx.save();
          ctx.globalAlpha = pulse;
          ctx.strokeStyle = "#ffd54a";
          ctx.lineWidth = Math.max(2, d.sw * 0.06);
          ctx.beginPath();
          ctx.ellipse(d.sx, d.sy - d.sw * 0.7, d.sw * 1.1, d.sw * 0.75, 0, 0, Math.PI * 2);
          ctx.stroke();
          ctx.fillStyle = "#ffd54a";
          ctx.font = `bold ${Math.max(10, d.sw * 0.3)}px system-ui`;
          ctx.textAlign = "center";
          ctx.fillText(String(d.seg.checkpoint), d.sx, d.sy - d.sw * 0.6);
          ctx.restore();
        }
      }

      // flying victims across the windshield
      for (const f of s.fly) {
        ctx.save();
        ctx.translate(f.x, f.y);
        ctx.rotate(f.rot);
        ctx.globalAlpha = Math.max(0, Math.min(1, f.life));
        drawSprite(ctx, f.type, 0, f.size / 2, f.size);
        ctx.restore();
      }

      drawCockpit(ctx, W, H, s.speed / MAX_SPEED);
    };

    const drawCockpit = (ctx: CanvasRenderingContext2D, W: number, H: number, spd: number) => {
      const dashTop = H * 0.74;
      const g = ctx.createLinearGradient(0, dashTop, 0, H);
      g.addColorStop(0, "#241d1a");
      g.addColorStop(1, "#0e0b0a");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(0, dashTop + H * 0.05);
      ctx.quadraticCurveTo(W / 2, dashTop - H * 0.05, W, dashTop + H * 0.05);
      ctx.lineTo(W, H);
      ctx.lineTo(0, H);
      ctx.closePath();
      ctx.fill();

      // steering wheel
      const cx = W / 2;
      const cy = H * 1.02;
      const r = Math.min(W * 0.34, H * 0.34);
      const turn =
        (input.current.left ? -0.5 : 0) + (input.current.right ? 0.5 : 0) + state.current.playerX * 0.3;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(turn * 0.5);
      ctx.strokeStyle = "#1b1b1e";
      ctx.lineWidth = r * 0.16;
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = "#2b2b30";
      ctx.lineWidth = r * 0.12;
      ctx.beginPath();
      ctx.moveTo(-r, 0);
      ctx.lineTo(r, 0);
      ctx.moveTo(0, 0);
      ctx.lineTo(0, r);
      ctx.stroke();
      ctx.fillStyle = "#d4a13a";
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.18, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // speedo
      const sx = W * 0.14;
      const sy = H * 0.9;
      const sr = Math.min(W * 0.09, H * 0.1);
      ctx.strokeStyle = "rgba(255,255,255,0.25)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(sx, sy, sr, Math.PI * 0.8, Math.PI * 2.2);
      ctx.stroke();
      ctx.strokeStyle = spd > 0.75 ? "#ff5a5a" : "#ffd54a";
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.arc(sx, sy, sr, Math.PI * 0.8, Math.PI * 0.8 + Math.PI * 1.4 * spd);
      ctx.stroke();
      ctx.fillStyle = "#fff";
      ctx.font = `bold ${sr * 0.5}px system-ui`;
      ctx.textAlign = "center";
      ctx.fillText(`${Math.round(spd * 180)}`, sx, sy + sr * 0.2);
    };

    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, [say]);

  const hold = (key: keyof typeof input.current) => ({
    onPointerDown: (e: React.PointerEvent) => {
      e.preventDefault();
      input.current[key] = true;
    },
    onPointerUp: () => (input.current[key] = false),
    onPointerLeave: () => (input.current[key] = false),
    onPointerCancel: () => (input.current[key] = false),
  });

  return (
    <div className="relative h-[100dvh] w-full overflow-hidden bg-background select-none">
      <canvas
        ref={canvasRef}
        className="absolute inset-0 h-full w-full"
        style={{ transform: shake > 0 ? `translate(${(Math.random() - 0.5) * shake * 14}px, ${(Math.random() - 0.5) * shake * 14}px)` : undefined }}
      />

      {/* rear-view mirror with Vera */}
      <div className="pointer-events-none absolute left-1/2 top-3 z-20 w-[min(46vw,320px)] -translate-x-1/2">
        <div className="rounded-[2rem] border-4 border-foreground/70 bg-card/90 p-1 shadow-xl backdrop-blur">
          <div className="flex items-center gap-2">
            <img
              src={veraAsset.url}
              alt="Vera, the student driver, in the rear-view mirror"
              className="h-14 w-14 shrink-0 rounded-full object-cover md:h-16 md:w-16"
              style={{ transform: `rotate(${shake * 8}deg)` }}
            />
            <p className="line-clamp-2 pr-2 text-[11px] font-semibold leading-tight text-card-foreground md:text-sm">
              {veraLine}
            </p>
          </div>
        </div>
      </div>

      {/* HUD */}
      <div className="pointer-events-none absolute left-3 top-3 z-20 space-y-1 text-xs font-bold uppercase tracking-wide text-primary-foreground md:text-sm">
        <div className="rounded-md bg-foreground/70 px-2 py-1 backdrop-blur">Score {score}</div>
        <div className="rounded-md bg-foreground/70 px-2 py-1 backdrop-blur">Victims {victims}</div>
      </div>
      <div className="pointer-events-none absolute right-3 top-3 z-20 text-right">
        <div className="rounded-md bg-foreground/70 px-2 py-1 text-xs font-bold uppercase text-primary-foreground backdrop-blur md:text-sm">
          {Math.ceil(timeLeft)}s
        </div>
        <div className="mt-1 h-2 w-24 overflow-hidden rounded-full bg-foreground/60">
          <div className="h-full bg-chart-4" style={{ width: `${progress * 100}%` }} />
        </div>
      </div>

      {/* instructor */}
      <div className="pointer-events-none absolute bottom-3 right-3 z-20 flex max-w-[65vw] items-end gap-2">
        <div className="rounded-2xl rounded-br-none bg-card/90 px-3 py-2 text-[11px] font-semibold text-card-foreground shadow-lg backdrop-blur md:text-sm">
          {instLine}
        </div>
        <img
          src={instructorAsset.url}
          alt="The driving instructor shouting"
          className="h-16 w-16 shrink-0 rounded-full object-cover md:h-20 md:w-20"
        />
      </div>

      {/* touch controls */}
      {phase === "playing" && (
        <div className="absolute inset-x-0 bottom-0 z-30 flex items-end justify-between p-4 md:hidden">
          <div className="flex gap-3">
            <button
              {...hold("left")}
              aria-label="Steer left"
              className="h-16 w-16 rounded-full bg-foreground/70 text-2xl text-primary-foreground active:bg-foreground"
            >
              ◀
            </button>
            <button
              {...hold("right")}
              aria-label="Steer right"
              className="h-16 w-16 rounded-full bg-foreground/70 text-2xl text-primary-foreground active:bg-foreground"
            >
              ▶
            </button>
          </div>
          <div className="flex gap-3">
            <button
              {...hold("brake")}
              aria-label="Brake"
              className="h-16 w-16 rounded-full bg-destructive/80 text-xs font-bold uppercase text-destructive-foreground active:bg-destructive"
            >
              Brake
            </button>
            <button
              {...hold("gas")}
              aria-label="Accelerate"
              className="h-16 w-16 rounded-full bg-chart-4/90 text-xs font-bold uppercase text-foreground active:bg-chart-4"
            >
              Gas
            </button>
          </div>
        </div>
      )}

      {/* overlays */}
      {phase !== "playing" && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-foreground/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-card p-6 text-center shadow-2xl">
            <img
              src={veraAsset.url}
              alt="Vera"
              className="mx-auto h-24 w-24 rounded-full object-cover"
            />
            {phase === "intro" ? (
              <>
                <h1 className="mt-3 text-2xl font-extrabold text-card-foreground">
                  Vera's Impossible Driving Test
                </h1>
                <p className="mt-2 text-sm text-muted-foreground">
                  60 seconds. One route. Zero talent. Hit the checkpoints, flatten everything else —
                  every victim scores points.
                </p>
                <p className="mt-2 text-xs text-muted-foreground">
                  Arrows / WASD on desktop, touch buttons on mobile.
                </p>
              </>
            ) : (
              <>
                <h2 className="mt-3 text-2xl font-extrabold text-card-foreground">
                  {result?.won ? "Route complete!" : "TEST FAILED"}
                </h2>
                <p className="mt-2 text-sm italic text-muted-foreground">"{result?.text}"</p>
                <p className="mt-3 text-lg font-bold text-card-foreground">
                  Score {score} · Victims {victims}
                </p>
              </>
            )}
            <button
              onClick={start}
              className="mt-5 w-full rounded-xl bg-primary px-4 py-3 text-sm font-bold uppercase tracking-wide text-primary-foreground transition-colors hover:bg-primary/90"
            >
              {phase === "intro" ? "Start the exam" : "Try again"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
