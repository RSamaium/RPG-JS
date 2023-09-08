import fs from 'fs';
import path from 'path';

export function runtimePlugin(_outputPath, vite) {
    return {
        name: 'runtime-plugin',
        writeBundle() {
            const outputPath = path.join(_outputPath, 
                (vite?.build?.lib?.fileName ?? 'rpg.runtime') + '.' +
                (vite?.build?.rollupOptions?.output?.format ?? 'umd') +
                '.js'
            )
            if (fs.existsSync(outputPath)) {
                const originalCode = fs.readFileSync(outputPath, 'utf-8');
                const modifiedCode = `window.global ||= window;\n${originalCode}`;
                fs.writeFileSync(outputPath, modifiedCode);
            }
        }
    }
}