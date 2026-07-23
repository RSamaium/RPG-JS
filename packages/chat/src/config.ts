import type {
  ChatChannel,
  ChatClientOptions,
  ChatPlayerLike,
  ChatServerOptions,
  ResolvedChatClientOptions,
  ResolvedChatServerOptions,
} from "./types";

export const CHAT_GUI_ID = "rpg-chat";
export const CHAT_SEND_EVENT = "chat:send";
export const CHAT_MESSAGE_EVENT = "chat:message";
export const CHAT_ERROR_EVENT = "chat:error";

const positiveInteger = (value: number | undefined, fallback: number): number => {
  if (!Number.isFinite(value)) return fallback;
  return Math.max(1, Math.floor(value as number));
};

const readText = (value: string | (() => string) | undefined): string => {
  return typeof value === "function" ? value() : value || "";
};

export function normalizeChatClientOptions(
  options: ChatClientOptions = {},
): ResolvedChatClientOptions {
  return {
    guiId: options.guiId || CHAT_GUI_ID,
    component: options.component || (() => null),
    renderer: options.renderer || "canvas",
    autoOpen: options.autoOpen ?? true,
    position: options.position || "bottom-left",
    maxMessages: positiveInteger(options.maxMessages, 100),
  };
}

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
