import type {
  ChatAudience,
  ChatChannel,
  ChatMessage,
  ChatMessagePayload,
} from "./shared-types";

export interface ChatMapLike {
  id?: string | (() => string);
  broadcast(type: string, value: unknown): void;
}

export interface ChatPlayerLike {
  id: string;
  name?: string | (() => string);
  getCurrentMap(): ChatMapLike | undefined;
  emit(type: string, value: unknown): void;
  on(type: string, callback: (payload: ChatMessagePayload) => void | Promise<void>): void;
}

/**
 * A place where players talk. Declare it with `defineChatChannel` and give it to `channels`.
 *
 * @example
 * ```ts
 * const guild = defineChatChannel({
 *   id: 'guild',
 *   label: 'game.chat.guild',
 *   color: 'violet',
 *   canSend: (player) => guildOf(player) !== undefined,
 *   audience: (message, player) => ({ type: 'group', id: guildOf(player)! }),
 * })
 * ```
 */
export interface ChatChannelDefinition {
  /** Letters, digits and dashes. It travels in the messages. */
  id: ChatChannel;
  /** A translation key or plain text, for the channel selector of the GUI. */
  label?: string;
  /** A hue of the channel in the GUI: `slate`, `amber`, `violet`, `emerald`, `rose` or `sky`. */
  color?: string;
  /** Who may write on this channel. Everybody when it is missing. */
  canSend?(player: ChatPlayerLike): boolean | Promise<boolean>;
  /**
   * Who receives what is written. The map of the speaker for `map` and everybody for `global` when it is missing;
   * a channel with another id must give it.
   */
  audience?(message: ChatMessage, player: ChatPlayerLike): ChatAudience;
}

export interface ChatModerationContext {
  player: ChatPlayerLike;
  channel: ChatChannel;
  text: string;
}

/**
 * One message on its way from the player to the delivery, as a middleware sees it.
 */
export interface ChatContext {
  readonly player: ChatPlayerLike;
  readonly channel: ChatChannelDefinition;
  /** The normalized text. A middleware can rewrite it: the rewritten text is what the players read. */
  text: string;
  /** Data shared by the middleware of this message. */
  readonly meta: Record<string, unknown>;
  /** Refuses the message: the player gets the error `key` and nothing is shown. */
  reject(key: string, params?: Record<string, unknown>): never;
}

/**
 * A step of the moderation. Call `next()` to let the message go on; neither calling it nor refusing refuses the message.
 */
export type ChatMiddleware = (
  context: ChatContext,
  next: () => Promise<void>,
) => void | Promise<void>;

export interface ChatRejectedInfo {
  player: ChatPlayerLike;
  channel?: ChatChannel;
  text: string;
  /** The error key given to the player. */
  key: string;
}

export interface ChatRateLimitOptions {
  maxMessages?: number;
  windowMs?: number;
}

export interface ChatServerOptions {
  /**
   * The channels of the game: the built-in `'map'` and `'global'`, or definitions made with `defineChatChannel`.
   * `['map']` by default; an omitted channel in a message is `map` when it exists, else the first one.
   */
  channels?: Array<ChatChannel | ChatChannelDefinition>;
  maxLength?: number;
  rateLimit?: ChatRateLimitOptions | false;
  formatAuthor?: (player: ChatPlayerLike) => string;
  /** Rejects with `false`, or returns the text to broadcast. Runs before `middleware`. */
  beforeSend?: (
    context: ChatModerationContext,
  ) => string | false | Promise<string | false>;
  /** The moderation, in order, after the checks of the module and before the delivery. */
  middleware?: ChatMiddleware[];
  afterSend?: (
    message: ChatMessage,
    player: ChatPlayerLike,
  ) => void | Promise<void>;
  /** Carries a message to the audience of a channel that is not the map of the speaker. */
  deliver?: (
    audience: ChatAudience,
    message: ChatMessage,
    player: ChatPlayerLike,
  ) => void | Promise<void>;
  /** The legacy adapter of the `global` channel: `deliver` is the canonical option and wins when both are given. */
  broadcastGlobal?: (message: ChatMessage, player: ChatPlayerLike) => void | Promise<void>;
  /** When a message was refused, by the module or by a middleware. A failure of the hook is ignored. */
  onRejected?: (info: ChatRejectedInfo) => void | Promise<void>;
}

export interface ResolvedChatServerOptions {
  /** The ids of the channels, the first one being the default when `map` is missing. */
  channels: ChatChannel[];
  channelDefinitions: ChatChannelDefinition[];
  maxLength: number;
  rateLimit: Required<ChatRateLimitOptions> | false;
  formatAuthor: (player: ChatPlayerLike) => string;
  middleware: ChatMiddleware[];
  beforeSend?: ChatServerOptions["beforeSend"];
  afterSend?: ChatServerOptions["afterSend"];
  deliver?: ChatServerOptions["deliver"];
  broadcastGlobal?: ChatServerOptions["broadcastGlobal"];
  onRejected?: ChatServerOptions["onRejected"];
}
