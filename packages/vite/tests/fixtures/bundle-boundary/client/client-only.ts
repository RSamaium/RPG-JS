export const clientCanary = "RPGJS_CLIENT_CANARY_DOCUMENT";

export function readBrowserSide(): string {
  return typeof document === "undefined" ? "no-document" : document.title;
}
