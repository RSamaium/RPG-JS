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

By default, the starter runs as a standalone RPG. The server runs inside the
browser in this mode, so other players cannot connect to it over the internet.

Choose MMORPG mode explicitly when you want a separate authoritative server:

```bash
RPG_TYPE=mmorpg npm run dev
```

On Windows, use `cross-env`:

```bash
npm install --save-dev cross-env
npx cross-env RPG_TYPE=mmorpg npm run dev
```

## What to read next

Follow this order:

1. [Getting Started](/guide/get-started)
2. [Structure](/guide/structure)
3. [Create your first map](/guide/create-your-first-map)
4. [Create hero in map](/guide/create-hero-in-map)
5. [Put an MMORPG online](/guide/deploy-mmorpg)
