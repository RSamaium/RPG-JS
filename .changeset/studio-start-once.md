---
"@rpgjs/studio": patch
---

Do not start the game again when a connection only transfers the player into a map. Every reconnection to the map room used to send the player to the start map again, so the client loaded the map about eight times before the first one was shown.
