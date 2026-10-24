import { Container, GlProgram, Mesh, MeshGeometry, Shader, Texture } from "pixi.js";
import {
  resolveTerrainWaveDirectionVector,
  resolveTerrainWaveRenderStrength,
  type TerrainWaterOverlayData,
  type TerrainWaterRegion,
} from "./terrain-chunk-painter";

/**
 * The water animation on the GPU.
 *
 * Each region of water is one quad with a fragment shader that draws what the CPU version drew with 2D canvases:
 * the surface of the terrain shifted in bands (refraction), a pale glow, all cut by the shape of the water.
 * Only the phase changes from one frame to the next, so a frame costs a few uniforms instead of a canvas redraw.
 */
const VERTEX = /* glsl */ `
in vec2 aPosition;
in vec2 aUV;
out vec2 vUV;
out vec2 vLocal;
uniform mat3 uProjectionMatrix;
uniform mat3 uWorldTransformMatrix;
uniform mat3 uTransformMatrix;
void main() {
  mat3 mvp = uProjectionMatrix * uWorldTransformMatrix * uTransformMatrix;
  gl_Position = vec4((mvp * vec3(aPosition, 1.0)).xy, 0.0, 1.0);
  vUV = aUV;
  vLocal = aPosition;
}
`;

const FRAGMENT = /* glsl */ `
in vec2 vUV;
in vec2 vLocal;
out vec4 finalColor;
uniform sampler2D uSurface;
uniform sampler2D uMask;
uniform vec2 uRegionOrigin;
uniform vec2 uSurfaceSize;
uniform vec2 uCenter;
uniform vec2 uFlow;
uniform vec2 uAngle;
uniform float uPhase;
uniform float uCenterFlow;
uniform float uAcrossAmplitude;
uniform float uFlowAmplitude;
uniform float uRefractionAlpha;
uniform float uGlowAlpha;

const float BAND_HEIGHT = 48.0;

void main() {
  // Pixel in the space of the overlay, then in the space turned to the direction of the flow.
  vec2 p = uRegionOrigin + vLocal;
  vec2 d = p - uCenter;
  float flowY = -uAngle.y * d.x + uAngle.x * d.y;

  // The bands are anchored to the world and drift with the phase; each one is shifted on its own.
  float globalY = flowY + uCenterFlow;
  float drift = mod(uPhase * 12.0, BAND_HEIGHT);
  float bandStart = floor((globalY - drift) / BAND_HEIGHT) * BAND_HEIGHT + drift;
  float acrossOffset = sin(bandStart * 0.075 + uPhase * 2.4) * uAcrossAmplitude;
  float flowOffset = sin(bandStart * 0.035 - uPhase * 1.7) * uFlowAmplitude;
  vec2 across = vec2(uFlow.y, -uFlow.x);
  vec2 offset = across * acrossOffset + uFlow * flowOffset;

  vec2 surfaceUV = (p - offset) / uSurfaceSize;
  bool inside = surfaceUV.x >= 0.0 && surfaceUV.x <= 1.0 && surfaceUV.y >= 0.0 && surfaceUV.y <= 1.0;
  vec4 surface = inside ? texture(uSurface, surfaceUV) : vec4(0.0);

  // The surface is drawn with the refraction alpha, then the glow is screened over the whole region.
  float backdropAlpha = surface.a * uRefractionAlpha;
  vec3 backdrop = surface.a > 0.0 ? surface.rgb / surface.a : vec3(0.0);
  vec3 glow = vec3(180.0, 235.0, 255.0) / 255.0;
  float resultAlpha = uGlowAlpha + backdropAlpha * (1.0 - uGlowAlpha);
  vec3 screened = backdrop + glow - backdrop * glow;
  vec3 color = vec3(0.0);
  if (resultAlpha > 0.0) {
    float share = uGlowAlpha / resultAlpha;
    color = (1.0 - share) * backdrop + share * ((1.0 - backdropAlpha) * glow + backdropAlpha * screened);
  }

  // Only where there is water.
  float shape = texture(uMask, vUV).a;
  finalColor = vec4(color * resultAlpha, resultAlpha) * shape;
}
`;

export interface TerrainWaterGpuOverlay {
  /** Holds one quad per region of water, in the space of the overlay. */
  container: Container;
  /** Moves the waves to the current phase of every region. */
  sync(): void;
  dispose(): void;
}

const nearest = (texture: Texture): Texture => {
  texture.source.scaleMode = "nearest";
  return texture;
};

/**
 * Builds the GPU version of the water of a chunk. Throws where the shader cannot be made (no WebGL):
 * the caller then draws the water on the CPU.
 */
export function createTerrainWaterGpuOverlay(
  water: TerrainWaterOverlayData,
  origin: { x: number; y: number }
): TerrainWaterGpuOverlay {
  const program = GlProgram.from({ vertex: VERTEX, fragment: FRAGMENT, name: "studio-terrain-water" });
  const surfaceTexture = nearest(Texture.from(water.surface));
  const centerX = water.overlayBounds.width * 0.5;
  const centerY = water.overlayBounds.height * 0.5;
  const container = new Container();
  const parts: Array<{
    region: TerrainWaterRegion;
    mesh: Mesh<any, any>;
    uniforms: { uPhase: number };
    texture: Texture;
    geometry: MeshGeometry;
  }> = [];

  for (const region of water.regions) {
    const { x, y, width, height } = region.bounds;
    const angle = ((region.direction - 90) * Math.PI) / 180;
    const flow = resolveTerrainWaveDirectionVector(region.direction);
    const strength = resolveTerrainWaveRenderStrength(region.intensity);
    const maskTexture = nearest(Texture.from(region.mask));
    const geometry = new MeshGeometry({
      positions: new Float32Array([0, 0, width, 0, width, height, 0, height]),
      uvs: new Float32Array([0, 0, 1, 0, 1, 1, 0, 1]),
      indices: new Uint32Array([0, 1, 2, 0, 2, 3]),
    });
    const shader = new Shader({
      glProgram: program,
      resources: {
        uSurface: surfaceTexture.source,
        uMask: maskTexture.source,
        waterUniforms: {
          uRegionOrigin: { value: new Float32Array([x, y]), type: "vec2<f32>" },
          uSurfaceSize: { value: new Float32Array([water.surface.width, water.surface.height]), type: "vec2<f32>" },
          uCenter: { value: new Float32Array([centerX, centerY]), type: "vec2<f32>" },
          uFlow: { value: new Float32Array([flow.x, flow.y]), type: "vec2<f32>" },
          uAngle: { value: new Float32Array([Math.cos(angle), Math.sin(angle)]), type: "vec2<f32>" },
          uPhase: { value: 0, type: "f32" },
          uCenterFlow: { value: (origin.x + centerX) * flow.x + (origin.y + centerY) * flow.y, type: "f32" },
          uAcrossAmplitude: { value: strength.refractionAcrossAmplitude, type: "f32" },
          uFlowAmplitude: { value: strength.refractionFlowAmplitude, type: "f32" },
          uRefractionAlpha: { value: strength.refractionAlpha, type: "f32" },
          uGlowAlpha: { value: strength.glowAlpha, type: "f32" },
        },
      },
    });
    const mesh = new Mesh({ geometry, shader });
    mesh.x = x;
    mesh.y = y;
    container.addChild(mesh);
    parts.push({
      region,
      mesh,
      uniforms: (shader.resources.waterUniforms as { uniforms: { uPhase: number } }).uniforms,
      texture: maskTexture,
      geometry,
    });
  }

  const sync = () => {
    for (const part of parts) part.uniforms.uPhase = part.region.phase + part.region.seed * 4;
  };
  sync();

  return {
    container,
    sync,
    dispose() {
      container.destroy({ children: true });
      for (const part of parts) {
        part.geometry.destroy();
        part.texture.destroy(true);
      }
      surfaceTexture.destroy(true);
    },
  };
}
