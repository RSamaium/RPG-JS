import { signal } from "canvasengine";
import type {
  ResolvedChatClientOptions,
} from "./client-types";
import type {
  ChatChannel,
  ChatErrorPayload,
  ChatMessage,
} from "./shared-types";
import { normalizeChatClientOptions } from "./client-config";

export const chatMessages = signal<ChatMessage[]>([]);
export const chatError = signal<ChatErrorPayload | null>(null);
export const chatClientOptions = signal<ResolvedChatClientOptions>(
  normalizeChatClientOptions(),
);
/** The channels of the selector. */
export const chatChannels = signal(chatClientOptions().channels);
/** The channel the next message goes to. */
export const chatSelectedChannel = signal<ChatChannel>(chatClientOptions().channels[0]!.id);
/** Open (log and input), or reduced to a pill with the number of unread messages. */
export const chatExpanded = signal(chatClientOptions().startExpanded);
export const chatUnread = signal(0);
/** A message was sent and the server has not answered yet: the GUI shows a loading. */
export const chatSending = signal(false);
/** The box is made taller, or is the default height. */
export const chatTall = signal(false);

const ERROR_VISIBLE_MS = 5000;
const SENDING_TIMEOUT_MS = 8000;
let errorTimer: ReturnType<typeof setTimeout> | undefined;
let sendingTimer: ReturnType<typeof setTimeout> | undefined;

function endChatSending(): void {
  clearTimeout(sendingTimer);
  chatSending.set(false);
}

/** The message went to the server: waiting for it to come back or to be refused. It ends by itself, so nobody is stuck. */
export function startChatSending(): void {
  clearTimeout(sendingTimer);
  chatSending.set(true);
  sendingTimer = setTimeout(() => chatSending.set(false), SENDING_TIMEOUT_MS);
}

/** Shows the last error of the server for a few seconds: other players keep talking, it must not stay forever. */
export function showChatError(error: ChatErrorPayload | null): void {
  if (error) endChatSending();
  clearTimeout(errorTimer);
  chatError.set(error);
  if (error) errorTimer = setTimeout(() => chatError.set(null), ERROR_VISIBLE_MS);
}

export function configureChatClient(options: ResolvedChatClientOptions): void {
  chatClientOptions.set(options);
  chatChannels.set(options.channels);
  chatSelectedChannel.set(options.channels[0]!.id);
  chatMessages.set([]);
  showChatError(null);
  chatExpanded.set(options.startExpanded);
  chatUnread.set(0);
  endChatSending();
  chatTall.set(false);
}

/** `selfId` is the id of the player on this client: their own message ends the sending, and is never unread. */
export function addChatMessage(message: ChatMessage, selfId?: string | null): void {
  if (selfId !== undefined && message.playerId === selfId) endChatSending();
  const next = [...chatMessages(), message];
  chatMessages.set(next.slice(-chatClientOptions().maxMessages));
  if (!chatExpanded() && message.playerId !== selfId) chatUnread.set(chatUnread() + 1);
}

/** A moderation tool removed a message: it leaves the screen, whatever the channel. */
export function removeChatMessage(id: string): void {
  chatMessages.set(chatMessages().filter((message) => message.id !== id));
}

export function clearChatMessages(): void {
  chatMessages.set([]);
}

export function selectChatChannel(id: ChatChannel): void {
  if (chatChannels().some((channel) => channel.id === id)) chatSelectedChannel.set(id);
}

export function setChatExpanded(expanded: boolean): void {
  chatExpanded.set(expanded);
  if (expanded) chatUnread.set(0);
}

export function setChatTall(tall: boolean): void {
  chatTall.set(tall);
}
