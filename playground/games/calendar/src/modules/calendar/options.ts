import type { CalendarServerOptions } from "@rpgjs/calendar/server";

// Sample content: icons are glyphs here, an image URL works too (`icon: "/icons/market.png"`).
export const calendarOptions: CalendarServerOptions = {
  calendar: { seasons: ["spring", "summer", "autumn", "winter"] },
  today: { year: 1, month: 1, day: 3 },
  categories: {
    weather: { color: "#f2c14e", icon: "☀" },
    market: { color: "#5fd16a", icon: "⚑" },
    sea: { color: "#4fa3f2", icon: "≈" },
    combat: { color: "#ef5a4a", icon: "⚔" },
    festival: { color: "#9b6bff", icon: "♪" },
    season: { color: "#5fd16a", icon: "❀" },
    quest: { color: "#ef7a5a", icon: "✉" },
  },
  events: [
    { id: "market", title: "Village Market", description: "Merchants gather in the main square.", category: "market", on: { month: 1, day: 7 } },
    { id: "fishing", title: "Fishing Tournament", description: "Compete for rare fish and prizes.", category: "sea", on: { month: 1, day: 12 } },
    { id: "arena", title: "Arena Challenge", description: "Face powerful opponents.", category: "combat", on: { month: 1, day: 17 } },
    { id: "festival", title: "Spring Festival", description: "Music, food and various activities in the capital.", category: "festival", on: { month: 1, day: 21 }, lasts: 2 },
    { id: "harvest", title: "Harvest Season Begins", description: "Crops grow faster for 7 days.", category: "season", on: { month: 1, day: 26 } },
  ],
  sources: [
    {
      // Only the player who got the quest sees its deadline.
      id: "quests",
      scope: "player",
      list: () => [
        { id: "silver-key", title: "Deliver the silver key", description: "Bring it to Captain Ruel.", category: "quest", on: { year: 1, month: 1, day: 15 } },
      ],
    },
  ],
  hooks: {
    onDayChange: ({ previous, current }) => console.log(`[calendar] day ${previous.day} -> ${current.day}`),
    onEventStart: ({ entry }) => console.log(`[calendar] starts: ${entry.title}`),
    onEventEnd: ({ entry }) => console.log(`[calendar] ends: ${entry.title}`),
  },
};
