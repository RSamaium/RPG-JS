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
      addParameter: "$player.addParameter",
      addState: "$player.addState",
      allRecovery: "$player.hp",
      animationFixed: "$player.animationFixed",
      animationName: "$player.animationName",
      applyDamage: "$player.applyDamage",
      applyIceMovement: "$player.applyIceMovement",
      assignHotbarSlot: "$player.assignHotbarSlot",
      atk: "$player.atk",
      attachShape: "$map.attachShape",
      autoChangeMap: "$player.autoChangeMap",
      breakRoutes: "$player.breakRoutes",
      buyItem: "$player.buyItem",
      callGameover: "$player.callGameover",
      callMainMenu: "$player.callMainMenu",
      callShop: "$player.callShop",
      cameraFollow: "$player.cameraFollow",
      canMove: "$player.canMove",
      changeActor: "$player.changeActor",
      changeDirection: "$map.turnEvent",
      changeMap: "$player.changeMap",
      changeRoom: "$player.changeRoom",
      clearHotbarSlot: "$player.clearHotbarSlot",
      clearMovements: "$player.clearMovements",
      clearVariables: "$player.clearVariables",
      configureHotbar: "$player.configureHotbar",
      createDynamicEvent: "$map.createDynamicEvent",
      dash: "$player.dash",
      direction: "$player.direction",
      directionFixed: "$player.directionFixed",
      dropLoot: "$player.dropLoot",
      effects: "$player.effects",
      elements: "$player.elements",
      elementsDefense: "$player.elementsDefense",
      elementsEfficiency: "$player.elementsEfficiency",
      equip: "$player.equip",
      equipments: "$player.isEquipped",
      exp: "$player.exp",
      expCurve: "$player.expCurve",
      expForNextlevel: "$player.expForNextlevel",
      finalLevel: "$player.finalLevel",
      flash: "$player.flash",
      followPath: "$player.followPath",
      forgetSkill: "$player.forgetSkill",
      frequency: "$player.frequency",
      getDirection: "$player.direction",
      getGui: "$player.updateGui",
      getHotbar: "$player.getHotbar",
      getHotbarCapacity: "$player.getHotbarCapacity",
      getInShapes: "$player.getInShapes",
      getItem: "$player.getItem",
      getLocale: "$player.getLocale",
      getParamItem: "$player.getParamItem",
      getParamValue: "$player.getParamValue",
      getShapes: "$player.getShapes",
      getSkill: "$player.hasSkill",
      getState: "$player.hasState",
      getTile: "$map.getTile",
      getVariable: "$player.getVariable",
      getVariableKeys: "$player.getVariableKeys",
      gold: "$player.gold",
      graphics: "$player.graphics",
      gui: "$player.openGui",
      hasActiveMovements: "$player.hasActiveMovements",
      hasEffect: "$player.hasEffect",
      hasItem: "$player.hasItem",
      hasVariable: "$player.hasVariable",
      hideAttachedGui: "$player.hideAttachedGui",
      hideHotbar: "$player.hideHotbar",
      hitbox: "$player.hitbox",
      hp: "$player.hp",
      infiniteMoveRoute: "$player.infiniteMoveRoute",
      initialLevel: "$player.initialLevel",
      knockback: "$player.knockback",
      knockbackActive: "$player.knockbackActive",
      learnSkill: "$player.learnSkill",
      level: "$player.level",
      mass: "$player.mass",
      moveRoutes: "$player.moveRoutes",
      moveTo: "$map.moveEvent",
      name: "$player.name",
      oscillate: "$player.oscillate",
      param: "$player.maxHp",
      parameters: "$player.parameters",
      paramsModifier: "$player.paramsModifier",
      pdef: "$player.pdef",
      placeHotbarItem: "$player.placeHotbarItem",
      playSound: "$player.playSound",
      pushable: "$player.pushable",
      recovery: "$player.hp",
      refreshHotbar: "$player.refreshHotbar",
      removeComponents: "$player.removeComponents",
      removeGui: "$player.closeGui",
      removeItem: "$player.removeItem",
      removeState: "$player.removeState",
      removeVariable: "$player.removeVariable",
      replayRoutes: "$player.replayRoutes",
      sdef: "$player.sdef",
      selectHotbarSlot: "$player.selectHotbarSlot",
      sellItem: "$player.sellItem",
      setActor: "$player.setActor",
      setAnimation: "$map.playEventAnimation",
      setClass: "$player.setClass",
      setComponentsBottom: "$player.setComponentsBottom",
      setComponentsCenter: "$player.setComponentsCenter",
      setComponentsLeft: "$player.setComponentsLeft",
      setComponentsRight: "$player.setComponentsRight",
      setComponentsTop: "$player.setComponentsTop",
      setGraphic: "$map.setEventGraphic",
      setGraphicAnimation: "$player.setGraphicAnimation",
      setHitbox: "$player.setHitbox",
      setLocale: "$player.setLocale",
      setMass: "$player.setMass",
      setParameter: "$player.setParameter",
      setSizes: "$player.setSizes",
      setVariable: "$player.setVariable",
      shapes: "$player.getShapes",
      shootProjectile: "$player.shootProjectile",
      showAnimation: "$map.showAnimation",
      showAttachedGui: "$player.showAttachedGui",
      showCharacterSelect: "$player.showCharacterSelect",
      showChoices: "$player.showChoices",
      showComponentAnimation: "$map.showComponentAnimation",
      showEmotionBubble: "$player.showEmotionBubble",
      showHit: "$player.showHit",
      showHotbar: "$player.showHotbar",
      showInput: "$player.showInput",
      showLoad: "$player.showLoad",
      showNotification: "$player.showNotification",
      showSave: "$player.showSave",
      showSaveLoad: "$player.showSaveLoad",
      showText: "$player.showText",
      skills: "$player.getSkills",
      sp: "$player.sp",
      speed: "$player.speed",
      states: "$player.getStates",
      statesDefense: "$player.statesDefense",
      statesEfficiency: "$player.statesEfficiency",
      stopAllSounds: "$player.stopAllSounds",
      stopMoveTo: "$map.stopEvent",
      stopSound: "$player.stopSound",
      t: "$player.t",
      teleport: "$player.teleport",
      through: "$player.through",
      throughEvent: "$player.throughEvent",
      throughOtherPlayer: "$player.throughOtherPlayer",
      tiles: "$map.getTile",
      tint: "$player.tint",
      useActiveHotbarSlot: "$player.useActiveHotbarSlot",
      useHotbarSlot: "$player.useHotbarSlot",
      useItem: "$player.useItem",
      useSkill: "$player.useSkill",
      x: "$player.x",
      y: "$player.y",
      z: "$player.z",
    },
    excluded: {
      "internal to the engine, not gameplay: its life cycle, snapshots and saves, synchronization with the clients, hooks and events of the class, factories of instances, the way the player is linked to a room": [
        "applyDefaultParameters", "applyFrames", "applySnapshot", "buildDefaultSlots", "clientVisual", "createClassInstance",
        "createItemInstance", "createSkillInstance", "createStateInstance", "databaseById", "emit", "events", "execMethod",
        "flattenRoutes", "getCurrentMap", "getCurrentRoom", "hooks", "hpSignal", "i18n", "initializeDefaultStats",
        "initializeHotbar", "isConnected", "isEvent", "load", "mergeComponents", "normalizeComponents", "normalizeHotbar", "off",
        "on", "once", "pendingMapPosition", "prepareSnapshotForObjectLoad", "projectiles", "resolveClassSnapshot",
        "resolveConfiguredCapacity", "resolveEquipmentsSnapshot", "resolveItemsSnapshot", "resolveSkillsSnapshot",
        "resolveStatesSnapshot", "runHook", "save", "server", "setMap", "setSync", "snapshot", "spSignal", "syncChanges", "transferRoom",
        "type", "worldPositionX", "worldPositionY"
      ],
      "flags the physics engine keeps up to date: scripts read and change the character with x, y, z, through, pushable, speed, setHitbox": [
        "interactive", "otherPlayersCollision", "position"
      ],
      "movement strategies are objects of the physics engine, not data: scripts use dash, knockback, followPath, oscillate, applyIceMovement, shootProjectile and moveRoutes": [
        "addMovement", "getActiveMovements", "removeMovement"
      ],
      "the definitions the client draws, as objects of the client: scripts set them with setComponentsTop/Bottom/Left/Right/Center and removeComponents": [
        "componentsBottom", "componentsCenter", "componentsLeft", "componentsRight", "componentsTop"
      ],
      "they take or give classes and functions of the database (a state class, an item instance, a formula): scripts use addState, useItem, applyDamage, getParamValue": [
        "applyEffect", "applyStates", "coefficientElements", "findStateEfficiency", "getFeature", "getFormulas"
      ],
      "the instances of the inventory, with their signals: scripts read an item with getItem and count with hasItem": [
        "items"
      ],
      "the bookkeeping of the hotbar (checks, normalization, the raw state): scripts use getHotbar, selectHotbarSlot, clearHotbarSlot, useHotbarSlot, configureHotbar": [
        "assertAccessibleSlot", "assertEntryAvailable", "assertSlot", "commitHotbar", "getHotbarLockedSlotHint", "hotbar",
        "isHotbarEntryTypeAllowed"
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
      addInDatabase: "$map.addInDatabase",
      broadcast: "$map.broadcast",
      clearLighting: "$map.clearLighting",
      clearVariables: "$map.clearVariables",
      clearWeather: "$map.clearWeather",
      createDynamicEvent: "$map.createDynamicEvent",
      createShape: "$map.createShape",
      dropLoot: "$map.dropLoot",
      findSpawnPosition: "$map.findSpawnPosition",
      getBodyPosition: "$map.getBodyPosition",
      getEvent: "$map.getEvent",
      getEvents: "$map.getEvents",
      getInteractableObjectIds: "$map.getInteractableObjectIds",
      getLighting: "$map.getLighting",
      getPlayer: "$map.getPlayer",
      getPlayers: "$map.getPlayers",
      getShape: "$map.getShape",
      getShapes: "$map.getShapes",
      getSuspendedEvents: "$map.getSuspendedEvents",
      getTick: "$map.getTick",
      getVariable: "$map.getVariable",
      getVariableKeys: "$map.getVariableKeys",
      getWeather: "$map.getWeather",
      hasVariable: "$map.hasVariable",
      heightPx: "$map.heightPx",
      id: "$map.id",
      isEventSuspended: "$map.isEventSuspended",
      isMoving: "$map.isMoving",
      movePlayer: "$map.movePlayer",
      patchLighting: "$map.patchLighting",
      patchWeather: "$map.patchWeather",
      playSound: "$map.playSound",
      playVisualEffect: "$map.playVisualEffect",
      queryArea: "$map.queryArea",
      queryHitbox: "$map.queryHitbox",
      removeEvent: "$map.removeEvent",
      removeInDatabase: "$map.removeInDatabase",
      removeShape: "$map.removeShape",
      removeVariable: "$map.removeVariable",
      resumeEvent: "$map.setEventVisible",
      resumeEvents: "$map.resumeEvents",
      setBodyPosition: "$map.setBodyPosition",
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
      suspendEvents: "$map.suspendEvents",
      transitionLighting: "$map.transitionLighting",
      updateHitbox: "$map.updateHitbox",
      widthPx: "$map.widthPx",
    },
    excluded: {
      "internal to the engine, not gameplay: its life cycle, ticks, synchronization with the clients, network, input, hooks, saves, and the bookkeeping of events per player": [
        "applyMapOptions", "applySyncToClient", "bindCharacterSignalSync", "buildRuntimeEventId", "clear", "clearAll",
        "clearEventRuntimeMetadata", "clearLightingTransition", "clearPhysic", "clientVisual", "emitPhysicsEntityAdd",
        "emitPhysicsEntityRemove", "emitPhysicsInit", "emitPhysicsReset", "events", "forceSingleTick", "getEventModeById",
        "getEventsForPlayer", "getMaxFixedStepsPerTick", "getObjectById", "getRuntimeMapUpdateToken",
        "getScenarioOwnerIdByEventId", "getServerTickTime", "getTickTime", "guiExit", "guiInteraction", "hasActiveConnections",
        "hooks", "interceptorPacket", "isAlwaysOnTopEvent", "isAutoTickEnabled", "isEventVisibleForPlayer",
        "isPhysicsSyncingSignals", "isPositiveNumber", "isStandalone", "listSaveSlots", "loadPhysic", "loadSlot", "mapView",
        "nextTick", "nextTickAsync", "normalizeTickDelta", "off", "on", "onAction", "onInput", "onJoin", "onLeave",
        "onMapStreamRequest", "onPing", "onRestore", "onSessionRestore", "onStart", "pauseLoopWhileEmpty", "players",
        "processInput", "rebuildMapFromStoredSource",
        "refreshCharacterHitboxes", "reloadMapEvents", "removeScenarioEventsForPlayer", "runFixedTicks", "runFixedTicksAsync",
        "runPostTickUpdates", "runQueuedServerTick", "runServerTick", "saveSlot", "setAutoTick", "setEventRuntimeMetadata",
        "setPlayerLocale", "setSync", "setupCollisionDetection", "spawnScenarioEventsForPlayer", "startServerTickLoop",
        "stopServerTickLoop", "syncChanges", "unbindCharacterSignalSync", "updateMap", "withPhysicsSync"
      ],
      "private methods of the engine, not its public API (they work on the physics bodies of the map)": [
        "addCharacter", "addMapHitbox", "addStaticHitbox", "addZone", "clearStreamedStaticHitboxes",
        "configureCharacterPushability", "createCharacterHitbox", "dashBody", "dispatchShapeCollision", "getCollisions",
        "getInteractionAABB", "getInteractionCollisions", "getZone", "isEntityMoving", "isPushableCharacter", "isSpawnObstacle",
        "isThroughEvent", "moveBody", "registerZoneEvents", "removeHitbox", "removeZone", "replaceStaticHitboxes",
        "replaceStreamedStaticHitboxes", "resolveCharacterHitboxSize", "resolveCharacterMass", "resolveHitboxDimension",
        "resolveNumeric", "resolvePhysicsEntityKind", "resolveTrustedMapDimensions", "setCharacterCollisionEnabled",
        "setStaticHitboxElevation", "shouldDisableCharacterCollisions", "staticHitboxBlocksOwner", "stopMovement",
        "updateCharacterHitbox"
      ],
      "they give objects of the physics engine (a body, a stream of positions), not data: scripts use getBodyPosition, setBodyPosition, queryHitbox, isMoving": [
        "createMovingHitbox", "getBody"
      ],
      "the world of maps and map streaming, set by the game and its map loader: scripts move players with $player.changeMap and autoChangeMap": [
        "createDynamicWorldMaps", "deleteWorldMaps", "getInWorldMaps", "getWorldMaps", "getWorldMapsManager",
        "removeFromWorldMaps", "restoreMapStreamingRuntime", "restoreWorldMapsRuntime", "setInWorldMaps", "updateWorld",
        "updateWorldMaps", "worldX", "worldY"
      ],
      "they take a function: scripts filter $map.getEvents() themselves": [
        "getEventBy", "getEventsBy"
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
