import { Query, Presets, RpgPlayer } from '@rpgjs/server'
import { testing } from '@rpgjs/testing'
import { RPGServer } from './fixtures/server'
import { Monster } from './fixtures/enemy'
import { Shield } from './fixtures/armor'
import { Fire } from './fixtures/skill'
import { Fighter } from './fixtures/class'

let  client, socket, player, server
const { DAMAGE_PHYSIC, DAMAGE_SKILL } = Presets

beforeEach(() => {
    const fixture = testing(RPGServer)
    server = fixture.server
    client = fixture.createClient()
    socket = client.connection()
    player = Query.getPlayer(client)
})

test('Test Damage', () => {
  /*player.startBattle([
    { enemy: Monster, level: 1 }
  ])*/
  const monster = new Monster()
  monster.server = server
  player.addItem(Shield)
  player.equip(Shield, true)
  player.setClass(Fighter)
  const skill = player.learnSkill(Fire)
  const damage = player.applyDamage(monster)

  console.log(damage)
  //console.log(damage)
  // expect(player.hp).toBe(MAXHP_CURVE.start)

   //player.useSkill(Fire, monster)
})