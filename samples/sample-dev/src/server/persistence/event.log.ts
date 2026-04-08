import fs from 'fs';
import path from 'path';

const LOG_FILE = path.resolve(process.cwd(), 'world_data', 'events.log');

export function logEvent(event: any) {
    try {
        const dir = path.dirname(LOG_FILE);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        fs.appendFileSync(LOG_FILE, JSON.stringify(event) + '\n');
    } catch {
        // Ignore append errors so missing dirs don't crash the server
    }
}
