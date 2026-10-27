---
"@rpgjs/server": minor
"@rpgjs/client": minor
"@rpgjs/ui-css": minor
---

A game or a Studio plugin can add entries with a data panel to the main menu: `player.callMainMenu({ entries: [{ id: "quests", label: "Quests", panel: { list: [...] } }], onEntryAction })`. The entries come after the built-in ones by default (`before`, `after` or `index` on an entry put it elsewhere), a built-in id cannot be redefined, and `entries` can be a function read again at each refresh so the panel follows the state of the player. A panel is plain data (rows with a title, subtitle, text, badge, progress bar and actions) that the built-in menu draws in the right column with the pointer, the keyboard and the gamepad. The actions are validated by the server against what the panel offers before `onEntryAction` runs; an entry without a panel calls `onEntryAction` with the action `open`. New types `MenuCustomEntry`, `MenuPanel`, `MenuPanelItem`, `MenuPanelAction` and `MenuEntryActionContext`.
