import type { BattleSpritesheet, BattlerHints, RpgFrame } from "./index";

/**
 * Spritesheet AI → RPGJS spritesheet. The battle plugin only knows RPGJS
 * spritesheets; this adapter turns a Spritesheet AI export (`manifest.json` of
 * the "rpgjs" engine export + its atlas) into one, with the battle hints the
 * manifest makes possible:
 * - timings from `durationsMs` (clamped: generated timings are uneven);
 * - the impact frame read from the phase labels ("strike", "slash"…);
 * - filler poses trimmed from `hurt` / `dead` rows.
 *
 * ```ts
 * import manifest from "../../public/battlers/hero-knight/manifest.json";
 * const knight = fromSpritesheetAi("hero-knight", manifest, { image: "/battlers/hero-knight/atlas.png", facing: "left" });
 * defineModule<RpgClient>({ spritesheets: [knight] });
 * ```
 */

export interface SpritesheetAiManifest {
  columns: number;
  rows: number;
  cell: { width: number; height: number };
  animations: {
    id: string;
    row: number;
    frames: number;
    playback?: string;
    durationsMs?: number[];
    sequence?: number[];
    manual?: boolean;
    phaseLabels?: string[];
  }[];
}

export interface SpritesheetAiOptions extends Omit<BattlerHints, "anims" | "loop"> {
  /** Atlas URL. */
  image: string;
  /** Frame indexes to keep per animation (e.g. skip generation artefacts). */
  frames?: Record<string, number[]>;
}

const TICK_MS = 1000 / 60;
const IMPACT = /strik|slash|release|launch|thrust|swing|hit\b|fire|shoot|impact/i;

/** Index (in `frames`) of the frame where the hit lands, read from phase labels. */
export function inferImpact(frames: number[], labels: string[]): number {
  const found = frames.findIndex((i) => IMPACT.test(labels[i] ?? ""));
  return found >= 0 ? found : Math.floor(frames.length * 0.45);
}

/** Default frame selection: generated hurt/dead rows start with filler poses. */
export function autoFrames(id: string, labels: string[], all: number[]): number[] {
  if (id === "hurt") {
    const start = labels.findIndex((l) => /impact|recoil/i.test(l));
    return all.slice(Math.max(0, start), Math.max(start + 3, 6));
  }
  if (id === "dead") {
    const hit = labels.findIndex((l) => /impact|collaps/i.test(l));
    return hit > 0 ? all.slice(hit - 1) : all;
  }
  return all;
}

/** Generated timings are uneven: keep the rhythm snappy and readable. */
export function clampDuration(ms: number, id: string) {
  if (id === "idle") return Math.min(160, Math.max(90, ms));
  return Math.min(id === "dead" ? 220 : 150, Math.max(45, ms));
}

export function fromSpritesheetAi(id: string, manifest: SpritesheetAiManifest, o: SpritesheetAiOptions): BattleSpritesheet {
  const textures: BattleSpritesheet["textures"] = {};
  const impact: Record<string, number | undefined> = { ...o.impact };
  const loop: string[] = [];
  for (const a of manifest.animations) {
    const labels = a.phaseLabels ?? [];
    const all = Array.from({ length: a.frames }, (_, i) => i);
    const frames = o.frames?.[a.id] ?? a.sequence ?? autoFrames(a.id, labels, all);
    let time = 0;
    const seq: RpgFrame[] = frames.map((i) => {
      const frame = { time: Math.round(time), frameX: i, frameY: a.row };
      time += (a.manual ? (a.durationsMs?.[i] ?? 100) : clampDuration(a.durationsMs?.[i] ?? 100, a.id)) / TICK_MS;
      return frame;
    });
    seq.push({ time: Math.round(time) });
    textures[a.id] = { animations: [seq] };
    impact[a.id] ??= inferImpact(frames, labels);
    if (a.manual ? a.playback === "loop" : a.id === "idle" || a.playback === "loop") loop.push(a.id);
  }
  return {
    id,
    image: o.image,
    width: manifest.columns * manifest.cell.width,
    height: manifest.rows * manifest.cell.height,
    framesWidth: manifest.columns,
    framesHeight: manifest.rows,
    textures,
    battle: { facing: o.facing, scale: o.scale, face: o.face, impact, loop },
  };
}
