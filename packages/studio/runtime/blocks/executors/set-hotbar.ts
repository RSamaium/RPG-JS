import { excludeTriggers } from '../context-helpers';
import type { BlockExecutor } from '../types';

export const schemaSetHotbar = {
  type: 'set_hotbar',
  label: 'Hotbar',
  description: 'Display or hide the player hotbar',
  category: 'scene',
  icon: '🎛️',
  requiredCapabilities: ['player', 'ui'],
  contextCondition: excludeTriggers('onInit'),
  schema: {
    type: 'object',
    properties: {
      action: {
        type: 'string',
        title: 'Action',
        enum: ['show', 'hide'],
        default: 'show',
        format: {
          labels: ['Display', 'Hide'],
        },
      },
    },
    required: ['action'],
    allOf: [
      {
        if: {
          properties: {
            action: { const: 'show' },
          },
          required: ['action'],
        },
        then: {
          properties: {
            content: {
              type: 'string',
              title: 'Content',
              enum: ['skills', 'items', 'mixed'],
              default: 'skills',
              format: {
                labels: ['Skills', 'Items', 'Skills + Items'],
              },
            },
            slotCount: {
              type: 'integer',
              title: 'Number of slots',
              minimum: 1,
              maximum: 10,
              default: 10,
            },
          },
          required: ['content', 'slotCount'],
        },
      },
    ],
  },
} as const;

export const set_hotbar: BlockExecutor<'set_hotbar'> = async (context, params) => {
  if (params.action === 'hide') {
    context.player.hideHotbar();
    return;
  }

  const content = params.content === 'items' || params.content === 'mixed'
    ? params.content
    : 'skills';
  const requestedSlots = Math.round(Number(params.slotCount));
  const capacity = Number.isFinite(requestedSlots)
    ? Math.max(1, Math.min(10, requestedSlots))
    : 10;
  const allowedEntryTypes = content === 'mixed'
    ? ['skill', 'item'] as const
    : content === 'items'
      ? ['item'] as const
      : ['skill'] as const;

  await context.player.showHotbar({
    capacity,
    allowedEntryTypes,
  });
};
