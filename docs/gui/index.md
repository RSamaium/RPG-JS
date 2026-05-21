---
title: "GUI overview"
description: "Choose the right RPGJS GUI pattern for screens, HUDs, dialogs, and sprite-attached interfaces."
---

# GUI overview

GUI pages cover interfaces that open, close, receive user input, and exchange actions with the game. They are separate from sprite rendering components.

Use GUI when the player interacts with an interface, when the server opens a menu or dialog, or when a screen-level element should live above the game canvas.

## Choose a GUI pattern

| Need | Use |
| --- | --- |
| Show a start screen before the player enters the game | [Title Screen](/gui/title-screen) |
| Display conversations or narrative text | [Dialog Box](/gui/dialog-box) |
| Show persistent game information on screen | [HUD](/gui/hud) |
| Add numbered shortcuts for items, skills, and actions | [Hotbar](/gui/hotbar) |
| Replace a prebuilt GUI with your own component | [Prebuilt GUI Contracts](/gui/prebuilt-contracts) |
| Attach an interactive interface to a sprite | [Attach GUI to Sprites](/guide/gui/attach-gui) |
| Apply client-side feedback before the server confirms an action | [Optimistic GUI Actions](/gui/optimistic-actions) |
| Inject engine services inside `.ce` GUI files | [Engine Injection in .ce Files](/gui/engine-injection) |
| Build GUI with Vue components | [Vue.js integration](/gui/vue-integration) |

## GUI or component?

Use [Components overview](/guide/components-overview) when you only need a passive visual layer around sprites.

Use GUI when the element behaves like an interface: it can be opened, hidden, updated with GUI data, or can send interactions back to the server.

## Attached GUI

An attached GUI follows a sprite in the map, but it still belongs to the GUI system. This makes it useful for tooltips, contextual menus, and interactive widgets that need GUI lifecycle methods.

For passive labels or bars around sprites, prefer [Sprite Components](/guide/sprite-components) or [Authoritative Sprite Components](/guide/component).
