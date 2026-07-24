---
"@rpgjs/action-battle": patch
"@rpgjs/client": patch
"@rpgjs/studio": patch
---

Make Adventure combat more responsive and readable with overlap-safe control locks, guard/parry/counter gameplay, soft targeting, coordinated enemy attack turns, Studio-driven combat animations, skill hit-rate handling, anchored impact feedback, configurable hit-stop, and enemy death effects.

Let temporary attack spritesheets finish their visual follow-through after gameplay recovery instead of forcing the character back to `stand` mid-animation. Studio four-direction attack spritesheets now play in 350ms by default without changing locomotion speed, with an optional `attackDurationMs` media metadata override.

Keep repeated Studio event placements as independent runtime entities with deterministic instance ids and separate hitboxes.
