---
title: "Prebuilt GUI Contracts"
description: "Data and interaction contracts for replacing RPGJS prebuilt GUI components."
---

# Prebuilt GUI Contracts

RPGJS prebuilt GUIs are regular GUI entries registered with fixed IDs. You can replace their visual implementation with your own CanvasEngine component by registering a GUI with the same ID.

The server API stays the same. For example, `player.showText()` still opens `rpg-dialog`, but your component receives the dialog data and decides how to render it.

## Register a Replacement

Create a `.ce` file and register it with the prebuilt ID you want to replace:

```ts
import { provideClientModules } from '@rpgjs/client'
import { PrebuiltGui } from '@rpgjs/common'
import MyDialog from './gui/my-dialog.ce'

export default {
  providers: [
    provideClientModules([
      {
        gui: [
          {
            id: PrebuiltGui.Dialog,
            component: MyDialog,
            renderer: 'canvas',
          },
        ],
      },
    ]),
  ],
}
```

The last component registered for an ID wins. A CanvasEngine replacement removes any Vue entry with the same ID, and a Vue replacement removes the built-in CanvasEngine component. Declare `renderer: 'canvas'` for `.ce` registrations; registrations without a renderer still use legacy component-shape detection for compatibility. This page focuses on CanvasEngine `.ce` replacements; for Vue-specific examples, see [Vue.js integration](/gui/vue-integration).

## Component Interface

CanvasEngine GUI components receive:

| Prop | Description |
| --- | --- |
| `data` | Signal containing the object sent by the server. Read it with `data()`. |
| `onFinish(value?)` | Closes the GUI and resolves the server-side promise when the GUI was opened with `waitingAction`. |
| `onInteraction(name, payload?)` | Sends an action to the server without closing the GUI. |

For example, this CanvasEngine component can replace the built-in dialog box:

```html
<DOMContainer width="100%" height="100%">
  <div class="my-dialog" data-position={position()}>
    @if (speaker()) {
      <strong>{speaker()}</strong>
    }

    <p>{message()}</p>

    @if (choices().length) {
      <div class="choices">
        @for ((choice, index) of choices()) {
          <button click={selectChoice(index)}>
            {choice.text}
          </button>
        }
      </div>
    }
    @else {
      <button click={continueDialog()}>Continue</button>
    }
  </div>
</DOMContainer>

<script>
  import { computed } from "canvasengine";

  const { data, onFinish } = defineProps();

  const message = computed(() => data().message || "");
  const choices = computed(() => data().choices || []);
  const speaker = computed(() => data().speaker || "");
  const position = computed(() => data().position || "bottom");

  function selectChoice(index) {
    return function() {
      onFinish(index);
    };
  }

  function continueDialog() {
    return function() {
      onFinish();
    };
  }
</script>
```

Use `onFinish()` when the server is waiting for a final answer, such as a dialog choice. Use `onInteraction()` for actions that should keep the GUI open, such as buying an item or equipping gear.

## Character Select

| Contract | Value |
| --- | --- |
| ID | `PrebuiltGui.CharacterSelect` / `rpg-character-select` |
| Server API | `player.showCharacterSelect(actors, options)` |
| Select with | `onInteraction('select', { id })` |
| Cancel with | `onInteraction('cancel')` when `allowCancel` is true |

Data contains `actors`, `title`, `subtitle`, `selectedActorId`, and
`allowCancel`. Each Actor presentation contains `id`, optional `name`, optional
`description`, and optional `graphic` and `faceset` spritesheet IDs. A custom
renderer must return an Actor ID from this list; the server ignores unknown IDs
and keeps the GUI open. The promise resolves to the original server-owned Actor,
not the client payload, and never calls `setActor()` implicitly.

## Input

| Contract | Value |
| --- | --- |
| ID | `PrebuiltGui.Input` / `rpg-input` |
| Server API | `player.showInput(message, options)` |
| Submit with | `onInteraction('submit', { value })` |
| Cancel with | `onInteraction('cancel')` |

The prebuilt input GUI renders either an HTML input or textarea. Server-owned
validation keeps the GUI open when a submitted value is invalid. Projects can
replace the component by registering another GUI with the same ID, but the
replacement must use the interactions above so validation still runs on the
authoritative server.

Data:

| Field | Type | Description |
| --- | --- | --- |
| `message` | `string` | Label or question displayed above the field. |
| `control` | `'input'` or `'textarea'` | HTML control to render. |
| `type` | `'text'`, `'number'`, `'password'`, or `'email'` | Input and result type. Textareas always use text. |
| `defaultValue` | `string` or `number` | Initial field value. |
| `placeholder` | `string` | Optional placeholder. |
| `required` | `boolean` | Whether an empty submission is invalid. |
| `minLength`, `maxLength` | `number` | Text length constraints. |
| `min`, `max`, `step` | `number` | Numeric constraints. |
| `rows` | `number` | Visible textarea rows. |
| `confirmText`, `cancelText` | `string` | Button labels. |
| `cancelButton` | `boolean` | Whether the Cancel button is displayed. Defaults to `true`. |
| `errorKey`, `errorParams` | `string`, `object` | Latest server validation message, resolved through the project i18n service. |

```ts
const age = await player.showInput('Your age', {
  type: 'number',
  required: true,
  min: 1,
})
// number | null

const biography = await player.showInput('Biography', {
  control: 'textarea',
  rows: 6,
  maxLength: 500,
})
// string | null
```

An optional empty number and an explicit cancellation both resolve to `null`.
Text, password, email, and textarea inputs resolve to strings.
Default button labels and validation errors use `rpg.input.*` translation keys.
Game-level i18n messages can override them; explicit `confirmText` and
`cancelText` options take precedence for one form.

## Dialog Box

| Contract | Value |
| --- | --- |
| ID | `PrebuiltGui.Dialog` / `rpg-dialog` |
| Server APIs | `player.showText()`, `player.showChoices()` |
| Close with | `onFinish(index?)` |

Data:

| Field | Type | Description |
| --- | --- | --- |
| `message` | `string` | Text to display. |
| `choices` | `{ text: string }[]` | Choice labels. The original server-side `value` is not sent to the client. |
| `position` | `'top'`, `'middle'`, or `'bottom'` | Dialog placement. Defaults to `bottom`. |
| `fullWidth` | `boolean` | Whether the dialog should use the full screen width. |
| `autoClose` | `boolean` | Whether the dialog may close automatically. |
| `typewriterEffect` | `boolean` | Whether the text should reveal progressively. |
| `speaker` | `string` | Speaker label. |
| `face` | `{ id: string; expression?: string }` | Faceset spritesheet ID and expression. |
| `input` | `InputFormData` | Optional typed input displayed after the text. Mutually exclusive with `choices`. |

To return a choice, call `onFinish(index)` where `index` is the selected choice index. For text without choices, call `onFinish()` when the player dismisses the dialog.

For a dialog input, use `onInteraction('submit', { value })` and
`onInteraction('cancel')`. This keeps parsing and validation on the server and
allows invalid submissions to update `input.errorKey` without closing the GUI.

CanvasEngine example:

```html
<DOMContainer width="100%" height="100%">
  <div class="dialog">
    <p>{data().message}</p>

    @for ((choice, index) of data().choices || []) {
      <button click={selectChoice(index)}>{choice.text}</button>
    }

    @if (!(data().choices || []).length) {
      <button click={closeText()}>Continue</button>
    }
  </div>
</DOMContainer>

<script>
  const { data, onFinish } = defineProps();

  function selectChoice(index) {
    return function() {
      onFinish(index);
    };
  }

  function closeText() {
    return function() {
      onFinish();
    };
  }
</script>
```

## Hotbar

| Contract | Value |
| --- | --- |
| ID | `PrebuiltGui.Hotbar` / `rpg-hotbar` |
| Server APIs | `player.showHotbar(options)`, `player.hideHotbar()` |
| Keep open with | `onInteraction(name, payload)` |

Data:

| Field | Type | Description |
| --- | --- | --- |
| `hotbar` | `HotbarState` | Persistent version, initialization state, capacity, active slot, and ten serialized assignments. |
| `capacity` | `number` | Number of currently accessible slots, from 1 to 10. |
| `activeSlot` | `number \| null` | Zero-based selected slot. |
| `slots` | `HotbarDisplaySlot[]` | Ten resolved presentation slots. |
| `feedback` | `HotbarActionFeedback` | Optional transient `used`, `selected`, or `rejected` animation state. |

Each presentation slot contains `index`, `type`, `entry`, `name`,
`description`, `icon`, `quantity`, `cost`, `badge`, `usable`, `cooldownMs`,
`readyAt`, `activation`, `locked`, and `lockedHint` when applicable. Empty
slots use `type: "empty"` and `entry: null`.

Interactions:

| Interaction | Payload | Server behavior |
| --- | --- | --- |
| `selectSlot` | `{ slot }` | Validates capacity and persists the active slot. |
| `useSlot` | `{ slot, target? }` | Selects and authoritatively uses the current entry. |
| `useActiveSlot` | `{ target? }` | Uses the selected slot when one exists. |
| `refresh` | none | Rebuilds presentation, quantities, costs, and cooldowns. |

Custom components should render only the received presentation and send these
interactions. They must not consume inventory, SP, or apply gameplay effects
on the client. For color, spacing, and typography changes, prefer the native
[hotbar theme variables](/guide/hotbar#theme-the-native-component) over a
replacement.

## Main Menu

| Contract | Value |
| --- | --- |
| ID | `PrebuiltGui.MainMenu` / `rpg-main-menu` |
| Server API | `player.callMainMenu(options)` |
| Close with | `onInteraction('exit')` or `onFinish()` |

Data:

| Field | Type | Description |
| --- | --- | --- |
| `menus` | `{ id; label; disabled? }[]` | Menu entries. Default IDs are `items`, `skills`, `equip`, `options`, `save`, `exit`. |
| `items` | `MenuItem[]` | Inventory entries with `id`, `name`, `description`, `quantity`, `icon`, stats, `type`, `usable`, `equipped`. |
| `equips` | `MenuItem[]` | Inventory entries whose type is `weapon` or `armor`. |
| `skills` | `{ id; name; description; spCost }[]` | Player skills. |
| `saveLoad` | `object` | Save overlay data, usually `{ mode: 'save', canSave, showAutoSlot, autoSlotIndex, autoSlotLabel }`. |
| `playerStats` | `object` | Current stats such as `atk`, `pdef`, `sdef`, `str`, `dex`, `int`, `agi`, `maxHp`, `maxSp`. |
| `expForNextlevel` | `number` | EXP target for the next level. |

Interactions:

| Interaction | Payload | Server behavior |
| --- | --- | --- |
| `useItem` | `{ id }` | Calls `player.useItem(id)` and refreshes menu data. |
| `equipItem` | `{ id, equip }` | Calls `player.equip(id, equip)` and refreshes menu data. |
| `openSave` | none | Closes the main menu and opens `rpg-save` in save mode. |
| `exit` | none | Closes the menu and resolves with `'exit'`. |

The built-in client also applies optimistic updates for `useItem` and `equipItem`. Custom Vue and CanvasEngine replacements can use the same interaction names and still benefit from those reducers.

## Shop

| Contract | Value |
| --- | --- |
| ID | `PrebuiltGui.Shop` / `rpg-shop` |
| Server API | `player.callShop(options)` |
| Close with | `onFinish()` |

Data:

| Field | Type | Description |
| --- | --- | --- |
| `items` | `ShopItem[]` | Items available to buy. |
| `sellItems` | `ShopItem[]` | Player inventory items available to sell. |
| `playerParams` | `object` | Current player stats used to compare item modifiers. |
| `message` | `string` | Merchant message. |
| `face` | `{ id: string; expression?: string }` | Merchant faceset. |

`ShopItem` includes `id`, `name`, `description`, `price`, `icon`, `type`, optional `stats`, optional `quantity`, and `equipped`.

Interactions:

| Interaction | Payload | Server behavior |
| --- | --- | --- |
| `buyItem` | `{ id, nb }` | Calls `player.buyItem(id, nb)` and refreshes shop data. |
| `sellItem` | `{ id, nb }` | Adds gold, removes inventory items, and refreshes shop data. |

## Save and Load

| Contract | Value |
| --- | --- |
| ID | `PrebuiltGui.Save` / `rpg-save` |
| Server APIs | `player.showSave()`, `player.showLoad()`, `player.showSaveLoad()` |
| Close with | `onFinish(index?)` |

Data:

| Field | Type | Description |
| --- | --- | --- |
| `slots` | `(SaveSlot | null)[]` | Save metadata without the `snapshot` field. Empty slots are `null`. |
| `mode` | `'save'` or `'load'` | Selects save or load behavior. |
| `showAutoSlot` | `boolean` | Whether to display an auto-save entry. |
| `autoSlotIndex` | `number` | Slot index used by the auto-save entry. |
| `autoSlotLabel` | `string` | Label for the auto-save entry. |

Server interactions:

| Interaction | Payload | Server behavior |
| --- | --- | --- |
| `save` | `{ index }` | Saves into the slot and closes with the selected index. |
| `load` | `{ index }` | Loads the slot and closes with the selected index. |
| `select` | `{ index }` | Alias handled according to the current mode. |

The built-in `save-load.ce` also uses `SaveClientService` directly for local save/load UI flows. A replacement can use either the server interactions above or its own client service flow, depending on the game architecture.

## Title Screen

| Contract | Value |
| --- | --- |
| ID | `PrebuiltGui.TitleScreen` / `rpg-title-screen` |
| Server API | `player.gui('rpg-title-screen').open(options)` when used from the server |
| Close with | `onInteraction('select', selection)` or local hide logic |

Data:

| Field | Type | Description |
| --- | --- | --- |
| `entries` | `{ id; label; disabled? }[]` | Selectable actions. Defaults to `start` and `load`. |
| `title` | `string` | Main title. |
| `subtitle` | `string` | Subtitle. |
| `version` | `string` | Version label. |
| `showPressStart` | `boolean` | Option reserved by the server contract. |
| `saveLoad` | `object` | Data passed to `rpg-save` when using local load behavior. |
| `localActions` | `boolean` | If true, built-in title actions hide the title or open save/load locally. |

Interaction:

| Interaction | Payload |
| --- | --- |
| `select` | `{ id, index, entry }` |

## Game Over

| Contract | Value |
| --- | --- |
| ID | `PrebuiltGui.Gameover` / `rpg-gameover` |
| Server API | `player.callGameover(options)` |
| Close with | `onInteraction('select', selection)` or local hide logic |

Data:

| Field | Type | Description |
| --- | --- | --- |
| `entries` | `{ id; label; disabled? }[]` | Selectable actions. Defaults to `title` and `load`. |
| `title` | `string` | Main title. |
| `subtitle` | `string` | Subtitle. |
| `saveLoad` | `object` | Data passed to `rpg-save` when using local load behavior. |
| `localActions` | `boolean` | If true, built-in actions display the title screen or save/load locally. |

Interaction:

| Interaction | Payload |
| --- | --- |
| `select` | `{ id, index, entry }` |

## HUD and Notifications

`HudComponent` and `NotificationComponent` are also GUI components, but they are less driven by a server payload than the modal GUIs above.

HUD data:

| Field | Type | Description |
| --- | --- | --- |
| `faceset` | `{ id: string; expression?: string }` | Optional face displayed next to player status. |

The HUD reads the current player from the client engine for `hp`, `sp`, max values, and level.

Notifications use `PrebuiltGui.Notification` / `rpg-notification`, but the built-in component reads `engine.notificationManager.stack()` instead of a direct `data` payload. Custom notification UIs should use the same notification manager if they need the existing `player.showNotification()` behavior.
