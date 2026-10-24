import { positiveInteger } from "./config";
import { resolveChatChannel } from "./channels";
import type { ChatChannel } from "./shared-types";
import type {
  ChatPlayerLike,
  ChatServerOptions,
  ResolvedChatServerOptions,
} from "./server-types";

const readText = (value: string | (() => string) | undefined): string => {
  return typeof value === "function" ? value() : value || "";
};

export function normalizeChatServerOptions(
  options: ChatServerOptions = {},
): ResolvedChatServerOptions {
  const definitions = [
    ...new Map(
      (options.channels?.length ? options.channels : ["map"])
        .map(resolveChatChannel)
        .map((definition) => [definition.id, definition] as const),
    ).values(),
  ];
  const channels: ChatChannel[] = definitions.map((definition) => definition.id);
  return {
    channels,
    channelDefinitions: definitions,
    maxLength: positiveInteger(options.maxLength, 180),
    rateLimit: options.rateLimit === false
      ? false
      : {
          maxMessages: positiveInteger(options.rateLimit?.maxMessages, 5),
          windowMs: positiveInteger(options.rateLimit?.windowMs, 10_000),
        },
    formatAuthor: options.formatAuthor || ((player: ChatPlayerLike) => {
      return readText(player.name) || `Player ${player.id}`;
    }),
    middleware: options.middleware ?? [],
    beforeSend: options.beforeSend,
    afterSend: options.afterSend,
    deliver: options.deliver,
    broadcastGlobal: options.broadcastGlobal,
    onRejected: options.onRejected,
  };
}
