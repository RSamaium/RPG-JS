import type { RpgMap, RpgPlayer } from "@rpgjs/server";
import type { AnyBlockInstance } from "../runtime/blocks/types";
import { createBlockExecutionService } from "./block-executor";

/** What a GUI of the client sends to the server (`RpgGui.guiInteraction(guiId, name, data)`). */
export interface StudioGuiInteraction {
  guiId: string;
  name: string;
  data?: unknown;
}

/** The workflow a GUI interaction runs: the block collection of that GUI the interaction names. */
export interface StudioGuiWorkflow {
  /** Runtime id of the GUI (`rpg-main-menu`, `rpg-hotbar`...). */
  gui: string;
  blockCollectionId: string;
  blocks: AnyBlockInstance[];
}

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === "object" && !Array.isArray(value) && Object.getPrototypeOf(value) === Object.prototype;

/**
 * Finds the workflow of a GUI interaction in the project. The Studio publishes its GUIs in `guis`, each with the block
 * collections attached to it (`blockCollections`, with their blocks); the code of a GUI asks for one by its id
 * (`interaction(blockCollectionId, data)`). Only a collection attached to that GUI runs: a client cannot start any other
 * workflow of the project.
 *
 * @param config - The project (the `globalConfig` of the map), which holds the published `guis`.
 * @param guiId - The runtime id of the GUI that sent the interaction, or its Studio id.
 * @param name - The name of the interaction: the id of the block collection.
 * @returns The workflow to run, or `undefined` when the GUI or the collection is not published.
 */
export function findStudioGuiWorkflow(config: unknown, guiId: string, name: string): StudioGuiWorkflow | undefined {
  const guis = (config as { guis?: unknown } | null | undefined)?.guis;
  if (!Array.isArray(guis) || !guiId || !name) return undefined;
  const gui = guis.find((entry) => isPlainObject(entry) && (entry.runtimeId === guiId || entry._id === guiId));
  if (!isPlainObject(gui) || !Array.isArray(gui.blockCollections)) return undefined;
  const collection = gui.blockCollections.find((entry: unknown) =>
    isPlainObject(entry) && (entry._id ?? entry.id) === name,
  );
  if (!isPlainObject(collection) || !Array.isArray(collection.blocks)) return undefined;
  return {
    gui: String(gui.runtimeId ?? gui._id ?? guiId),
    blockCollectionId: name,
    blocks: collection.blocks as AnyBlockInstance[],
  };
}

const queues = new WeakMap<object, Promise<void>>();

/**
 * Runs, for a player, the workflow of the Studio attached to the interaction a GUI sent: the blocks of the collection,
 * with the source `gui_interaction` and `context.guiInteraction` (the collection, the data the GUI sent, the GUI). The
 * workflows of a player run one after the other. A failing workflow is reported and stops there; the game goes on.
 *
 * The data comes from the client: it must be plain data, and a block reads only what it validates (`use_hotbar_slot`
 * reads an index from 0 to 9, never an item or skill id).
 */
export function runStudioGuiInteraction(player: RpgPlayer, interaction: StudioGuiInteraction): Promise<void> {
  const map = (player.getCurrentMap?.() ?? null) as (RpgMap & { globalConfig?: unknown }) | null;
  const workflow = findStudioGuiWorkflow(map?.globalConfig, String(interaction?.guiId ?? ""), String(interaction?.name ?? ""));
  if (!workflow) return Promise.resolve();
  const data = isPlainObject(interaction.data) ? interaction.data : {};

  const previous = queues.get(player) ?? Promise.resolve();
  const current = previous
    .catch(() => undefined)
    .then(async () => {
      const executor = createBlockExecutionService(player, null, map, {
        guiInteraction: { blockCollectionId: workflow.blockCollectionId, data, gui: workflow.gui },
      });
      try {
        await executor.executeBlockSequence(workflow.blocks);
      } catch (error) {
        console.error(`[studio] GUI workflow "${workflow.blockCollectionId}" of "${workflow.gui}" failed`, error);
      }
      player.syncChanges?.();
    });
  queues.set(player, current);
  void current.finally(() => {
    if (queues.get(player) === current) queues.delete(player);
  });
  return current;
}
