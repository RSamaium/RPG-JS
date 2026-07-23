import type { GuiComponent, GuiRenderer } from "@rpgjs/client";

export type ChatPosition = "top-left" | "top-right" | "bottom-left" | "bottom-right";

export interface ChatClientOptions {
  guiId?: string;
  component?: GuiComponent;
  renderer?: GuiRenderer;
  autoOpen?: boolean;
  position?: ChatPosition;
  maxMessages?: number;
  maxLength?: number;
}

export interface ResolvedChatClientOptions {
  guiId: string;
  component: GuiComponent;
  renderer: GuiRenderer;
  autoOpen: boolean;
  position: ChatPosition;
  maxMessages: number;
  maxLength: number;
}
