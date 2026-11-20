/**
 * What scripts have of the engine: every public method and property of `RpgPlayer`, `RpgEvent` and `RpgMap` is either exposed to
 * scripts (with the name a script uses) or excluded on purpose, with the reason. A test lists the methods of the engine and fails
 * when one has no decision, so that a new method of the engine gets one instead of being forgotten.
 */

/** The decision for each method of a class of the engine: the name a script uses for it, or why scripts do not have it. */
export interface EngineCoverage {
  /** Method or property of the engine → the name of the game API that gives it to scripts (`$player.addItem`). */
  exposed: Record<string, string>;
  /** Why scripts do not have them → the methods and properties. */
  excluded: Record<string, readonly string[]>;
}

/** The decisions for `RpgPlayer`, `RpgEvent` and `RpgMap`. */
export const ENGINE_COVERAGE: { player: EngineCoverage; event: EngineCoverage; map: EngineCoverage } = {
  /** `RpgPlayer` (the player of the script; an event has them too). */
  player: {
    exposed: {
      addItem: "$player.addItem",
      addState: "$player.addState",
      allRecovery: "$player.hp",
      assignHotbarSlot: "$player.assignHotbarSlot",
      attachShape: "$map.attachShape",
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
        "canMove", "hitbox", "interactive", "mass", "otherPlayersCollision", "position", "pushable", "setHitbox", "setMass",
        "setSizes", "through", "throughEvent", "throughOtherPlayer", "z"
      ],
      "moves a character with physics strategies or routes: the player moves by its inputs, scripts teleport it and walk events with $map.moveEvent": [
        "addMovement", "applyIceMovement", "breakRoutes", "clearMovements", "dash", "followPath", "frequency",
        "getActiveMovements", "hasActiveMovements", "infiniteMoveRoute", "knockback", "knockbackActive", "moveRoutes",
        "oscillate", "removeMovement", "replayRoutes", "shootProjectile", "speed"
      ],
      "how the client draws the character beyond its graphic and its animations (components, camera, tint, hit texts, GUIs on the sprite): the game designs it; scripts change the graphic of an event and play its animations": [
        "animationFixed", "animationName", "cameraFollow", "componentsBottom", "componentsCenter", "componentsLeft",
        "componentsRight", "componentsTop", "directionFixed", "flash", "graphics", "hideAttachedGui", "removeComponents",
        "setComponentsBottom", "setComponentsCenter", "setComponentsLeft", "setComponentsRight", "setComponentsTop",
        "setGraphicAnimation", "showAttachedGui", "showHit", "tint"
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
};
