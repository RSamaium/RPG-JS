
import { testing } from '@rpgjs/testing'
import { beforeEach, expect, test, vi } from 'vitest'

beforeEach(async () => {

   const fixture = await testing([{
      server: {
        engine: {
          onStart: () => {
            console.log('onStart') 
          }
        }
      }
   }]);  
   
   const { player } = await fixture.createClient()
})

test('Test HP', () => {
   expect(1).toBe(1)
})