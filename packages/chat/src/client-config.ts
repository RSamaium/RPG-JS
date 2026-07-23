import { CHAT_GUI_ID, positiveInteger } from "./config";
import type {
  ChatClientOptions,
  ResolvedChatClientOptions,
} from "./client-types";

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
    maxLength: positiveInteger(options.maxLength, 180),
  };
}
