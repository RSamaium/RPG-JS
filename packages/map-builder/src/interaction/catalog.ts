import type { JsonObject } from "../model/json";
import type { IntentType, PositionedIntentType } from "./intents";
import type { PipelineStep } from "./pipeline";

export interface CatalogItem<Id extends string = string> {
  /** What the UI and `placement.start()` call it. */
  readonly id: Id;
  /** The asset drawn once placed (an `AssetResolver` reference). */
  readonly sprite: string;
  /** Initial `data` of the element created. */
  readonly data?: JsonObject;
  /** Rules specific to this item, run after those of the feature. */
  readonly pipeline?: readonly PipelineStep<"element.place">[];
}

export interface Catalog<Id extends string = string> {
  readonly ids: readonly Id[];
  readonly items: readonly CatalogItem<Id>[];
  get(id: string): CatalogItem<Id> | undefined;
  has(id: string): id is Id;
}

/** What can be placed, as data: Studio brings a rich catalog, a game three trees. Ids are checked by the compiler. */
export function defineCatalog<const Items extends readonly CatalogItem<string>[]>(items: Items): Catalog<Items[number]["id"]> {
  const table = new Map<string, CatalogItem<Items[number]["id"]>>();
  for (const item of items) {
    if (typeof item.id !== "string" || item.id.length === 0) throw new Error("A catalog item needs a non-empty id");
    if (table.has(item.id)) throw new Error(`Catalog item "${item.id}" is defined twice`);
    table.set(item.id, item);
  }
  return {
    ids: [...table.keys()],
    items: [...table.values()],
    get: (id) => table.get(id),
    has: (id): id is Items[number]["id"] => table.has(id),
  };
}

export type CatalogId<C> = C extends Catalog<infer Id> ? Id : never;
export type { IntentType, PositionedIntentType };
