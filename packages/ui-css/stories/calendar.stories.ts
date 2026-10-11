import type { Meta, StoryObj } from "@storybook/html-vite";
import { escape } from "./fixtures";

// Presentation fixtures: the data the server sends (`CalendarView` of @rpgjs/calendar) is sample content here.
export default {
  title: "Compositions/Calendar",
  excludeStories: ["calendarStory"],
  parameters: { controls: { disable: true } },
} satisfies Meta;

interface Sample {
  day: number;
  title: string;
  description: string;
  glyph: string;
  color: string;
}

const weekdays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const sample: Sample[] = [
  { day: 3, title: "Clear Skies", description: "The weather is sunny.", glyph: "☀", color: "#f2c14e" },
  { day: 7, title: "Village Market", description: "Merchants gather in the main square.", glyph: "⚑", color: "#5fd16a" },
  { day: 12, title: "Fishing Tournament", description: "Compete for rare fish and prizes.", glyph: "≈", color: "#4fa3f2" },
  { day: 17, title: "Arena Challenge", description: "Face powerful opponents.", glyph: "⚔", color: "#ef5a4a" },
  { day: 21, title: "Spring Festival", description: "Music, food and various activities in the capital.", glyph: "♪", color: "#9b6bff" },
  { day: 26, title: "Harvest Season Begins", description: "Crops grow faster for 7 days.", glyph: "❀", color: "#5fd16a" },
];

interface Options {
  events?: Sample[];
  today?: number;
  selected?: number;
  firstWeekday?: number;
  daysInMonth?: number;
  title?: string;
}

export function calendarStory({
  events = sample,
  today = 3,
  selected = today,
  firstWeekday = 0,
  daysInMonth = 30,
  title = "Spring",
}: Options = {}): HTMLElement {
  const root = document.createElement("div");
  let current = selected;

  function render() {
    const byDay = new Map(events.map((event) => [event.day, event]));
    const cells =
      Array.from({ length: firstWeekday }, () => '<div class="rpg-ui-calendar-cell" data-empty="true" role="gridcell"></div>').join("") +
      Array.from({ length: daysInMonth }, (_, index) => {
        const day = index + 1;
        const event = byDay.get(day);
        return `<div class="rpg-ui-calendar-cell" role="gridcell"
          data-empty="false" data-today="${day === today}" data-selected="${day === current}" data-has-events="${Boolean(event)}"
          aria-label="${event ? `${day}: ${escape(event.title)}` : day}" ${day === today ? 'aria-current="date"' : ""} data-day="${day}">
          <span class="rpg-ui-calendar-day">${day}</span>
          ${event ? `<span class="rpg-ui-calendar-dot" style="--rpg-ui-calendar-color:${event.color}"></span><span class="rpg-ui-calendar-icon" style="--rpg-ui-calendar-color:${event.color}" aria-hidden="true">${event.glyph}</span>` : ""}
        </div>`;
      }).join("");
    const list = events.filter((event) => event.day >= current);
    root.innerHTML = `<div class="catalog-stage"><div class="rpg-ui-calendar-overlay" style="position:relative;min-height:560px">
      <div class="rpg-ui-calendar-backdrop"></div>
      <section class="rpg-ui-calendar-window" role="dialog" aria-modal="true" aria-label="Calendar">
        <button class="rpg-ui-close-button rpg-ui-calendar-close" type="button" aria-label="Close">×</button>
        <header class="rpg-ui-calendar-header"><span class="rpg-ui-calendar-header-icon" aria-hidden="true">▦</span>
          <div><h2 class="rpg-ui-calendar-title">Calendar</h2><p class="rpg-ui-calendar-subtitle">Check upcoming events and important dates.</p></div></header>
        <div class="rpg-ui-calendar-body">
          <div class="rpg-ui-calendar-main">
            <div class="rpg-ui-calendar-nav"><button class="rpg-ui-calendar-arrow" type="button" aria-label="Previous month">‹</button>
              <div class="rpg-ui-calendar-month" aria-live="polite"><span>${escape(title)}</span><span class="rpg-ui-calendar-dot-separator" aria-hidden="true">·</span><span>Year 1</span></div>
              <button class="rpg-ui-calendar-arrow" type="button" aria-label="Next month">›</button></div>
            <div class="rpg-ui-calendar-weekdays" role="row">${weekdays.map((name) => `<span role="columnheader">${name}</span>`).join("")}</div>
            <div class="rpg-ui-calendar-grid" role="grid">${cells}</div>
          </div>
          <aside class="rpg-ui-calendar-events" aria-label="Events">
            <div class="rpg-ui-calendar-events-header"><h3>Events</h3><span class="rpg-ui-calendar-selected">Day ${current}</span></div>
            <div class="rpg-ui-calendar-event-list">${list.length ? list.map((event) => `
              <button class="rpg-ui-calendar-event" type="button" data-selected="${event.day === current}" data-day="${event.day}">
                <span class="rpg-ui-calendar-event-icon" style="--rpg-ui-calendar-color:${event.color}" aria-hidden="true">${event.glyph}</span>
                <span class="rpg-ui-calendar-event-text"><strong>${escape(event.title)}</strong><small>${escape(event.description)}</small></span>
                <span class="rpg-ui-calendar-event-day">Day ${event.day}</span></button>`).join("") : `
              <div class="rpg-ui-empty-state"><span aria-hidden="true">◇</span><h3>Nothing planned</h3><p>Events and important dates will appear here.</p></div>`}
            </div>
          </aside>
        </div>
      </section></div></div>`;
    root.querySelectorAll<HTMLElement>("[data-day]").forEach((element) =>
      element.addEventListener("click", () => {
        current = Number(element.dataset.day);
        render();
      }),
    );
  }
  render();
  return root;
}

export const Month: StoryObj = { render: () => calendarStory() };
export const SelectedEvent: StoryObj = { render: () => calendarStory({ selected: 21 }) };
export const NothingPlanned: StoryObj = { render: () => calendarStory({ events: [] }) };
export const ShortMonth: StoryObj = {
  render: () => calendarStory({ events: sample.slice(0, 3), firstWeekday: 5, daysInMonth: 28, today: 12, title: "Winter" }),
};
