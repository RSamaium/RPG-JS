# @rpgjs/chat

## 5.0.0

### Minor Changes

- 995277f: Add explicit renderer-neutral GUI registrations with an official Vue helper,
  ship the authoritative and replaceable RPGJS chat module, provide default and
  pixel chat themes over shared semantic CSS primitives, and enforce client/server
  production bundle isolation with executable fixtures. Include a runnable pixel
  chat playground and keep chat socket listeners active across standalone startup
  and player map transfers. Document client/server setup, moderation hooks,
  replacement components, themes, translations, and the public chat state API.
  Emit complete side-specific chat declarations, synchronize the built-in input
  length with client configuration, and reject explicitly unknown chat channels.

### Patch Changes

- 973878b: Update CanvasEngine to 2.3.0. The 2.3 compiler no longer injects `computed`, `h`, `cond` and `loop` into every component, so components now import the helpers their script uses. `rpgjs()` declares its `Plugin[]` return type.
- 1cae469: Update CanvasEngine to 2.4.0. Templates now read computed signals explicitly (`position().x` in the HP bar, light halo and dynamic bar components) and the action-battle projectile trail passes `loop={true}` to its `Fx`.
- ad200a9: Publish the chat plugin with the current engine versions and CanvasEngine 2.4.0; the 5.0.0-rc.9 version number was already taken on npm by an older build.
- 00ac672: Prevent npm releases from containing unresolved `workspace:` dependency protocols, and publish release candidates directly under the npm `latest` tag.
- 15ae51e: Publish release candidates under the npm `latest` tag so fresh RPGJS projects install the current release.
- 98a30f0: Publish release candidates under npm's `latest` tag while retaining the repository's prerelease mode.
- Updated dependencies [decf73e]
- Updated dependencies [b74236b]
- Updated dependencies [37a4fb0]
- Updated dependencies [8ef3f4a]
- Updated dependencies [b6ab003]
- Updated dependencies [973878b]
- Updated dependencies [1cae469]
- Updated dependencies [e7b12ab]
- Updated dependencies [ccb9495]
- Updated dependencies [e7d8d13]
- Updated dependencies [1028c17]
- Updated dependencies [777541a]
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
- Updated dependencies [48fcd25]
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
- Updated dependencies [7846969]
- Updated dependencies [6b8d872]
- Updated dependencies [13517b8]
- Updated dependencies [72d3e5d]
- Updated dependencies [15ae51e]
- Updated dependencies [e11f2ed]
- Updated dependencies [f624302]
- Updated dependencies [59c06c9]
- Updated dependencies [98a30f0]
- Updated dependencies [335b768]
- Updated dependencies [e0bba29]
- Updated dependencies [85aea0c]
- Updated dependencies [c849207]
- Updated dependencies [f6aa046]
- Updated dependencies [14f7cf9]
- Updated dependencies [1393b73]
- Updated dependencies [3fb2765]
- Updated dependencies [1a45ca5]
- Updated dependencies [327185b]
- Updated dependencies [fc86ec2]
- Updated dependencies [66c0d77]
- Updated dependencies [e5ad24a]
- Updated dependencies [a7f44ba]
- Updated dependencies [83fc2b7]
- Updated dependencies [8ef3f4a]
- Updated dependencies [be412cf]
- Updated dependencies [2719f48]
- Updated dependencies [aed4d3e]
- Updated dependencies [06afecc]
- Updated dependencies [0dbe078]
- Updated dependencies [114469c]
- Updated dependencies [ef47908]
- Updated dependencies [0512640]
- Updated dependencies [3d13f8c]
  - @rpgjs/common@5.0.0
  - @rpgjs/client@5.0.0
  - @rpgjs/server@5.0.0
  - @rpgjs/vite@5.0.0

## 5.0.0-rc.10

### Patch Changes

- ad200a9: Publish the chat plugin with the current engine versions and CanvasEngine 2.4.0; the 5.0.0-rc.9 version number was already taken on npm by an older build.

## 5.0.0-rc.9

### Patch Changes

- 1cae469: Update CanvasEngine to 2.4.0. Templates now read computed signals explicitly (`position().x` in the HP bar, light halo and dynamic bar components) and the action-battle projectile trail passes `loop={true}` to its `Fx`.
- Updated dependencies [1cae469]
- Updated dependencies [14f7cf9]
- Updated dependencies [114469c]
  - @rpgjs/client@5.0.0-rc.9
  - @rpgjs/server@5.0.0-rc.9
  - @rpgjs/vite@5.0.0-rc.9

## 5.0.0-rc.8

### Patch Changes

- 973878b: Update CanvasEngine to 2.3.0. The 2.3 compiler no longer injects `computed`, `h`, `cond` and `loop` into every component, so components now import the helpers their script uses. `rpgjs()` declares its `Plugin[]` return type.
- Updated dependencies [973878b]
- Updated dependencies [a0710ce]
- Updated dependencies [c69f516]
- Updated dependencies [7846969]
- Updated dependencies [13517b8]
- Updated dependencies [72d3e5d]
- Updated dependencies [1a45ca5]
- Updated dependencies [327185b]
- Updated dependencies [fc86ec2]
- Updated dependencies [a7f44ba]
- Updated dependencies [0dbe078]
  - @rpgjs/client@5.0.0-rc.8
  - @rpgjs/server@5.0.0-rc.8
  - @rpgjs/vite@5.0.0-rc.8
  - @rpgjs/common@5.0.0-rc.6

## 5.0.0-rc.7

### Patch Changes

- Updated dependencies
- Updated dependencies [ef47908]
  - @rpgjs/client@5.0.0-rc.7
  - @rpgjs/server@5.0.0-rc.7
  - @rpgjs/vite@5.0.0-rc.7

## 5.0.0-rc.6

### Patch Changes

- Updated dependencies [d88267a]
- Updated dependencies
  - @rpgjs/common@5.0.0-rc.5
  - @rpgjs/server@5.0.0-rc.6
  - @rpgjs/client@5.0.0-rc.6
  - @rpgjs/vite@5.0.0-rc.6

## 5.0.0-rc.5

### Patch Changes

- Updated dependencies [f488e28]
  - @rpgjs/client@5.0.0-rc.5
  - @rpgjs/server@5.0.0-rc.5
  - @rpgjs/vite@5.0.0-rc.5

## 5.0.0-rc.4

### Patch Changes

- Publish release candidates under npm's `latest` tag while retaining the repository's prerelease mode.
- Updated dependencies
  - @rpgjs/client@5.0.0-rc.4
  - @rpgjs/common@5.0.0-rc.4
  - @rpgjs/server@5.0.0-rc.4
  - @rpgjs/vite@5.0.0-rc.4

## 5.0.0-rc.3

### Patch Changes

- Publish release candidates under the npm `latest` tag so fresh RPGJS projects install the current release.
- Updated dependencies
  - @rpgjs/client@5.0.0-rc.3
  - @rpgjs/common@5.0.0-rc.3
  - @rpgjs/server@5.0.0-rc.3
  - @rpgjs/vite@5.0.0-rc.3

## 5.0.0-rc.2

### Patch Changes

- Prevent npm releases from containing unresolved `workspace:` dependency protocols.
- Updated dependencies
  - @rpgjs/client@5.0.0-rc.2
  - @rpgjs/common@5.0.0-rc.2
  - @rpgjs/server@5.0.0-rc.2
  - @rpgjs/vite@5.0.0-rc.2

## 5.0.0-rc.9

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
  - @rpgjs/server@5.0.0-rc.36
  - @rpgjs/common@5.0.0-rc.32
  - @rpgjs/vite@5.0.0-rc.36

## 5.0.0-beta.8

### Patch Changes

- Updated dependencies [e7b12ab]
  - @rpgjs/client@5.0.0-beta.35
  - @rpgjs/server@5.0.0-beta.35
  - @rpgjs/vite@5.0.0-beta.35

## 5.0.0-beta.7

### Patch Changes

- Updated dependencies [b74236b]
- Updated dependencies [1fb8040]
- Updated dependencies [6b8d872]
- Updated dependencies [85aea0c]
  - @rpgjs/client@5.0.0-beta.34
  - @rpgjs/common@5.0.0-beta.31
  - @rpgjs/server@5.0.0-beta.34
  - @rpgjs/vite@5.0.0-beta.34

## 5.0.0-beta.6

### Patch Changes

- Updated dependencies [0909491]
- Updated dependencies [c849207]
  - @rpgjs/client@5.0.0-beta.33
  - @rpgjs/server@5.0.0-beta.33
  - @rpgjs/vite@5.0.0-beta.33

## 5.0.0-beta.5

### Patch Changes

- Updated dependencies [decf73e]
- Updated dependencies [1bcd9fc]
  - @rpgjs/common@5.0.0-beta.30
  - @rpgjs/client@5.0.0-beta.32
  - @rpgjs/server@5.0.0-beta.32
  - @rpgjs/vite@5.0.0-beta.32

## 5.0.0-beta.4

### Patch Changes

- Updated dependencies [e892732]
  - @rpgjs/client@5.0.0-beta.31
  - @rpgjs/common@5.0.0-beta.29
  - @rpgjs/server@5.0.0-beta.31
  - @rpgjs/vite@5.0.0-beta.31

## 5.0.0-beta.3

### Patch Changes

- Updated dependencies [e0bba29]
- Updated dependencies [aed4d3e]
  - @rpgjs/client@5.0.0-beta.30
  - @rpgjs/common@5.0.0-beta.28
  - @rpgjs/server@5.0.0-beta.30
  - @rpgjs/vite@5.0.0-beta.30

## 5.0.0-beta.2

### Patch Changes

- Updated dependencies [512e637]
- Updated dependencies [4b6fe16]
- Updated dependencies [512e637]
- Updated dependencies [4cc3086]
- Updated dependencies [9f317fb]
- Updated dependencies [512e637]
- Updated dependencies [aa4a517]
  - @rpgjs/server@5.0.0-beta.29
  - @rpgjs/client@5.0.0-beta.29
  - @rpgjs/common@5.0.0-beta.27
  - @rpgjs/vite@5.0.0-beta.29

## 5.0.0-beta.1

### Minor Changes

- 995277f: Add explicit renderer-neutral GUI registrations with an official Vue helper,
  ship the authoritative and replaceable RPGJS chat module, provide default and
  pixel chat themes over shared semantic CSS primitives, and enforce client/server
  production bundle isolation with executable fixtures. Include a runnable pixel
  chat playground and keep chat socket listeners active across standalone startup
  and player map transfers. Document client/server setup, moderation hooks,
  replacement components, themes, translations, and the public chat state API.
  Emit complete side-specific chat declarations, synchronize the built-in input
  length with client configuration, and reject explicitly unknown chat channels.

### Patch Changes

- Updated dependencies [37a4fb0]
- Updated dependencies [995277f]
- Updated dependencies [995277f]
- Updated dependencies [335b768]
  - @rpgjs/server@5.0.0-beta.28
  - @rpgjs/client@5.0.0-beta.28
  - @rpgjs/vite@5.0.0-beta.28
