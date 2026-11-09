import type { StudioViewportBounds } from "./viewport-culling";

/** An element plays at most this many looping effects at once, unless the map says otherwise. */
export const DEFAULT_MAX_LOOPING_EFFECTS = 24;
/** Pixels around the viewport where a looping effect is alive: it spawns when its element enters it. */
export const VISUAL_EFFECT_SPAWN_MARGIN = 160;
/** Pixels around the viewport an effect already alive stays in: larger than the spawn margin, so nothing flickers at the edge. */
export const VISUAL_EFFECT_KEEP_MARGIN = 320;
/** Particle budget of an effect while the cap is reached, as a share of its own. */
export const CAPPED_PARTICLE_SHARE = 0.5;
/** Particles of an effect that gives no `maxParticles`. */
export const DEFAULT_EFFECT_MAX_PARTICLES = 600;

/** The visual effect of a map element: `id` names it, `effect` is the resolved effect (the payload skills use), `x` and `y` are pixels local to the element. */
export interface ElementVisualEffect {
  id: string;
  x: number;
  y: number;
  effect?: Record<string, unknown>;
}

/** A looping effect of an element, placed on the map. */
export interface ElementVisualEffectCandidate {
  key: string;
  id: string;
  effect?: Record<string, unknown>;
  /** Position on the map, in pixels. */
  x: number;
  y: number;
  /** Depth of the element, so the effect sorts with it. */
  zIndex: number;
}

/** A looping effect that is alive. */
export interface LiveVisualEffect extends ElementVisualEffectCandidate {
  /** Maximum particles of this effect: lowered while the cap is reached. */
  maxParticles: number;
}

const finite = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value);

/**
 * The visual effect of an element as plain data, or null when it has none or it is not valid: it needs an id, and `x` and `y`
 * default to the middle of the element (`width` and `height` are its size).
 */
export function normalizeElementVisualEffect(
  value: unknown,
  size: { width: number; height: number },
): ElementVisualEffect | null {
  if (!value || typeof value !== "object") return null;
  const source = value as Record<string, unknown>;
  const id = typeof source.id === "string" ? source.id.trim() : "";
  if (!id) return null;
  const x = finite(source.x) ? source.x : size.width / 2;
  const y = finite(source.y) ? source.y : size.height / 2;
  const effect = source.effect && typeof source.effect === "object" && !Array.isArray(source.effect)
    ? (source.effect as Record<string, unknown>)
    : undefined;
  return { id, x: Math.round(x), y: Math.round(y), ...(effect ? { effect } : {}) };
}

const within = (bounds: StudioViewportBounds, margin: number, x: number, y: number) =>
  x >= bounds.x - margin && x <= bounds.x + bounds.width + margin && y >= bounds.y - margin && y <= bounds.y + bounds.height + margin;

/**
 * Which looping effects are alive. An effect is alive when its element is near the viewport: it spawns inside `spawnMargin`
 * and, once alive, is destroyed only outside the larger `keepMargin`. No more than `cap` are alive: the ones already alive keep
 * their place, then the nearest to the center of the viewport take what is left. While the cap is reached the effects run with a
 * share of their particles, so the frame time stays flat when more would have been wanted.
 *
 * @param candidates - The looping effects of the map.
 * @param viewport - The viewport in map pixels, or null when it is not known (nothing is alive).
 * @param alive - The keys of the effects alive now.
 */
export function selectLiveVisualEffects(
  candidates: readonly ElementVisualEffectCandidate[],
  viewport: StudioViewportBounds | null,
  alive: ReadonlySet<string> = new Set(),
  options: { cap?: number; spawnMargin?: number; keepMargin?: number } = {},
): { live: LiveVisualEffect[]; capped: boolean } {
  if (!viewport) return { live: [], capped: false };
  const cap = Math.max(0, Math.floor(options.cap ?? DEFAULT_MAX_LOOPING_EFFECTS));
  const spawnMargin = options.spawnMargin ?? VISUAL_EFFECT_SPAWN_MARGIN;
  const keepMargin = options.keepMargin ?? VISUAL_EFFECT_KEEP_MARGIN;
  const centerX = viewport.x + viewport.width / 2;
  const centerY = viewport.y + viewport.height / 2;
  const distance = (c: ElementVisualEffectCandidate) => Math.hypot(c.x - centerX, c.y - centerY);

  const wanted = candidates.filter((c) => within(viewport, alive.has(c.key) ? keepMargin : spawnMargin, c.x, c.y));
  const kept = wanted.filter((c) => alive.has(c.key)).sort((a, b) => distance(a) - distance(b));
  const fresh = wanted.filter((c) => !alive.has(c.key)).sort((a, b) => distance(a) - distance(b));
  const chosen = [...kept, ...fresh].slice(0, cap);
  const capped = wanted.length >= cap && cap > 0;
  const share = capped ? CAPPED_PARTICLE_SHARE : 1;
  const particles = (c: ElementVisualEffectCandidate) => {
    const own = c.effect && finite((c.effect as Record<string, unknown>).maxParticles)
      ? Number((c.effect as Record<string, unknown>).maxParticles)
      : DEFAULT_EFFECT_MAX_PARTICLES;
    return Math.max(1, Math.round(own * share));
  };
  return { live: chosen.map((c) => ({ ...c, maxParticles: particles(c) })), capped };
}
