/**
 * The game API of scripts, as data: what a script may read, assign and call in a game. It follows the API of RPGJS: the names are
 * the ones of `RpgPlayer` (`showText`, `showChoices`, `showNotification`, `changeMap`, `addItem`, `getVariable`…), and so are the
 * options that exist there. What each of these does is not here: the game (a player, a map) and the simulation each implement it
 * (`ApiImpl`), and `missingImplementations` checks that they cover exactly this list.
 */
import type { ApiDescription } from "../core/api";
import { GAME_SIGNALS } from "./signals";

const VALUE = "string | number | boolean | null | object";

/**
 * The API of scripts in a game, as data: `$player`, `$map`, `$room`, `$event`, `$shared`, `$data`, `$hook`, `$state`, the functions `wait`, `random`,
 * `distance`, `inSight`, `Item`, `Graphic`, and the signals of the game. What each name does is in `GAME_API_IMPL`, over a `ScriptWorld`.
 */
export const GAME_API_DESCRIPTION: ApiDescription = {
  signals: GAME_SIGNALS,
  families: [
    {
      name: "Rewards and dialogues", doc: "talk to the player, give and take, remember",
      names: ["$player.showText", "$player.showChoices", "$player.showNotification", "$player.gold", "$player.addItem", "$player.removeItem", "$player.getVariable", "$player.setVariable", "$state", "$shared", "$data"],
      example: 'on("event.action", { where: { "event.name": "merchant" } }, () => { if ($player.showChoices("Buy a potion?", [{ text: "Yes", value: true }, { text: "No", value: false }])?.value) { $player.gold -= 10; $player.addItem("potion", 1); } });',
    },
    {
      name: "Positions and sight", doc: "where the player and the events are, and who sees whom",
      names: ["$player.x", "$player.y", "$player.direction", "$event.direction", "$map.getEvent", "distance", "inSight"],
      example: 'on("map.tick", { every: 0.5 }, () => { const guard = $map.getEvent("guard"); if (guard && inSight(guard, { x: $player.x, y: $player.y }, { walls: true })) { $map.showEmotionBubble("guard", "exclamation"); } });',
    },
    {
      name: "Zones", doc: "areas of the map, fixed or attached to an event, that players enter and leave",
      names: ["$map.createShape", "$map.attachShape", "$map.removeShape", "player.inShape", "player.outShape"],
      example: 'on("player.inShape", { where: { "shape.eventId": "healer" } }, () => { $player.hp = $player.maxHp; });',
    },
    {
      name: "Movement and cutscenes", doc: "walk, turn, follow, flee, hide events; freeze the player and move the camera",
      names: ["$map.moveEvent", "$map.followPlayer", "$map.fleePlayer", "$map.stopEvent", "$map.turnEvent", "$map.teleportEvent", "$map.setEventVisible", "$player.teleport", "$player.canMove", "$player.cameraFollow", "event.arrived"],
      example: '$player.canMove = false; $player.cameraFollow("guard", { smoothMove: true }); $map.moveEvent("guard", { x: 320, y: 96 }, { wait: true }); $player.showText("The gate is open."); $player.cameraFollow("player"); $player.canMove = true;',
    },
    {
      name: "Look of events", doc: "graphics, animations and emotion bubbles",
      names: ["$map.setEventGraphic", "$map.playEventAnimation", "$map.showEmotionBubble", "$player.showEmotionBubble"],
    },
    {
      name: "Scenery", doc: "the tiles of the map and the ones players touch",
      names: ["$map.getTile", "player.touchTile"],
      example: 'on("player.touchTile", (e) => { if (e.properties.kind === "lava") { $player.hp -= 10; } });',
    },
    {
      name: "Battle and character", doc: "hp, sp, states, experience, skills, equipment, items, battles and enemies",
      names: ["$player.hp", "$player.sp", "$player.addState", "$player.exp", "$player.learnSkill", "$player.equip", "$player.useItem", "$player.useSkill", "$player.startBattle", "$map.spawnEnemy", "enemy.defeated", "battle.end"],
      example: 'on("enemy.defeated", { where: { enemy: "slime" } }, () => { const c = { ...($state.kills ?? {}) }; c[$player.name] = (c[$player.name] ?? 0) + 1; $state.kills = c; });',
    },
    {
      name: "Time", doc: "do something later, or again and again, for a player",
      names: ["$player.startTimer", "$player.stopTimer", "timer.fire", "wait", 'on(signal, { every })'],
      example: 'on("player.touchTile", (e) => { if (e.properties.kind === "poison") { $player.startTimer("poison", 1, { repeat: true }); } });\non("timer.fire", { where: { name: "poison" } }, () => { $player.hp -= 5; });',
    },
    {
      name: "Debugging", doc: "write what the script does where its author reads it",
      names: ["log"],
    },
  ],
  handles: {
    $player: {
      doc: "The player the script acts for. The names are the ones of RpgPlayer.",
      members: {
        gold: { type: "number", writable: true, doc: "The gold. Assign it with =, +=, -=, *=: it never goes below 0." },
        level: { type: "number" },
        name: { type: "string" },
        x: { type: "number", doc: "Position on the map in pixels: the top-left of the hitbox, as changeMap and teleport take it." },
        y: { type: "number" },
        direction: { type: '"up" | "down" | "left" | "right"', doc: "Where the player faces." },
        hp: { type: "number", writable: true, doc: "Health points. Assign them with =, +=, -=, *=: they stay between 0 and maxHp, and 0 makes the player dead (player.dead)." },
        sp: { type: "number", writable: true, doc: "Skill points, between 0 and maxSp." },
        maxHp: { type: "number", doc: "0 when the game gives the player no maximum (no parameters): hp is then not capped." },
        maxSp: { type: "number", doc: "0 when the game gives the player no maximum." },
        canMove: { type: "boolean", writable: true, doc: "Whether the player moves with its inputs. Set it to false during a cutscene, and back to true after: nothing gives it back by itself." },
        exp: { type: "number", writable: true, doc: "Experience points. Assign them with = or +=: they never go below 0, and the player levels up as they grow (player.levelUp)." },
      },
      methods: {
        getItem: { sync: true, sig: "(id: string): { id: string; name: string; quantity: number } | undefined", doc: "A copy of an item of the inventory, or undefined when the player has none." },
        hasItem: { sync: true, sig: "(id: string): boolean" },
        addItem: { sig: "(id: string, nb?: number): void", doc: "Gives an item of the database of the game." },
        removeItem: { sig: "(id: string, nb?: number): void", doc: "Takes up to nb items: a player who has fewer loses what they have, one who has none loses nothing." },
        getVariable: { sync: true, sig: `(key: string): ${VALUE} | undefined`, doc: "A variable of the player. What you read is read-only: copy it before changing the copy." },
        setVariable: { sig: `(key: string, value: ${VALUE}): void`, doc: "Sets a variable of the player: a text, a number, true/false, null, or plain data of at most 2 000 characters. The value is copied." },
        hasVariable: { sync: true, sig: "(key: string): boolean" },
        removeVariable: { sig: "(key: string): boolean", doc: "Returns whether there was something to remove." },
        showText: {
          sig: '(text: string, options?: { position?: "top" | "middle" | "bottom"; speaker?: string; fullWidth?: boolean; autoClose?: boolean; typewriterEffect?: boolean }): void',
          doc: "Shows a dialogue and waits for the player to close it.",
        },
        showChoices: {
          sig: "(text: string, choices: { text: string; value: string | number | boolean }[]): { text: string; value: string | number | boolean } | null",
          doc: "Asks the player to pick one of 2 to 8 choices and waits. Gives the choice picked, or null when the player closes it.",
        },
        showNotification: { sig: '(message: string, options?: { type?: "info" | "warn" | "error"; time?: number }): void', doc: "Shows a notification." },
        changeMap: { sig: "(map: string, positions?: { x: number; y: number }): void", doc: "Moves the player to a map, at a position when given." },
        openGui: {
          sig: "(id: string, data?: object, options?: { blockPlayerInput?: boolean }): void",
          doc: 'Opens a GUI of the client for the player, as player.gui(id).open(data, options) does in RPGJS. A GUI of a plugin is named <pluginId>_<file> (the file panel.ce of the plugin quests is "quests_panel"); the GUIs of the game (rpg-…) are not for scripts. The data (2 000 characters at most) reaches the component. blockPlayerInput stops the player from moving while it is open. The script does not wait: listen to "gui.action" for what the player does in it.',
        },
        updateGui: { sig: "(id: string, data: object): void", doc: "Sends new data to a GUI that is open, as player.gui(id).update(data) does." },
        closeGui: { sig: "(id: string, data?: object): void", doc: "Closes a GUI, as player.removeGui(id, data) does." },
        assignHotbarSlot: {
          sig: '(slot: number, entry: { type: "skill" | "item" | string; id: string }): void',
          doc: "Puts a skill the player knows, a usable item or the entry of a plugin in a slot of the hotbar (0 to 9), as player.assignHotbarSlot does. The entry that was elsewhere in the hotbar moves. Listen to player.hotbarChange for the changes.",
        },
        cameraFollow: { sig: '(target: string, options?: { smoothMove?: boolean; time?: number }): void', doc: 'Points the camera of the player at an event (its id), or back at the player with "player". smoothMove glides to it in time milliseconds (10 000 at most). Only this player sees it.' },
        startTimer: {
          sig: "(name: string, seconds: number, options?: { repeat?: boolean }): void",
          doc: "Starts a timer of the player: timer.fire { name } is emitted for this player after seconds (0.1 to 3 600), and again every seconds with repeat, until stopTimer or the player leaves the game. Starting a timer of the same name restarts it. 20 timers per player at most.",
        },
        stopTimer: { sig: "(name: string): boolean", doc: "Stops a timer of the player. Gives false when there is none of that name." },
        showEmotionBubble: { sig: "(emotion: string): void", doc: 'Shows an emotion bubble above the player, for every player of the map: "like", "surprise", "idea", "question", "exclamation", "angry", "sad", "love", "music", "sleep"… or one the game adds.' },
        addState: { sig: "(id: string): boolean", doc: "Gives a state of the database (poison, sleep, haste…), with its effects on the parameters, as player.addState does. Gives false when the player already has it." },
        removeState: { sig: "(id: string): boolean", doc: "Takes a state away. Gives false when the player does not have it." },
        hasState: { sync: true, sig: "(id: string): boolean" },
        getStates: { sync: true, sig: "(): string[]", doc: "The ids of the states of the player." },
        learnSkill: { sig: "(id: string): boolean", doc: "Teaches a skill of the database (player.skillChange fires). Gives false when the player already knows it." },
        forgetSkill: { sig: "(id: string): boolean", doc: "Makes the player forget a skill. Gives false when the player does not know it." },
        hasSkill: { sync: true, sig: "(id: string): boolean" },
        getSkills: { sync: true, sig: "(): string[]", doc: "The ids of the skills the player knows." },
        equip: { sig: "(id: string, equipped?: boolean): boolean", doc: "Equips a weapon or an armor of the inventory, or takes it off with false, as player.equip does (player.itemEquip fires). Gives false when it cannot: not in the inventory, not equipment, refused by the class, already so." },
        isEquipped: { sync: true, sig: "(id: string): boolean" },
        useItem: { sig: "(id: string): boolean", doc: "Uses an item of the inventory as the player would: its effects and states apply, then one is consumed (player.itemUse fires). Gives false when it cannot: not in the inventory, not usable, or its hit rate failed (it is then consumed too, as in RPGJS)." },
        teleport: { sig: "(position: { x: number; y: number }): void", doc: "Moves the player at once to a position of the map they are on. To go to another map, use changeMap." },
        startBattle: {
          sig: '(troopId: string, options?: { kind?: "turn" | "tactical" }): "victory" | "defeat" | "escape" | null',
          doc: 'Plays a troop of the database with the battle system of the game and waits for the end of the battle: gives "victory", "defeat" or "escape", or null when the game has no battle system for it. kind picks a turn-based or a tactical battle; without it, the game picks. battle.start and battle.end fire as for any battle.',
        },
        useSkill: {
          sig: "(skillId: string, options?: { target?: string }): boolean",
          doc: "Uses a skill the player knows, as player.useSkill does. With Action Battle on the map, a skill with an action follows its rules: its projectile, damage formula, factions, states, SP cost and cooldown. target is the id of an event or a player of the map; without it, Action Battle aims at the nearest enemy within the reach of the action, whatever the player faces. Gives false when the skill cannot be used now (not learned, not enough SP, cooldown, no target).",
        },
      },
    },
    $map: {
      doc: "The map the script runs in, with the names of RpgMap. It is not there in a room that is not a map: $room.kind says where the script runs.",
      members: { id: { type: "string" } },
      methods: {
        createDynamicEvent: {
          sig: "(event: { id?: string; x: number; y: number; name?: string; graphic?: string; hitbox?: { width: number; height: number }; through?: boolean; forPlayer?: boolean }): string",
          doc: "Creates an event on the map and gives its id. It is described by plain data and listens to the same signals as any event (event.action, event.touch). With forPlayer: true it exists for the player of the script only (the others neither see nor touch it, and it goes when that player leaves the map); its id is then made unique for the player. A script makes 50 events on a map at most.",
        },
        getEvent: { sync: true, sig: "(id: string): { id: string; name: string; x: number; y: number; direction: string } | undefined", doc: "A copy of an event of the map, with where it faces, or undefined." },
        getEvents: { sync: true, sig: "(): { id: string; name: string; x: number; y: number; direction: string }[]", doc: "Copies of the events of the map." },
        removeEvent: { sig: "(id: string): boolean", doc: "Removes an event that a script made. The events of the game are not removed: it gives false." },
        getPlayers: { sync: true, sig: "(): { id: string; name: string }[]", doc: "The players on the map." },
        getVariable: { sync: true, sig: `(key: string): ${VALUE} | undefined`, doc: "A variable of the map, shared by its players. What you read is read-only." },
        setVariable: { sig: `(key: string, value: ${VALUE}): void`, doc: "Sets a variable of the map, with the same values as the variables of the player." },
        hasVariable: { sync: true, sig: "(key: string): boolean" },
        removeVariable: { sig: "(key: string): boolean" },
        getWeather: { sync: true, sig: "(): object | null", doc: "The weather of the map: { effect, preset, params, transitionMs, durationMs }, or null." },
        setWeather: { sig: "(state: object | null): void", doc: "Sets the weather of the map with plain data: it needs an effect (\"rain\", \"snow\"…) or a preset; null clears it." },
        patchWeather: { sig: "(patch: object): void", doc: "Changes some fields of the weather, its params included, and keeps the others." },
        clearWeather: { sig: "(): void" },
        getLighting: { sync: true, sig: "(): object | null", doc: "The lighting of the map: { ambient, spots, sun, shadows, dayNight }, or null." },
        setLighting: { sig: "(state: object | null): void", doc: "Sets the lighting of the map with plain data; null clears it." },
        patchLighting: { sig: "(patch: object): void", doc: "Changes some parts of the lighting and keeps the others." },
        clearLighting: { sig: "(): void" },
        setDay: { sig: "(): void", doc: "Turns the day on." },
        setNight: { sig: "(): void", doc: "Turns the night on." },
        transitionLighting: { sig: '(to: object, options?: { duration?: number; easing?: "linear" | "easeInOut" }): void', doc: "Moves the lighting to another one over duration milliseconds." },
        createShape: {
          sig: "(zone: { name?: string; x: number; y: number; width: number; height: number; z?: number; color?: string; collision?: boolean; properties?: object }): string",
          doc: 'Makes a zone on the map and gives its name. Players entering and leaving it fire player.inShape and player.outShape. `color` is "#rrggbb". A script makes 50 zones on a map at most.',
        },
        getShape: { sync: true, sig: "(name: string): { name: string; x: number; y: number; width: number; height: number } | undefined", doc: "A copy of a zone of the map, or undefined." },
        getShapes: { sync: true, sig: "(): { name: string; x: number; y: number; width: number; height: number }[]", doc: "Copies of the zones of the map." },
        removeShape: { sig: "(name: string): boolean", doc: "Removes a zone that a script made. The zones of the game are not removed: it gives false." },
        playSound: { sig: "(id: string, options?: { volume?: number; loop?: boolean }): void", doc: "Plays a sound for the players of the map. volume is 0 to 1." },
        stopSound: { sig: "(id: string): void" },
        showAnimation: { sig: "(position: { x: number; y: number }, graphic: string, animationName?: string): void", doc: 'Shows an animation of a graphic at a position of the map, for its players. animationName is "default" when not given.' },
        showComponentAnimation: { sig: "(id: string, position: { x: number; y: number }, params?: object): void", doc: "Shows an animation made by a component of the game, with plain data as params." },
        launchProjectile: {
          sig: "(options: { projectile: string; from: { x: number; y: number }; toward: { x: number; y: number }; damage?: number; speed?: number; range?: number; arc?: boolean | { height?: number }; landingRadius?: number; delay?: number; owner?: \"player\" }): string",
          doc: "Launches a projectile of the map from a point toward another one and gives its id. `projectile` is the type of the projectile: the clients draw it with the look registered for this type. damage is HP removed from each player or event it hits, as is (no defense, no faction): for a hit that follows the battle rules, use $player.useSkill. By default it flies straight and hits the first player or event on its way. With arc, it is lobbed over them and lands on `toward` (or short of it, at range); with landingRadius it then hits the players and events within that distance of where it lands, otherwise it hits nothing. delay is a wind-up in ms before it leaves. With owner: \"player\" the player of the script launches it: it flies through them, and projectile.end and event.projectileHit fire for them; without it the projectile has no owner, can hit any player, and those two signals do not fire. Listen to event.projectileHit, player.projectileHit and projectile.end for what it does. speed is at most 2 000, range at most 5 000, arc.height and landingRadius at most 500, delay at most 10 000.",
        },
        playVisualEffect: {
          sig: "(options: { effect: string; at: { x: number; y: number }; preset?: object; duration?: number; scale?: number }): void",
          doc: "Plays a one-shot visual effect (particles) at a point of the map, for its players. effect is the name of a built-in particle preset, or of the effect described by preset (a particle preset { emitters: [...] }: the resolved preset of a Studio Visual Effect). duration is how long it stays drawn, at most 10 000 ms; without it, it ends with its particles. scale is 0.1 to 10.",
        },
        attachShape: {
          sig: '(eventId: string, zone: { name?: string; radius?: number; width?: number; height?: number; angle?: number; direction?: "up" | "down" | "left" | "right"; limitedByWalls?: boolean; positioning?: "center" | "top" | "bottom" | "left" | "right"; follow?: "position" | "direction"; properties?: object }): string',
          doc: 'Attaches a zone to an event and gives its name: it moves with the event, and with follow: "direction" it turns with it. A circle of radius (or around width x height); with angle below 360 a cone facing direction: the sight of a guard. With limitedByWalls the walls hide what is behind them. Players entering and leaving it fire player.inShape and player.outShape, with shape.eventId. It counts in the 50 zones of scripts; removeShape removes it.',
        },
        moveEvent: {
          sig: '(id: string, to: { x: number; y: number } | "player", options?: { speed?: number; wait?: boolean }): boolean',
          doc: 'Walks an event of the map to a position (its top-left when it arrives) or to the player, around what blocks its way, and stops it there. event.arrived fires when it arrives. speed (0.1 to 20) is set on the event. With wait: true the script waits and gets whether it arrived (false when it was stopped, or after 60 seconds); without, it goes on at once and gets true. Every player of the map sees the event move.',
        },
        followPlayer: { sig: "(id: string, options?: { distance?: number }): void", doc: "An event follows the player, staying about distance pixels away (48 by default), until stopEvent, another move, or the player leaves the map. 50 events of a map at most follow or flee at once." },
        fleePlayer: { sig: "(id: string, options?: { distance?: number }): void", doc: "An event runs away from the player until it is distance pixels away (160 by default), and again when the player comes closer, until stopEvent, another move, or the player leaves the map." },
        stopEvent: { sig: "(id: string): void", doc: "Stops what scripts made an event do: a moveEvent, a follow, a flight. The routes the event has in the game go on." },
        turnEvent: { sig: '(id: string, direction: "up" | "down" | "left" | "right" | "player"): void', doc: 'Turns an event to a direction, or toward the player with "player".' },
        teleportEvent: { sig: "(id: string, position: { x: number; y: number }): void", doc: "Puts an event at a position of the map at once." },
        setEventVisible: { sig: "(id: string, visible: boolean): void", doc: "Hides an event (no sprite, no collision, no touch or action) and shows it again where it was, with its state. A hidden event stops its routes." },
        setEventGraphic: { sig: "(id: string, graphic: string): void", doc: "Changes the graphic of an event: an opened chest, a lit torch." },
        playEventAnimation: { sig: "(id: string, animationName: string, times?: number): void", doc: "Plays an animation of the graphic of an event (attack, skill…), times times (1 by default, 100 at most), then the event walks and stands as before." },
        showEmotionBubble: { sig: "(id: string, emotion: string): void", doc: 'Shows an emotion bubble above an event: "surprise" when a guard sees the player.' },
        spawnEnemy: {
          sig: "(enemy: { enemy: string; x: number; y: number; id?: string; name?: string; forPlayer?: boolean }): string",
          doc: "Makes an enemy appear and gives the id of its event: the game turns the event into the enemy `enemy` (an enemy of its database in a Studio game; with Action Battle it fights with its AI). It counts in the 50 events of scripts, and removeEvent removes it. With forPlayer: true it exists for the player of the script only. enemy.defeated fires when a player defeats it. Refused when the game has no such enemy.",
        },
        getTile: {
          sync: true,
          sig: "(x: number, y: number): { x: number; y: number; collision: boolean; properties: object; layers: { properties: object }[] } | undefined",
          doc: "The tile at a position in pixels: its cell (x, y in tiles), whether it blocks, and the properties of its tiles (properties merges them, the top layer wins). undefined when the map has no tiles (a map that is not a Tiled map) or outside of it. A tile whose properties have interactive: true fires player.touchTile.",
        },
        shakeMap: { sig: '(options?: { intensity?: number; duration?: number; frequency?: number; direction?: "x" | "y" | "both" }): void', doc: "Shakes the screen of the players of the map." },
      },
    },
    $room: {
      doc: "The room the script runs in: a map, or a gameplay room that is not a map.",
      members: { kind: { type: "string", doc: '"map" for a map, otherwise the kind the room was registered with.' }, id: { type: "string" } },
    },
    $event: {
      doc: "The event the script runs for (for the signals of an event).",
      members: { id: { type: "string" }, name: { type: "string", doc: "Empty when the event has none." }, x: { type: "number" }, y: { type: "number" }, direction: { type: '"up" | "down" | "left" | "right"', doc: "Where the event faces." } },
    },
    $shared: {
      doc: "Properties shared by all the players of the map, declared with shared({ ... }). Assignments (=, +=, -=) are applied at once; use take() to test and decrease in one step.",
      declared: true,
      methods: {
        take: {
          sig: "(name: string, amount: number, options?: { min?: number }): boolean",
          doc: "Decrease a number by amount only if it stays at or above min (0 by default). Returns false and changes nothing otherwise. Atomic: two players cannot both take the last one.",
        },
      },
      dynamic: { keyDoc: "name: string", type: "number | string | boolean | null", writable: true },
    },
    $data: {
      doc: "The database of the game, read only: the records of its collections (item, skill, enemy…, and the ones a plugin adds, such as quests_quest). A record is a copy of its fields, with its id and its type.",
      methods: {
        get: { sig: "(type: string, id: string): { id: string; type: string; [field: string]: any } | undefined", doc: 'A copy of a record of a collection, or undefined when there is none: $data.get("quests_quest", "wolves").' },
        list: { sig: "(type: string): { id: string; type: string; [field: string]: any }[]", doc: "Copies of the records of a collection, 1 000 at most." },
      },
    },
    $hook: {
      doc: "The payload of the signal that fired the script (the handler receives the same data as its argument).",
      dynamic: { keyDoc: "key: string", type: "string | undefined" },
    },
    $state: {
      doc: "Persistent data of the script's plugin. What you read is read-only: to change a value, build a modified copy, then assign the whole copy: const c = { ...$state.crafted }; c[id] = n; $state.crafted = c;",
      dynamic: { keyDoc: "key: string", type: "any", writable: true },
    },
  },
  functions: {
    wait: { sig: "(seconds: number): void", doc: "Pauses the script (60 seconds at most; not slept in a simulation)." },
    random: { sig: "(min: number, max: number): number", doc: "A whole number between min and max, both included. Seeded in a simulation." },
    log: { sig: "(...values: any[]): void", doc: "Writes a line where the author of the script reads it: the console of the server and the logs of the service (a simulation keeps it in its effects). Texts as they are, anything else as JSON, 500 characters at most." },
    distance: { sig: "(a: { x: number; y: number }, b: { x: number; y: number }): number", doc: "The distance between two points in pixels: distance({ x: $player.x, y: $player.y }, $map.getEvent(id))." },
    inSight: {
      sig: '(from: { x: number; y: number; direction?: "up" | "down" | "left" | "right" }, to: { x: number; y: number }, options?: { range?: number; angle?: number; walls?: boolean }): boolean',
      doc: "Whether to is in sight of from: within range pixels (200 by default), within angle degrees of where from faces (90 by default when from has a direction, a full circle otherwise), and with walls: true, with no wall between them. inSight($map.getEvent(\"guard\"), { x: $player.x, y: $player.y }, { walls: true }).",
    },
    Item: { sig: "(id: string): string", ref: "item", doc: 'Reference to an item of the database, checked when the script is saved: Item("potion").' },
    Graphic: { sig: "(id: string): string", ref: "graphic", doc: 'Reference to a graphic of the database: Graphic("npc_marchand").' },
  },
};
