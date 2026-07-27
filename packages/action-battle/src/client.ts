import { PrebuiltComponentAnimations, RpgClient, RpgClientEngine, RpgGui, inject } from "@rpgjs/client";
import { defineModule } from "@rpgjs/common";
import {
  setActionBattleOptions,
  startAttackPreview,
  stopAttackPreview,
} from "./ui/state";
import { ActionBattleOptions } from "./types";
import { normalizeActionBattleOptions } from "./config";
import { getNormalizedActionBattleAttackProfile } from "./core/attack-runtime";
import {
  applyActionBattleAttackDirection,
  resolveActionBattleAttackDirection,
} from "./attack-input";
import { withActionBattleAnimationUnlocked } from "./locomotion";
import { getActionBattleControlLockDuration } from "./core/attack-profile";
import {
  acquireActionBattleControl,
  releaseActionBattleControls,
} from "./core/control-state";
import type { NormalizedActionBattleAttackProfile } from "./types";
import { resolveActionBattleUi } from "./ui";
import {
  ACTION_BATTLE_HIT_FX_COMPONENT_ID,
  ACTION_BATTLE_DAMAGE_COMPONENT_ID,
  ACTION_BATTLE_TELEGRAPH_COMPONENT_ID,
  ACTION_BATTLE_SOFT_TARGET_COMPONENT_ID,
  createActionBattleClientVisuals,
  playActionBattleVisual,
  setActionBattlePreviewStarter,
} from "./visual";
import {
  ACTION_BATTLE_COMBAT_AUDIO_ID,
  createActionBattleCombatAudioVisual,
  playLocalActionBattleAttackAudio,
} from "./audio";
// @ts-ignore CanvasEngine components are compiled by @canvasengine/compiler.
import AttackTelegraphComponent from "./components/attack-telegraph.ce";
// @ts-ignore CanvasEngine components are compiled by @canvasengine/compiler.
import DamagePopupComponent from "./components/damage-popup.ce";
// @ts-ignore CanvasEngine components are compiled by @canvasengine/compiler.
import SoftTargetComponent from "./components/soft-target.ce";
// @ts-ignore CanvasEngine components are compiled by @canvasengine/compiler.
import SkillProjectileComponent from "./components/skill-projectile.ce";
import {
  ACTION_BATTLE_SKILL_LOADOUT_VISUAL_ID,
  setActionBattleSkillLoadout,
} from "./ui/state";

export const ACTION_BATTLE_SKILL_PROJECTILE_TYPE = "action-battle-skill";

const beginLocalPlayerAttackLock = (
  engine: RpgClientEngine,
  profile: NormalizedActionBattleAttackProfile
): boolean => {
  const player = engine.scene?.getCurrentPlayer?.() as any;
  if (!player) return true;

  const runtimePlayer = player as any;
  const now = Date.now();
  if (
    typeof runtimePlayer.__actionBattleAttackLockedUntil === "number" &&
    runtimePlayer.__actionBattleAttackLockedUntil > now
  ) {
    return false;
  }

  releaseActionBattleControls(player, "attack");
  const actionId = (runtimePlayer.__actionBattleAttackLockId ?? 0) + 1;
  runtimePlayer.__actionBattleAttackLockId = actionId;
  runtimePlayer.__actionBattleAttackLockedUntil =
    now + profile.totalDurationMs;
  runtimePlayer.__actionBattleAttackActiveUntil =
    now + profile.startupMs + profile.activeMs;

  const movementDuration = getActionBattleControlLockDuration(
    profile,
    profile.control.movementLock
  );
  const directionDuration = getActionBattleControlLockDuration(
    profile,
    profile.control.directionLock
  );

  if (movementDuration > 0) {
    if (typeof engine.interruptCurrentPlayerMovement === "function") {
      engine.interruptCurrentPlayerMovement(player);
    } else {
      (engine.scene as any)?.stopMovement?.(player);
    }
    acquireActionBattleControl(player, {
      owner: "attack",
      movement: true,
      durationMs: movementDuration,
    });
  }
  if (directionDuration > 0) {
    acquireActionBattleControl(player, {
      owner: "attack",
      direction: true,
      durationMs: directionDuration,
    });
  }
  acquireActionBattleControl(player, {
    owner: "attack",
    animation: true,
    durationMs: profile.totalDurationMs,
  });

  setTimeout(() => {
    if (runtimePlayer.__actionBattleAttackLockId !== actionId) return;
    runtimePlayer.__actionBattleAttackLockedUntil = 0;
    runtimePlayer.__actionBattleAttackActiveUntil = 0;
    releaseActionBattleControls(player, "attack");
  }, profile.totalDurationMs);

  return true;
};

const resolveLocalPlayerDirection = (player: any) => {
  if (typeof player.getDirection === "function") return player.getDirection();
  if (typeof player.direction === "function") return player.direction();
  return player.direction ?? "down";
};

const playLocalPlayerAttackAnimation = (
  player: any,
  options: ActionBattleOptions
) => {
  withActionBattleAnimationUnlocked(player, () => {
    playActionBattleVisual(options.visual, {
      moment: "attack",
      entity: player,
    });
  });
};

const showLocalAttackPreview = (player: any, options: ActionBattleOptions) => {
  const attackPreview = options.ui?.attackPreview as any;
  if (!player || attackPreview?.enabled === false) return;
  playActionBattleVisual(options.visual, {
    moment: "preview",
    entity: player,
  });
};

export const createActionBattleClient = (
  options: ActionBattleOptions = {}
) => {
  const normalized = normalizeActionBattleOptions(options);
  setActionBattleOptions(normalized);
  setActionBattlePreviewStarter((entity, previewOptions = {}) => {
    const direction = previewOptions.direction ?? resolveLocalPlayerDirection(entity);
    const durationMs = Math.max(
      1,
      previewOptions.durationMs ?? normalized.attack?.previewDurationMs ?? 180
    );
    const previewId = startAttackPreview({
      direction,
      durationMs,
      color: previewOptions.color ?? normalized.attack?.previewColor,
      accentColor:
        previewOptions.accentColor ?? normalized.attack?.previewAccentColor,
    });
    setTimeout(() => stopAttackPreview(previewId), durationMs);
  });
  const resolvedUi = resolveActionBattleUi(normalized.ui);
  const actionBarEnabled = resolvedUi.actionBar.enabled;
  const hitComponent = PrebuiltComponentAnimations?.Hit;
  const fxComponent = PrebuiltComponentAnimations?.Fx;
  return defineModule<RpgClient>({
    componentAnimations: [
      ...(hitComponent
        ? [
            {
              id: "hit",
              component: hitComponent,
            },
          ]
        : []),
      ...(fxComponent
        ? [
            {
              id: ACTION_BATTLE_HIT_FX_COMPONENT_ID,
              component: fxComponent,
            },
          ]
        : []),
      {
        id: ACTION_BATTLE_TELEGRAPH_COMPONENT_ID,
        component: AttackTelegraphComponent,
      },
      {
        id: ACTION_BATTLE_DAMAGE_COMPONENT_ID,
        component: DamagePopupComponent,
      },
      {
        id: ACTION_BATTLE_SOFT_TARGET_COMPONENT_ID,
        component: SoftTargetComponent,
      },
    ],
    clientVisuals: {
      ...createActionBattleClientVisuals(normalized),
      [ACTION_BATTLE_SKILL_LOADOUT_VISUAL_ID]: (context: any) => {
        setActionBattleSkillLoadout(context.data?.skills ?? []);
      },
      [ACTION_BATTLE_COMBAT_AUDIO_ID]:
        createActionBattleCombatAudioVisual(normalized.audio),
    },
    projectiles: {
      components: {
        [ACTION_BATTLE_SKILL_PROJECTILE_TYPE]: SkillProjectileComponent,
      },
    },
    gui: resolvedUi.gui,
    sprite: {
      componentsBehind: resolvedUi.sprite.componentsBehind,
      componentsInFront: resolvedUi.sprite.componentsInFront,
    },
    sceneMap: {
      onAfterLoading() {
        const engine = inject(RpgClientEngine);
        engine.music.reset();
        const dodge = normalized.combat?.player?.dodge;
        if (dodge && typeof dodge === "object" && dodge.enabled !== false) {
          engine.dashDefaults = {
            duration: dodge.durationMs,
            cooldown: dodge.cooldownMs,
            additionalSpeed: dodge.additionalSpeed,
          };
        } else {
          engine.dashDefaults = {};
        }
        if (actionBarEnabled && resolvedUi.actionBar.autoOpen) {
          const gui = inject(RpgGui)
          gui.display('action-battle-action-bar')
        }
      }
    },
    engine: {
      onInput(engine: RpgClientEngine, { input, data }: any) {
        if (input?.type === "dash") {
          const dodge = normalized.combat?.player?.dodge;
          if (dodge && typeof dodge === "object" && dodge.enabled !== false) {
            engine.processAction("action-battle:dodge", {
              direction: input.direction,
            });
          }
          return;
        }
        if (input !== "action") return;
        const player = engine.scene?.getCurrentPlayer?.() as any;
        if (!player) return;
        const direction = resolveActionBattleAttackDirection(player, { data });
        applyActionBattleAttackDirection(player, direction);
        const attackProfile = getNormalizedActionBattleAttackProfile(normalized);
        if (attackProfile.totalDurationMs > 0) {
          const locked = beginLocalPlayerAttackLock(engine, attackProfile);
          if (!locked) return;
        }
        playLocalPlayerAttackAnimation(player, normalized);
        playLocalActionBattleAttackAudio(engine, normalized.audio, {
          moment: "attack",
          entity: player,
          engine,
        });
        showLocalAttackPreview(player, normalized);
      },
    }
  });
};

export default createActionBattleClient();
