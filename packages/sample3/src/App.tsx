import { useEffect, useState } from 'react'
import { RpgGame } from '@rpgjs/client/react'
import { KeyboardControls, RpgClientEngine, inject, RpgGui } from '@rpgjs/client'

function App() {
  const onReady = (engine: RpgClientEngine) => {
    RpgGui.display('test')
  }

  return (
    <>
      <RpgGame onReady={onReady} />
    </>
  )
}

export default App
