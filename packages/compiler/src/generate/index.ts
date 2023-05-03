import * as fs from 'fs';
import * as path from 'path';
import { addToToml } from '../add/addToToml.js';

/**
 * 1. Create new directory (example: my-system) with
 *      - config.json: content is { "server": {}, "client": {}, "*": {} }
 * 2. Add to rpg.toml in current project.
 *      modules = [
            './main',
            '@rpgjs/default-gui',
            './my-system'
        ]
 * @param type module
 * @param directory 
 */
export function generate(type: string, directory: string): void {
    const configJsonContent = JSON.stringify({ server: {}, client: {}, "*": {} }, null, 2);

    // Create new directory
    const newDirPath = directory;
    if (!fs.existsSync(newDirPath)) {
        fs.mkdirSync(newDirPath, { recursive: true });
    }

    // Create config.json file
    const configJsonPath = path.join(newDirPath, 'config.json');
    fs.writeFileSync(configJsonPath, configJsonContent);

    // Add new module to rpg.toml
    addToToml(`./${directory}`)
}
