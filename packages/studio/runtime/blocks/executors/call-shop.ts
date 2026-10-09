import { excludeTriggers } from '../context-helpers';
import type { BlockExecutor, CallShopParams } from '../types';
import { itemSchema } from '@common/schemas/database';
import { resolveStringTemplate, studioStringTemplateFormat } from '../resolve-text';

export const schemaCallShop = {
  type: 'call_shop',
  label: 'Call Shop',
  description: 'Open the shop interface',
  category: 'scene',
  icon: '🛒',
  requiredCapabilities: ['player', 'ui'],
  contextCondition: excludeTriggers('onInit'),
  schema: {
    type: 'object',
    properties: {
      items: {
        type: 'array',
        title: 'Items',
        items: {
          type: 'string',
          title: 'Item',
          description: 'Select an item from the database',
          $ref: '#/functions/item',
          format: {
            add: {
              schema: itemSchema
            }
          }
        }
      },
      sellMultiplier: {
        type: 'number',
        title: 'Sell Multiplier',
        description: 'The multiplier for the sell price of the items. You can negative values to decrease the sell price.',
        format: {
          mode: "decimal",
          minFractionDigits: 1,
          maxFractionDigits: 7,
        }
      },
      message: {
        type: 'string',
        title: 'Message',
        format: studioStringTemplateFormat
      },
      face: {
        type: 'string',
        title: 'Face',
        description: 'Select the faceset and expression to display',
        format: {
          name: 'faceset-expression'
        }
      }
    },
    required: ['items']
  }
} as const;

export const call_shop: BlockExecutor<'call_shop'> = async (context, params) => {
  const hasOptions = Boolean(
    params.sell ||
    params.sellMultiplier !== undefined ||
    params.message ||
    params.face
  );

  const map = context.player.getCurrentMap?.();
  if (!map) {
    throw new Error('Map not found');
  }
  
  const payload = hasOptions
    ? {
        items: params.items.map((item: string) => map.database()[item]),
        sell: params.sell,
        sellMultiplier: params.sellMultiplier,
        message: params.message === undefined
          ? undefined
          : resolveStringTemplate(params.message, context),
        face: params.face
      }
    : params.items;

  await context.player.callShop(payload as CallShopParams['items'] | CallShopParams);
};
