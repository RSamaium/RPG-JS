import { excludeTriggers } from '../context-helpers';
import type { BlockExecutor } from '../types';

export const schemaChangeClass = {
  type: 'change_class',
  label: 'block.change class.label',
  description: 'block.change class.description',
  category: 'character',
  icon: '🎓',
  requiredCapabilities: ['player', 'map'],
  contextCondition: excludeTriggers('onInit'),
  schema: {
    type: 'object',
    properties: {
      classId: {
        type: 'string',
        title: 'block.change class.class',
        $ref: '#/functions/class',
      },
    },
    required: ['classId'],
  },
} as const;

export const change_class: BlockExecutor<'change_class'> = async (context, params) => {
  const player = context.player as any;
  const map = context.map ?? player.getCurrentMap?.();
  const record = map?.database?.()?.[params.classId];
  const type = record?._type ?? record?.type ?? record?.resourceType;
  if (!record || (typeof record !== 'function' && type !== 'class')) {
    console.warn(`[StudioBlocks] class ${params.classId} was not found`);
    return;
  }
  if (typeof player.setClass !== 'function') {
    console.warn('[StudioBlocks] change_class requires an RPGJS player exposing setClass()');
    return;
  }
  if (typeof record !== 'function' && typeof player.changeActor !== 'function') {
    console.warn('[StudioBlocks] change_class requires an RPGJS version supporting resolved Class objects');
    return;
  }
  player.setClass(record);
};
