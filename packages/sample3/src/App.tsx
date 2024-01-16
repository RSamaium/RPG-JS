import { useEffect, useRef, useState } from 'react'
import { RpgGame } from '@rpgjs/client/react'
import { KeyboardControls, RpgClientEngine, inject, RpgGui, RpgClient, RpgSceneMap } from '@rpgjs/client'
import { inject as injectServer, RpgServerEngine, RpgPlayer, RpgMap, RpgEvent, EventData } from '@rpgjs/server'
import { Container, Graphics } from 'pixi.js'
import axios from 'axios'

function App() {
  const serverRef = useRef<RpgServerEngine>()
  const playerRef = useRef<RpgPlayer>()
  const clientRef = useRef<RpgClientEngine>()
  const currentMap = useRef<RpgMap>()
  const [currentStep, setCurrentStep] = useState(0)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [loading, setLoading] = useState(false)
  const [inputValue, setInputValue] = useState('')

  const onReady = ({ server, client }: { server: RpgServerEngine, client: RpgClientEngine }) => {
    serverRef.current = server
    clientRef.current = client
  }

  const [modules, setModules] = useState<any[]>([
    {
      server: {
        player: {
          onConnected(player: RpgPlayer) {
            player.setHitbox(24, 24)
            player.speed = 4
            player.setGraphic('hero')
            playerRef.current = player
          }
        }
      }
    }
  ])
  return (
    <>
      
    </>
  )
}

export default App
