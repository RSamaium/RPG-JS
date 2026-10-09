import { excludeTriggers } from '../context-helpers';
import type { BlockExecutor, ShowNotificationParams } from '../types';
import { resolveStringTemplate, studioStringTemplateFormat } from '../resolve-text';

export const schemaShowNotification = {
  type: 'show_notification',
  label: 'Show Notification',
  description: 'Display a notification message to the player',
  category: 'message',
  icon: '🔔',
  requiredCapabilities: ['player', 'ui'],
  contextCondition: excludeTriggers('onInit'),
  schema: {
    type: 'object',
    properties: {
      message: {
        type: 'string',
        title: 'Message',
        description: 'Notification text to display',
        format: studioStringTemplateFormat
      },
      time: {
        type: 'number',
        title: 'Duration (ms)',
        description: 'How long to display the notification',
        minimum: 0
      },
      icon: {
        type: 'string',
        title: 'Icon',
        description: 'Optional icon to display',
        format: {
          name: 'media',
          type: 'icon',
          buttonLabel: 'Select Icon',
          useUpload: {
            accept: 'image/*'
          }
        }
      },
      sound: {
        type: 'string',
        title: 'Sound',
        description: 'Optional sound effect to play',
        format: {
          name: 'media',
          type: 'sound',
          buttonLabel: 'Select Sound Effect',
          useUpload: {
            accept: 'audio/*'
          }
        }
      },
      type: {
        type: 'string',
        title: 'Type',
        enum: ['info', 'warn', 'error']
      }
    },
    required: ['message']
  }
} as const;

export const show_notification: BlockExecutor<'show_notification'> = async (context, params) => {
  await context.player.showNotification(resolveStringTemplate(params.message, context), {
    time: params.time,
    icon: params.icon,
    sound: params.sound,
    type: params.type
  });
};
