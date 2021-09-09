import { Presets } from '@rpgjs/server'
import { Monster } from './fixtures/enemy'
import { Shield } from './fixtures/armor'
import { Fire } from './fixtures/skill'
import { Fighter } from './fixtures/class'
import _beforeEach from './beforeEach'

const { DAMAGE_PHYSIC, DAMAGE_SKILL } = Presets

let  client, player, fixture, playerId

beforeEach(async () => {
    const ret = await _beforeEach()
    client = ret.client
    player = ret.player
    fixture = ret.fixture
    playerId = ret.playerId
})

/*test('Test Damage', () => {
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
})*/