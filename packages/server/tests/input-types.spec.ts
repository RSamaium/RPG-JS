import { describe, expectTypeOf, test } from 'vitest'
import type { InputOptions, RpgPlayer } from '../src'

describe('player.showInput types', () => {
  test('infers the result from the input options', () => {
    const assertions = (player: RpgPlayer) => {
      expectTypeOf(player.showInput('Name')).toEqualTypeOf<Promise<string | null>>()
      expectTypeOf(player.showInput('Password', { type: 'password' })).toEqualTypeOf<Promise<string | null>>()
      expectTypeOf(player.showInput('Biography', { control: 'textarea', rows: 6 })).toEqualTypeOf<Promise<string | null>>()
      expectTypeOf(player.showInput('Age', { type: 'number', required: true })).toEqualTypeOf<Promise<number | null>>()
      expectTypeOf(player.showText('Age?', { input: { type: 'number', required: true } })).toEqualTypeOf<Promise<number | null>>()
      expectTypeOf(player.showText('Biography?', { input: { control: 'textarea', rows: 6 } })).toEqualTypeOf<Promise<string | null>>()
      const dynamicOptions = {} as InputOptions
      expectTypeOf(player.showInput('Dynamic', dynamicOptions)).toEqualTypeOf<Promise<string | number | null>>()
    }

    expectTypeOf(assertions).toBeFunction()
  })
})
