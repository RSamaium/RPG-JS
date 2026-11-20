---
"@rpgjs/studio": minor
---

The Studio server module answers the `scriptEnemy.create(event, enemyId)` hook of the scripts: `$map.spawnEnemy({ enemy, x, y })` turns the event into an enemy of the database of the game, as an enemy event is (parameters, level, natural attack, HP/SP, skills, battle AI or the interaction of the host, graphic). `initializeStudioEnemy(event, enemy, map)` does it for both.
