import { excludeTriggers } from '../context-helpers';
import { variableSchema } from '../../schemas/database';
import type {
  GameExecutionContext,
  ShowTextParams
} from '../types';
import { getEvent } from './utils';
import {
  resolveStringTemplate,
  studioStringTemplateFormat,
  studioTextareaTemplateFormat,
} from '../resolve-text';

export const schemaShowText = {
  type: 'show_text',
  label: 'Show Text',
  description: 'Display a message dialog to the player',
  category: 'message',
  icon: '💬',
  requiredCapabilities: ['player', 'ui'],
  contextCondition: excludeTriggers('onInit'),
  schema: {
    type: 'object',
    properties: {
      text: { 
        type: 'string', 
        title: 'Message Text',
        description: 'The text to display in the dialog',
        format: studioTextareaTemplateFormat
      },
      speaker: { 
        type: 'string', 
        title: 'Speaker Name',
        description: 'Name of the character speaking (optional)',
        $ref: '#/functions/event'
      },
      faceset: {
        type: 'string',
        title: 'Faceset',
        description: 'Select the faceset and expression to display',
        format: {
          name: 'faceset-expression'
        }
      },
      position: {
        type: 'string',
        title: 'Dialog Position',
        enum: ['top', 'middle', 'bottom'],
        default: 'bottom'
      },
      inputEnabled: {
        type: 'boolean',
        title: 'block.show text.input enabled',
        description: 'block.show text.input enabled description',
        default: false
      }
    },
    allOf: [
      {
        if: { properties: { inputEnabled: { const: true } } },
        then: {
          properties: {
            inputVariableId: {
              type: 'string',
              title: 'block.show text.input variable',
              description: 'block.show text.input variable description',
              $ref: '#/functions/variable',
              format: { add: { schema: variableSchema } }
            },
            inputControl: { type: 'string', title: 'block.show text.input control', enum: ['input', 'textarea'], default: 'input' },
            inputType: { type: 'string', title: 'block.show text.input type', enum: ['text', 'number', 'password', 'email'], default: 'text' },
            inputPlaceholder: { type: 'string', title: 'block.show text.input placeholder', format: studioStringTemplateFormat },
            inputRequired: { type: 'boolean', title: 'block.show text.input required', default: false },
            inputConfirmText: { type: 'string', title: 'block.show text.input confirm text', format: studioStringTemplateFormat },
            inputCancelText: { type: 'string', title: 'block.show text.input cancel text', format: studioStringTemplateFormat },
            inputCancelButton: { type: 'boolean', title: 'block.show text.input cancel button', default: true }
          },
          required: ['inputVariableId']
        }
      },
      {
        if: { properties: { inputEnabled: { const: true }, inputControl: { const: 'textarea' } } },
        then: { properties: {
          inputType: { const: 'text', default: 'text' },
          inputDefaultValue: { type: 'string', title: 'block.show text.input default value', format: studioStringTemplateFormat },
          inputMinLength: { type: 'number', title: 'block.show text.input min length', minimum: 0 },
          inputMaxLength: { type: 'number', title: 'block.show text.input max length', minimum: 0 },
          inputRows: { type: 'number', title: 'block.show text.input rows', minimum: 1, default: 4 }
        } }
      },
      {
        if: { properties: { inputEnabled: { const: true }, inputControl: { const: 'input' }, inputType: { const: 'number' } } },
        then: { properties: {
          inputDefaultValue: { type: 'number', title: 'block.show text.input default value' },
          inputMin: { type: 'number', title: 'block.show text.input min' },
          inputMax: { type: 'number', title: 'block.show text.input max' },
          inputStep: { type: 'number', title: 'block.show text.input step', exclusiveMinimum: 0 }
        } }
      },
      {
        if: { properties: {
          inputEnabled: { const: true },
          inputControl: { const: 'input' },
          inputType: { enum: ['text', 'password', 'email'] }
        } },
        then: { properties: {
          inputDefaultValue: { type: 'string', title: 'block.show text.input default value', format: studioStringTemplateFormat },
          inputMinLength: { type: 'number', title: 'block.show text.input min length', minimum: 0 },
          inputMaxLength: { type: 'number', title: 'block.show text.input max length', minimum: 0 }
        } }
      }
    ],
    required: ['text']
  }
} as const;

export const buildShowTextInputOptions = (params: ShowTextParams): Record<string, unknown> => {
  const common = {
    placeholder: params.inputPlaceholder,
    required: params.inputRequired,
    confirmText: params.inputConfirmText,
    cancelText: params.inputCancelText,
    cancelButton: params.inputCancelButton,
  };
  if (params.inputControl === 'textarea') {
    return {
      ...common,
      control: 'textarea',
      type: 'text',
      defaultValue: typeof params.inputDefaultValue === 'string' ? params.inputDefaultValue : undefined,
      minLength: params.inputMinLength,
      maxLength: params.inputMaxLength,
      rows: params.inputRows,
    };
  }
  if (params.inputType === 'number') {
    return {
      ...common,
      control: 'input',
      type: 'number',
      defaultValue: typeof params.inputDefaultValue === 'number' ? params.inputDefaultValue : undefined,
      min: params.inputMin,
      max: params.inputMax,
      step: params.inputStep,
    };
  }
  return {
    ...common,
    control: 'input',
    type: params.inputType === 'password' || params.inputType === 'email' ? params.inputType : 'text',
    defaultValue: typeof params.inputDefaultValue === 'string' ? params.inputDefaultValue : undefined,
    minLength: params.inputMinLength,
    maxLength: params.inputMaxLength,
  };
};

/**
 * Displays a text message dialog to the player
 * 
 * This executor handles showing text dialogs with optional speaker information
 * and position configuration. It supports both simple text messages and
 * dialog boxes with character names.
 * 
 * @param context - The execution context containing player and event references
 * @param params - Parameters containing the text message and optional configuration
 * 
 * @example
 * ```typescript
 * await showTextExecutor(context, {
 *   text: 'Hello, adventurer!',
 *   speaker: 'npc_001',
 *   position: 'bottom'
 * });
 * ```
 */
type ShowTextExecutionContext = Pick<GameExecutionContext, 'player' | 'event'>
  & Partial<Pick<GameExecutionContext, 'getVariable' | 'setVariable'>>;

const resolveOptionalTemplate = (
  value: string | undefined,
  context: ShowTextExecutionContext,
): string | undefined => value === undefined ? undefined : resolveStringTemplate(value, context);

export const show_text = async (
  context: ShowTextExecutionContext,
  params: ShowTextParams,
): Promise<void> => {
    const text = resolveStringTemplate(params.text, context);
    const options = {
      talkWith: getEvent(context, { eventId: params.speaker }),
      position: params.position,
      face: params.faceset
    };
    if (!params.inputEnabled) {
      await context.player.showText(text, options);
      return;
    }
    const resolvedInputParams: ShowTextParams = {
      ...params,
      inputPlaceholder: resolveOptionalTemplate(params.inputPlaceholder, context),
      inputConfirmText: resolveOptionalTemplate(params.inputConfirmText, context),
      inputCancelText: resolveOptionalTemplate(params.inputCancelText, context),
      inputDefaultValue: typeof params.inputDefaultValue === 'string'
        ? resolveStringTemplate(params.inputDefaultValue, context)
        : params.inputDefaultValue,
    };
    const result = await context.player.showText(text, {
      ...options,
      input: buildShowTextInputOptions(resolvedInputParams),
    });
    if (params.inputVariableId) {
      const setVariable = context.setVariable
        ?? context.player?.setVariable?.bind(context.player);
      if (!setVariable) {
        throw new Error('show_text input requires variable storage');
      }
      setVariable(params.inputVariableId, result);
    }
};
