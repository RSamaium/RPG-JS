---
"@rpgjs/action-battle": patch
---

Fix instant skills with zero targeting range selecting no nearby enemies because
their automatic targeting radius was reduced to one pixel. Use the configured
soft-targeting distance for server-selected targets, allowing damage and impact
animations to execute while preserving explicit target range validation.
