const isBrowser = typeof window !== "undefined";

let _fs: any = null;
let _path: any = null;
let _file = "";

async function ensureNodeModules() {
  if (isBrowser || _fs) return;
  try {
    _fs = await import("fs");
    _path = await import("path");
    _file = _path.resolve(process.cwd(), "world_data", "state.json");
  } catch {
    // Not available in browser
  }
}

const pendingInit = ensureNodeModules();

let memoryState: any = null;

export function saveState(state: any) {
  memoryState = state;
  if (isBrowser || !_fs) return;
  try {
    const dir = _path.dirname(_file);
    if (!_fs.existsSync(dir)) {
      _fs.mkdirSync(dir, { recursive: true });
    }
    _fs.writeFileSync(_file, JSON.stringify(state, null, 2));
  } catch {
    // Ignore write errors
  }
}

export function loadState() {
  if (memoryState) return memoryState;
  if (isBrowser || !_fs) return null;
  try {
    if (!_fs.existsSync(_file)) return null;
    memoryState = JSON.parse(_fs.readFileSync(_file, "utf-8"));
    return memoryState;
  } catch {
    return null;
  }
}
