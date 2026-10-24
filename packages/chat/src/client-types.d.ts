import type { GuiComponent, GuiRenderer } from "@rpgjs/client";
import type { ChatChannel } from "./shared-types";

export type ChatPosition = "top-left" | "top-right" | "bottom-left" | "bottom-right";

/**
 * A channel as the GUI shows it. A `ChatChannelDefinition` of the server fits, so a game can give the same list to both.
 */
export type ChatClientChannel =
  | ChatChannel
  | { id: ChatChannel; label?: string; color?: string };

export interface ResolvedChatChannel {
  id: ChatChannel;
  /** A translation key or plain text. */
  label: string;
  color: string;
}

export interface ChatClientOptions {
  guiId?: string;
  component?: GuiComponent;
  renderer?: GuiRenderer;
  autoOpen?: boolean;
  position?: ChatPosition;
  maxMessages?: number;
  maxLength?: number;
  /**
   * The channels of the selector. `['map']` by default, and no selector while there is only one. Keep the list
   * aligned with the server: the server decides who may write and who reads.
   */
  channels?: ChatClientChannel[];
}

export interface ResolvedChatClientOptions {
  guiId: string;
  component: GuiComponent;
  renderer: GuiRenderer;
  autoOpen: boolean;
  position: ChatPosition;
  maxMessages: number;
  maxLength: number;
  channels: ResolvedChatChannel[];
}
