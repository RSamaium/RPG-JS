type RGB = [number, number, number];

function hexToRGB(hex: string): RGB {
    let r = parseInt(hex.substring(0, 2), 16);
    let g = parseInt(hex.substring(2, 4), 16);
    let b = parseInt(hex.substring(4, 6), 16);
    return [r, g, b];
}

function RGBToHex(rgb: RGB): string {
    let r = rgb[0].toString(16).padStart(2, '0');
    let g = rgb[1].toString(16).padStart(2, '0');
    let b = rgb[2].toString(16).padStart(2, '0');
    return r + g + b;
}

export function transitionColor(startColor: string, endColor: string, steps: number): string[] {
    let startRGB = hexToRGB(startColor.replace('#', ''));
    let endRGB = hexToRGB(endColor.replace('#', ''));
    let deltaRGB = [(endRGB[0] - startRGB[0]) / steps, (endRGB[1] - startRGB[1]) / steps, (endRGB[2] - startRGB[2]) / steps];

    let colors: string[] = [];
    for (let i = 0; i < steps; i++) {
        let color = [startRGB[0] + deltaRGB[0] * i, startRGB[1] + deltaRGB[1] * i, startRGB[2] + deltaRGB[2] * i];
        colors.push(RGBToHex(color as any));
    }
    colors.push(endColor.replace('#', ''));
    return colors;
}