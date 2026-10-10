---
"@rpgjs/common": patch
"@rpgjs/client": patch
"@rpgjs/ui-css": minor
---

Add a clock on screen for the Time Manager: `withTimeManager({ hud: true })` (or `hud: { position, size, fastScale }`) draws a pill with the day and the hour, and a round medallion whose sky, sun, moon and stars follow the hour of the server, with a badge when the time is paused or fast. `@rpgjs/ui-css` gets the `rpg-ui-clock` styles and Storybook stories.
