export interface GlobalAssetLoaderLike {
  getAssetCount?: () => number;
  getGlobalProgress?: () => number;
  onComplete?: (callback: () => void) => (() => void) | void;
}

export function waitForGlobalAssets(
  loader: GlobalAssetLoaderLike | null | undefined,
  maxWaitMs: number,
  onReady: () => void,
): () => void {
  const assetCount = loader?.getAssetCount?.() ?? 0;
  const progress = loader?.getGlobalProgress?.() ?? 1;
  if (!loader || assetCount === 0 || progress >= 1 || !loader.onComplete) {
    onReady();
    return () => undefined;
  }

  let active = true;
  let timeout: ReturnType<typeof setTimeout> | undefined;
  let unsubscribe: () => void = () => {};
  const finish = () => {
    if (!active) return;
    active = false;
    if (timeout) clearTimeout(timeout);
    unsubscribe();
    onReady();
  };

  unsubscribe = loader.onComplete(finish) ?? (() => {});
  if (!active) {
    // Some loaders invoke callbacks synchronously when completion races with
    // registration. In that case, release the just-created subscription too.
    unsubscribe();
  } else {
    timeout = setTimeout(finish, Math.max(0, maxWaitMs));
  }

  return () => {
    if (!active) return;
    active = false;
    if (timeout) clearTimeout(timeout);
    unsubscribe();
  };
}
