export interface TerrainCompositeLayer {
  pixels: Uint8ClampedArray;
  mask: Uint8ClampedArray;
}

export function composeTerrainLayerPixels(width: number, height: number, layers: TerrainCompositeLayer[]): Uint8ClampedArray {
  const output = new Uint8ClampedArray(Math.max(0, Math.floor(width) * Math.floor(height)) * 4);
  for (let offset = 0; offset < output.length; offset += 4) {
    let maskTotal = 0;
    let alphaTotal = 0;
    let red = 0;
    let green = 0;
    let blue = 0;
    for (const layer of layers) {
      const maskAlpha = layer.mask[offset + 3] / 255;
      if (maskAlpha <= 0) continue;
      const weight = maskAlpha * (layer.pixels[offset + 3] / 255);
      maskTotal += maskAlpha;
      if (weight <= 0) continue;
      alphaTotal += weight;
      red += layer.pixels[offset] * weight;
      green += layer.pixels[offset + 1] * weight;
      blue += layer.pixels[offset + 2] * weight;
    }
    if (maskTotal <= 0 || alphaTotal <= 0) continue;
    output[offset] = clampByte(red / alphaTotal);
    output[offset + 1] = clampByte(green / alphaTotal);
    output[offset + 2] = clampByte(blue / alphaTotal);
    output[offset + 3] = clampByte(alphaTotal / maskTotal * 255);
  }
  return output;
}

export const composeTerrainLayers = composeTerrainLayerPixels;

function clampByte(value: number): number {
  return Math.max(0, Math.min(255, Math.round(value)));
}
