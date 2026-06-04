import { excludeTriggers } from '../context-helpers';
import type {
  AnyBlockInstance,
  BlockExecutor,
  CallCommonEventParams,
  CommonEventPositionParams,
  SpawnCommonEventParams,
} from '../types';
import { executeBlocksRecursively, getExecutorsFromContext } from './execution';

const DEFAULT_MAX_DEPTH = 10;

export const schemaCallCommonEvent = {
  type: 'call_common_event',
  label: 'Call Common Event',
  description: 'Execute the selected common event workflow in the current context',
  category: 'system',
  icon: '🔁',
  schema: {
    type: 'object',
    properties: {
      commonEventId: {
        type: 'string',
        title: 'Common Event',
        description: 'Common event to execute',
        $ref: '#/functions/commonEvent'
      },
      parameters: {
        type: 'object',
        title: 'Parameters',
        description: 'Key/value parameters available to the common event',
        additionalProperties: true
      },
      maxDepth: {
        type: 'number',
        title: 'Max Recursion Depth',
        description: 'Stops recursive common event calls from looping forever',
        minimum: 1,
        maximum: 50,
        default: DEFAULT_MAX_DEPTH
      }
    },
    required: ['commonEventId']
  }
} as const;

export const schemaSpawnCommonEvent = {
  type: 'spawn_common_event',
  label: 'Spawn Common Event',
  description: 'Create a visible common event object on the current map',
  category: 'scene',
  icon: '➕',
  contextCondition: excludeTriggers('onInit'),
  schema: {
    type: 'object',
    properties: {
      commonEventId: {
        type: 'string',
        title: 'Common Event',
        description: 'Common event object to spawn',
        $ref: '#/functions/commonEvent'
      },
      positionMode: {
        type: 'string',
        title: 'Position',
        enum: ['current_event', 'player', 'explicit'],
        default: 'current_event',
        format: {
          labels: ['Current Event', 'Player', 'Explicit Position']
        }
      },
      x: {
        type: 'number',
        title: 'X'
      },
      y: {
        type: 'number',
        title: 'Y'
      },
      mode: {
        type: 'string',
        title: 'Event Mode',
        enum: ['shared', 'scenario'],
        default: 'shared',
        format: {
          labels: ['Shared', 'Scenario']
        }
      }
    },
    required: ['commonEventId']
  }
} as const;

const getCommonEventBlocks = (commonEvent: any): AnyBlockInstance[] => {
  if (!commonEvent || typeof commonEvent !== 'object') return [];
  const triggers = Array.isArray(commonEvent.triggers) ? commonEvent.triggers : [];
  const trigger =
    triggers.find((entry: any) => entry?.enabled !== false && entry?.type === 'onAction') ??
    triggers.find((entry: any) => entry?.enabled !== false && Array.isArray(entry?.blocks)) ??
    null;

  return Array.isArray(trigger?.blocks) ? trigger.blocks : [];
};

const getCommonEventPosition = (context: any, params: CommonEventPositionParams) => {
  if (params.positionMode === 'explicit') {
    return {
      x: Number(params.x ?? 0),
      y: Number(params.y ?? 0),
    };
  }

  if (params.positionMode === 'player') {
    return {
      x: typeof context.player?.x === 'function' ? context.player.x() : context.player?.x ?? 0,
      y: typeof context.player?.y === 'function' ? context.player.y() : context.player?.y ?? 0,
    };
  }

  return {
    x: typeof context.event?.x === 'function' ? context.event.x() : context.event?.x ?? 0,
    y: typeof context.event?.y === 'function' ? context.event.y() : context.event?.y ?? 0,
  };
};

export const call_common_event: BlockExecutor<'call_common_event'> = async (context, params) => {
  const commonEvent = await context.getCommonEvent?.(params.commonEventId);
  const blocks = getCommonEventBlocks(commonEvent);
  if (blocks.length === 0) return;

  const state = context.commonEventExecutionState ?? {
    depth: 0,
    parameters: {},
  };
  const maxDepth = params.maxDepth ?? DEFAULT_MAX_DEPTH;

  if (state.depth >= maxDepth) {
    console.warn(`Common event recursion depth exceeded for ${params.commonEventId}`);
    return;
  }

  const executors = getExecutorsFromContext(context);
  const nextContext = {
    ...context,
    commonEventExecutionState: {
      depth: state.depth + 1,
      parameters: {
        ...state.parameters,
        ...(params.parameters ?? {}),
      },
    },
  };

  await executeBlocksRecursively(blocks, nextContext, executors);
};

export const spawn_common_event: BlockExecutor<'spawn_common_event'> = async (context, params) => {
  const commonEvent = await context.getCommonEvent?.(params.commonEventId);
  if (!commonEvent) return;

  const position = getCommonEventPosition(context, params);
  await context.spawnCommonEvent?.(params.commonEventId, position, {
    mode: params.mode ?? 'shared',
  });
};
