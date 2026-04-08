const isBrowser = typeof window !== "undefined";

let _fs: any = null;
let _path: any = null;
let _file = "";

async function ensureNodeModules() {
  if (isBrowser || _fs) return;
  try {
    _fs = await import("fs");
    _path = await import("path");
    _file = _path.resolve(process.cwd(), "world_data", "events.log");
  } catch {
    // Not available in browser
  }
}

ensureNodeModules();

const memoryLog: any[] = [];

export function logEvent(event: any) {
  const entry = { ...event, timestamp: Date.now() };
  memoryLog.push(entry);
  if (memoryLog.length > 1000) memoryLog.shift();

  if (isBrowser || !_fs) return;
  try {
    const dir = _path.dirname(_file);
    if (!_fs.existsSync(dir)) {
      _fs.mkdirSync(dir, { recursive: true });
    }
    _fs.appendFileSync(_file, JSON.stringify(entry) + "\n");
  } catch {
    // Ignore write errors
  }
}
