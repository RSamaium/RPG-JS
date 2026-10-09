import type { InputOptions } from '@rpgjs/server'
import { variableSchema } from '../../schemas/database'
import { excludeTriggers } from '../context-helpers'
import type { BlockExecutor, ShowInputParams } from '../types'
import { resolveStringTemplate, studioStringTemplateFormat } from '../resolve-text'

export const schemaShowInput = {
  type: 'show_input',
  label: 'Show Input',
  description: 'Ask the player to enter a text or numeric value and store the result',
  category: 'message',
  icon: '⌨️',
  requiredCapabilities: ['player', 'ui'],
  contextCondition: excludeTriggers('onInit'),
  schema: {
    type: 'object',
    properties: {
      message: { type: 'string', title: 'Message', format: studioStringTemplateFormat },
      variableId: {
        type: 'string',
        title: 'Result Variable',
        description: 'Variable that receives the string, number, or null result',
        $ref: '#/functions/variable',
        format: { add: { schema: variableSchema } }
      },
      presentation: {
        type: 'string',
        title: 'Presentation',
        enum: ['standalone', 'dialog'],
        default: 'standalone',
        format: { labels: ['Standalone form', 'Dialog box'] }
      },
      control: {
        type: 'string',
        title: 'Control',
        enum: ['input', 'textarea'],
        default: 'input',
        format: { labels: ['Input', 'Textarea'] }
      },
      type: {
        type: 'string',
        title: 'Value Type',
        enum: ['text', 'number', 'password', 'email'],
        default: 'text',
        format: { labels: ['Text', 'Number', 'Password', 'Email'] }
      },
      placeholder: { type: 'string', title: 'Placeholder', format: studioStringTemplateFormat },
      required: { type: 'boolean', title: 'Required', default: false },
      confirmText: { type: 'string', title: 'Confirm Button Label', format: studioStringTemplateFormat },
      cancelText: { type: 'string', title: 'Cancel Button Label', format: studioStringTemplateFormat },
      cancelButton: { type: 'boolean', title: 'Show Cancel Button', default: true }
    },
    allOf: [
      {
        if: { properties: { presentation: { const: 'dialog' } } },
        then: { properties: {
          speaker: { type: 'string', title: 'Speaker Name' },
          position: { type: 'string', title: 'Dialog Position', enum: ['top', 'middle', 'bottom'], default: 'bottom' },
          faceset: { type: 'string', title: 'Faceset', format: { name: 'faceset-expression' } },
          expression: { type: 'string', title: 'Expression' },
          fullWidth: { type: 'boolean', title: 'Full Width', default: false },
          typewriterEffect: { type: 'boolean', title: 'Typewriter Effect', default: true }
        } },
        else: { properties: {
          title: { type: 'string', title: 'Title', format: studioStringTemplateFormat }
        } }
      },
      {
        if: { properties: { control: { const: 'textarea' } } },
        then: { properties: {
          type: { const: 'text', default: 'text' },
          defaultValue: { type: 'string', title: 'Default Value', format: studioStringTemplateFormat },
          minLength: { type: 'number', title: 'Minimum Length', minimum: 0 },
          maxLength: { type: 'number', title: 'Maximum Length', minimum: 0 },
          rows: { type: 'number', title: 'Rows', minimum: 1, default: 4 }
        } },
        else: { allOf: [{
          if: { properties: { type: { const: 'number' } } },
          then: { properties: {
            defaultValue: { type: 'number', title: 'Default Value' },
            min: { type: 'number', title: 'Minimum Value' },
            max: { type: 'number', title: 'Maximum Value' },
            step: { type: 'number', title: 'Step', exclusiveMinimum: 0 }
          } },
          else: { properties: {
            defaultValue: { type: 'string', title: 'Default Value', format: studioStringTemplateFormat },
            minLength: { type: 'number', title: 'Minimum Length', minimum: 0 },
            maxLength: { type: 'number', title: 'Maximum Length', minimum: 0 }
          } }
        }] }
      }
    ],
    required: ['message', 'variableId']
  }
} as const

export const buildInputOptions = (params: ShowInputParams): InputOptions => {
  const common = {
    title: params.presentation === 'dialog' ? undefined : params.title,
    placeholder: params.placeholder,
    required: params.required,
    confirmText: params.confirmText,
    cancelText: params.cancelText,
    cancelButton: params.cancelButton,
  }
  if (params.control === 'textarea') {
    return {
      ...common,
      control: 'textarea',
      type: 'text',
      defaultValue: typeof params.defaultValue === 'string' ? params.defaultValue : undefined,
      minLength: params.minLength,
      maxLength: params.maxLength,
      rows: params.rows,
    }
  }
  if (params.type === 'number') {
    return {
      ...common,
      control: 'input',
      type: 'number',
      defaultValue: typeof params.defaultValue === 'number' ? params.defaultValue : undefined,
      min: params.min,
      max: params.max,
      step: params.step,
    }
  }
  return {
    ...common,
    control: 'input',
    type: params.type === 'password' || params.type === 'email' ? params.type : 'text',
    defaultValue: typeof params.defaultValue === 'string' ? params.defaultValue : undefined,
    minLength: params.minLength,
    maxLength: params.maxLength,
  }
}

const resolveFace = (params: ShowInputParams) => {
  if (!params.faceset) return undefined
  if (typeof params.faceset === 'string') return { id: params.faceset, expression: params.expression ?? 'default' }
  const id = params.faceset.id ?? params.faceset.facesetId
  return id ? { id, expression: params.expression ?? params.faceset.expression ?? 'default' } : undefined
}

export const show_input: BlockExecutor<'show_input'> = async (context, params) => {
  const resolveOptional = (value: string | undefined) => value === undefined
    ? undefined
    : resolveStringTemplate(value, context)
  const resolvedParams: ShowInputParams = {
    ...params,
    title: resolveOptional(params.title),
    placeholder: resolveOptional(params.placeholder),
    confirmText: resolveOptional(params.confirmText),
    cancelText: resolveOptional(params.cancelText),
    defaultValue: typeof params.defaultValue === 'string'
      ? resolveStringTemplate(params.defaultValue, context)
      : params.defaultValue,
  }
  const message = resolveStringTemplate(params.message, context)
  const input = buildInputOptions(resolvedParams)
  const result = params.presentation === 'dialog'
    ? await context.player.showText(message, {
        input,
        speaker: params.speaker,
        position: params.position,
        face: resolveFace(params),
        fullWidth: params.fullWidth,
        typewriterEffect: params.typewriterEffect,
      })
    : await context.player.showInput(message, input)

  context.setVariable(params.variableId, result)
}
