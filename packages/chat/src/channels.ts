import type { ChatChannelDefinition } from "./server-types";

/**
 * Declares a channel for `provideChat`. It only gives the object its type.
 *
 * @title defineChatChannel
 * @method defineChatChannel(definition)
 * @param {ChatChannelDefinition} definition The id, the label, the color, who may write and who receives.
 * @returns {ChatChannelDefinition} The same definition.
 * @memberof ChatModule
 * @example
 * ```ts
 * const trade = defineChatChannel({
 *   id: 'trade',
 *   label: 'game.chat.trade',
 *   audience: () => ({ type: 'global' }),
 * })
 * ```
 */
export function defineChatChannel<T extends ChatChannelDefinition>(definition: T): T {
  return definition;
}

/** The players of the map of the speaker. */
export const mapChannel = defineChatChannel({
  id: "map",
  label: "rpg.chat.channel.map",
  color: "slate",
  audience: () => ({ type: "map" }),
});

/** Everybody in the game: the game gives `deliver` to carry the message to the other maps. */
export const globalChannel = defineChatChannel({
  id: "global",
  label: "rpg.chat.channel.global",
  color: "amber",
  audience: () => ({ type: "global" }),
});

const BUILT_IN: Record<string, ChatChannelDefinition> = { map: mapChannel, global: globalChannel };

/** The definition of a channel given as an id or as a definition. */
export function resolveChatChannel(entry: string | ChatChannelDefinition): ChatChannelDefinition {
  if (typeof entry !== "string") return entry;
  const built = BUILT_IN[entry];
  if (!built) {
    throw new Error(`The chat channel "${entry}" is unknown: declare it with defineChatChannel().`);
  }
  return built;
}
