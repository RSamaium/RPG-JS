import fs from 'fs';
import path from 'path';

const FILE = path.resolve(process.cwd(), 'world_data', 'state.json');

export function saveState(state: any) {
    try {
        const dir = path.dirname(FILE);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(FILE, JSON.stringify(state, null, 2));
    } catch {
        // Ignore write errors so missing dirs don't crash the server
    }
}

export function loadState() {
    try {
        if (!fs.existsSync(FILE)) return null;
        return JSON.parse(fs.readFileSync(FILE, 'utf-8'));
    } catch {
        return null;
    }
}
