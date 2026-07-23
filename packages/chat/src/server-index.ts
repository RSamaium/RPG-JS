import { createModule, type RpgProvider } from "@rpgjs/common";
import server, {
  createChatHandler,
  createChatServer,
} from "./server";
import type { ChatServerOptions } from "./server-types";

export {
  CHAT_ERROR_EVENT,
  CHAT_GUI_ID,
  CHAT_MESSAGE_EVENT,
  CHAT_SEND_EVENT,
} from "./config";
export { normalizeChatServerOptions } from "./server-config";
export {
  createChatHandler,
  createChatServer,
};
export type {
  ChatMapLike,
  ChatModerationContext,
  ChatPlayerLike,
  ChatRateLimitOptions,
  ChatServerOptions,
  ResolvedChatServerOptions,
} from "./server-types";
export type {
  ChatChannel,
  ChatErrorPayload,
  ChatMessage,
  ChatMessagePayload,
} from "./shared-types";

export interface ChatServerModuleOptions {
  server?: ChatServerOptions;
}

export function provideChat(
  options: ChatServerModuleOptions = {},
): RpgProvider[] {
  return createModule("Chat", [{
    server: createChatServer(options.server),
  }]);
}

export default {
  server,
};
