import { Query, Presets, RpgPlayer } from '@rpgjs/server'
import { testing } from '@rpgjs/testing'
import { RPGServer } from './fixtures/server'
import { Monster } from './fixtures/enemy'
import { Shield } from './fixtures/armor'
import { Fire } from './fixtures/skill'

let  client, socket, player
const { DAMAGE_PHYSIC, DAMAGE_SKILL } = Presets

beforeEach(() => {
    const fixture = testing(RPGServer)
    client = fixture.createClient()
    socket = client.connection()
    player = Query.getPlayer(client)
})

test('Test Damage', () => {
  /*player.startBattle([
    { enemy: Monster, level: 1 }
  ])*/
  const monster = new Monster()
  player.addItem(Shield)
  player.equip(Shield, true)
  const skill = player.learnSkill(Fire)
  //const damage = player.applyDamage(monster, DAMAGE_SKILL, skill)
  //console.log(damage)
  // expect(player.hp).toBe(MAXHP_CURVE.start)

   player.useSkill(Fire, monster, DAMAGE_SKILL)
})