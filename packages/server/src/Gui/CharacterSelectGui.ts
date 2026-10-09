import { PrebuiltGui } from "@rpgjs/common";
import type { ActorData } from "../Player/ClassManager";
import { RpgPlayer } from "../Player/Player";
import { Gui } from "./Gui";

export interface CharacterSelectActorData {
  id: string;
  name?: string;
  description?: string;
  graphic?: string;
  faceset?: string;
  illustration?: string;
  className?: string;
  classDescription?: string;
  classIcon?: string;
  stats?: CharacterSelectStats;
}

export interface CharacterSelectStats {
  maxHp?: number;
  str?: number;
  pdef?: number;
  agi?: number;
  int?: number;
}

export interface CharacterSelectOptions {
  title?: string;
  subtitle?: string;
  selectedActorId?: string;
  allowCancel?: boolean;
}

interface CharacterSelectRequest {
  id?: unknown;
}

const CHARACTER_SELECT_STAT_KEYS = ["maxHp", "str", "pdef", "agi", "int"] as const;

function readString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function readStat(actor: ActorData, key: typeof CHARACTER_SELECT_STAT_KEYS[number]): number | undefined {
  const explicit = (actor.stats as Record<string, unknown> | undefined)?.[key];
  const curve = actor.parameters?.[key];
  const value = typeof explicit === "number" ? explicit : curve?.start;
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

export class CharacterSelectGui extends Gui {
  constructor(player: RpgPlayer) {
    super(PrebuiltGui.CharacterSelect, player);
  }

  openCharacterSelect(
    actors: readonly (ActorData & { id: string })[],
    options: CharacterSelectOptions = {},
  ): Promise<ActorData | null> {
    if (actors.length === 0) {
      throw new TypeError("Character select requires at least one actor");
    }

    const actorsById = new Map<string, ActorData>();
    for (const actor of actors) {
      if (typeof actor.id !== "string" || actor.id.trim().length === 0) {
        throw new TypeError("Character select requires a non-empty actor ID");
      }
      if (actorsById.has(actor.id)) {
        throw new TypeError("Character select requires unique actor IDs");
      }
      actorsById.set(actor.id, actor);
    }

    const selectedActorId = options.selectedActorId && actorsById.has(options.selectedActorId)
      ? options.selectedActorId
      : actors[0].id;
    const allowCancel = options.allowCancel === true;

    this.on<CharacterSelectRequest>("select", ({ id }) => {
      if (typeof id !== "string") return;
      const actor = actorsById.get(id);
      if (actor) this.close(actor);
    });
    this.on("cancel", () => {
      if (allowCancel) this.close(null);
    });

    return super.open({
      title: options.title,
      subtitle: options.subtitle,
      selectedActorId,
      allowCancel,
      actors: actors.map((actor): CharacterSelectActorData => {
        const actorClass = typeof actor.class === "object" && actor.class !== null
          ? actor.class as Record<string, unknown>
          : undefined;
        const stats = Object.fromEntries(
          CHARACTER_SELECT_STAT_KEYS.flatMap((key) => {
            const value = readStat(actor, key);
            return value === undefined ? [] : [[key, value]];
          }),
        ) as CharacterSelectStats;

        return {
          id: actor.id,
          name: readString(actor.name),
          description: readString(actor.description),
          graphic: readString(actor.graphic),
          faceset: readString(actor.faceset),
          illustration: readString(actor.illustration),
          className: readString(actor.className) ?? readString(actorClass?.name),
          classDescription: readString(actor.classDescription) ?? readString(actorClass?.description),
          classIcon: readString(actor.classIcon) ?? readString(actorClass?.icon),
          stats: Object.keys(stats).length > 0 ? stats : undefined,
        };
      }),
    }, {
      waitingAction: true,
      blockPlayerInput: true,
    }) as Promise<ActorData | null>;
  }
}
