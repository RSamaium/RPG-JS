
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
   
   const client = fixture.createClient()
   
   console.log(client)
})

test('Test HP', () => {
   expect(1).toBe(1)
})