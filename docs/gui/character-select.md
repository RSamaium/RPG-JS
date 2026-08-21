---
title: "Character Select"
description: "Offer server-owned Actors and let the player choose one before starting a game."
---

# Character Select

Use `player.showCharacterSelect()` to open the native `rpg-character-select`
GUI. The server resolves every Actor, sends only presentation data to the
client, and returns only an Actor that was in the offered list.

```ts
const actor = await player.showCharacterSelect([Hero, Mage], {
  title: "Choose your hero",
  selectedActorId: "hero",
})

if (actor) {
  player.setActor(actor)
}
```

The selector does not apply the result automatically. This keeps game startup,
save-slot creation, and MMORPG account logic explicit. Inputs can be Actor
constructors, registered database IDs, or resolved Actor objects. Every resolved
Actor must expose a unique non-empty `id`.

The built-in cinematic carousel supports keyboard, gamepad, pointer buttons,
and horizontal swipe. It renders these optional Actor presentation fields:

- `name`, `description`, `graphic`, `faceset`, and `illustration`
- `className`, `classDescription`, and `classIcon`, or a resolved `class` object
- `parameters.maxHp`, `parameters.str`, `parameters.pdef`, `parameters.agi`, and
  `parameters.int` (the curve `start` value is displayed)

Only these presentation fields are sent to the client. Other Actor and Class
properties remain server-side. Register `graphic`, `illustration`, and
`classIcon` sprite sheets on the client before opening the GUI.

`allowCancel` defaults to `false`. When enabled, cancellation resolves to
`null`. Player movement is blocked while the GUI is open.

Projects can replace the CanvasEngine component by registering another GUI with
`PrebuiltGui.CharacterSelect`; preserve the interactions documented in
[Prebuilt GUI Contracts](/gui/prebuilt-contracts).
