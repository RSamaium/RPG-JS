/**
 * What scripts have of the engine and of its modules: every public method and property of `RpgPlayer`, `RpgEvent`, `RpgMap`, the
 * GUIs and the projectiles of the server, and every export of `@rpgjs/action-battle`, is either exposed to scripts (with the name a
 * script uses, or the signal that gives it) or excluded on purpose, with the reason. A test lists them and fails when one has no
 * decision, so that a new method gets one instead of being forgotten.
 */

/** The decision for each method of a class of the engine: the name a script uses for it, or why scripts do not have it. */
export interface EngineCoverage {
  /** Method or property of the engine → the name of the game API (`$player.addItem`) or the signal (`combat.hit`) that gives it to scripts. */
  exposed: Record<string, string>;
  /** Why scripts do not have them → the methods and properties. */
  excluded: Record<string, readonly string[]>;
}

/** The decisions for `RpgPlayer`, `RpgEvent` and `RpgMap`. */
export const ENGINE_COVERAGE: Record<"player" | "event" | "map" | "gui" | "mapProjectiles" | "playerProjectiles" | "actionBattle", EngineCoverage> = {
  /** `RpgPlayer` (the player of the script; an event has them too). */
  player: {
    exposed: {
      addItem: "$player.addItem",
      addState: "$player.addState",
      allRecovery: "$player.hp",
      assignHotbarSlot: "$player.assignHotbarSlot",
      attachShape: "$map.attachShape",
      cameraFollow: "$player.cameraFollow",
      canMove: "$player.canMove",
      changeDirection: "$map.turnEvent",
      changeMap: "$player.changeMap",
      createDynamicEvent: "$map.createDynamicEvent",
      direction: "$player.direction",
      equip: "$player.equip",
      equipments: "$player.isEquipped",
      exp: "$player.exp",
      forgetSkill: "$player.forgetSkill",
      getDirection: "$player.direction",
      getGui: "$player.updateGui",
      getItem: "$player.getItem",
      getSkill: "$player.hasSkill",
      getState: "$player.hasState",
      getTile: "$map.getTile",
      getVariable: "$player.getVariable",
      gold: "$player.gold",
      gui: "$player.openGui",
      hasItem: "$player.hasItem",
      hasVariable: "$player.hasVariable",
      hp: "$player.hp",
      learnSkill: "$player.learnSkill",
      level: "$player.level",
      moveTo: "$map.moveEvent",
      name: "$player.name",
      param: "$player.maxHp",
      recovery: "$player.hp",
      removeGui: "$player.closeGui",
      removeItem: "$player.removeItem",
      removeState: "$player.removeState",
      removeVariable: "$player.removeVariable",
      setAnimation: "$map.playEventAnimation",
      setGraphic: "$map.setEventGraphic",
      setVariable: "$player.setVariable",
      showAnimation: "$map.showAnimation",
      showChoices: "$player.showChoices",
      showComponentAnimation: "$map.showComponentAnimation",
      showEmotionBubble: "$player.showEmotionBubble",
      showNotification: "$player.showNotification",
      showText: "$player.showText",
      skills: "$player.getSkills",
      sp: "$player.sp",
      states: "$player.getStates",
      stopMoveTo: "$map.stopEvent",
      teleport: "$player.teleport",
      tiles: "$map.getTile",
      useItem: "$player.useItem",
      useSkill: "$player.useSkill",
      x: "$player.x",
      y: "$player.y",
    },
    excluded: {
      "internal to the engine: lifecycle, snapshots, synchronization, hooks, factories and translations": [
        "applyDefaultParameters", "applyFrames", "applySnapshot", "buildDefaultSlots", "clientVisual", "createClassInstance",
        "createItemInstance", "createSkillInstance", "createStateInstance", "databaseById", "emit", "events", "execMethod",
        "flattenRoutes", "getCurrentMap", "getCurrentRoom", "getLocale", "hooks", "hpSignal", "i18n", "initializeDefaultStats",
        "initializeHotbar", "isConnected", "isEvent", "load", "mergeComponents", "normalizeComponents", "normalizeHotbar", "off",
        "on", "once", "pendingMapPosition", "prepareSnapshotForObjectLoad", "projectiles", "resolveClassSnapshot",
        "resolveConfiguredCapacity", "resolveEquipmentsSnapshot", "resolveItemsSnapshot", "resolveSkillsSnapshot",
        "resolveStatesSnapshot", "save", "server", "setLocale", "setSync", "snapshot", "spSignal", "syncChanges", "t", "type",
        "worldPositionX", "worldPositionY"
      ],
      "physics and collisions of the character, set by the game: scripts move events with $map.moveEvent, followPlayer, fleePlayer and teleportEvent": [
        "hitbox", "interactive", "mass", "otherPlayersCollision", "position", "pushable", "setHitbox", "setMass", "setSizes",
        "through", "throughEvent", "throughOtherPlayer", "z"
      ],
      "moves a character with physics strategies or routes: the player moves by its inputs, scripts teleport it and walk events with $map.moveEvent": [
        "addMovement", "applyIceMovement", "breakRoutes", "clearMovements", "dash", "followPath", "frequency",
        "getActiveMovements", "hasActiveMovements", "infiniteMoveRoute", "knockback", "knockbackActive", "moveRoutes",
        "oscillate", "removeMovement", "replayRoutes", "shootProjectile", "speed"
      ],
      "how the client draws the character beyond its graphic and its animations (components, camera, tint, hit texts, GUIs on the sprite): the game designs it; scripts change the graphic of an event and play its animations": [
        "animationFixed", "animationName", "componentsBottom", "componentsCenter", "componentsLeft", "componentsRight",
        "componentsTop", "directionFixed", "flash", "graphics", "hideAttachedGui", "removeComponents", "setComponentsBottom",
        "setComponentsCenter", "setComponentsLeft", "setComponentsRight", "setComponentsTop", "setGraphicAnimation",
        "showAttachedGui", "showHit", "tint"
      ],
      "opens a GUI of the engine (menu, shop, save, game over, input) that the game wires itself: scripts open the GUIs of plugins with $player.openGui": [
        "callGameover", "callMainMenu", "callShop", "showCharacterSelect", "showInput", "showLoad", "showSave", "showSaveLoad"
      ],
      "moves the player to another room or server: the game owns its room flow, scripts use $player.changeMap": [
        "autoChangeMap", "changeRoom", "setMap", "transferRoom"
      ],
      "the rules of the battle system (parameters, defenses, elements, effects, formulas, damage): the game and its battle module own them; scripts change hp, sp, states, and start battles": [
        "addParameter", "applyDamage", "applyEffect", "applyStates", "atk", "coefficientElements", "effects", "elements",
        "elementsDefense", "elementsEfficiency", "findStateEfficiency", "getFeature", "getFormulas", "getParamItem",
        "getParamValue", "hasEffect", "parameters", "paramsModifier", "pdef", "sdef", "setParameter", "statesDefense",
        "statesEfficiency"
      ],
      "the class, the actor and the curve of experience the game designs: scripts give experience, skills and equipment": [
        "changeActor", "expCurve", "expForNextlevel", "finalLevel", "initialLevel", "setActor", "setClass"
      ],
      "the instances of the inventory: scripts read an item with $player.getItem and count with hasItem": [
        "items"
      ],
      "trade goes through the shop of the game: scripts give and take items and gold": [
        "buyItem", "sellItem"
      ],
      "the hotbar is driven by the player and its GUI: scripts assign a slot with $player.assignHotbarSlot and hear player.hotbarChange": [
        "assertAccessibleSlot", "assertEntryAvailable", "assertSlot", "clearHotbarSlot", "commitHotbar", "configureHotbar",
        "getHotbar", "getHotbarCapacity", "getHotbarLockedSlotHint", "hideHotbar", "hotbar", "isHotbarEntryTypeAllowed",
        "placeHotbarItem", "refreshHotbar", "selectHotbarSlot", "showHotbar", "useActiveHotbarSlot", "useHotbarSlot"
      ],
      "zones of the character itself: scripts make zones of the map and of events, and hear player.inShape and player.outShape": [
        "getInShapes", "getShapes", "shapes"
      ],
      "sounds for one player: scripts play the sounds of the map, for all its players, with $map.playSound": [
        "playSound", "stopAllSounds", "stopSound"
      ],
      "lists or clears every variable of the player, which other systems also use: a script names its own variables": [
        "clearVariables", "getVariableKeys"
      ],
      "loot is dropped by the loot system of the game: scripts give items with $player.addItem": [
        "dropLoot"
      ],
    },
  },
  /** `RpgEvent`, beyond what it has of `RpgPlayer`. */
  event: {
    exposed: {
      resume: "$map.setEventVisible",
      suspend: "$map.setEventVisible",
    },
    excluded: {
      "the events of the game are not removed by scripts: $map.removeEvent removes the events scripts made": [
        "remove"
      ],
      "a hidden event is not on the map: $map.getEvent gives undefined": [
        "suspended"
      ],
    },
  },
  /** `RpgMap`. */
  map: {
    exposed: {
      clearLighting: "$map.clearLighting",
      clearWeather: "$map.clearWeather",
      createDynamicEvent: "$map.createDynamicEvent",
      createShape: "$map.createShape",
      getEvent: "$map.getEvent",
      getEvents: "$map.getEvents",
      getLighting: "$map.getLighting",
      getPlayers: "$map.getPlayers",
      getShape: "$map.getShape",
      getShapes: "$map.getShapes",
      getVariable: "$map.getVariable",
      getWeather: "$map.getWeather",
      hasVariable: "$map.hasVariable",
      id: "$map.id",
      patchLighting: "$map.patchLighting",
      patchWeather: "$map.patchWeather",
      playSound: "$map.playSound",
      playVisualEffect: "$map.playVisualEffect",
      removeEvent: "$map.removeEvent",
      removeShape: "$map.removeShape",
      removeVariable: "$map.removeVariable",
      resumeEvent: "$map.setEventVisible",
      setDay: "$map.setDay",
      setLighting: "$map.setLighting",
      setNight: "$map.setNight",
      setVariable: "$map.setVariable",
      setWeather: "$map.setWeather",
      shakeMap: "$map.shakeMap",
      showAnimation: "$map.showAnimation",
      showComponentAnimation: "$map.showComponentAnimation",
      stopSound: "$map.stopSound",
      suspendEvent: "$map.setEventVisible",
      transitionLighting: "$map.transitionLighting",
    },
    excluded: {
      "internal to the engine: lifecycle, ticks, synchronization, network, input, hooks and saves": [
        "applyMapOptions", "applySyncToClient", "bindCharacterSignalSync", "broadcast", "buildRuntimeEventId", "clear",
        "clearAll", "clearEventRuntimeMetadata", "clearLightingTransition", "clientVisual", "emitPhysicsEntityAdd",
        "emitPhysicsEntityRemove", "emitPhysicsInit", "emitPhysicsReset", "events", "forceSingleTick", "getEventModeById",
        "getEventsForPlayer", "getMaxFixedStepsPerTick", "getObjectById", "getRuntimeMapUpdateToken",
        "getScenarioOwnerIdByEventId", "getServerTickTime", "getTick", "getTickTime", "guiExit", "guiInteraction",
        "hasActiveConnections", "hooks", "interceptorPacket", "isAlwaysOnTopEvent", "isAutoTickEnabled",
        "isEventVisibleForPlayer", "isPhysicsSyncingSignals", "isPositiveNumber", "isStandalone", "listSaveSlots", "loadSlot",
        "mapView", "nextTick", "nextTickAsync", "normalizeTickDelta", "off", "on", "onAction", "onInput", "onJoin", "onLeave",
        "onMapStreamRequest", "onPing", "onRestore", "onSessionRestore", "onStart", "players", "processInput", "reloadMapEvents",
        "removeScenarioEventsForPlayer", "runFixedTicks", "runFixedTicksAsync", "runPostTickUpdates", "runQueuedServerTick",
        "runServerTick", "saveSlot", "setAutoTick", "setEventRuntimeMetadata", "setPlayerLocale", "setSync",
        "spawnScenarioEventsForPlayer", "startServerTickLoop", "stopServerTickLoop", "syncChanges", "unbindCharacterSignalSync",
        "updateMap", "withPhysicsSync"
      ],
      "physics, hitboxes and collisions of the map, set by the game and its map loader: scripts make zones and walk events": [
        "addCharacter", "addMapHitbox", "addStaticHitbox", "addZone", "clearPhysic", "clearStreamedStaticHitboxes",
        "configureCharacterPushability", "createCharacterHitbox", "createMovingHitbox", "dashBody", "dispatchShapeCollision",
        "findSpawnPosition", "getBody", "getBodyPosition", "getCollisions", "getInteractableObjectIds", "getInteractionAABB",
        "getInteractionCollisions", "getZone", "heightPx", "isEntityMoving", "isMoving", "isPushableCharacter",
        "isSpawnObstacle", "isThroughEvent", "loadPhysic", "moveBody", "movePlayer", "queryArea", "queryHitbox",
        "refreshCharacterHitboxes", "registerZoneEvents", "removeHitbox", "removeZone", "replaceStaticHitboxes",
        "replaceStreamedStaticHitboxes", "resolveCharacterHitboxSize", "resolveCharacterMass", "resolveHitboxDimension",
        "resolveNumeric", "resolvePhysicsEntityKind", "resolveTrustedMapDimensions", "setBodyPosition",
        "setCharacterCollisionEnabled", "setStaticHitboxElevation", "setupCollisionDetection",
        "shouldDisableCharacterCollisions", "staticHitboxBlocksOwner", "stopMovement", "updateCharacterHitbox", "updateHitbox",
        "widthPx"
      ],
      "the world of maps and map streaming, set by the game: scripts move players with $player.changeMap": [
        "createDynamicWorldMaps", "deleteWorldMaps", "getInWorldMaps", "getWorldMaps", "getWorldMapsManager",
        "removeFromWorldMaps", "restoreMapStreamingRuntime", "restoreWorldMapsRuntime", "setInWorldMaps", "updateWorld",
        "updateWorldMaps", "worldX", "worldY"
      ],
      "the database of the game is the game's: scripts read it with $data": [
        "addInDatabase", "removeInDatabase"
      ],
      "loot is dropped by the loot system of the game: scripts give items with $player.addItem": [
        "dropLoot"
      ],
      "a script names an event by its id, and filters $map.getEvents itself": [
        "getEventBy", "getEventsBy", "getPlayer"
      ],
      "variables of every player and system of the map: a script names its own variables": [
        "clearVariables", "getVariableKeys"
      ],
      "hides or shows many events at once, for a scene of the game: scripts hide one event with $map.setEventVisible": [
        "getSuspendedEvents", "isEventSuspended", "resumeEvents", "suspendEvents"
      ],
    },
  },
  /** `Gui` of the server (`player.gui(id)`). */
  gui: {
    exposed: {
      close: "$player.closeGui",
      open: "$player.openGui",
      update: "$player.updateGui",
    },
    excluded: {
      "scripts hear what a GUI sends with the signal gui.action; the open of a GUI is matched by the engine": [
        "emit", "matchesOpenId", "on"
      ],
    },
  },
  /** `RpgMapProjectiles` (`map.projectiles`). */
  mapProjectiles: {
    exposed: {
      emit: "$map.launchProjectile",
    },
    excluded: {
      "the flight of a projectile, run by the engine on each tick: scripts launch projectiles and hear event.projectileHit, player.projectileHit and projectile.end": [
        "callHook", "canHit", "clear", "createStates", "finish", "flush", "getActiveNetworkProjectiles", "handleDestroy",
        "handleDestroyState", "handleHit", "handleHitState", "naturalEndReason", "notifyTarget", "ownerCenter", "ownerOf",
        "pathOf", "rebase", "resolveHit", "resolveIndexedDirection", "resolveLanding", "spawnInstant", "spawnNow", "step",
        "stepLinger"
      ],
    },
  },
  /** `RpgPlayerProjectiles` (`player.projectiles`). */
  playerProjectiles: {
    exposed: {
      emit: "$map.launchProjectile",
    },
    excluded: {

    },
  },
  /** The exports of `@rpgjs/action-battle`. */
  actionBattle: {
    exposed: {
      applyActionBattleEntityHit: "combat.hit",
      applyActionBattleHit: "combat.hit",
      applyPlayerHitToEvent: "combat.hit",
      createActionEnemy: "$map.spawnEnemy",
      executeActionBattleUse: "$player.useSkill",
      isActionBattleEnabled: "$player.useSkill",
    },
    excluded: {
      "identifiers and defaults of the module, read by the game when it configures it": [
        "ACTION_BATTLE_ACTION_BAR_GUI_ID", "ACTION_BATTLE_CLIENT_VISUAL_ID", "ACTION_BATTLE_COMBAT_AUDIO_ID",
        "ACTION_BATTLE_DAMAGE_COMPONENT_ID", "ACTION_BATTLE_DODGE", "ACTION_BATTLE_ENEMY_FACTION", "ACTION_BATTLE_GUARD_END",
        "ACTION_BATTLE_GUARD_START", "ACTION_BATTLE_HITBOX_FRAME_MS", "ACTION_BATTLE_HIT_FX_COMPONENT_ID",
        "ACTION_BATTLE_PLAYER_FACTION", "ACTION_BATTLE_SOFT_TARGET_COMPONENT_ID", "ACTION_BATTLE_TELEGRAPH_COMPONENT_ID",
        "DEFAULT_ACTION_BATTLE_ATTACK_PROFILE", "DEFAULT_ACTION_BATTLE_ENEMY_ATTACK_PROFILES",
        "DEFAULT_ACTION_BATTLE_HIT_REACTION", "DEFAULT_KNOCKBACK", "DEFAULT_PLAYER_ATTACK_HITBOXES",
        "DEFAULT_ZELDA_PLAYER_HITBOXES"
      ],
      "the rules of the combat (hits, guard, dodge, targets, weapons, attack profiles, factions), applied by the module: scripts hear combat.hit and enemy.defeated, and use skills with $player.useSkill": [
        "ActionBattleHitTracker", "acquireActionBattleAttackSlot", "beginActionBattleGuard", "canActionBattleDodge",
        "canActionBattleTarget", "canActionBattleUseTarget", "clearActionBattleDefense", "consumeActionBattleCounter",
        "defaultCombatSystem", "defaultKnockbackResolver", "defaultRpgjsDamageResolver", "directionToActionBattleTarget",
        "endActionBattleGuard", "getActionBattleActionConfig", "getActionBattleActionRange",
        "getActionBattleControlLockDuration", "getActionBattleFaction", "getActionBattleSystems", "getActionBattleTargets",
        "getNormalizedActionBattleAttackProfile", "getPlayerWeaponKnockbackForce", "handleActionBattleProjectileDestroy",
        "handleActionBattleProjectileImpact", "isActionBattleCombatEntity", "isActionBattleEntityInvincible",
        "isActionBattleEvent", "isActionBattleGuarding", "isActionBattlePlayer", "matchesActionBattleTargetSelector",
        "normalizeActionBattleAttackProfile", "normalizeActionBattleEnemyAttackProfiles", "normalizeActionBattleGuardOptions",
        "normalizeActionBattleHitReaction", "releaseActionBattleAttackSlot", "resolveActionBattleCharge",
        "resolveActionBattleComboStep", "resolveActionBattleDefense", "resolveActionBattleHitboxSpeed",
        "resolveActionBattleSoftTarget", "resolveActionBattleWeapon", "resolveActionBattleWeaponAttackProfile",
        "runActionBattleActiveHitbox", "scheduleActionBattleStartup", "setActionBattleInvincibility",
        "shouldUseActionBattleUsable"
      ],
      "the setup, the look and the sound of the module, configured by the game": [
        "ActionBattleUi", "createActionBattleAttackId", "createActionBattleClientVisuals", "createActionBattleCombatAudioVisual",
        "createActionBattleServer", "createActionBattleSystems", "createActionBattleUi", "createActionBattleVisual",
        "createClassicActionBattleVisual", "createDefaultPlayerHitboxResolver", "createFxActionBattleVisual", "default",
        "emitActionBattleClientVisual", "openActionBattleActionBar", "openActionBattleHotbar", "playActionBattleAudioCue",
        "playActionBattleMomentAudio", "playActionBattleVisual", "playLocalActionBattleAttackAudio", "provideActionBattle",
        "resolveActionBattleUi", "setActionBattlePreviewStarter", "updateActionBattleActionBar", "updateActionBattleHotbar",
        "visual"
      ],
      "how the game defines its enemies and their AI: scripts name an enemy by its id in $map.spawnEnemy": [
        "AiDebug", "AiState", "AttackPattern", "BattleAi", "EnemyType", "defaultEnemyBehaviors", "defaultEnemyPresets",
        "defineActionBattleAiPreset", "defineActionBattleEnemy"
      ],
      "the bricks of the AI of an enemy, put together in the game (its preset): scripts make enemies appear with $map.spawnEnemy and walk events with $map.moveEvent": [
        "action", "callAction", "chase", "condition", "cooldown", "decision", "defineAiBehavior", "defineAiTree",
        "distanceLessThan", "faceTarget", "flee", "fleeFromTarget", "holdPosition", "hpBelow", "idle", "ifDistanceLessThan",
        "ifHpBelow", "ifTargetInRange", "ifTargetVisible", "inState", "isEnemyType", "keepDistance", "moveToPoint",
        "moveToTarget", "once", "patrol", "phase", "rule", "run", "selector", "sequence", "sequenceWithDelay", "setMode",
        "setSpeed", "targetInRange", "targetVisible", "teleportNearTarget", "teleportTo", "useAttack", "useSkill", "wait"
      ],
    },
  },
};
