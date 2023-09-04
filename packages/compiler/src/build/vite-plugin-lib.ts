import fs from 'fs';
import path from 'path';

export function runtimePlugin(directoryPath: string) {
    return {
        name: 'runtime-plugin',
        writeBundle() {
            const outputPath = path.join(directoryPath, 'rpg.runtime.umd.js'); 
            if (fs.existsSync(outputPath)) {
                const originalCode = fs.readFileSync(outputPath, 'utf-8');
                const modifiedCode = `window.global ||= window;\n${originalCode}`;
                fs.writeFileSync(outputPath, modifiedCode);
            }
        }
    }
}