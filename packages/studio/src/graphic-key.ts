export const getGraphicKey = (graphic: any): string | null => {
  if (!graphic) return null;
  if (typeof graphic === "string") return graphic;
  if (typeof graphic === "object") {
    return (
      graphic._id ||
      graphic.mediaId ||
      graphic.id ||
      graphic.graphic ||
      graphic.fileName ||
      null
    );
  }
  return null;
};

type GraphicScale = number | [number, number] | { x: number; y?: number };

const toGraphicScale = (value: unknown): GraphicScale | undefined => {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return value;
  }
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
  }
  if (Array.isArray(value)) {
    const x = toGraphicScale(value[0]);
    const y = toGraphicScale(value[1] ?? value[0]);
    if (typeof x === "number" && typeof y === "number") {
      return [x, y];
    }
  }
  if (value && typeof value === "object") {
    const candidate = value as Record<string, unknown>;
    const x = toGraphicScale(candidate.x);
    const y = toGraphicScale(candidate.y ?? candidate.x);
    if (typeof x === "number" && typeof y === "number") {
      return { x, y };
    }
  }
  return undefined;
};

const getScaleFromSource = (source: unknown): GraphicScale | undefined => {
  const directScale = toGraphicScale(source);
  if (directScale !== undefined) return directScale;
  if (!source || typeof source !== "object") return undefined;
  const candidate = source as Record<string, any>;
  return (
    toGraphicScale(candidate.scale) ??
    toGraphicScale(candidate.params?.scale) ??
    toGraphicScale(candidate.metadata?.scale)
  );
};

export const getGraphicScale = (...sources: unknown[]): GraphicScale | undefined => {
  for (const source of sources) {
    const scale = getScaleFromSource(source);
    if (scale !== undefined) return scale;
  }
  return undefined;
};
