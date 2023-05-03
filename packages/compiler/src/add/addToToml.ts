import * as fs from 'fs';

const rpgTomlPath = 'rpg.toml';

export function addToToml(newModulePath: string) {
    if (fs.existsSync(rpgTomlPath)) {
        const rpgTomlContent = fs.readFileSync(rpgTomlPath, 'utf-8');
        const lines = rpgTomlContent.split('\n');

        let modulesLineIndex = -1;
        for (let i = 0; i < lines.length; i++) {
            if (lines[i].startsWith('modules = [')) {
                modulesLineIndex = i;
                break;
            }
        }

        if (modulesLineIndex !== -1) {
            const newModulesLine = `   '${newModulePath}',`;
            lines.splice(modulesLineIndex + 1, 0, newModulesLine);
            fs.writeFileSync(rpgTomlPath, lines.join('\n'));
        } else {
            console.error('Error: Unable to locate "modules" array in rpg.toml');
        }
    } else {
        console.error('Error: rpg.toml not found');
    }
}