---
"@rpgjs/server": patch
---

Fix: a player who has just joined a map no longer triggers `onTouch` / `onPlayerTouch` of the events under or placed on the arrival point, so paired doors no longer bounce the player back (#400). The contact stays silent until the player leaves the event (or sends an input, or the 1 s arrival window ends) and fires again on the next contact.
