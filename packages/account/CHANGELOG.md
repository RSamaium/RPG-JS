# @rpgjs/account

## 5.0.0

### Minor Changes

- f624302: Add a pre-connection MMORPG account GUI, deferred client connections, rich
  server authentication results, and player-aware authentication lifecycle hooks.
  Registration uses distinct username and email fields with password confirmation,
  and restored sessions no longer flash the account GUI before the title screen.
  Add branded account screens with configurable imagery, music and UI sounds,
  reusable form feedback primitives, and optional password recovery/reset adapters.

### Patch Changes

- 973878b: Update CanvasEngine to 2.3.0. The 2.3 compiler no longer injects `computed`, `h`, `cond` and `loop` into every component, so components now import the helpers their script uses. `rpgjs()` declares its `Plugin[]` return type.
- 1cae469: Update CanvasEngine to 2.4.0. Templates now read computed signals explicitly (`position().x` in the HP bar, light halo and dynamic bar components) and the action-battle projectile trail passes `loop={true}` to its `Fx`.
- 00ac672: Prevent npm releases from containing unresolved `workspace:` dependency protocols, and publish release candidates directly under the npm `latest` tag.
- 15ae51e: Publish release candidates under the npm `latest` tag so fresh RPGJS projects install the current release.
- 98a30f0: Publish release candidates under npm's `latest` tag while retaining the repository's prerelease mode.
- Updated dependencies [decf73e]
- Updated dependencies [b74236b]
- Updated dependencies [8ef3f4a]
- Updated dependencies [b6ab003]
- Updated dependencies [973878b]
- Updated dependencies [1cae469]
- Updated dependencies [e7b12ab]
- Updated dependencies [ccb9495]
- Updated dependencies [e7d8d13]
- Updated dependencies [1028c17]
- Updated dependencies [1bcd9fc]
- Updated dependencies [a0710ce]
- Updated dependencies [94cbdac]
- Updated dependencies [4d53aa7]
- Updated dependencies [66c0d77]
- Updated dependencies [66c0d77]
- Updated dependencies [94cbdac]
- Updated dependencies [94cbdac]
- Updated dependencies [fd12af7]
- Updated dependencies [c69f516]
- Updated dependencies [f488e28]
- Updated dependencies [8ef3f4a]
- Updated dependencies [e892732]
- Updated dependencies [00ac672]
- Updated dependencies [dc6aed5]
- Updated dependencies [0909491]
- Updated dependencies [50611c7]
- Updated dependencies [995277f]
- Updated dependencies [1fb8040]
- Updated dependencies [041d5ee]
- Updated dependencies [0fa8fb9]
- Updated dependencies [995277f]
- Updated dependencies [94cbdac]
- Updated dependencies [13517b8]
- Updated dependencies [72d3e5d]
- Updated dependencies [15ae51e]
- Updated dependencies [e11f2ed]
- Updated dependencies [f624302]
- Updated dependencies [59c06c9]
- Updated dependencies [98a30f0]
- Updated dependencies [e0bba29]
- Updated dependencies [85aea0c]
- Updated dependencies [c849207]
- Updated dependencies [14f7cf9]
- Updated dependencies [1393b73]
- Updated dependencies [3fb2765]
- Updated dependencies [1a45ca5]
- Updated dependencies [327185b]
- Updated dependencies [66c0d77]
- Updated dependencies [e5ad24a]
- Updated dependencies [83fc2b7]
- Updated dependencies [8ef3f4a]
- Updated dependencies [be412cf]
- Updated dependencies [2719f48]
- Updated dependencies [aed4d3e]
- Updated dependencies [06afecc]
- Updated dependencies [0dbe078]
- Updated dependencies [0512640]
- Updated dependencies [3d13f8c]
  - @rpgjs/common@5.0.0
  - @rpgjs/client@5.0.0
  - @rpgjs/vite@5.0.0

## 5.0.0-rc.9

### Patch Changes

- 1cae469: Update CanvasEngine to 2.4.0. Templates now read computed signals explicitly (`position().x` in the HP bar, light halo and dynamic bar components) and the action-battle projectile trail passes `loop={true}` to its `Fx`.
- Updated dependencies [1cae469]
- Updated dependencies [14f7cf9]
  - @rpgjs/client@5.0.0-rc.9
  - @rpgjs/vite@5.0.0-rc.9

## 5.0.0-rc.8

### Patch Changes

- 973878b: Update CanvasEngine to 2.3.0. The 2.3 compiler no longer injects `computed`, `h`, `cond` and `loop` into every component, so components now import the helpers their script uses. `rpgjs()` declares its `Plugin[]` return type.
- Updated dependencies [973878b]
- Updated dependencies [a0710ce]
- Updated dependencies [c69f516]
- Updated dependencies [13517b8]
- Updated dependencies [72d3e5d]
- Updated dependencies [1a45ca5]
- Updated dependencies [327185b]
- Updated dependencies [0dbe078]
  - @rpgjs/client@5.0.0-rc.8
  - @rpgjs/vite@5.0.0-rc.8
  - @rpgjs/common@5.0.0-rc.6

## 5.0.0-rc.7

### Patch Changes

- Updated dependencies
  - @rpgjs/client@5.0.0-rc.7
  - @rpgjs/vite@5.0.0-rc.7

## 5.0.0-rc.6

### Patch Changes

- Updated dependencies [d88267a]
- Updated dependencies
  - @rpgjs/common@5.0.0-rc.5
  - @rpgjs/client@5.0.0-rc.6
  - @rpgjs/vite@5.0.0-rc.6

## 5.0.0-rc.5

### Patch Changes

- Updated dependencies [f488e28]
  - @rpgjs/client@5.0.0-rc.5
  - @rpgjs/vite@5.0.0-rc.5

## 5.0.0-rc.4

### Patch Changes

- Publish release candidates under npm's `latest` tag while retaining the repository's prerelease mode.
- Updated dependencies
  - @rpgjs/client@5.0.0-rc.4
  - @rpgjs/common@5.0.0-rc.4
  - @rpgjs/vite@5.0.0-rc.4

## 5.0.0-rc.3

### Patch Changes

- Publish release candidates under the npm `latest` tag so fresh RPGJS projects install the current release.
- Updated dependencies
  - @rpgjs/client@5.0.0-rc.3
  - @rpgjs/common@5.0.0-rc.3
  - @rpgjs/vite@5.0.0-rc.3

## 5.0.0-rc.2

### Patch Changes

- Prevent npm releases from containing unresolved `workspace:` dependency protocols.
- Updated dependencies
  - @rpgjs/client@5.0.0-rc.2
  - @rpgjs/common@5.0.0-rc.2
  - @rpgjs/vite@5.0.0-rc.2

## 5.0.0-rc.1

### Minor Changes

- f624302: Add a pre-connection MMORPG account GUI, deferred client connections, rich
  server authentication results, and player-aware authentication lifecycle hooks.
  Registration uses distinct username and email fields with password confirmation,
  and restored sessions no longer flash the account GUI before the title screen.
  Add branded account screens with configurable imagery, music and UI sounds,
  reusable form feedback primitives, and optional password recovery/reset adapters.

### Patch Changes

- Updated dependencies [94cbdac]
- Updated dependencies [4d53aa7]
- Updated dependencies [66c0d77]
- Updated dependencies [66c0d77]
- Updated dependencies [94cbdac]
- Updated dependencies [94cbdac]
- Updated dependencies [94cbdac]
- Updated dependencies [f624302]
- Updated dependencies [66c0d77]
  - @rpgjs/client@5.0.0-rc.36
  - @rpgjs/common@5.0.0-rc.32
  - @rpgjs/vite@5.0.0-rc.36

## 5.0.0-beta.0

Initial beta of the optional pre-connection MMORPG account GUI.
