import { createEditorHost, type EditorHost, type EditorViewLike } from "@rpgjs/map-builder/embed";
import type { MapAuthority } from "@rpgjs/map-builder/authority";

/**
 * The game as an editor: when a Studio embeds this page (`?editor`, in an iframe, from an origin that is
 * allowed) it joins the authority of the map the player is on, drives the tools, and can pause the game.
 * Nobody else ever gets any of it: without `?editor` no host is created.
 *
 * The Studio runs in another page, so what it can do is only what the channels allow. The authority still
 * decides: the editor session is trusted with raw patches (undo, forms) and nothing else.
 */
const STUDIO_ORIGINS = ((import.meta as unknown as { env?: Record<string, string | undefined> }).env?.VITE_STUDIO_ORIGINS ?? "http://localhost:5194,http://127.0.0.1:5194").split(",");

interface MapSide {
  readonly authority: MapAuthority;
  /** Server side of the map: used to pause its loop. */
  readonly map: { setAutoTick(enabled: boolean): void };
}

const authorities = new Map<string, MapSide>();
const state: { mapId?: string; view?: EditorViewLike; engine?: { gamePause: { set(value: boolean): void } }; host?: EditorHost } = {};

/** The authority of a map exists (server side). Called by the game's server module. */
export function registerAuthority(mapId: string, authority: MapAuthority, map: MapSide["map"]): void {
  authorities.set(mapId, { authority, map });
  state.host?.notifyMap();
}

/** The client has its engine (to freeze the display when paused). */
export function setEngine(engine: NonNullable<typeof state.engine>): void {
  state.engine ??= engine;
}

/** What the game checks to trust the editor session with raw patches. */
export const isEditorActor = (actor: unknown): boolean => (actor as { editor?: boolean } | undefined)?.editor === true;

const isEmbeddedAsEditor = (): boolean =>
  typeof window !== "undefined" && window.parent !== window && new URLSearchParams(window.location.search).has("editor");

/** The player is on a map (and has its view): the editor, if there is one, follows. */
export function bindEditor(mapId: string, view: unknown): void {
  state.mapId = mapId;
  state.view = view as EditorViewLike;
  if (!state.host && isEmbeddedAsEditor()) {
    state.host = createEditorHost({
      allowedOrigins: STUDIO_ORIGINS,
      authority: () => {
        const side = state.mapId ? authorities.get(state.mapId) : undefined;
        return state.mapId && side ? { id: state.mapId, authority: side.authority } : undefined;
      },
      view: () => state.view,
      setPaused(paused) {
        // The server loop (inputs, physics, projectiles) and what the client draws.
        for (const side of authorities.values()) side.map.setAutoTick(!paused);
        state.engine?.gamePause.set(paused);
      },
    });
    (window as unknown as { __editorHost?: EditorHost }).__editorHost = state.host;
  }
  state.host?.notifyMap();
}

export function unbindEditor(): void {
  state.view = undefined;
  state.host?.notifyMap();
}
