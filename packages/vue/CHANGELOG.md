# @rpgjs/vue

## 5.0.0-beta.27

### Patch Changes

- e5ad24a: Establish the stable RPGJS-owned boundary for reactive gameplay properties,
  dependency-injection providers, Node room storage, and Cloudflare room hosting.
  Remove accidental Signe re-exports from the client and server roots, keep
  direct Signe imports as an explicitly advanced plugin path, and protect every
  published TypeScript entry with declaration reachability snapshots in CI.
  Keep provider creation strategies mutually exclusive, support asynchronous
  provider factories, and preserve strict member checking on the server engine.
  Enforce these public contracts in CI, test the RPGJS-owned Node storage
  lifecycle, and document complete stable migration examples.
- Updated dependencies [dc6aed5]
- Updated dependencies [e5ad24a]
  - @rpgjs/client@5.0.0-beta.27
  - @rpgjs/common@5.0.0-beta.26

## 5.0.0-beta.26

### Patch Changes

- b6ab003: Establish `defineModule()` as the canonical runtime module authoring API, export it from the client and server packages, keep `createModule()` for advanced provider composition, and align runtime-specific module installation documentation and examples.
- Updated dependencies [b6ab003]
- Updated dependencies [83fc2b7]
  - @rpgjs/client@5.0.0-beta.26
  - @rpgjs/common@5.0.0-beta.25

## 5.0.0-beta.25

### Patch Changes

- ccb9495: Fix TypeScript declaration errors across the package build, align multi-target declaration exports, complete movement API overloads, and make package and root builds fail when declaration generation reports a type error.
- Updated dependencies [ccb9495]
- Updated dependencies [0512640]
  - @rpgjs/client@5.0.0-beta.25
  - @rpgjs/common@5.0.0-beta.24

## 5.0.0-beta.24

### Patch Changes

- Updated dependencies [e11f2ed]
- Updated dependencies [3fb2765]
- Updated dependencies [be412cf]
  - @rpgjs/client@5.0.0-beta.24
  - @rpgjs/common@5.0.0-beta.23

## 5.0.0-beta.23

### Patch Changes

- Updated dependencies [e7d8d13]
  - @rpgjs/client@5.0.0-beta.23
  - @rpgjs/common@5.0.0-beta.22

## 5.0.0-beta.22

### Patch Changes

- Updated dependencies [1028c17]
  - @rpgjs/client@5.0.0-beta.22

## 5.0.0-beta.20

### Patch Changes

- Release the next RPGJS beta while keeping the physics package unchanged.
- Updated dependencies
  - @rpgjs/client@5.0.0-beta.20
  - @rpgjs/common@5.0.0-beta.20

## 5.0.0-beta.19

### Patch Changes

- Release the next RPGJS beta while keeping the physics package unchanged.
- Updated dependencies
  - @rpgjs/client@5.0.0-beta.19
  - @rpgjs/common@5.0.0-beta.19

## 5.0.0-beta.17

### Patch Changes

- Release the next RPGJS beta while keeping the physics package on its stable release line.
- Updated dependencies
  - @rpgjs/client@5.0.0-beta.17
  - @rpgjs/common@5.0.0-beta.16

## 5.0.0-beta.16

### Patch Changes

- Release the next RPGJS beta with terrain rendering performance improvements and a unified server tick loop.
- Updated dependencies
  - @rpgjs/client@5.0.0-beta.16
  - @rpgjs/common@5.0.0-beta.15

## 5.0.0-beta.15

### Patch Changes

- Updated dependencies [dba133e]
  - @rpgjs/client@5.0.0-beta.15

## 5.0.0-beta.14

### Patch Changes

- Updated dependencies [c96b31a]
  - @rpgjs/common@5.0.0-beta.14
  - @rpgjs/client@5.0.0-beta.14

## 5.0.0-beta.13

### Patch Changes

- Release the next RPGJS beta with client interactions, i18n support, movement and physics improvements, Studio fixes, action battle updates, playground migration, and related runtime documentation.
- Updated dependencies
  - @rpgjs/client@5.0.0-beta.13
  - @rpgjs/common@5.0.0-beta.13

## 5.0.0-beta.12

### Patch Changes

- Updated dependencies
  - @rpgjs/client@5.0.0-beta.12
  - @rpgjs/common@5.0.0-beta.12

## 5.0.0-beta.11

### Patch Changes

- Align the Vue package compiler dependency with the beta.11 CanvasEngine release.

## 5.0.0-beta.10

### Patch Changes

- Fix current-player control binding and canMove reads when values are provided by synced or reactive state.

  Fix Vue GUI rendering for hidden fixed GUIs while keeping attached GUI targets updated.

- Updated dependencies
  - @rpgjs/client@5.0.0-beta.10

## 5.0.0-beta.9

### Major Changes

- c456d25: beta.9

### Patch Changes

- Updated dependencies [c456d25]
  - @rpgjs/client@5.0.0-beta.9
  - @rpgjs/common@5.0.0-beta.9

## 5.0.0-beta.8

### Major Changes

- 35e7fa4: beta.8

### Patch Changes

- Updated dependencies [35e7fa4]
  - @rpgjs/client@5.0.0-beta.8
  - @rpgjs/common@5.0.0-beta.8
