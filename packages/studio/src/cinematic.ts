import { getGameDataProvider } from "./data-provider";
import { resolveAssetSource } from "./spritesheet-utils";

export async function resolveStudioCinematicSource(mediaId: unknown): Promise<string> {
  if (typeof mediaId !== "string" || !mediaId.trim()) return "";
  const media = await getGameDataProvider().getMedia(mediaId);
  return resolveAssetSource(media?.fileName);
}

/** Only event blocks are visited, never the map's tile/terrain arrays. */
export function collectCinematicMediaIds(events: unknown): string[] {
  const ids = new Set<string>();
  const visit = (value: unknown): void => {
    if (Array.isArray(value)) { value.forEach(visit); return; }
    if (!value || typeof value !== 'object') return;
    const node = value as Record<string, unknown>;
    const data = node.data as Record<string, unknown> | undefined;
    if (node.type === 'show_cinematic' && data?.preload !== false && typeof data?.video === 'string') ids.add(data.video);
    for (const child of Object.values(node)) {
      if (child && typeof child === 'object') visit(child);
    }
  };
  visit(events);
  return [...ids];
}

/** Best-effort browser buffering, bounded to three videos per mounted map. */
export function preloadMapCinematics(events: unknown): () => void {
  let disposed = false;
  const videos: HTMLVideoElement[] = [];
  for (const id of collectCinematicMediaIds(events).slice(0, 3)) {
    void resolveStudioCinematicSource(id).then(src => {
      if (disposed || !src) return;
      const video = document.createElement('video');
      video.crossOrigin = 'anonymous';
      video.preload = 'auto';
      video.src = src;
      videos.push(video);
      video.load();
    }).catch(() => { /* Playback displays recoverable errors if this media is used. */ });
  }
  return () => {
    disposed = true;
    for (const video of videos) { video.removeAttribute('src'); video.load(); }
  };
}
