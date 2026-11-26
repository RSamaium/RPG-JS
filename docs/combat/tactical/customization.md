---
title: "Customization"
description: "Server options, server hooks, objectives, client options, texts, controls, client hooks and public API of the tactical battle."
---

# Customization

The server options and hooks change the rules; the client options and hooks change only what is shown. The server owns the outcome either way.

## Server options (`provideTacticalServer`)

| Option | Default | Meaning |
|---|---|---|
| `units`, `skills`, `items`, `roles`, `encounters` | — | Data kept outside the RPGJS database (the database is read otherwise). |
| `ai` | attack the weakest target in range, else close in | Enemy AI (`TacticalAi`). |
| `enemyDelay` | `1650` | Delay between two enemy actions, in ms. |
| `turnSeconds` | `60` | Seconds a side has to play its phase with several players; `0`: no limit. An encounter's own value wins. |
| `hidePlayer` | `true` | Hide the player's map sprite during the battle, for everyone. The fighters' own screens hide every event and player of the map anyway (`engine.hideMapObjects`, see [Hide map objects](/guide/hide-map-objects)). |
| `hero(player, { side, seat })` | — | How the hero of a player fights: `role`, `battler`, `stats.range`, `stats.move`… (see [the hero of a player](/combat/tactical/battle-data#the-hero-of-a-player)). |
| `hooks` | — | Hooks declared without a module. |

```ts
provideTacticalServer({
  enemyDelay: 1200,
  turnSeconds: 45,
  // The heroes of the players are mages, whatever their class.
  hero: () => ({ role: "mage" }),
});
```

## Server hooks

Any game module can implement `tactical` hooks (`defineModule<RpgServer>({ tactical: { ... } })`), or pass them in `hooks`.

| Hook | Use |
|---|---|
| `onSetup(player, battle, state)` | Change the state (units, rules, objective) before the first display. |
| `onStart(player, battle)` | A battle starts. |
| `onCommand(player, battle, env)` | Return `false` to refuse a command. |
| `onChooseAction({ state, unit, suggested, battle })` | Replace the AI's command; a refused command falls back to `suggested`. |
| `onSpectate(spectator, battle)` | Return `false` to refuse a spectator. |
| `onEnd(player, battle, result)` | The battle ends, after the outcome of the heroes is written on the players. |
| `onDamage`, `onJudge`, `onAction`, `onMove`, `onDefeat`, `onPhase` | Synchronous rule hooks; they also receive `player` and `battle`. `onDamage` returns the final amount, `onJudge` returns the winning side to end the battle. |

```ts
defineModule<RpgServer>({
  tactical: {
    onDamage({ amount }) { return amount + 2; },
    onJudge({ state }) { return state.round > 9 ? "enemy" : undefined; }, // the heroes lose after 9 rounds
    onSpectate(spectator, battle) { return battle.players.length > 1; },   // only group battles can be watched
  },
});
```

`TacticalBattleHandle` gives hooks the battle `id`, `player`, `players` (it keeps the players who left), `versus`, `spectators()` and `state()`.

### Objectives

New objective types: `registerObjectiveType(id, { judge(state, objective) })` returns `"ally"` or `"enemy"` when decided. Built-in types cannot be replaced; `unregisterObjectiveType(id)` removes yours.

## Client options (`provideTacticalClient`)

| Option | Meaning |
|---|---|
| `hideGuis` / `keepGuis` / `onBattleShown()` | How the battle shares the screen with the GUIs of the game, as in every RPGJS battle system (`BattleScreenOptions`): by default every GUI but the battle and the built-in dialogs is hidden; `keepGuis` keeps some (a chat panel); `onBattleShown` adapts a GUI of your own and returns what restores it. |
| `sounds` | The cues `select`, `confirm`, `hit`, `back`: a sound id, `false` (silence) or a function `(engine, volume) => void`. Without one, a short tone is synthesized. |
| `muted`, `reducedMotion` | Start muted or with reduced motion. |
| `hooks` | Client hooks declared without a module. |

## Texts

The texts of the HUD are `tactical.*` keys of the RPGJS i18n service (`TACTICAL_I18N`, exported by `@rpgjs/tactical-rpg/client`, holds the English and French defaults). A guest without a name is called by `tactical.player` (`Player {index}`). A game overrides them, or adds a language, with the `i18n` of its own module:

```ts
defineModule<RpgClient>({ i18n: { en: { "tactical.title": "Sanctuary", "tactical.victory": "Glory!" } } });
```

The hints that name a key (`tactical.moveHint`, `tactical.skillKeys`, `tactical.danger`…) take the keys the game binds as parameters: `{escape}`, `{action}`, `{up}`, `{down}`, `{left}`, `{right}`, `{next}` (next unit), `{end}` (end the phase), `{danger}` and `{entries}` (the keys of the action menu). Keep them in your own texts. The names of the keys are the `tactical.key.*` texts (`tactical.key.space`, `tactical.key.escape`…); other keys are shown in capitals.

## Controls

The HUD uses the keyboard controls of the game (`keyboardControls` of the client config) and the gamepad mapping of the built-in GUIs. Every key is configurable, and the HUD always shows the key the game binds:

| Control (`keyboardControls`) | Default key | Gamepad | Does |
|---|---|---|---|
| `up`, `down`, `left`, `right` | arrows | d-pad, stick | Move the cursor; go through a menu. |
| `action` | `space` | A | Confirm; held during the opposing turn: fast-forward. |
| `escape` | `escape` | B, Start | Go back one step; a spectator leaves. |
| `tabNext` | `page down` | R | Select the next unit. |
| `endPhase` | `e` | Y | End the phase. |
| `danger` | `r` | — | Show or hide the danger zone. |
| `entry1` … `entry6` | `hotbar1` … `hotbar6` (`1` … `6`) | X: `entry2` | `entry1` goes back to the move; `entry2` … `entry6` are the entries of the action menu, in the order it shows them. |

```ts
provideClientGlobalConfig({
  keyboardControls: { endPhase: "enter", danger: "d" },
});
```

While the player writes in a text field (the chat), the keys are left to it. Every command also has a button for touch screens, and a right click goes back.

## Client hooks

```ts
defineModule<RpgClient>({
  tactical: {
    onStart(state) {},
    onPlay(event, state, stage) {
      if (event.kind !== "skill" || event.skillId !== "meteor") return;
      const at = stage.world(state.units.find((u) => u.id === event.targetId)!);
      stage.fx.play("meteorImpact", at.x, at.y);
      stage.screen.shakeScreen(14, 600);
      return false; // played here: skip the default effects
    },
    onEnd(state) {},
  },
});
```

`onPlay` runs before each event: return `false` to play its effects yourself (the units still move). `stage` gives `fx` (battle-kit `FxPlayer`), `screen` (`ScreenEffects`), `popup(text, x, y, { color, big })`, `world(cell)` (cell centre in map pixels) and `unit(id)` (reactive view of a unit). The hooks change what is shown, never the outcome: the server owns the rules.

## Public API

`@rpgjs/tactical-rpg/server` exports the module (`provideTacticalServer`), the battle functions above, the data helpers (`tacticalSkill`, `tacticalItem`, `tacticalUnit`, `tacticalRole`, `tacticalEncounter`), `registerObjectiveType` / `unregisterObjectiveType`, and the types of the data, options and hooks (`BattleState`, `Unit`, `Command`, `TacticalResult`, `TacticalAi`…). `@rpgjs/tactical-rpg/client` exports `provideTacticalClient`, `walkingSheet`, `TACTICAL_I18N` and the types of the client hooks. The rules, the board, the AI and the HUD state are internal.

The battle functions are described in [Start a battle](/combat/tactical/starting-battles).

## Not included

The package contains the rules, AI, HUD and battlefield. Wiring to a particular game stays in that game: reading the battle data from your own tools, a multiplayer lobby, launching a battle from a link, signals for scripts. [Start a battle](/combat/tactical/starting-battles) shows how to start battles from events, zones and challenges.
