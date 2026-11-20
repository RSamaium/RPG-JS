---
"@rpgjs/server": patch
---

A state of the database given as plain data (a Studio record, `{ name, effects, _type: "state" }`) can be added, found and removed: `player.addState("poison")` failed with `stateClass is not a constructor`. The state is a copy of the record, with its id.
