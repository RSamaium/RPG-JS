import { createServer, Move, provideServerModules, RpgMap, RpgPlayer, DialogPosition, RpgShape, Components, MAXHP, RpgEvent, EventData, MapData, Frequency, ATK, PDEF, LocalStorageSaveStorageStrategy, provideAutoSave, RpgServerEngine, EventDefinition } from "@rpgjs/server";
import { provideTiledMap } from "@rpgjs/tiledmap/server";
import { Item } from '@rpgjs/database'
import mainServerModule from "./modules/server";
import { Direction } from "@rpgjs/common";
import {
  ACTION_BATTLE_HIT_FX_COMPONENT_ID,
  BattleAi,
  createActionBattleVisual,
  EnemyType,
  AttackPattern,
  provideActionBattle,
  action,
  callAction,
  chase,
  condition,
  distanceLessThan,
  flee,
  hpBelow,
  ifDistanceLessThan,
  ifHpBelow,
  ifTargetInRange,
  keepDistance,
  phase,
  selector,
  sequence,
  sequenceWithDelay,
  setSpeed,
  targetInRange,
  teleportNearTarget,
  useAttack,
  useSkill,
  visual,
  wait,
} from "@rpgjs/action-battle/server";
import { provideSaveStorage } from "@rpgjs/server";

const playSampleSlashFx = (
  target: any,
  fx: {
    component(entity: any, id: string, params?: Record<string, any>): void;
  },
  scale = 1
) => {
  fx.component(target, ACTION_BATTLE_HIT_FX_COMPONENT_ID, {
    name: "slashSpark",
    scale,
    rotation: Math.random() > 0.5 ? -0.25 : 0.25,
    zIndex: 2000,
  });
  fx.component(target, ACTION_BATTLE_HIT_FX_COMPONENT_ID, {
    name: "impactBurst",
    scale: scale * 0.55,
    alpha: 0.85,
    zIndex: 1999,
  });
};

const sampleActionBattleVisual = createActionBattleVisual({
  attack({ entity }, fx) {
    fx.graphic(entity, "attack");
  },
  castSkill({ entity }, fx) {
    fx.graphic(entity, "castSkill");
  },
  hit({ target, damage }, fx) {
    fx.flash(target, {
      tint: "white",
      duration: 110,
      cycles: 1,
    });
    fx.damageText(target, damage);
    playSampleSlashFx(target, fx, 1.05);
  },
  hurt({ entity, target, damage }, fx) {
    const hurtTarget = target ?? entity;
    fx.flash(hurtTarget, {
      tint: "white",
      duration: 130,
      cycles: 1,
    });
    fx.damageText(hurtTarget, damage);
    fx.graphic(hurtTarget, "hurt");
    playSampleSlashFx(hurtTarget, fx, 1.25);
  },
  defeat({ entity, target }, fx) {
    fx.graphic(target ?? entity, "die");
  },
});

/**
 * Basic Sword weapon
 * 
 * A standard sword with moderate attack power and knockback.
 */
const BasicSword = {
  id: 'basic-sword',
  name: 'Basic Sword',
  description: 'A simple iron sword',
  price: 100,
  atk: 15,
  knockbackForce: 40,
  _type: 'weapon' as const,
};

/**
 * Heavy Hammer weapon
 * 
 * A powerful hammer with high knockback but slower attack.
 */
const HeavyHammer = {
  id: 'heavy-hammer',
  name: 'Heavy Hammer',
  description: 'A massive war hammer with devastating knockback',
  price: 250,
  atk: 25,
  knockbackForce: 80,
  _type: 'weapon' as const,
};

/**
 * Enemy Claw weapon
 * 
 * Natural weapon for enemies with low knockback.
 */
const EnemyClaw = {
  id: 'enemy-claw',
  name: 'Sharp Claws',
  description: 'Natural claws for slashing',
  price: 0,
  atk: 10,
  knockbackForce: 30,
  _type: 'weapon' as const,
};

/**
 * Basic Shield armor
 * 
 * Simple protective equipment.
 */
const BasicShield = {
  id: 'basic-shield',
  name: 'Wooden Shield',
  description: 'A basic wooden shield',
  price: 50,
  pdef: 10,
  _type: 'armor' as const,
  icon: 'wood',
};

const BasicArmor = {
  id: 'basic-armor',
  name: 'Basic Armor',
  description: 'A basic armor',
  price: 50,
  pdef: 10,
  _type: 'armor' as const,
  icon: 'armor',
};

const BasicHelmet = {
  id: 'basic-helmet',
  name: 'Basic Helmet',
  description: 'A basic helmet',
  price: 50,
  pdef: 10,
  _type: 'armor' as const,
  icon: 'helmet',
};

const FireArmor = {
  id: 'fire-armor',
  name: 'Fire Armor',
  description: 'A fire armor',
  price: 50,
  pdef: 10,
  _type: 'armor' as const,
  icon: 'fire-armor',
};

const BasicPotion = {
  id: 'basic-potion',
  name: 'Basic Potion',
  description: 'A basic potion',
  price: 10,
  _type: 'item' as const,
  icon: 'potion',
};

const fireSkill = {
  id: 'fire-skill',
  name: 'Fire Skill',
  description: 'A fire skill',
  spCost: 10,
  hitRate: 1,
  power: 50,
  coefficient: { [ATK]: 0, [PDEF]: 0 },
  _type: 'skill' as const,
  // onUse(player: RpgPlayer) {
  //   console.log('Fire spell cast!');
  // }
};

const EliteBoltSkill = {
  id: "elite-bolt",
  name: "Elite Bolt",
  description: "A ranged action-battle projectile used by the kiter monster",
  spCost: 0,
  hitRate: 1,
  power: 18,
  coefficient: { [ATK]: 1, [PDEF]: 0.4 },
  _type: "skill" as const,
  action: {
    target: "enemy" as const,
    range: 230,
    mode: "projectile" as const,
    projectile: {
      type: "elite-bolt",
      speed: 210,
      range: 230,
      spreadDegrees: 14,
      collision: {
        ignoreOwner: true,
        predictImpact: false,
      },
      params: {
        color: "#38bdf8",
        trailColor: "#0f766e",
      },
    },
  },
};

export function Event(): EventDefinition {
  return {
    name: "EV-1",
    onInit() {
      this.setGraphic("monster");
      this.speed = 2
      this.teleport({ x: 100, y: 200 })
      this.name = "John Doe";
    },
    onPlayerTouch(player: RpgPlayer) {
     console.log("touch");
    },
    async onAction(player: RpgPlayer) {
      this.moveTo(player)
     // this.setAnimation('attack')

      // player.gold = 100;
      // await player.showText("Hello", {
      //   face: {
      //     id: 'facesetId',
      //     expression: 'happy'
      //   },
      //   talkWith: this
      // })
      // this.setGraphic("monster")
      // player.setVariable('questCompleted', true);
      // player.gold = 1000;
      // await player.callShop({
      //   items: [BasicSword, HeavyHammer, EnemyClaw, BasicShield],
      //   message: "Hey !",
      //   face: {
      //     id: 'facesetId',
      //     expression: 'happy'
      //   }
      // })
      // await player.showText("Thanks you !", {
      //   face: {
      //     id: 'facesetId',
      //     expression: 'happy'
      //   },
      //   talkWith: this
      // })
      // this.frequency = 100;
      // this.moveRoutes([
      //   Move.tileRight(2),
      //   Move.tileDown(2)
      // ])
    },
  };
}

const setupActionBattleEnemy = (
  event: RpgEvent,
  options: {
    name: string;
    x: number;
    y: number;
    hp: number;
    atk: number;
    speed: number;
    ai: ConstructorParameters<typeof BattleAi>[1];
  }
) => {
  event.setGraphic("monster");
  event.speed = options.speed;
  event.teleport({ x: options.x, y: options.y });
  event.name = options.name;
  event.through = false;
  event.hp = options.hp;
  event.param[MAXHP] = options.hp;
  event.param[ATK] = options.atk;
  event.param[PDEF] = 5;
  event.addItem(EnemyClaw);
  event.equip(EnemyClaw.id);
  event.battleAi = new BattleAi(event, options.ai);
};

export function AiPresetRusher() {
  return {
    name: "AI Demo - Preset Rusher",
    onInit() {
      setupActionBattleEnemy(this, {
        name: "Preset Rusher",
        x: 180,
        y: 160,
        hp: 260,
        atk: 12,
        speed: 3,
        ai: {
          preset: "sample-rusher",
          rewards: { exp: 15, gold: 5 },
          targets: 'events'
        },
      });
    },
  };
}

export function AiSimpleKiter() {
  return {
    name: "AI Demo - Simple Kiter",
    onInit() {
      setupActionBattleEnemy(this, {
        name: "Simple Kiter",
        x: 300,
        y: 180,
        hp: 220,
        atk: 9,
        speed: 2.5,
        ai: {
          preset: "sample-kiter",
          rewards: { exp: 18, gold: 8 },
          targets: 'events'
        },
      });
    },
  };
}

type EliteMonsterStyle = "brute" | "skirmisher";

export function AiTreeElite(
  x,
  y,
  faction = "elite-a",
  style: EliteMonsterStyle = "brute"
) {
  const isSkirmisher = style === "skirmisher";
  return {
    name: isSkirmisher
      ? "AI Demo - Projectile Skirmisher"
      : "AI Demo - Aggressive Brute",
    onInit() {
      setupActionBattleEnemy(this, {
        name: isSkirmisher ? "Projectile Skirmisher" : "Aggressive Brute",
        x,
        y,
        hp: isSkirmisher ? 300 : 460,
        atk: isSkirmisher ? 12 : 18,
        speed: isSkirmisher ? 2.6 : 2.25,
        ai: {
          preset: isSkirmisher ? "ranged" : "tank",
          faction,
          targets: "hostile",
          attackSkill: isSkirmisher ? EliteBoltSkill : undefined,
          attackRange: isSkirmisher ? 230 : 68,
          attackCooldown: isSkirmisher ? 1450 : 650,
          poise: isSkirmisher ? 1 : 3,
          dodgeChance: isSkirmisher ? 0.35 : 0.08,
          attackPatterns: isSkirmisher
            ? [AttackPattern.Melee, AttackPattern.Zone]
            : [
                AttackPattern.Melee,
                AttackPattern.Combo,
                AttackPattern.Charged,
              ],
          behaviorTree: isSkirmisher
            ? selector([
                sequence([
                  condition(hpBelow(0.35)),
                  action(flee()),
                ]),
                sequence([
                  condition(distanceLessThan(115)),
                  action(keepDistance(165)),
                ]),
                sequence([
                  condition(targetInRange(230)),
                  action(useSkill(EliteBoltSkill)),
                ]),
                action(chase()),
              ])
            : selector([
                sequence([
                  condition(hpBelow(0.12)),
                  action(useAttack(AttackPattern.Charged)),
                ]),
                sequence([
                  condition(targetInRange(72)),
                  action(useAttack(AttackPattern.Combo)),
                ]),
                action(chase()),
              ]),
          rewards: isSkirmisher
            ? { exp: 45, gold: 25 }
            : { exp: 50, gold: 28 },
        },
      });
    },
  };
}

export function AiPhaseBoss() {
  return {
    name: "AI Demo - Phase Boss",
    onInit() {
      setupActionBattleEnemy(this, {
        name: "Phase Boss",
        x: 420,
        y: 260,
        hp: 900,
        atk: 24,
        speed: 2,
        ai: {
          preset: "tank",
          attackRange: 72,
          attackCooldown: 1000,
          poise: 5,
          behaviorTree: selector([
            phase(
              "boss-alert",
              0.6,
              sequenceWithDelay("boss-alert-sequence", [
                visual({ kind: "bubble", text: "!", durationMs: 700 }),
                wait(700),
                setSpeed(3.5),
                teleportNearTarget({ distance: 140 }),
              ])
            ),
            phase(
              "boss-rage",
              0.3,
              sequenceWithDelay("boss-rage-sequence", [
                visual({ kind: "rage", durationMs: 900 }),
                wait(450),
                callAction("sample-boss-rage", { attackBonus: 8 }),
                useAttack(AttackPattern.Charged),
              ])
            ),
            sequence([
              condition(targetInRange(72)),
              action(useAttack(AttackPattern.Combo)),
            ]),
            action(chase()),
          ]),
          rewards: { exp: 120, gold: 80 },
        },
      });
    },
  };
}

export default createServer({
  providers: [
  //  provideTiledMap(),
    provideActionBattle({
      combat: {
        pvp: true,
        attack: {
          lockMovement: true,
          lockDurationMs: 320,
          profile: {
            startupMs: 0,
            activeMs: 180,
            recoveryMs: 140,
            hitPolicy: "oncePerTarget",
          },
          hitboxes: {
            up: { offsetX: -24, offsetY: -66, width: 48, height: 58 },
            down: { offsetX: -24, offsetY: 8, width: 48, height: 58 },
            left: { offsetX: -66, offsetY: -24, width: 58, height: 48 },
            right: { offsetX: 8, offsetY: -24, width: 58, height: 48 },
            default: { offsetX: -24, offsetY: -48, width: 48, height: 58 },
          },
        },
      },
      visual: sampleActionBattleVisual,
      ai: {
        actions: {
          "sample-boss-rage": ({ event }, payload) => {
            const attackBonus = Number(payload?.attackBonus ?? 0);
            if (Number.isFinite(attackBonus)) {
              event.param[ATK] += attackBonus;
            }
          },
        },
        presets: {
          "sample-rusher": {
            preset: "aggressive",
            attackRange: 54,
            visionRange: 190,
            attackCooldown: 750,
            dodgeChance: 0.2,
            attackPatterns: [
              AttackPattern.Melee,
              AttackPattern.Combo,
              AttackPattern.DashAttack,
            ],
            simpleBehavior: {
              when: [
                ifHpBelow(0.2, flee()),
                ifTargetInRange(useAttack(AttackPattern.Combo)),
              ],
              otherwise: chase(),
            },
          },
          "sample-kiter": {
            preset: "ranged",
            attackRange: 115,
            visionRange: 230,
            attackCooldown: 1100,
            dodgeChance: 0.45,
            attackPatterns: [
              AttackPattern.Melee,
              AttackPattern.Zone,
              AttackPattern.DashAttack,
            ],
            simpleBehavior: {
              when: [
                ifHpBelow(0.3, flee()),
                ifDistanceLessThan(85, keepDistance(125)),
                ifTargetInRange(useAttack(AttackPattern.Zone), 115),
              ],
              otherwise: chase(),
            },
          },
        },
        behaviors: {
          "sample-aggressive": ({ hpPercent }) => ({
            mode: hpPercent !== null && hpPercent < 0.25 ? "retreat" : "assault",
            attackCooldown: 850,
            moveToCooldown: 350,
          }),
        },
      },
    }),

    provideSaveStorage(new LocalStorageSaveStorageStrategy({ key: "save" })),
    provideAutoSave({
      canSave: (player) => true,
      getDefaultSlot: () => 0
    }),

    provideServerModules([
      mainServerModule,
      {
        // Register weapons and armor in database
        database: async () => {
          return {
            'basic-sword': BasicSword,
            'heavy-hammer': HeavyHammer,
            'enemy-claw': EnemyClaw,
            'basic-shield': BasicShield,
            'basic-armor': BasicArmor,
            'basic-helmet': BasicHelmet,
            'fire-armor': FireArmor,
            'fire-skill': fireSkill,
            'elite-bolt': EliteBoltSkill,
            'basic-potion': BasicPotion,
           }
        },
        engine: {
          // auth(server: RpgServerEngine) {
          //   if (server.getCurrentRoomId()?.includes('lobby')) {
          //     return undefined
          //   }
          //   throw 'test'
          // }
        },
        player: {
          props: {
            wood: Number
          },
          onStart: (player: RpgPlayer) => {
          
            player.level = 5

            // player.paramsModifier = {
            //   [MAXHP]: { value: 100 }
            // };

            player.setHitbox(100, 100)

            if (!player.getSkill(fireSkill)) {
              player.learnSkill(fireSkill);
            }
            
            player.changeMap("center-map", {
              x: 500,
              y: 500,
            });

            player.allRecovery()
          },
          onConnected: (player: RpgPlayer) => {
            player.addItem(BasicPotion);
            
          },
          onLoad: (player: RpgPlayer, data: any) => {
            console.log("load", player.items());
          },
          onSave: (player: RpgPlayer, data: any) => {
            console.log("save");
            console.log(data);
          },
          onJoinMap: (player: RpgPlayer, map: RpgMap) => {
            player.setGraphic("hero");
            console.log("join map", player.expCurve, player.param);
            console.log('---', player.hitbox().w, player.hitbox().h)

            // Configure player stats
            //player.hp = 200;
            //player.param[MAXHP] = 200;
            player.param[ATK] = 20;
            player.param[PDEF] = 10;




            if (!player.getSkill(fireSkill)) {
              player.learnSkill(fireSkill);
            }
            
            console.log("Player equipped with:", player.equipments().map(e => e.name()));
          },
          onLeaveMap: (player: RpgPlayer, map: RpgMap) => {

          },
          async onDead(player: RpgPlayer) {
            const runtimePlayer = player as RpgPlayer & {
              __sampleGameoverOpen?: boolean;
            };
            if (runtimePlayer.__sampleGameoverOpen) return;
            runtimePlayer.__sampleGameoverOpen = true;

            const selection = await player.callGameover({
                title: 'Game Over',
                  subtitle: 'Choose your fate',
                  entries: [
                      { id: 'title', label: 'Title Screen' },
                      { id: 'load', label: 'Load Game' }
                  ]
              })
      
              if (selection?.id === 'title') {
                  await player.gui('rpg-title-screen').open()
              }
      
              if (selection?.id === 'load') {
                  await player.showLoad()
              }

              if (player.hp > 0) {
                runtimePlayer.__sampleGameoverOpen = false;
              }
          },
          async onInput(player: RpgPlayer, input: any) {
            // console.log("call shop")

            if (input.action == 'action') {
              const val = await player.showText('Comment tu vas ?', {
                input: {
                  placeholder: 'Your value',
                  required: true,
                  control: 'textarea',
                  confirmText: 'Validate',
                  cancelButton: false
                }
              })
              console.log(val)
            }

            // const choice = await player.showChoices('Hello', [
            //   { text: 'Fight', value: 'fight' },
            //   { text: 'Run away', value: 'run' },
            //   { text: 'Talk', value: 'talk' }
            // ])

            // console.log(choice)
           
           //  player.callShop([BasicSword, HeavyHammer, EnemyClaw, BasicShield])
             // player.hp -= 100;
            
            //  player.callMainMenu({
            //   menus: [
            //     { id: 'items', label: 'Items' },
            //     { id: 'equip', label: 'Equip' },
            //     { id: 'save', label: 'Save' },
            //   ]
            //  })
           if (input.action == 'escape') {
            const map = player.getCurrentMap()
            map.setWeather({
              effect: 'rain',
              preset: 'steadyRain',
              params: {
                density: 220,
                speed: 0.7,
                windStrength: 0.25
              },
              transitionMs: 900,
              startedAt: Date.now()
            })
           }
           // player.hp -= 100;
            // const map = player.getCurrentMap()
            // const event = map?.getEventBy(event => event.name === "EV-1")
            // console.log(event)
            // event!.animationFixed = true 
            
            // event!.changeDirection(Direction.Left)
            // event!.directionFixed = true
            // event!.knockback({ x: 100, y: 1 }, 100)
            // map?.shakeMap({
            //   intensity: 10,
            //   duration: 1000,
            //   frequency: 10,
            //   direction: 'x',
            // })
            //console.log(player.x(), player.y())
          } 
        },
        maps: [
          {
            id: 'center-map',
            events: [
              // { event: Event() },
              //{ event: Event() },
              { event: AiTreeElite(200, 300, "elite-a", "brute") },
              { event: AiTreeElite(300, 200, "elite-b", "skirmisher") },
              { event: AiPhaseBoss() },
            ]
          }
        ],
        worldMaps: [
          { 
            id: 'world',
            maps: [
              {
                id: 'center-map',
                worldX: 500,
                worldY: 500,
                width: 1500,
                height: 1500,
              },
              {
                id: 'left-map',
                worldX: 0,
                worldY: 500,
                width: 500,
                height: 500,
              },
              {
                id: 'right-map',
                worldX: 1000,
                worldY: 500,
                width: 500,
                height: 500,
              },
              {
                id: 'top-map',
                worldX: 500,
                worldY: 0,
                width: 500,
                height: 500,
              },
              {
                id: 'bottom-map',
                worldX: 500,
                worldY: 1000,
                width: 500,
                height: 500,
              },
            ]
          }
        ]
      }
    ])
  ],
});
