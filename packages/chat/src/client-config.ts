import { CHAT_GUI_ID, positiveInteger } from "./config";
import type {
  ChatClientChannel,
  ChatClientOptions,
  ResolvedChatChannel,
  ResolvedChatClientOptions,
} from "./client-types";

const BUILT_IN_CHANNELS: Record<string, ResolvedChatChannel> = {
  map: { id: "map", label: "rpg.chat.channel.map", color: "slate" },
  global: { id: "global", label: "rpg.chat.channel.global", color: "amber" },
};

export function resolveChatClientChannel(entry: ChatClientChannel): ResolvedChatChannel {
  if (typeof entry === "string") return BUILT_IN_CHANNELS[entry] ?? { id: entry, label: entry, color: "slate" };
  const built = BUILT_IN_CHANNELS[entry.id];
  return {
    id: entry.id,
    label: entry.label ?? built?.label ?? entry.id,
    color: entry.color ?? built?.color ?? "slate",
  };
}

export function normalizeChatClientOptions(
  options: ChatClientOptions = {},
): ResolvedChatClientOptions {
  return {
    guiId: options.guiId || CHAT_GUI_ID,
    component: options.component || (() => null),
    renderer: options.renderer || "canvas",
    autoOpen: options.autoOpen ?? true,
    startExpanded: options.startExpanded ?? false,
    position: options.position || "bottom-left",
    maxMessages: positiveInteger(options.maxMessages, 100),
    maxLength: positiveInteger(options.maxLength, 180),
    channels: [
      ...new Map(
        (options.channels?.length ? options.channels : ["map"])
          .map(resolveChatClientChannel)
          .map((channel) => [channel.id, channel] as const),
      ).values(),
    ],
  };
}
