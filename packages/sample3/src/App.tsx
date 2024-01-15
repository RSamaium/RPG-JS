import { useEffect, useState } from 'react'
import { RpgGame } from '@rpgjs/client/react'
import { KeyboardControls, RpgClientEngine, inject, RpgGui } from '@rpgjs/client'
import { inject as injectServer, RpgServerEngine, RpgPlayer } from '@rpgjs/server'

function App() {
  const onReady = ({ server }: { server: RpgServerEngine }) => {

  }

  const [modules, setModules] = useState<any[]>([
    {
      server: {
        engine: {
          onStart(engine: RpgServerEngine) {
            engine.sceneMap.createDynamicMap({
              id: 'map',
              file: 'http://localhost:39463/main/maps/map.tmx'
            })
          }
        },
        player: {
          onConnected(player: RpgPlayer) {
            player.setHitbox(24, 24)
            player.speed = 4
            player.changeMap('map')
          }
        }
      }
    }
  ])

  const btn = () => {
    setModules((modules) => {
      return [
        ...modules,
        {
          server: {
            engine: {
              onStart() {

              }
            }
          }
        }
      ]
    })
  }

  return (
    <>
      <RpgGame onReady={onReady} modules={modules} />
      <div>

        <button onClick={btn}>ok</button>

      </div>
    </>
  )
}

export default App
