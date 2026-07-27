---
title: "GUI Commands"
description: "Dialogs, menus, notifications, and custom GUI commands."
---

# GUI Commands

Dialogs, menus, notifications, and custom GUI commands.

## Members

- [Call custom GUI](#call-custom-gui)
- [Call Game Over Menu](#call-game-over-menu)
- [Call Main Menu](#call-main-menu)
- [Call Shop Menu](#call-shop-menu)
- [Close custom GUI](#close-custom-gui)
- [Displays a notification](#displays-a-notification)
- [Hide Hotbar](#hide-hotbar)
- [Hide to GUI attached](#hide-to-gui-attached)
- [Show Choices](#show-choices)
- [Show Hotbar](#show-hotbar)
- [Show Input](#show-input)
- [Show Load](#show-load)
- [Show Save](#show-save)
- [Show Save/Load](#show-save-load)
- [Show Text](#show-text)
- [View to GUI attached](#view-to-gui-attached)
- [WithGuiManager](#withguimanager)

## Call custom GUI

Call a custom Gui

```ts
// Calls a client-side component, created with VueJS, named "inn".
const gui = player.gui('inn')

 // You can wait for actions on the menu. It only works if the menu is open.
gui.on('accept', () => {
     player.allRecovery()
})

// The GUI is opened by passing recoverable data on the client side.
gui.open({ hello: 'world' })
```

When opening the GUI, one can give options

```ts
await gui.open({ hello: 'world' }, {
     waitingAction: true,
     blockPlayerInput: true
})
// After the GUI is closed
```

- `blockPlayerInput`: while the GUI is open, the player can not move on the map
- `waitingAction`: We explicitly wait until the GUI is closed for the promise to be resolved.

- Source: `packages/server/src/Player/GuiManager.ts`
- Kind: `method`
- Member of: `GuiManager`
- Defined in: `GuiManagerMixin`

### Signature

```ts
player.gui(guiId)
```

### Parameters

- `guiId`: `string`

## Call Game Over Menu

Calls game over menu. Opens the GUI named `rpg-gameover`

```ts
const selection = await player.callGameover()
if (selection?.id === 'title') {
    await player.gui('rpg-title-screen').open()
}
if (selection?.id === 'load') {
    await player.showLoad()
}
```

- Source: `packages/server/src/Player/GuiManager.ts`
- Kind: `method`
- Member of: `GuiManager`
- Defined in: `IGuiManager`

### Signature

```ts
player.callGameover(options)
```

### Parameters

- `options?`: `GameoverGuiOptions`

## Call Main Menu

Calls main menu. Opens the GUI named `rpg-main-menu`

- Source: `packages/server/src/Player/GuiManager.ts`
- Kind: `method`
- Member of: `GuiManager`
- Defined in: `IGuiManager`

### Signature

```ts
player.callMainMenu(options)
```

### Parameters

- `options?`: `MenuGuiOptions`

## Call Shop Menu

Calls shop menu. Opens the GUI named `rpg-shop`

- Source: `packages/server/src/Player/GuiManager.ts`
- Kind: `method`
- Member of: `GuiManager`
- Defined in: `GuiManagerMixin`

### Signature

```ts
player.callShop()
```

### Parameters

- `items`: `ShopItemInput[] | ShopGuiOptions`

## Close custom GUI

Closes the GUI and removes it from memory

- Source: `packages/server/src/Player/GuiManager.ts`
- Kind: `method`
- Member of: `GuiManager`
- Defined in: `GuiManagerMixin`

### Signature

```ts
player.removeGui(guiId,data)
```

### Parameters

- `guiId`: `string`
- `data?`: `unknown`
- `guiOpenId?`: `unknown`

## Displays a notification

Displays a notification . Opens the GUI named `rpg-notification`

- Source: `packages/server/src/Player/GuiManager.ts`
- Kind: `method`
- Member of: `GuiManager`
- Defined in: `IGuiManager`

### Signature

```ts
player.showNotification()
```

### Parameters

- `message`: `string`
- `options?`: `{ time?: number; icon?: string; sound?: string; type?: "info" | "warn" | "error" }`

## Hide Hotbar

Hide the default hotbar GUI.

- Source: `packages/server/src/Player/GuiManager.ts`
- Kind: `method`
- Member of: `RpgPlayer`
- Defined in: `GuiManagerMixin`

### Signature

```ts
player.hideHotbar()
```

## Hide to GUI attached

Hide the GUI attached to the players

- Source: `packages/server/src/Player/GuiManager.ts`
- Kind: `method`
- Member of: `GuiManager`
- Defined in: `GuiManagerMixin`
- Since: `3.0.0-beta.5`

### Signature

```ts
player.hideAttachedGui(players?)
```

### Parameters

- `players?`: `RpgPlayer[] | RpgPlayer`

### Examples

```ts
player.hideAttachedGui()
```
```ts
player.hideAttachedGui(aPlayer)
```
```ts
player.hideAttachedGui([player1, player2])
```

## Show Choices

Shows a dialog box with a choice. Opens the GUI named `rpg-dialog`

```ts
const choice = await player.showChoices('What color do you prefer?', [
     { text: 'Black', value: 'black' },
     { text: 'Rather the blue', value: 'blue' },
     { text: 'I don\'t have a preference!', value: 'none' }
])

// If the player selects the first
console.log(choice) // { text: 'Black', value: 'black' }
```

- Source: `packages/server/src/Player/GuiManager.ts`
- Kind: `method`
- Member of: `GuiManager`
- Defined in: `IGuiManager`

### Signature

```ts
player.showChoices(text,choices)
```

### Parameters

- `msg`: `string`
- `choices`: `Choice[]`
- `options?`: `DialogBaseOptions`

## Show Hotbar

Display the persistent player hotbar.

The server owns slot content and validates every use. The default client
GUI provides direct keyboard shortcuts and a gamepad radial selector.

- Source: `packages/server/src/Player/GuiManager.ts`
- Kind: `method`
- Member of: `RpgPlayer`
- Defined in: `GuiManagerMixin`

### Signature

```ts
player.showHotbar(options)
```

### Parameters

- `options?`: `HotbarGuiOptions`

### Returns

The GUI open result.

### Examples

```ts
player.showHotbar();
```

## Show Input

Opens the prebuilt input GUI and waits for the player to submit or cancel it.
The player cannot move while the form is open. Number inputs resolve to a
`number`; text inputs and textareas resolve to a `string`; cancellation and
an empty optional number input resolve to `null`.

```ts
const age = await player.showInput('Your age', {
  type: 'number',
  required: true,
  min: 1
})
// age is number | null

const biography = await player.showInput('Biography', {
  control: 'textarea',
  rows: 6,
  maxLength: 500
})
// biography is string | null
```

- Source: `packages/server/src/Player/GuiManager.ts`
- Kind: `method`
- Member of: `GuiManager`
- Defined in: `IGuiManager`

### Signature

```ts
player.showInput(message,options)
```

### Parameters

- `message`: `string`
- `options`: `NumberInputOptions`

### Returns

The typed submitted value, or `null` when cancelled or when an optional number is empty.

## Show Load

Display a load slots screen. Opens the GUI named `rpg-save`

```ts
const index = await player.showLoad(slots)
```

- Source: `packages/server/src/Player/GuiManager.ts`
- Kind: `method`
- Member of: `GuiManager`
- Defined in: `IGuiManager`

### Signature

```ts
player.showLoad(slots,options)
```

### Parameters

- `slots?`: `SaveSlot[]`
- `options?`: `SaveLoadOptions`

## Show Save

Display a save slots screen. Opens the GUI named `rpg-save`

```ts
const index = await player.showSave(slots)
```

- Source: `packages/server/src/Player/GuiManager.ts`
- Kind: `method`
- Member of: `GuiManager`
- Defined in: `IGuiManager`

### Signature

```ts
player.showSave(slots,options)
```

### Parameters

- `slots?`: `SaveSlot[]`
- `options?`: `SaveLoadOptions`

## Show Save/Load

Display a save/load slots screen. Opens the GUI named `rpg-save`

```ts
const index = await player.showSaveLoad(slots, { mode: 'save' })
```

- Source: `packages/server/src/Player/GuiManager.ts`
- Kind: `method`
- Member of: `GuiManager`
- Defined in: `IGuiManager`

### Signature

```ts
player.showSaveLoad(slots,options)
```

### Parameters

- `slots?`: `SaveSlot[]`
- `options?`: `SaveLoadOptions`

## Show Text

Show a text. This is a graphical interface already built. Opens the GUI named `rpg-dialog`

```ts
player.showText('Hello World')
```

The method returns a promise. It is resolved when the dialog box is closed.

```ts
await player.showText('Hello World')
// dialog box is closed, then ...
```

**Option: position**

You can define how the dialog box is displayed:
- top
- middle
- bottom

(bottom by default)

```ts
player.showText('Hello World', {
     position: 'top'
})
```

Add a typed input directly below the dialog text:

```ts
const age = await player.showText('How old are you?', {
  input: { type: 'number', required: true, min: 1 }
})
// age is number | null
```

**Option: fullWidth**

`boolean` (true by default)

Indicate that the dialog box will take the full width of the screen.

```ts
player.showText('Hello World', {
     fullWidth: true
})
```

**Option: autoClose**

`boolean` (false by default)

If false, the user will have to press Enter to close the dialog box.

 ```ts
player.showText('Hello World', {
     autoClose: true
})
```

**Option: typewriterEffect**

`boolean` (true by default)

Performs a typewriter effect

 ```ts
player.showText('Hello World', {
     typewriterEffect: false
})
```

**Option: talkWith**

`RpgPlayer` (nothing by default)

If you specify the event or another player, the other player will stop his or her movement and look in the player's direction.

 ```ts
// Code in an event
player.showText('Hello World', {
     talkWith: this
})
```

- Source: `packages/server/src/Player/GuiManager.ts`
- Kind: `method`
- Member of: `GuiManager`
- Defined in: `IGuiManager`

### Signature

```ts
player.showText(text,options)
```

### Parameters

- `msg`: `string`
- `options`: `DialogBaseOptions & { input: NumberInputOptions }`

## View to GUI attached

Display the GUI attached to the players

If you don't specify the players as parameters, it will display the GUI of the instance
But you can specify which GUIs to display by specifying the players as the first parameter

- Source: `packages/server/src/Player/GuiManager.ts`
- Kind: `method`
- Member of: `GuiManager`
- Defined in: `GuiManagerMixin`
- Since: `3.0.0-beta.5`

### Signature

```ts
player.showAttachedGui(players?)
```

### Parameters

- `players?`: `RpgPlayer[] | RpgPlayer`

### Examples

```ts
player.showAttachedGui()
```
```ts
player.showAttachedGui(aPlayer)
```
```ts
player.showAttachedGui([player1, player2])
```

## WithGuiManager

GUI Manager Mixin

Provides graphical user interface management capabilities to any class. This mixin handles
dialog boxes, menus, notifications, shops, and custom GUI components. It manages the
complete GUI system including opening, closing, and data passing between client and server.

- Source: `packages/server/src/Player/GuiManager.ts`
- Kind: `function`

### Signature

```ts
WithGuiManager(Base: TBase): new (...args: ConstructorParameters<TBase>) => InstanceType<TBase> &
  IGuiManager
```

### Parameters

- `Base`: `TBase`

### Returns

Extended class with GUI management methods

### Examples

```ts
class MyPlayer extends WithGuiManager(BasePlayer) {
  constructor() {
    super();
    // GUI system is automatically initialized
  }
}

const player = new MyPlayer();
await player.showText('Hello World!');
player.callMainMenu();
```
