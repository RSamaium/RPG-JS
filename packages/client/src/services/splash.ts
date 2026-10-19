/**
 * Startup splash: an optional `#rpg-splash` element in the page (see the `rpg-ui-splash`
 * classes of `@rpgjs/ui-css`). It is pure HTML and CSS, so the player sees it at the first
 * paint, before the engine is loaded, and its animation keeps running while the main thread
 * is busy. The engine fills its label and a module dismisses it once the first screen is ready.
 *
 * Client only. Without the element in the page, every function is a no-op.
 */
export const STARTUP_SPLASH_ID = "rpg-splash";

const findSplash = (): HTMLElement | null =>
  typeof document === "undefined" ? null : document.getElementById(STARTUP_SPLASH_ID);

/** Whether the page has a startup splash that is still on screen. */
export const hasStartupSplash = (): boolean => {
  const splash = findSplash();
  return !!splash && splash.dataset.leaving !== "true";
};

/**
 * Sets the text under the spinner. The engine calls it with the translated
 * `rpg.transition.loading` text as soon as the i18n service is available.
 */
export const setStartupSplashLabel = (text: string): void => {
  const label = findSplash()?.querySelector<HTMLElement>("[data-rpg-splash-label]");
  if (label) label.textContent = text;
};

/**
 * Fades the splash out, then removes it from the page.
 *
 * @example
 * ```ts
 * // Once the first screen is ready to be seen
 * dismissStartupSplash();
 * ```
 */
export const dismissStartupSplash = (): void => {
  const splash = findSplash();
  if (!splash || splash.dataset.leaving === "true") return;
  splash.dataset.leaving = "true";
  const remove = () => splash.remove();
  splash.addEventListener("transitionend", remove, { once: true });
  setTimeout(remove, 1000);
};
