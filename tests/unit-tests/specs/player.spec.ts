import { Query, Presets } from '@rpgjs/server'
import { Armor } from '@rpgjs/database'
import { testing } from '@rpgjs/testing'
import { RPGServer } from './fixtures/server'
import { HpUpValue } from './fixtures/armor'

let  client, socket, player
const { MAXHP_CURVE, MAXSP_CURVE, MAXHP } = Presets

beforeEach(() => {
    const fixture = testing(RPGServer)
    client = fixture.createClient()
    socket = client.connection()
    player = Query.getPlayer(client)
})

test('Test HP', () => {
   expect(player.hp).toBe(MAXHP_CURVE.start)
})

test('Test SP', () => {
   expect(player.sp).toBe(MAXSP_CURVE.start)
})

test('Test MaxHP', () => {
   expect(player.param.maxHp).toBe(MAXHP_CURVE.start)
})

test('Test MaxHP Modifier Value', () => {
   player.addItem(HpUpValue)
   player.equip(HpUpValue)
   expect(player.param.maxHp).toBe(MAXHP_CURVE.start + 100)
   player.equip(HpUpValue, false)
   expect(player.param.maxHp).toBe(MAXHP_CURVE.start)
})

test('Test MaxHP Modifier Rate', () => {

   @Armor({
      name: 'HpUpRate',
      paramsModifier: {
            [MAXHP]: {
               rate: 1.5
            }
      }
   })
   class HpUpRate {}

   player.addItem(HpUpRate)
   player.equip(HpUpRate)
   expect(player.param.maxHp).toBe(MAXHP_CURVE.start * 1.5)
   player.equip(HpUpRate, false)
   expect(player.param.maxHp).toBe(MAXHP_CURVE.start)
})

test('Test MaxHP Multi Modifier Value', () => {

   @Armor({
      name: 'HpUpValue1',
      paramsModifier: {
            [MAXHP]: {
               value: 100
            }
      }
   })
   class HpUpValue1 {}

   @Armor({
      name: 'HpUpValue2',
      paramsModifier: {
            [MAXHP]: {
               value: 150
            }
      }
   })
   class HpUpValue2 {}
   
   player.addItem(HpUpValue1)
   player.addItem(HpUpValue2)
   player.equip(HpUpValue1)
   player.equip(HpUpValue2)
   expect(player.param.maxHp).toBe(MAXHP_CURVE.start + 250)
})

test('Test MaxHP Multi Modifier Rate', () => {

   @Armor({
      name: 'HpUpValue1',
      paramsModifier: {
            [MAXHP]: {
               rate: 1.5
            }
      }
   })
   class HpUpRate1 {}

   @Armor({
      name: 'HpUpValue2',
      paramsModifier: {
            [MAXHP]: {
               rate: 0.5
            }
      }
   })
   class HpUpRate2 {}
   
   player.addItem(HpUpRate1)
   player.addItem(HpUpRate2)
   player.equip(HpUpRate1)
   player.equip(HpUpRate2)
   expect(player.param.maxHp).toBe(MAXHP_CURVE.start)
})