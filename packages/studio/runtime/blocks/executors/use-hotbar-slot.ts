import { forSources } from '../context-helpers';
import type { BlockExecutor } from '../types';

export const schemaUseHotbarSlot = {
  type: 'use_hotbar_slot',
  label: 'Use Hotbar Slot',
  description: 'Use the authoritative hotbar slot selected by a GUI interaction',
  agentDescription: 'GUI workflows only. Uses the validated interaction payload index and never trusts the client-provided skill or item id.',
  category: 'scene',
  icon: '⚡',
  requiredCapabilities: ['player', 'ui', 'guiInteraction'],
  contextCondition: forSources('gui_interaction'),
  schema: {
    type: 'object',
    properties: {},
    additionalProperties: false,
  },
} as const;

/**
 * Uses the hotbar slot a GUI interaction selected: the index of the slot (0 to 9) in the data the GUI sent. The client
 * never says which skill or item it is: the player uses what its own hotbar holds there, with the rules of the hotbar.
 */
export const use_hotbar_slot: BlockExecutor<'use_hotbar_slot'> = async (context) => {
  const index = context.guiInteraction?.data["index"];
  if (!Number.isInteger(index) || Number(index) < 0 || Number(index) > 9) {
    throw new Error('The GUI interaction payload must contain a hotbar index from 0 to 9');
  }
  if (typeof context.player?.useHotbarSlot !== 'function') {
    throw new Error('Player does not support hotbar slot usage');
  }
  await context.player.useHotbarSlot(Number(index));
};
