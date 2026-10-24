/**
 * Media the game warms up after the hero is ready (combat animations, actors, illustrations).
 * They are loaded while the first map loads; the map is revealed only once they are in, so a
 * temporary attack or hurt graphic never meets a spritesheet that is still loading.
 */
let pendingPreload: Promise<void> = Promise.resolve();

/** Registers the background preload of the current startup. */
export function setStudioMediaPreload(preload: Promise<void>): void {
  pendingPreload = preload;
}

/**
 * Resolves once the background preload is over, or after `maxWaitMs`: the map must not stay hidden for
 * media only a later fight needs. It never rejects.
 */
export function waitForStudioMediaPreload(maxWaitMs = 800): Promise<void> {
  const preload = pendingPreload.catch(() => undefined);
  return Promise.race([
    preload,
    new Promise<void>((resolve) => setTimeout(resolve, maxWaitMs)),
  ]);
}
