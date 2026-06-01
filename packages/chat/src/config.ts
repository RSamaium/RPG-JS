import type { ChatOptions, ResolvedChatOptions } from "./types";

export const CHAT_GUI_ID = "rpg-chat";
export const CHAT_SEND_EVENT = "chat:send";
export const CHAT_MESSAGE_EVENT = "chat:message";

export const DEFAULT_CHAT_OPTIONS: ResolvedChatOptions = {
  guiId: CHAT_GUI_ID,
  autoOpen: true,
  position: "bottom-left",
  maxMessages: 100,
  maxLength: 180,
  placeholder: "Message...",
  formatAuthor: (player) => player.name || `Player ${player.id}`,
};

let currentChatOptions: ResolvedChatOptions = DEFAULT_CHAT_OPTIONS;

const positiveInteger = (
  value: number | undefined,
  fallback: number
): number => {
  if (!Number.isFinite(value) || value === undefined) return fallback;
  return Math.max(1, Math.floor(value));
};

export function normalizeChatOptions(
  options: ChatOptions = {}
): ResolvedChatOptions {
  return {
    ...DEFAULT_CHAT_OPTIONS,
    ...options,
    maxMessages: positiveInteger(
      options.maxMessages,
      DEFAULT_CHAT_OPTIONS.maxMessages
    ),
    maxLength: positiveInteger(options.maxLength, DEFAULT_CHAT_OPTIONS.maxLength),
    formatAuthor: options.formatAuthor ?? DEFAULT_CHAT_OPTIONS.formatAuthor,
  };
}

export function setChatOptions(options: ResolvedChatOptions) {
  currentChatOptions = options;
}

export function getChatOptions(): ResolvedChatOptions {
  return currentChatOptions;
}
