# @rpgjs/physic

## 5.0.4

### Patch Changes

- aa0fa28: Order the collisions of a step much faster, with the same order. The world sorted its collisions on every resolver pass by building the pair key again for each comparison and comparing with `localeCompare`; with about 30 players overlapping on a map it was more than 40 % of the CPU time of a server. The key is now built once per sort, and the ids made of ASCII letters, digits and `-` (those of RPGJS) are compared with plain string comparisons that give the order of the root collation (letters without their case, then lowercase before uppercase). Any other key goes through a shared `Intl.Collator`, and the plain comparison is only used after a check, once, that it matches the collation of the runtime. The order of the collisions, and so the simulation, is unchanged.

## 5.0.3

### Patch Changes

- ccb9495: Fix TypeScript declaration errors across the package build, align multi-target declaration exports, complete movement API overloads, and make package and root builds fail when declaration generation reports a type error.

## 5.0.2

### Patch Changes

- ccb9495: Fix TypeScript declaration errors across the package build, align multi-target declaration exports, complete movement API overloads, and make package and root builds fail when declaration generation reports a type error.

## 5.0.1-beta.0

### Patch Changes

- Release the next RPGJS beta with client interactions, i18n support, movement and physics improvements, Studio fixes, action battle updates, playground migration, and related runtime documentation.

## 5.0.0

### Minor Changes

- 18aa0ad: Add movement strategy helpers, physics gameplay examples, and expanded physics documentation.
