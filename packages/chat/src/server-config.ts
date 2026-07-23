import { positiveInteger } from "./config";
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
  const channels: ChatChannel[] = [
    ...new Set<ChatChannel>(options.channels?.length ? options.channels : ["map"]),
  ];
  return {
    channels,
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
    beforeSend: options.beforeSend,
    afterSend: options.afterSend,
    broadcastGlobal: options.broadcastGlobal,
  };
}
