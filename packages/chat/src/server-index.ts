import { createModule, type RpgProvider } from "@rpgjs/common";
import server, {
  createChatHandler,
  createChatServer,
} from "./server";
import type { ChatServerOptions } from "./server-types";

export {
  CHAT_DELETE_EVENT,
  CHAT_ERROR_EVENT,
  CHAT_GUI_ID,
  CHAT_MESSAGE_EVENT,
  CHAT_SEND_EVENT,
} from "./config";
export { normalizeChatServerOptions } from "./server-config";
export { defineChatChannel, globalChannel, mapChannel } from "./channels";
export {
  createChatHandler,
  createChatServer,
};
export type {
  ChatChannelDefinition,
  ChatContext,
  ChatMapLike,
  ChatMiddleware,
  ChatModerationContext,
  ChatPlayerLike,
  ChatRateLimitOptions,
  ChatRejectedInfo,
  ChatServerOptions,
  ResolvedChatServerOptions,
} from "./server-types";
export type {
  ChatAudience,
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
