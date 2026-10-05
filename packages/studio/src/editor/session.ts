import { Container } from "pixi.js";
import type { EditorHost } from "@rpgjs/map-builder/embed";
import { setStudioMapsPaused } from "./pause";
import { buildEditableMap, resolveLists, type RawElementLists, type StudioLayerName } from "./adapter";

/**
 * The game as an editor (MAP_BUILDER.md, section 17): when a Studio embeds the game in an iframe with `?editor`,
 * the placed elements of the map become a map builder map, the Studio joins it as a trusted session, and what it
 * changes is drawn again by the runtime. Nothing here runs for a player: without `?editor` it is never loaded.
 */
export const STUDIO_EDITOR_PLUGIN_ID = "studio.editor";

/** Whether this page was opened by a Studio to be edited. */
export function isStudioEditorMode(): boolean {
  return typeof window !== "undefined" && window.parent !== window && new URLSearchParams(window.location.search).has("editor");
}

export interface StudioEditorHandle {
  /** The map has been loaded: adopt it. Called again for every map the player goes to. */
  start(map: {
    readonly mapId: string;
    readonly size: readonly [number, number];
    readonly raw: RawElementLists;
    readonly resolveOne: (raw: any, layerNumber: number) => any | null;
  }): void;
}

interface EngineLike {
  globalConfig?: { studioPlugins?: any[] };
  sceneMap?: { data?: { (): any; set(value: any): void } };
  gamePause?: { set(value: boolean): void };
}

const handles = new WeakMap<object, StudioEditorHandle>();

/**
 * Makes room for the editor in the map component, synchronously, before it is drawn: a container in the layer the
 * characters are in, where selection frames will be shown. Returns what `loadMap` calls once it has the map.
 */
export function prepareStudioEditor(engine: EngineLike, options: { readonly allowedOrigins: readonly string[] }): StudioEditorHandle {
  const known = handles.get(engine);
  if (known) return known;
  const holder = new Container();
  holder.label = "studio-editor";
  // Above the characters and the elements: selection frames are never hidden.
  holder.zIndex = 2_147_483_000;
  const config = (engine.globalConfig ??= {});
  const plugins = (config.studioPlugins ??= []);
  if (!plugins.some((plugin) => plugin?.id === STUDIO_EDITOR_PLUGIN_ID)) {
    plugins.push({ id: STUDIO_EDITOR_PLUGIN_ID, eventLayerPixiChildren: () => [holder] });
  }

  // One host for the whole life of the page: a Studio that connected to it must not lose it when the game loads a
  // map again (it does, at start) or goes to another one. Only what the host looks at is swapped.
  let active: Run | undefined;
  let host: Promise<EditorHost> | undefined;
  let generation = 0;

  const ensureHost = (): Promise<EditorHost> => {
    host ??= import("@rpgjs/map-builder/embed").then(({ createEditorHost }) =>
      createEditorHost({
        allowedOrigins: options.allowedOrigins,
        // The game may run in a frame inside a wrapper page (a sandbox): the Studio is the top window, not the parent.
        parent: (window.top ?? window.parent) as never,
        authority: () => (active ? { id: active.id, authority: active.authority } : undefined),
        view: () => active?.view as never,
        setPaused(paused) {
          setStudioMapsPaused(paused);
          engine.gamePause?.set(paused);
        },
        onError: (error) => console.error("[studio editor]", error),
      }),
    );
    return host;
  };

  const handle: StudioEditorHandle = {
    start(map) {
      const token = ++generation;
      const previous = active;
      active = undefined;
      previous?.stop();
      void run(engine, holder, map)
        .then(async (started) => {
          if (token !== generation) return started.stop();
          active = started;
          (await ensureHost()).notifyMap();
        })
        .catch((error) => console.error("[studio editor]", error));
    },
  };
  handles.set(engine, handle);
  return handle;
}

/** The editing session of one map: its authority, and the view that brings the tools. */
interface Run {
  readonly id: string;
  readonly authority: { connect(session: never): never };
  readonly view: unknown;
  stop(): void;
}

async function run(engine: EngineLike, holder: Container, map: Parameters<StudioEditorHandle["start"]>[0]): Promise<Run> {
  const [{ createMapAuthority }, { connectInMemory, joinRemoteMap }, { elements, selection }, { createMapView, attachMapView }] = await Promise.all([
    import("@rpgjs/map-builder/authority"),
    import("@rpgjs/map-builder/remote"),
    import("@rpgjs/map-builder/features"),
    import("@rpgjs/map-builder/renderer"),
  ]);

  const { definition, assets } = buildEditableMap({ id: map.mapId, size: map.size, raw: map.raw, resolveOne: map.resolveOne });

  // The game is the authority of its own map; only the Studio session may send raw patches (a form, an undo).
  const authority = createMapAuthority({
    definition,
    assets,
    trustPatches: (actor) => (actor as { editor?: boolean } | undefined)?.editor === true,
    onError: (error) => console.error("[studio editor]", error),
  });
  const connection = connectInMemory(authority, { id: "game" });
  const remote = await joinRemoteMap({ transport: connection.transport });

  // The runtime draws the elements; the map builder only brings selection, dragging and the model.
  const view = createMapView({
    model: remote.model,
    assets,
    features: [elements({ edit: true }), selection({ drag: { live: false }, remove: true })],
    draw: false,
    modes: ["play"],
    onError: (error) => console.error("[studio editor]", error),
  });
  const detach = attachMapView(holder, view);
  const syncPointer = (modes: readonly string[]): void => {
    // In play the game gets the pointer; in edit the map builder does.
    view.root.eventMode = modes.includes("edit") ? "static" : "none";
  };
  syncPointer(view.interaction.modes);
  const stopModes = view.interaction.state.subscribe((snapshot) => syncPointer(snapshot.modes));

  // What the model says is what the runtime draws: after every change, whoever made it.
  const redraw = (): void => {
    const lists = resolveLists(authority.model.state.elements, map.resolveOne);
    const scene = engine.sceneMap?.data;
    const current = scene?.();
    if (!scene || !current?.data) return;
    scene.set({
      ...current,
      data: { ...current.data, elementsAlwaysLow: lists.alwaysLow, elementsLow: lists.low, elementsHigh: lists.high },
    });
  };
  const stopRedraw = authority.model.subscribe(() => redraw());

  return {
    id: map.mapId,
    authority: authority as never,
    view,
    stop() {
      stopRedraw();
      stopModes();
      detach();
      view.destroy();
      remote.disconnect();
      connection.disconnect();
      void authority.destroy();
    },
  };
}

export type { StudioLayerName };
