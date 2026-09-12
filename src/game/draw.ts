export type SpriteType =
  | "ped"
  | "ped2"
  | "dog"
  | "cone"
  | "bin"
  | "hydrant"
  | "sign"
  | "tree"
  | "car"
  | "scooter";

export const SPRITE_TYPES: SpriteType[] = [
  "ped",
  "ped2",
  "dog",
  "cone",
  "bin",
  "hydrant",
  "sign",
  "tree",
  "car",
  "scooter",
];

export const SPRITE_POINTS: Record<SpriteType, number> = {
  ped: 120,
  ped2: 120,
  dog: 90,
  cone: 40,
  bin: 50,
  hydrant: 70,
  sign: 60,
  tree: 80,
  car: 150,
  scooter: 100,
};

export const SPRITE_LABEL: Record<SpriteType, string> = {
  ped: "PEDESTRIAN",
  ped2: "TOURIST",
  dog: "DOG",
  cone: "CONE",
  bin: "TRASH CAN",
  hydrant: "HYDRANT",
  sign: "STOP SIGN",
  tree: "TREE",
  car: "PARKED CAR",
  scooter: "SCOOTER",
};

/** Draws a simple vector sprite, centred on cx with its feet at baseY. */
export function drawSprite(
  ctx: CanvasRenderingContext2D,
  type: SpriteType,
  cx: number,
  baseY: number,
  h: number,
) {
  if (h < 2) return;
  ctx.save();
  ctx.translate(cx, baseY);
  const s = h;
  const fill = (c: string) => (ctx.fillStyle = c);
  const rect = (x: number, y: number, w: number, hh: number) =>
    ctx.fillRect(x * s, y * s, w * s, hh * s);
  const circle = (x: number, y: number, r: number) => {
    ctx.beginPath();
    ctx.arc(x * s, y * s, r * s, 0, Math.PI * 2);
    ctx.fill();
  };

  switch (type) {
    case "ped":
    case "ped2": {
      const shirt = type === "ped" ? "#e05252" : "#3a7bd5";
      fill("#f0c8a0");
      circle(0, -0.86, 0.13);
      fill(shirt);
      rect(-0.16, -0.74, 0.32, 0.36);
      fill("#2b3242");
      rect(-0.15, -0.38, 0.12, 0.38);
      rect(0.03, -0.38, 0.12, 0.38);
      fill(shirt);
      rect(-0.27, -0.72, 0.11, 0.3);
      rect(0.16, -0.72, 0.11, 0.3);
      break;
    }
    case "dog": {
      fill("#8a5a2b");
      rect(-0.3, -0.34, 0.52, 0.2);
      circle(0.28, -0.4, 0.12);
      fill("#6d4520");
      rect(-0.26, -0.16, 0.08, 0.16);
      rect(0.1, -0.16, 0.08, 0.16);
      rect(-0.42, -0.42, 0.14, 0.06);
      break;
    }
    case "cone": {
      fill("#ff7a18");
      ctx.beginPath();
      ctx.moveTo(0, -0.9 * s);
      ctx.lineTo(0.26 * s, 0);
      ctx.lineTo(-0.26 * s, 0);
      ctx.closePath();
      ctx.fill();
      fill("#fff");
      rect(-0.19, -0.48, 0.38, 0.12);
      break;
    }
    case "bin": {
      fill("#3f7a4f");
      rect(-0.22, -0.7, 0.44, 0.7);
      fill("#2c5c3a");
      rect(-0.26, -0.78, 0.52, 0.1);
      break;
    }
    case "hydrant": {
      fill("#d32f2f");
      rect(-0.14, -0.62, 0.28, 0.62);
      circle(0, -0.66, 0.15);
      rect(-0.24, -0.46, 0.48, 0.1);
      break;
    }
    case "sign": {
      fill("#9aa0a6");
      rect(-0.03, -0.75, 0.06, 0.75);
      fill("#d32f2f");
      circle(0, -0.85, 0.24);
      fill("#fff");
      ctx.font = `bold ${0.2 * s}px system-ui`;
      ctx.textAlign = "center";
      ctx.fillText("STOP", 0, -0.79 * s);
      break;
    }
    case "tree": {
      fill("#6b4a2a");
      rect(-0.06, -0.42, 0.12, 0.42);
      fill("#2f7d4f");
      circle(0, -0.62, 0.3);
      fill("#3a9a60");
      circle(-0.12, -0.78, 0.22);
      circle(0.14, -0.76, 0.2);
      break;
    }
    case "scooter": {
      fill("#f2c14e");
      rect(-0.3, -0.4, 0.6, 0.12);
      fill("#333");
      circle(-0.26, -0.16, 0.16);
      circle(0.26, -0.16, 0.16);
      fill("#f2c14e");
      rect(0.2, -0.74, 0.08, 0.36);
      break;
    }
    case "car": {
      fill("#2f6fd0");
      rect(-0.6, -0.52, 1.2, 0.34);
      ctx.beginPath();
      ctx.moveTo(-0.36 * s, -0.52 * s);
      ctx.lineTo(-0.2 * s, -0.82 * s);
      ctx.lineTo(0.22 * s, -0.82 * s);
      ctx.lineTo(0.38 * s, -0.52 * s);
      ctx.closePath();
      ctx.fill();
      fill("#bfe3ff");
      rect(-0.22, -0.78, 0.44, 0.22);
      fill("#1b1b1b");
      circle(-0.36, -0.14, 0.16);
      circle(0.36, -0.14, 0.16);
      break;
    }
  }
  ctx.restore();
}
