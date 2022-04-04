import workerpool from 'workerpool'
import RpgMap from '../Map'
import Game from '../Game'
import { RpgCommonPlayer } from '../Player'

const objects: any = {}
let objectsByMap: any = {}
const gameEngine = new Game('worker')
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
  const map = new RpgMap()
  map.load(data.data)
  RpgMap.buffer.set(data.id, map)
}

async function movePlayers(data) {
  objectsByMap = {}
  const ret = {}
  for (let object of data) {
    gameEngine.world.addObject(object.id, object)
    const player = await gameEngine.processInput(object.id)
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