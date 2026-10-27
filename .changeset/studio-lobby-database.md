---
"@rpgjs/studio": patch
---

Choosing a hero in the character selection of an MMORPG no longer leaves the player on a black screen. The player is still in the lobby at that moment, and `setActor` looks the class and the skills of the actor up in the database of its room, which only received the Studio records once the player joined a map (`The ID=<skill> data is not found in the database`, then the transfer to the start map never happened). The Studio database is now registered in the room of the player before `setActor`.
