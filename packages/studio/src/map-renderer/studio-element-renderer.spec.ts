import { describe, expect, it } from "vitest";
import {
  buildStudioElementSpriteParts,
  resolveStudioElementLightSpotOverlay,
  resolveStudioElementMetrics,
  resolveStudioElementShadowCaster,
  StudioElementRenderer,
} from "./studio-element-renderer";
import {
  isTerrainWaveAnimated,
  resolveCanvasOffsetDrawRegion,
  resolveTerrainHoleFillGeometry,
  resolveTerrainHoleWaveDescriptors,
  resolveTerrainHoleWaveOptions,
  resolveStudioTerrainWallShadowStyle,
  resolveTerrainTextureRepeatLocal,
  resolveTerrainWaveDirectionVector,
  resolveTerrainWaveHighlightColor,
  resolveTerrainWaveRenderStrength,
  resolveWaterMaskChunkIntersection,
} from "./terrain-renderer/terrain-chunk-renderer";

const createElement = (overrides: Record<string, any> = {}) => ({
  id: "tree",
  rect: [0, 0, 48, 48],
  drawIn: [96, 144, 48, 48],
  hitbox: { x: 12, y: 30, width: 24, height: 14 },
  zIndexOffset: 0,
  hasShadow: true,
  ...overrides,
});

const createTerrainData = (overrides: Record<string, any> = {}) => ({
  widthTiles: 10,
  heightTiles: 8,
  tileSize: 48,
  width: 480,
  height: 384,
  asset: null,
  sourceTexture: "",
  terrainControl: null,
  terrainGrid: [],
  morphologyFeatures: [],
  waterAnimation: { enabled: false, speed: 1, intensity: 0.45, direction: 90 },
  version: "terrain-v1",
  ...overrides,
});

describe("studio element renderer helpers", () => {
  const createMorphologyMask = (width: number, height: number, filled = true) => {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const alpha = filled ? 255 : 0;
    const data = new Uint8ClampedArray(width * height * 4);
    for (let index = 3; index < data.length; index += 4) data[index] = alpha;
    const context = canvas.getContext("2d")!;
    context.getImageData = () => ({ data } as ImageData);
    return { canvas, bounds: { x: 0, y: 0, width, height } };
  };

  it("resolves the projected water level shared by hole fills and their animation mask", () => {
    const geometry = resolveTerrainHoleFillGeometry(
      createMorphologyMask(100, 80),
      { id: "pond", kind: "hole", params: { fillHeight: 50 }, strokes: [] },
      60
    );

    expect(geometry).toEqual({ level: 0.5, dropY: 23, inset: 6 });
  });

  it("does not create animated water geometry for empty or unfilled holes", () => {
    const feature = { id: "pond", kind: "hole" as const, params: { fillHeight: 0 }, strokes: [] };

    expect(resolveTerrainHoleFillGeometry(createMorphologyMask(100, 80), feature, 60)).toBeNull();
    expect(resolveTerrainHoleFillGeometry(
      createMorphologyMask(100, 80, false),
      { ...feature, params: { fillHeight: 100 } },
      60
    )).toBeNull();
  });

  it("inherits wave options per hole and clamps explicit overrides", () => {
    const fallback = { enabled: false, speed: 1.5, intensity: 0.4, direction: 135 };
    const inherited = { id: "pond-a", kind: "hole" as const, params: {}, strokes: [] };
    const overridden = {
      id: "pond-b",
      kind: "hole" as const,
      params: { waveSpeed: 9, waveIntensity: 0, waveDirection: -90 },
      strokes: [],
    };

    expect(resolveTerrainHoleWaveOptions(inherited, fallback)).toEqual({
      speed: 1.5,
      intensity: 0.4,
      direction: 135,
    });
    expect(resolveTerrainHoleWaveOptions(overridden, fallback)).toEqual({
      speed: 4,
      intensity: 0,
      direction: 270,
    });
  });

  it("keeps independent descriptors for animated and static filled holes", () => {
    const descriptors = resolveTerrainHoleWaveDescriptors(
      [
        {
          id: "east-flow",
          kind: "hole",
          params: { fillHeight: 60, waveSpeed: 1, waveIntensity: 0.8, waveDirection: 0 },
          strokes: [],
        },
        {
          id: "static-west",
          kind: "hole",
          params: { fillHeight: 80, waveSpeed: 3, waveIntensity: 0, waveDirection: 180 },
          strokes: [],
        },
        { id: "empty", kind: "hole", params: { fillHeight: 0 }, strokes: [] },
        { id: "wall", kind: "wall", params: { fillHeight: 100 }, strokes: [] },
      ],
      { enabled: false, speed: 1.5, intensity: 0.4, direction: 90 }
    );

    expect(descriptors.map(({ feature, options }) => ({ id: feature.id, ...options }))).toEqual([
      { id: "east-flow", speed: 1, intensity: 0.8, direction: 0 },
      { id: "static-west", speed: 3, intensity: 0, direction: 180 },
    ]);
    expect(descriptors.map(({ options }) => isTerrainWaveAnimated(options))).toEqual([true, false]);
  });

  it("maps cardinal wave directions to screen-space vectors", () => {
    expect(resolveTerrainWaveDirectionVector(0)).toEqual({ x: 1, y: 0 });
    expect(resolveTerrainWaveDirectionVector(90)).toEqual({ x: 0, y: 1 });
    expect(resolveTerrainWaveDirectionVector(180)).toEqual({ x: -1, y: 0 });
    expect(resolveTerrainWaveDirectionVector(270)).toEqual({ x: 0, y: -1 });
  });

  it("brightens the local liquid color without imposing a blue tint", () => {
    const highlight = resolveTerrainWaveHighlightColor({ r: 210, g: 30, b: 20, a: 255 });

    expect(highlight).toEqual({ r: 255, g: 41, b: 27, a: 255 });
    expect(highlight.r).toBeGreaterThan(highlight.g);
    expect(highlight.g).toBeGreaterThan(highlight.b);
  });

  it("scales refraction and highlights continuously from zero intensity", () => {
    expect(resolveTerrainWaveRenderStrength(0)).toMatchObject({
      refractionAlpha: 0,
      refractionAcrossAmplitude: 0,
      refractionFlowAmplitude: 0,
      glowAlpha: 0,
      waveAlpha: 0,
    });

    const subtle = resolveTerrainWaveRenderStrength(0.001);
    expect(subtle.refractionAlpha).toBeLessThan(0.01);
    expect(subtle.refractionAcrossAmplitude).toBeLessThan(0.01);
    expect(subtle.waveAlpha).toBeLessThan(0.01);
  });

  it("crops a filled-hole mask to the current chunk without losing alignment", () => {
    expect(resolveWaterMaskChunkIntersection(
      { x: 700, y: 40, width: 140, height: 120 },
      { x: 20, y: 10, width: 100, height: 80 },
      { x: 768, y: 0, width: 768, height: 768 }
    )).toEqual({
      bounds: { x: 0, y: 50, width: 52, height: 80 },
      sourceX: 68,
      sourceY: 10,
    });
  });

  it("crops an offset refraction draw to the affected band", () => {
    expect(resolveCanvasOffsetDrawRegion(
      768,
      768,
      768,
      768,
      3,
      -2,
      { x: 90, y: 120, width: 580, height: 9 }
    )).toEqual({
      sourceX: 87,
      sourceY: 122,
      destinationX: 90,
      destinationY: 120,
      width: 580,
      height: 9,
    });
  });

  it("returns no refraction draw when the shifted source misses the clipped band", () => {
    expect(resolveCanvasOffsetDrawRegion(
      64,
      64,
      768,
      768,
      700,
      700,
      { x: 90, y: 120, width: 580, height: 9 }
    )).toBeNull();
  });

  it("repeats terrain texture coordinates without mirroring adjacent tiles", () => {
    expect(resolveTerrainTextureRepeatLocal(0, 48)).toBe(0);
    expect(resolveTerrainTextureRepeatLocal(24, 48)).toBe(0.5);
    expect(resolveTerrainTextureRepeatLocal(48, 48)).toBe(0);
    expect(resolveTerrainTextureRepeatLocal(72, 48)).toBe(0.5);
  });

  it("creates one fallback sprite part when no draw rule is configured", () => {
    const parts = buildStudioElementSpriteParts(createElement());

    expect(parts).toEqual([
      {
        key: "default",
        x: 96,
        y: 144,
        width: 48,
        height: 48,
        sourceRect: { x: 0, y: 0, width: 48, height: 48 },
      },
    ]);
  });

  it("repeats a source rect horizontally for repeat-axis rules", () => {
    const parts = buildStudioElementSpriteParts(
      createElement({
        rect: [0, 0, 16, 16],
        drawIn: [0, 0, 40, 16],
        drawRule: {
          type: "repeat-axis",
          axis: "x",
          rects: {
            body: [0, 0, 16, 16],
          },
        },
      })
    );

    expect(parts).toHaveLength(3);
    expect(parts.map((part) => part.width)).toEqual([16, 16, 8]);
    expect(parts[2].sourceRect.width).toBe(8);
  });

  it("repeats along the resized axis instead of scaling repeat-axis segments", () => {
    const parts = buildStudioElementSpriteParts(
      createElement({
        rect: [0, 0, 16, 16],
        drawIn: [0, 0, 16, 16],
        scale: { x: 40 / 16, y: 1 },
        drawRule: {
          type: "repeat-axis",
          axis: "x",
          rects: {
            body: [0, 0, 16, 16],
          },
        },
      })
    );

    expect(parts).toHaveLength(3);
    expect(parts.map((part) => part.width)).toEqual([16, 16, 8]);
    expect(parts[2].sourceRect.width).toBe(8);
  });

  it("keeps edge-repeat caps unscaled and repeats the middle across the target width", () => {
    const parts = buildStudioElementSpriteParts(
      createElement({
        rect: [201, 693, 92, 101],
        drawIn: [732, 792, 92, 101],
        scale: { x: 384 / 92, y: 1 },
        drawRule: {
          type: "edge-repeat",
          axis: "x",
          rects: {
            start: [0, 0, 19, 101],
            middle: [19, 0, 26, 101],
            end: [45, 0, 47, 101],
          },
        },
      })
    );

    expect(parts).toHaveLength(15);
    expect(parts[0]).toMatchObject({ x: 732, y: 792, width: 19, height: 101 });
    expect(parts[parts.length - 1]).toMatchObject({ x: 1069, y: 792, width: 47, height: 101 });
    expect(parts.slice(1, -1).map((part) => part.width)).toEqual([
      26, 26, 26, 26, 26, 26, 26, 26, 26, 26, 26, 26, 6,
    ]);
    expect(parts[1].sourceRect).toMatchObject({ x: 220, y: 693, width: 26, height: 101 });
    expect(parts[13].sourceRect).toMatchObject({ x: 220, y: 693, width: 6, height: 101 });
  });

  it("compresses edge-repeat segments when the target is smaller than fixed edges", () => {
    const parts = buildStudioElementSpriteParts(
      createElement({
        rect: [0, 0, 30, 10],
        drawIn: [0, 0, 20, 10],
        drawRule: {
          type: "edge-repeat",
          axis: "x",
          rects: {
            start: [0, 0, 15, 10],
            middle: [15, 0, 1, 10],
            end: [16, 0, 14, 10],
          },
        },
      })
    );

    expect(parts).toHaveLength(2);
    expect(parts[0].width + parts[1].width).toBe(20);
    expect(parts[0].sourceRect.width).toBeLessThan(15);
    expect(parts[1].sourceRect.width).toBeLessThanOrEqual(14);
  });

  it("creates the expected frame-9slice segments", () => {
    const parts = buildStudioElementSpriteParts(
      createElement({
        rect: [0, 0, 30, 30],
        drawIn: [0, 0, 50, 50],
        drawRule: {
          type: "frame-9slice",
          rects: {
            cornerTL: [0, 0, 10, 10],
            cornerTR: [20, 0, 10, 10],
            cornerBL: [0, 20, 10, 10],
            cornerBR: [20, 20, 10, 10],
            edgeT: [10, 0, 10, 10],
            edgeB: [10, 20, 10, 10],
            edgeL: [0, 10, 10, 10],
            edgeR: [20, 10, 10, 10],
            center: [10, 10, 10, 10],
          },
        },
      })
    );

    expect(parts.length).toBeGreaterThanOrEqual(9);
    expect(parts.some((part) => part.x === 10 && part.y === 10)).toBe(true);
  });

  it("uses the hitbox bottom as the sortable z index when a hitbox exists", () => {
    const metrics = resolveStudioElementMetrics(
      createElement({
        drawIn: [10, 20, 96, 96],
        rect: [0, 0, 48, 48],
        hitbox: { x: 8, y: 20, width: 24, height: 12 },
        zIndexOffset: 3,
      })
    );

    expect(metrics.resolvedZIndex).toBe(87);
  });

  it("clamps oversized hitboxes to the rendered element bounds", () => {
    const metrics = resolveStudioElementMetrics(
      createElement({
        drawIn: [10, 20, 96, 96],
        rect: [0, 0, 48, 48],
        hitbox: { x: 0, y: 0, width: 48, height: 80 },
      })
    );

    expect(metrics.hitboxHeight).toBe(48);
    expect(metrics.resolvedZIndex).toBe(116);
  });

  it("respects the shared shadow budget", () => {
    const budget = { remaining: 1 };
    const options = { shadowBudget: budget, lighting: { sun: { intensity: 0.95 } } };
    const first = resolveStudioElementShadowCaster(createElement(), undefined, options);
    const second = resolveStudioElementShadowCaster(createElement(), undefined, options);

    expect(first).not.toBeNull();
    expect(second).toBeNull();
    expect(budget.remaining).toBe(0);
  });

  it("enables element shadow casters from an active map sun", () => {
    const caster = resolveStudioElementShadowCaster(createElement(), undefined, {
      sceneMap: {
        lighting: () => ({ sun: { intensity: 0.95 } }),
      },
    });

    expect(caster?.enabled).toBe(true);
  });

  it("uses projected RPG-style shadow tuning for studio elements", () => {
    const caster = resolveStudioElementShadowCaster(
      createElement({
        drawIn: [96, 144, 48, 48],
        hitbox: { x: 12, y: 30, width: 24, height: 14 },
      }),
      undefined,
      {
        lighting: { sun: { intensity: 0.95 } },
      }
    );

    expect(caster).not.toBeNull();
    if (!caster) throw new Error("Expected element shadow style");
    expect(caster.height).toBeGreaterThan(50);
    expect(caster.alpha).toBeGreaterThan(0.37);
    expect(caster.alpha).toBeLessThan(0.48);
    expect(caster.length).toBeGreaterThan(40);
    expect(caster.length).toBeLessThan(55);
    expect(caster.widthScale).toBeLessThan(0.6);
    expect(caster.contactWidthScale).toBeLessThan(0.9);
    expect(caster.contactAlpha).toBeGreaterThan(0.8);
    expect(caster.contactAlpha).toBeGreaterThan(caster.alpha);
    expect(caster.direction.x).toBeGreaterThan(0);
    expect(caster.direction.y).toBeGreaterThan(0);
    expect(caster.contactY).toBe(44);
  });

  it("keeps the Studio element shadow angle locked to the active sun even near light spots", () => {
    const caster = resolveStudioElementShadowCaster(
      createElement({
        drawIn: [96, 144, 48, 48],
        hitbox: { x: 12, y: 30, width: 24, height: 14 },
      }),
      undefined,
      {
        lighting: {
          sun: { x: -0.45, y: -1, intensity: 0.95 },
          spots: [{ x: 200, y: 110, radius: 240, intensity: 2 }],
        },
      }
    );

    expect(caster).not.toBeNull();
    if (!caster) throw new Error("Expected element shadow style");
    expect(caster.direction.x).toBeCloseTo(0.4104, 3);
    expect(caster.direction.y).toBeCloseTo(0.9119, 3);
  });

  it("creates automatic element shadow casters from an active sun even when the element disabled manual shadows", () => {
    const caster = resolveStudioElementShadowCaster(
      createElement({ hasShadow: false }),
      undefined,
      {
        lighting: { sun: { intensity: 0.95 } },
      }
    );

    expect(caster).not.toBeNull();
    expect(caster?.enabled).toBe(true);
  });

  it("attaches Studio element shadows as a projected silhouette sprite instead of a shadow caster proxy", async () => {
    const renderer = new StudioElementRenderer();
    const [container] = await renderer.renderElements(
      [createElement({ image: "" })],
      { lighting: { sun: { intensity: 0.95 } } }
    );

    const shadow = container.children.find((child: any) => child.label === "StudioElement:tree:shape-shadow") as any;

    expect((container as any).shadowCaster).toBeUndefined();
    expect(shadow).toBeTruthy();
    expect(shadow.shadowCaster).toBeUndefined();
    expect(shadow.__studioShapeShadow?.contactY).toBe(44);
    expect(shadow.__studioShapeShadow?.contactAlpha).toBeGreaterThan(0.8);
    expect(shadow.__studioShapeShadow?.length).toBeGreaterThan(40);
    expect(shadow.__studioShapeShadow?.visualContactWidth).toBeLessThan(24);
    expect(shadow.__studioShapeShadow?.contactOverlap).toBeGreaterThan(2);
    expect(shadow.__studioShapeShadow?.footprintHeight).toBeGreaterThanOrEqual(3);
    expect(shadow.zIndex).toBeLessThan(0);

    renderer.destroy();
  });

  it("does not attach Studio element collision debug graphics by default", async () => {
    const renderer = new StudioElementRenderer();
    const [container] = await renderer.renderElements([createElement({ image: "" })]);

    const debug = container.children.find((child: any) => String(child.label ?? "").includes("CollisionDebug"));

    expect(debug).toBeUndefined();

    renderer.destroy();
  });

  it("attaches Studio element collision debug graphics when enabled", async () => {
    const renderer = new StudioElementRenderer();
    const [container] = await renderer.renderElements([createElement({ image: "" })], {
      debugCollisions: true,
    });

    const debug = container.children.find((child: any) => child.label === "StudioElement:tree:CollisionDebug") as any;

    expect(debug).toBeTruthy();
    expect(debug.zIndex).toBeGreaterThan(1000000);

    renderer.destroy();
  });

  it("does not attach Studio element collision debug graphics for disabled hitboxes", async () => {
    const renderer = new StudioElementRenderer();
    const [container] = await renderer.renderElements(
      [createElement({ image: "", hitbox: { type: "none", x: 12, y: 30, width: 24, height: 14 } })],
      { debugCollisions: true }
    );

    const debug = container.children.find((child: any) => String(child.label ?? "").includes("CollisionDebug"));

    expect(debug).toBeUndefined();

    renderer.destroy();
  });

  it("anchors the projected silhouette on the hitbox contact center", async () => {
    const renderer = new StudioElementRenderer();
    const [container] = await renderer.renderElements(
      [
        createElement({
          image: "",
          hitbox: { x: 4, y: 30, width: 10, height: 14 },
        }),
      ],
      { lighting: { sun: { intensity: 0.95 } } }
    );

    const shadow = container.children.find((child: any) => child.label === "StudioElement:tree:shape-shadow") as any;

    expect(shadow).toBeTruthy();
    expect(shadow.__studioShapeShadow?.contactX).toBe(9);
    expect(shadow.__studioShapeShadow?.projectedContactX).toBeCloseTo(9, 4);

    renderer.destroy();
  });

  it("does not create element shadow casters without manual shadow or automatic sun shadows", () => {
    const caster = resolveStudioElementShadowCaster(createElement({ hasShadow: false }));

    expect(caster).toBeNull();
  });

  it("keeps explicit shadow disable as an opt-out for sun-driven element shadows", () => {
    const caster = resolveStudioElementShadowCaster(createElement({ hasShadow: false }), undefined, {
      lighting: { sun: { intensity: 0.95 }, shadows: { enabled: false } },
    });

    expect(caster).toBeNull();
  });

  it("resolves a visible light spot overlay from element lightSpot data", () => {
    const overlay = resolveStudioElementLightSpotOverlay(
      createElement({
        drawIn: [100, 200, 96, 96],
        rect: [0, 0, 48, 48],
        lightSpot: {
          enabled: true,
          x: 24,
          y: 12,
          radius: 40,
          intensity: 80,
          style: "soft",
        },
      })
    );

    expect(overlay.enabled).toBe(true);
    expect(overlay.x).toBe(148);
    expect(overlay.y).toBe(224);
    expect(overlay.radius).toBe(80);
    expect(overlay.renderRadius).toBe(132);
    expect(overlay.intensity).toBe(0.8);
    expect(overlay.style).toBe("soft");
  });

  it("resolves static wall shadow style from an active sun", () => {
    const style = resolveStudioTerrainWallShadowStyle(
      createTerrainData(),
      {
        sun: { intensity: 0.95 },
      }
    );

    expect(style).not.toBeNull();
    expect(style?.offsetX).toBeGreaterThan(0);
    expect(style?.offsetY).toBeGreaterThan(0);
    expect(style?.alpha).toBeGreaterThan(0.3);
  });

  it("keeps wall shadow projection independent from sun distance", () => {
    const near = resolveStudioTerrainWallShadowStyle(createTerrainData(), {
      sun: { x: -10, y: -12, z: 120, intensity: 0.95 },
    });
    const far = resolveStudioTerrainWallShadowStyle(createTerrainData(), {
      sun: { x: -9999, y: -9999, z: 1200, intensity: 0.95 },
    });

    expect(near).not.toBeNull();
    expect(far).not.toBeNull();
    expect(near?.offsetX).toBe(far?.offsetX);
    expect(near?.offsetY).toBe(far?.offsetY);
    expect(near?.blur).toBe(far?.blur);
  });

  it("does not resolve wall shadow style when sun shadows are disabled", () => {
    const style = resolveStudioTerrainWallShadowStyle(
      createTerrainData(),
      {
        sun: { intensity: 0.95 },
        shadows: { enabled: false },
      }
    );

    expect(style).toBeNull();
  });
});
