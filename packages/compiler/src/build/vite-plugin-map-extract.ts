import fs from 'fs';
import path from 'path';
import { parseStringPromise } from 'xml2js';
import { globFiles } from './utils.js';

// Process a TSX file and copy its image to the output directory
async function processTsxFile(tsxFile: string, output: string) {
    if (tsxFile.includes('gui')) return

    const content = fs.readFileSync(tsxFile).toString()
    const result = await parseStringPromise(content);
    const imagePath = path.join(path.dirname(tsxFile), result.tileset.image[0].$.source);

    copyImageToOutput(imagePath, output);
}

// Process a TMX file and copy all its images to the output directory
async function processTmxFile(tmxFile: string, output: string) {
    const content = fs.readFileSync(tmxFile).toString()
    const result = await parseStringPromise(content);

    // Copy an image from a given source path to the output directory
    const processImageSource = (source: string) => {
        const imagePath = path.join(path.dirname(tmxFile), source);
        copyImageToOutput(imagePath, output);
    };

    // Process image layers
    if (result.map.imagelayer) {
        for (const imagelayer of result.map.imagelayer) {
            processImageSource(imagelayer.image[0].$.source);
        }
    }

    // Process object groups with image properties
    if (result.map.objectgroup) {
        for (const objectgroup of result.map.objectgroup) {
            if (objectgroup.properties && objectgroup.properties[0].property) {
                for (const property of objectgroup.properties[0].property) {
                    if (property.$.name === 'image' && property.$.type === 'file') {
                        processImageSource(property.$.value);
                    }
                }
            }
        }
    }
}

// Copy an image file to the output directory
function copyImageToOutput(imagePath: string, output: string) {
    const imageName = path.basename(imagePath);
    const destPath = path.join(output, 'assets', imageName);

    if (!fs.existsSync(path.dirname(destPath))) {
        fs.mkdirSync(path.dirname(destPath), { recursive: true });
    }

    try {
        fs.copyFileSync(imagePath, destPath);
    }
    catch (err) {
        // TODO  - display module
        console.error(`Error copying image ${imagePath} to ${destPath}: ${err}`);
        throw err
    }
}

// Export the map extract plugin
export function mapExtractPlugin(output: string = 'client') {
    return {
        name: 'map-extract',
        async buildStart() {
            for (const tsxFile of globFiles('tsx')) {
                await processTsxFile(tsxFile, output);
            }
            for (const tmxFile of globFiles('tmx')) {
                await processTmxFile(tmxFile, output);
            }
        },
    };
}
