import type {
  BlockExecutor,
  BlockDefinition
} from '../types';
import { resolveStringTemplate, studioStringTemplateFormat } from '../resolve-text';


export const schemaShowUpAnimation: BlockDefinition<'show_up_animation'> = {
  type: 'show_up_animation',
  label: 'Show Up Animation',
  description: 'Display an up animation above the player',
  category: 'character',
  icon: '⬆️',
  requiredCapabilities: ['player', 'ui'],
  schema: {
    type: 'object',
    properties: {
      text: {
        type: 'string',
        title: 'Text',
        description: 'Text to display (supports Studio string templates)',
        format: studioStringTemplateFormat
      },
      icon: {
        type: 'string',
        title: 'Icon',
        description: 'Optional icon to display before the text',
        format: {
          name: "media",
          type: "icon",
          buttonLabel: "Select Icon",
          useUpload: {
            accept: "image/*",
          },
        },
      },
      sound: {
        type: 'string',
        title: 'Sound',
        description: 'Optional sound effect to play',
        format: {
          name: "media",
          type: "sound",
          buttonLabel: "Select Sound Effect",
          useUpload: {
            accept: "audio/*",
          },
        },
      }
    },
    required: ['text']
  }
};

export const show_up_animation: BlockExecutor<'show_up_animation'> = async (context, params) => {
  await context.player.showComponentAnimation?.('up', {
    text: resolveStringTemplate(params.text, context),
    icon: params.icon
  });
};
