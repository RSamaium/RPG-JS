import type { RpgPlayer } from "@rpgjs/server";

export interface PremiumStatus {
  active: boolean;
  expiresAt: number | null;
  source: "paypal" | "vote" | "admin" | null;
}

export interface PremiumPlayerData {
  premiumExpiresAt: number | null;
  premiumSource: string | null;
}

const XP_MULTIPLIER = 1.5;
const PREMIUM_PRICE_EUR = 10;

const premiumStore = new Map<string, PremiumStatus>();

export function getPremiumStatus(playerId: string): PremiumStatus {
  const data = premiumStore.get(playerId);
  if (!data) return { active: false, expiresAt: null, source: null };
  if (data.expiresAt && data.expiresAt < Date.now()) {
    premiumStore.delete(playerId);
    return { active: false, expiresAt: null, source: null };
  }
  return data;
}

export function activatePremium(
  playerId: string,
  durationMs: number | null,
  source: PremiumStatus["source"]
): PremiumStatus {
  const existing = getPremiumStatus(playerId);
  const baseTime =
    existing.active && existing.expiresAt ? existing.expiresAt : Date.now();
  const expiresAt = durationMs ? baseTime + durationMs : null;

  const status: PremiumStatus = { active: true, expiresAt, source };
  premiumStore.set(playerId, status);
  return status;
}

export function deactivatePremium(playerId: string): void {
  premiumStore.delete(playerId);
}

export function isPremium(playerId: string): boolean {
  return getPremiumStatus(playerId).active;
}

export function getXpMultiplier(playerId: string): number {
  return isPremium(playerId) ? XP_MULTIPLIER : 1.0;
}

export function canUseHousing(playerId: string): boolean {
  return isPremium(playerId);
}

export function canImportTextures(playerId: string): boolean {
  return isPremium(playerId);
}

export function hasGoldenName(playerId: string): boolean {
  return isPremium(playerId);
}

export function addVotePremium(playerId: string): PremiumStatus {
  const twoHoursMs = 2 * 60 * 60 * 1000;
  return activatePremium(playerId, twoHoursMs, "vote");
}

export { PREMIUM_PRICE_EUR, XP_MULTIPLIER };
