import { signal } from "canvasengine";
import type { RpgClientEvent } from "../Game/Event";
import type { RpgClientPlayer } from "../Game/Player";

/**
 * Which objects of one kind a `hideMapObjects` call hides.
 *
 * - `true`: all of them; `false` or left out: none.
 * - a list of ids: those objects.
 * - a function: the objects for which it returns `true`. It is read inside a reactive computation, so it may read
 *   the signals of the object (its graphic, a synced param...) and the object is shown again when they change.
 */
export type MapObjectSelector<T> = boolean | readonly string[] | ((object: T, id: string) => boolean);

/**
 * The objects that `RpgClientEngine.hideMapObjects` hides for the local client.
 *
 * @example
 * ```ts
 * // Every event, and every player but the local one
 * const options: HideMapObjectsOptions = { events: true, players: 'others' }
 * ```
 */
export interface HideMapObjectsOptions {
  /** The events to hide. */
  events?: MapObjectSelector<RpgClientEvent>;
  /** The players to hide; `'others'` hides every player but the local one. */
  players?: MapObjectSelector<RpgClientPlayer> | "others";
}

/** The kind of a map object, as the client scene stores it. */
export type MapObjectKind = "events" | "players";

/** Shows again the objects hidden by one `hideMapObjects` call. Calling it more than once does nothing. */
export type RestoreMapObjects = () => void;

interface MapObjectFilter {
  readonly options: HideMapObjectsOptions;
}

const selects = <T>(selector: MapObjectSelector<T> | undefined, object: T, id: string): boolean => {
  if (selector === true) return true;
  if (!selector) return false;
  if (typeof selector === "function") return Boolean(selector(object, id));
  return selector.includes(id);
};

/**
 * The client-only filters that hide map objects. The filters are kept in a signal, so the characters that read
 * `isHidden` in a computation are hidden and shown again as filters are added and removed, and an object that
 * enters the map later follows the filters in place.
 */
export class MapObjectVisibility {
  private readonly filters = signal<readonly MapObjectFilter[]>([]);

  /** Adds a filter. The returned function removes it; the objects show again once no filter hides them. */
  hide(options: HideMapObjectsOptions): RestoreMapObjects {
    const filter: MapObjectFilter = { options: { ...options } };
    this.filters.set([...this.filters(), filter]);
    return () => {
      const filters = this.filters();
      if (!filters.includes(filter)) return;
      this.filters.set(filters.filter((entry) => entry !== filter));
    };
  }

  /**
   * Whether a filter hides an object. Reactive: it reads the filters signal.
   *
   * @param kind - Where the scene stores the object.
   * @param id - Its id in the scene.
   * @param object - The object, given to the selector functions.
   * @param localPlayerId - The id of the local player, never hidden by `'others'`.
   */
  isHidden(kind: MapObjectKind, id: string, object: RpgClientEvent | RpgClientPlayer | undefined, localPlayerId: string | null): boolean {
    for (const { options } of this.filters()) {
      if (kind === "events") {
        if (selects(options.events, object as RpgClientEvent, id)) return true;
      } else if (options.players === "others") {
        if (id !== localPlayerId) return true;
      } else if (selects(options.players, object as RpgClientPlayer, id)) {
        return true;
      }
    }
    return false;
  }

  /** Removes every filter, when the client leaves the map. The restore functions given before do nothing. */
  clear(): void {
    if (this.filters().length) this.filters.set([]);
  }
}
