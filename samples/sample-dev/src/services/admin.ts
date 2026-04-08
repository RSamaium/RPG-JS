export interface AdminCredentials {
  email: string;
  password: string;
}

export interface ToplistEntry {
  id: string;
  name: string;
  bannerUrl: string;
  voteUrl: string;
  enabled: boolean;
}

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "";

const activeSessions = new Set<string>();

const toplistEntries: ToplistEntry[] = [];

export function adminLogin(
  email: string,
  password: string
): { success: boolean; token?: string; error?: string } {
  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
    return {
      success: false,
      error: "Admin credentials not configured. Set ADMIN_EMAIL and ADMIN_PASSWORD env vars.",
    };
  }
  if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
    const token = generateToken();
    activeSessions.add(token);
    return { success: true, token };
  }
  return { success: false, error: "Invalid credentials" };
}

export function adminLogout(token: string): void {
  activeSessions.delete(token);
}

export function isValidAdminSession(token: string | undefined): boolean {
  if (!token) return false;
  return activeSessions.has(token);
}

export function getToplistEntries(): ToplistEntry[] {
  return toplistEntries.filter((e) => e.enabled);
}

export function getAllToplistEntries(): ToplistEntry[] {
  return [...toplistEntries];
}

export function addToplistEntry(entry: Omit<ToplistEntry, "id">): ToplistEntry {
  const newEntry: ToplistEntry = {
    ...entry,
    id: generateToken().slice(0, 8),
  };
  toplistEntries.push(newEntry);
  return newEntry;
}

export function updateToplistEntry(
  id: string,
  updates: Partial<Omit<ToplistEntry, "id">>
): ToplistEntry | null {
  const entry = toplistEntries.find((e) => e.id === id);
  if (!entry) return null;
  Object.assign(entry, updates);
  return entry;
}

export function removeToplistEntry(id: string): boolean {
  const idx = toplistEntries.indexOf(
    toplistEntries.find((e) => e.id === id)!
  );
  if (idx === -1) return false;
  toplistEntries.splice(idx, 1);
  return true;
}

function generateToken(): string {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < 32; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}
