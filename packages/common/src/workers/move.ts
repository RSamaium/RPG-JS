import workerpool from 'workerpool'
import { RpgCommonMap } from '../Map'
import { RpgCommonGame, GameSide } from '../Game'
import { RpgCommonPlayer } from '../Player'

const objects: any = {}
let objectsByMap: any = {}
const gameEngine = new RpgCommonGame()
gameEngine.start({
  getObject(playerId) {
    return objects[playerId]
  },
  addObject(playerId, data) {
    const player = gameEngine.addPlayer(RpgCommonPlayer, playerId)
    for (let key in data) {
      player[key] = data[key]
    }
    if (player.hitbox) {
      player.setHitbox(player.hitbox.width, player.hitbox.height)
    }
    objects[playerId] = player
    objectsByMap[player.map] = player
    return player
  },
  getObjectsOfGroup(mapId, player) {
    return {}
  }
})

let i=0

function loadMap(data) {
  const map = new RpgCommonMap()
  map.load(data.data)
  RpgCommonMap.buffer.set(data.id, map)
}

async function movePlayers(data) {
  objectsByMap = {}
  const ret = {}
  for (let object of data) {
    gameEngine.world.addObject(object.id, object)
    const { player } = await gameEngine.processInput(object.id)
    if (player) {
      ret[player.id] = {
        position: {
          x: player.position.x,
          y: player.position.y,
          z: player.position.z
        },
        direction: player.direction
      }
    }  
  }
  return ret
}
  
workerpool.worker({
  loadMap,
  movePlayers
});