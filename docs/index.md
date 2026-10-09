---
title: "Quick Start"
description: "Create and run your first RPGJS project in a few minutes."
---

# Quick Start

Use the starter, install dependencies, and launch the dev server:

```bash
npx degit rpgjs/starter#v5 my-rpg-game
cd my-rpg-game
npm install
npm run dev
```

Open `http://localhost:5173`.

## Choose MMORPG or standalone RPG

By default, the starter runs as a standalone RPG. This mode runs the client and
server together in the browser and does not create a public multiplayer server.

To run the client and authoritative server separately for an MMORPG, set
`RPG_TYPE=mmorpg`:

```bash
RPG_TYPE=mmorpg npm run dev
```

On Windows, use `cross-env`:

```bash
npm install --save-dev cross-env
npx cross-env RPG_TYPE=mmorpg npm run dev
```

## Next steps

- [Getting Started](/guide/get-started)
- [Structure](/guide/structure)
- [Create your first map](/guide/create-your-first-map)
- [Create hero in map](/guide/create-hero-in-map)
- [Put an MMORPG online](/guide/deploy-mmorpg)
- [API overview](/api)
- [Studio overview](/studio/index)
- [GitHub repository](https://github.com/RSamaium/RPG-JS)
