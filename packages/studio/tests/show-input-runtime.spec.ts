import { describe, expect, test, vi } from 'vitest'
import { buildInputOptions, schemaShowInput, show_input } from '../runtime/blocks/executors/show-input'

describe('Studio show input runtime', () => {
  test('exposes the typed input settings and a required result variable', () => {
    expect(schemaShowInput.schema.properties.control.enum).toEqual(['input', 'textarea'])
    expect(schemaShowInput.schema.properties.type.enum).toEqual(['text', 'number', 'password', 'email'])
    expect(schemaShowInput.schema.required).toEqual(['message', 'variableId'])
  })

  test('stores numeric results as numbers', async () => {
    const showInput = vi.fn(async () => 42)
    const setVariable = vi.fn()
    const context = { player: { showInput }, setVariable } as any

    await show_input(context, {
      message: 'Age',
      variableId: 'age',
      control: 'input',
      type: 'number',
      required: true,
      min: 1,
      max: 120,
    })

    expect(showInput).toHaveBeenCalledWith('Age', expect.objectContaining({
      control: 'input',
      type: 'number',
      required: true,
      min: 1,
      max: 120,
    }))
    expect(setVariable).toHaveBeenCalledWith('age', 42)
  })

  test('builds shared textarea options once and uses the dialog presentation', async () => {
    const params = {
      message: 'Biography',
      variableId: 'biography',
      presentation: 'dialog' as const,
      control: 'textarea' as const,
      rows: 6,
      speaker: 'Archivist',
      position: 'bottom' as const,
    }
    expect(buildInputOptions(params)).toMatchObject({ control: 'textarea', type: 'text', rows: 6 })

    const showText = vi.fn(async () => 'A long story')
    const showInput = vi.fn()
    const setVariable = vi.fn()
    const context = { player: { showText, showInput }, setVariable } as any
    await show_input(context, params)

    expect(showText).toHaveBeenCalledWith('Biography', expect.objectContaining({
      input: expect.objectContaining({ control: 'textarea', rows: 6 }),
      speaker: 'Archivist',
      position: 'bottom',
    }))
    expect(showInput).not.toHaveBeenCalled()
    expect(setVariable).toHaveBeenCalledWith('biography', 'A long story')
  })

  test('forces textarea values to text and stores null cancellations', async () => {
    const showInput = vi.fn(async () => null)
    const setVariable = vi.fn()
    const context = { player: { showInput }, setVariable } as any

    await show_input(context, {
      message: 'Biography',
      variableId: 'biography',
      control: 'textarea',
      type: 'number',
      rows: 6,
    })

    expect(showInput).toHaveBeenCalledWith('Biography', expect.objectContaining({
      control: 'textarea',
      type: 'text',
      rows: 6,
    }))
    expect(setVariable).toHaveBeenCalledWith('biography', null)
  })
})
