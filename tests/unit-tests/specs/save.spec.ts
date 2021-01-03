import { Query, Presets, RpgPlayer } from '@rpgjs/server'
import { testing } from '@rpgjs/testing'
import { RPGServer } from './fixtures/server'
import { Potion } from './fixtures/item'
import { Sword } from './fixtures/weapons'
import { Confuse } from './fixtures/state'
import { Fire } from './fixtures/skill'

let  client, socket, player, server

beforeEach(() => {
    const fixture = testing(RPGServer)
    server = fixture.server
    client = fixture.createClient()
    socket = client.connection()
    player = Query.getPlayer(client)
})

test('Test Save', () => {
    player.addItem(Potion)
    const json = player.save()
    const obj = JSON.parse(json)
    expect(obj.items).toMatchObject([{"item":"potion","nb":1}])
})

test('Test Load', () => {
    player.addItem(Potion)
    player.addItem(Sword)
    player.equip(Sword)
    player.addState(Confuse)
    player.learnSkill(Fire)
    player.statesEfficiency = [{ rate: 1, state: Confuse }]
    const json = player.save()
    player.removeItem(Potion)
    player.equip(Sword, false)
    player.removeState(Confuse)
    player.forgetSkill(Fire)
    player.load(json)
    expect(player).toHaveProperty('items.0.item.hpValue')
    expect(player).toHaveProperty('equipments.0.atk')
    expect(player).toHaveProperty('equipments.0.equipped')
    expect(player.equipments[0].equipped).toBeTruthy()
    expect(player).toHaveProperty('states.0.effects')
    expect(player).toHaveProperty('skills.0.power')
})