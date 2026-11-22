/**
 * Battlers are ordinary RPGJS spritesheets, registered like any other
 * (`defineModule<RpgClient>({ spritesheets: [...] })`) and referenced by id
 * (`battler: "hero-knight"`). Battle hints (facing, impact frame, animation
 * names…) sit in a `battle` field of the spritesheet, or in the client option
 * `battlers`. Timings come from the texture frames (`time`, in 60 fps ticks).
 *
 * ```ts
 * export const knight = {
 *   id: "hero-knight", image: "/battlers/knight.png", framesWidth: 8, framesHeight: 6,
 *   textures: {
 *     idle:   { animations: () => [[{ time: 0, frameX: 0, frameY: 0 }, { time: 10, frameX: 1, frameY: 0 }, { time: 20 }]] },
 *     attack: { animations: () => [[{ time: 0, frameX: 0, frameY: 1 }, …, { time: 48 }]] },
 *   },
 *   battle: { facing: "left", impact: { attack: 3 } },
 * };
 * ```
 */

/** Frame of an RPGJS texture animation (`time` in ticks; the last one may only mark the end). */
export interface RpgFrame {
  time: number;
  frameX?: number;
  frameY?: number;
  [key: string]: unknown;
}

type RpgAnimations = RpgFrame[][] | ((options?: Record<string, unknown>) => RpgFrame[][]);

/** An RPGJS spritesheet definition (object form), plus optional battle hints. */
export interface BattleSpritesheet {
  id?: string;
  image: string;
  width?: number;
  height?: number;
  framesWidth: number;
  framesHeight: number;
  textures: Record<string, { animations: RpgAnimations; [key: string]: unknown }>;
  battle?: BattlerHints;
  [key: string]: unknown;
}

/** Battle animation names used by the choreography (missing ones fall back, see `ALIASES`). */
export type BattleAnimName = "idle" | "attack" | "skill" | "item" | "limit" | "hurt" | "staggered" | "dead" | "victory";

export interface BattlerHints {
  /** Direction the sprite is drawn facing. Default: left for heroes, right for enemies. */
  facing?: "left" | "right";
  /** Size multiplier in battle. */
  scale?: number;
  /** Battle animation → texture of the spritesheet (default: the same name). */
  anims?: Partial<Record<BattleAnimName, string>>;
  /** Frame index (in the animation) where the hit lands. Default: about 45 %. */
  impact?: Partial<Record<string, number>>;
  /** Looping animations. Default: idle. */
  loop?: string[];
  /** Portrait crop for the timeline / cut-in, relative to a cell (0..1). Default: from the idle pose. */
  face?: { x: number; y: number; size: number };
}

export interface BattlerAnim {
  /** Cells of the atlas, in order. */
  frames: { x: number; y: number }[];
  durations: number[];
  loop: boolean;
  impact: number;
}

export interface BattlerInfo {
  id: string;
  /** Id of the battle spritesheet registered by the plugin (the original + held poses). */
  sheetId: string;
  image: string;
  hints: BattlerHints;
  anims: Map<string, BattlerAnim>;
  columns: number;
  rows: number;
  /** Visible bounds of the idle pose, in cell pixels. */
  bounds: { x: number; y: number; w: number; h: number };
  cell: { width: number; height: number };
  face: { x: number; y: number; size: number };
}

const ALIASES: Record<string, string[]> = {
  item: ["item", "skill", "attack", "idle"],
  skill: ["skill", "attack", "idle"],
  limit: ["limit", "skill", "attack", "idle"],
  victory: ["victory", "idle"],
  staggered: ["staggered", "hurt", "idle"],
  hurt: ["hurt", "idle"],
  dead: ["dead", "hurt", "idle"],
  attack: ["attack", "idle"],
};
export const TICK_MS = 1000 / 60;

/** Resolve an animation name with fallbacks (enemies rarely have "victory"). */
export function animName(info: BattlerInfo, name: string): string {
  for (const n of ALIASES[name] ?? [name, "idle"]) if (info.anims.has(n)) return n;
  return info.anims.keys().next().value!;
}

export const anim = (info: BattlerInfo, name: string) => info.anims.get(animName(info, name))!;

/** Time from animation start to its impact frame. */
export const impactDelay = (a: BattlerAnim) => a.durations.slice(0, a.impact).reduce((s, d) => s + d, 0);
export const animDuration = (a: BattlerAnim) => a.durations.reduce((s, d) => s + d, 0);

/** First frame sequence of a texture (RPGJS allows a function of options, e.g. direction). */
function sequence(animations: RpgAnimations, facing: string): RpgFrame[] {
  const list = typeof animations === "function" ? animations({ direction: facing }) : animations;
  return list?.[0] ?? [];
}

/** Frames and durations of one texture (`time` deltas, in ticks). */
export function readTexture(animations: RpgAnimations, facing = "left"): Omit<BattlerAnim, "loop" | "impact"> {
  const seq = [...sequence(animations, facing)].sort((a, b) => a.time - b.time);
  const frames: { x: number; y: number }[] = [];
  const durations: number[] = [];
  seq.forEach((f, i) => {
    if (f.frameX === undefined && f.frameY === undefined) return; // end marker
    const next = seq[i + 1];
    const ticks = next ? next.time - f.time : i > 0 ? f.time - seq[i - 1].time : 10;
    frames.push({ x: f.frameX ?? 0, y: f.frameY ?? 0 });
    durations.push(Math.max(1, ticks) * TICK_MS);
  });
  return { frames, durations };
}

/**
 * Battle animations of a spritesheet: every texture, plus the battle names
 * mapped by `hints.anims`. Pure (no DOM), so it is easy to test.
 */
export function battlerAnims(sheet: BattleSpritesheet, hints: BattlerHints = {}): Map<string, BattlerAnim> {
  const facing = hints.facing ?? "left";
  const loops = new Set(hints.loop ?? ["idle"]);
  const anims = new Map<string, BattlerAnim>();
  const build = (name: string, texture: string) => {
    const t = sheet.textures[texture];
    if (!t) return;
    const { frames, durations } = readTexture(t.animations, facing);
    if (!frames.length) return;
    anims.set(name, {
      frames,
      durations,
      loop: loops.has(name) || loops.has(texture),
      impact: Math.min(frames.length - 1, hints.impact?.[name] ?? hints.impact?.[texture] ?? Math.floor(frames.length * 0.45)),
    });
  };
  for (const texture of Object.keys(sheet.textures)) build(texture, texture);
  for (const [name, texture] of Object.entries(hints.anims ?? {})) if (texture) build(name, texture);
  return anims;
}

/**
 * The spritesheet the battle plays: every animation re-timed from its frames,
 * plus a `<name>@hold` texture (last frame held) for poses such as `dead`.
 */
export function toSpritesheet(info: BattlerInfo) {
  const textures: Record<string, { animations: () => unknown[][] }> = {};
  for (const [name, a] of info.anims) {
    let t = 0;
    const frames: Record<string, number>[] = a.frames.map((f, i) => {
      const frame = { time: Math.round(t), frameX: f.x, frameY: f.y };
      t += a.durations[i] / TICK_MS;
      return frame;
    });
    frames.push({ time: Math.round(t) });
    const last = a.frames[a.frames.length - 1];
    textures[name] = { animations: () => [frames] };
    textures[`${name}@hold`] = { animations: () => [[{ time: 0, frameX: last.x, frameY: last.y }, { time: 600 }]] };
  }
  return {
    id: info.sheetId,
    image: info.image,
    width: info.columns * info.cell.width,
    height: info.rows * info.cell.height,
    framesWidth: info.columns,
    framesHeight: info.rows,
    textures,
  };
}

const cache = new Map<string, Promise<BattlerInfo>>();

/** Read a battler from its RPGJS spritesheet (cached per id). */
export function loadBattler(id: string, sheet: BattleSpritesheet, overrides: BattlerHints = {}): Promise<BattlerInfo> {
  if (!cache.has(id)) cache.set(id, load(id, sheet, overrides));
  return cache.get(id)!;
}

async function load(id: string, sheet: BattleSpritesheet, overrides: BattlerHints): Promise<BattlerInfo> {
  const hints: BattlerHints = { ...sheet.battle, ...overrides };
  const anims = battlerAnims(sheet, hints);
  if (!anims.size) throw new Error(`[TurnBattle] Spritesheet "${id}" has no usable texture`);
  const image = await loadImage(sheet.image);
  const columns = sheet.framesWidth;
  const rows = sheet.framesHeight;
  const cell = { width: (sheet.width ?? image.naturalWidth) / columns, height: (sheet.height ?? image.naturalHeight) / rows };
  const idle = anims.get("idle") ?? anims.values().next().value!;
  const bounds = alphaBounds(image, cell, idle.frames[0]);
  const face = hints.face ?? {
    x: (bounds.x + bounds.w / 2) / cell.width,
    y: (bounds.y + Math.min(bounds.h, bounds.w) * 0.32) / cell.height,
    size: (Math.min(bounds.h, bounds.w) * 0.8) / cell.width,
  };
  return { id, sheetId: `turn-battle:${id}`, image: sheet.image, hints, anims, columns, rows, bounds, cell, face };
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

/** Visible part of one cell (opaque pixels), to anchor the sprite and crop the portrait. */
function alphaBounds(img: HTMLImageElement, cell: { width: number; height: number }, at: { x: number; y: number }) {
  const cw = Math.round(cell.width);
  const ch = Math.round(cell.height);
  const fallback = { x: cw * 0.3, y: ch * 0.15, w: cw * 0.4, h: ch * 0.7 };
  try {
    const canvas = document.createElement("canvas");
    canvas.width = cw;
    canvas.height = ch;
    const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
    ctx.drawImage(img, at.x * cell.width, at.y * cell.height, cell.width, cell.height, 0, 0, cw, ch);
    const data = ctx.getImageData(0, 0, cw, ch).data;
    let x0 = cw, y0 = ch, x1 = 0, y1 = 0;
    for (let y = 0; y < ch; y++)
      for (let x = 0; x < cw; x++)
        if (data[(y * cw + x) * 4 + 3] > 40) {
          if (x < x0) x0 = x;
          if (x > x1) x1 = x;
          if (y < y0) y0 = y;
          if (y > y1) y1 = y;
        }
    return x1 > x0 ? { x: x0, y: y0, w: x1 - x0, h: y1 - y0 } : fallback;
  } catch {
    return fallback;
  }
}
