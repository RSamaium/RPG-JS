import {
  parentPort,
  threadId
} from 'worker_threads'
import RpgMap from '../Map'
import Game from '../Game'
import { RpgCommonPlayer } from '../Player'
import { RpgPlugin, HookServer } from '../Plugin'

if (process.pid) {
  console.log('This subprocess is your pid ' + process.pid);
}


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

RpgPlugin.on(HookServer.PlayerMove, (player) => {
  parentPort?.postMessage({ id: player.id, direction: player.direction, x: player.position.x, y: player.position.y })
})

parentPort?.on('message', ({ method, data }) => {
  if (!data) return
   if (method == 'loadMap') {
     const map = new RpgMap()
     map.load(data.data)
     RpgMap.buffer.set(data.id, map)
   }
   else if (method == 'movePlayers') {
    objectsByMap = {}
      for (let object of data) {
        gameEngine.world.addObject(object.id, object)
        gameEngine.processInput(object['pendingMove'], object.id)
      }
   } 
})