import {
  CHAT_MESSAGE_EVENT,
  provideChat,
  type ChatMessage,
} from "@rpgjs/chat/server";
import { createServer, provideServerModules } from "@rpgjs/server";
import { provideMain } from "./modules/main";

const guideReply = (message: ChatMessage): string => {
  const text = message.text.toLowerCase();
  if (text.includes("theme")) return "This interface uses @rpgjs/ui-css/theme-pixel.css.";
  if (text.includes("hello") || text.includes("bonjour")) return "Welcome to Pixel Chat Plaza!";
  return "Message received and validated by the map server.";
};

export default createServer({
  providers: [
    provideMain(),
    provideChat({
      server: {
        channels: ["map"],
        maxLength: 120,
        rateLimit: {
          maxMessages: 5,
          windowMs: 10_000,
        },
        afterSend(message, player) {
          const map = player.getCurrentMap();
          if (!map) return;
          map.broadcast(CHAT_MESSAGE_EVENT, {
            id: `pixel-guide-${message.id}`,
            text: guideReply(message),
            author: "Pixel Guide",
            playerId: "pixel-guide",
            channel: "map",
            mapId: message.mapId,
            createdAt: Date.now(),
          } satisfies ChatMessage);
        },
      },
    }),
    provideServerModules([]),
  ],
});
