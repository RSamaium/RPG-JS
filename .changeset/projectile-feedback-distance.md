---
"@rpgjs/client": minor
---

The impact sound and map shake of the standard projectile component only reach the players near the impact: they fade with the distance to the local player (the sound also pans to the side of the impact) and stop beyond `feedbackDistance` (480 px by default, set per look). In an MMORPG, a fight elsewhere on the map no longer shakes every screen.
