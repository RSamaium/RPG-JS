---
"@rpgjs/action-battle": patch
"@rpgjs/studio": patch
---

Fix an enemy that came back invisible after being defeated: a map reload (`updateMap`, run about twenty times when a Studio map loads) replaces the events, but the Action Battle AI of each replaced event kept running, unseen, and kept attacking and holding the battle music. The AI now stops as soon as its event is no longer the one registered on the map.

Fix "Start" doing nothing after Game Over → Title screen: the title screen opened over the map, where nothing handles "Start". Studio now handles the title entries there: "Start" resets the hero, selects the actor and restarts on the start map, "Load" opens the load menu.
