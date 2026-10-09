import { getOrCreateI18nService } from "@rpgjs/common";
import type { RpgPlayer } from "../Player/Player";

/** Validate untrusted locale input against game catalogues, for this player only. */
export function applyPlayerLocale(player: RpgPlayer, value: unknown): boolean {
  if (!value || typeof value !== "object") return false;
  const locale = (value as { locale?: unknown }).locale;
  const service = getOrCreateI18nService(player.context);
  if (typeof locale !== "string" || (!service.getAvailableLocales().includes(locale) && locale !== service.defaultLocale)) return false;
  if (player.conn) player.conn.setState({ ...(player.conn.state ?? {}), rpgjsLocale: locale });
  player.setLocale(locale);
  return true;
}

/** Apply connection preference before gameplay hooks, including restored sessions. */
export function applyConnectionLocale(player: RpgPlayer, ctx?: { request?: { url: string } }): void {
  if (!ctx?.request?.url) return;
  const locale = new URL(ctx.request.url, "http://localhost").searchParams.get("locale");
  applyPlayerLocale(player, { locale });
}
