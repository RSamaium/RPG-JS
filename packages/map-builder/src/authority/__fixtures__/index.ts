import { defineCatalog } from "../../interaction/catalog";
import { assets, world } from "../../interaction/__fixtures__";
import type { ServerMessage } from "../../protocol";
import { createMapAuthority, type AuthoritySession, type MapAuthorityOptions } from "../authority";

export { assets, world };

export const catalog = defineCatalog([
  { id: "oak", sprite: "tree" },
  { id: "cabin", sprite: "house" },
]);

export interface Player {
  readonly id: string;
  readonly admin?: boolean;
}

/** A session that records what it is sent. */
export function session(id: string, actor: unknown = { id }): AuthoritySession & { readonly inbox: ServerMessage[]; of<T extends ServerMessage["type"]>(type: T): Array<Extract<ServerMessage, { type: T }>> } {
  const inbox: ServerMessage[] = [];
  return {
    id,
    actor,
    send: (message) => void inbox.push(JSON.parse(JSON.stringify(message))),
    inbox,
    of: (type) => inbox.filter((message) => message.type === type) as never,
  };
}

export function authority(overrides: Partial<MapAuthorityOptions> = {}) {
  return createMapAuthority({
    definition: world(),
    assets,
    placement: { catalog },
    onError: (error) => {
      throw error;
    },
    ...overrides,
  });
}

/** Lets everything that was delivered later (microtasks, timers of 0) happen. */
export const settle = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0));
