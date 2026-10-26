---
"@rpgjs/physic": patch
"@rpgjs/server": patch
---

Order the collisions of a step much faster, with the same order. The world sorted its collisions on every resolver pass by building the pair key again for each comparison and comparing with `localeCompare`; with about 30 players overlapping on a map it was more than 40 % of the CPU time of a server. The key is now built once per sort, and the ids made of ASCII letters, digits and `-` (those of RPGJS) are compared with plain string comparisons that give the order of the root collation (letters without their case, then lowercase before uppercase). Any other key goes through a shared `Intl.Collator`, and the plain comparison is only used after a check, once, that it matches the collation of the runtime. The order of the collisions, and so the simulation, is unchanged.
