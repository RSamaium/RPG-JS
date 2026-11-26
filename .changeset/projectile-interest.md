---
"@rpgjs/server": patch
---

With map streaming, the interest of players in flying projectiles costs less (#520). At every physics step, the position and the chunk of each flying projectile were computed again for every player. They are now computed once per step, and a player whose retained chunks did not change is skipped when no projectile changed chunk. With 100 players who see 55 flying projectiles, the step spends about 0.1 to 0.2 ms on it instead of 1.2 ms. A spawn packet is also filtered for every client from one computation of the chunks of its projectiles.
