---
"@rpgjs/script": minor
---

Scripts read the database of the game with `$data`: `$data.get(type, id)` gives a copy of a record of a collection (or `undefined`) and `$data.list(type)` copies of the records of a collection (1 000 at most). On a real game the records are the ones RPGJS keeps in the database of the room, with `_type` for their collection, as `@rpgjs/studio` loads them, so a script can read the collections a project adds (quests, for example). A simulation takes the records in `world.data`.
