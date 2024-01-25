import { RpgGame } from '@rpgjs/client/react'
import { RpgClientEngine } from '@rpgjs/client'
import { RpgServerEngine } from '@rpgjs/server'
import { SignupPage } from './pages/signup.js'
import { Web3Wrapper } from './web3/index.js'
import { useStore } from '@nanostores/react' 
import { isConnected } from './store/auth.js'


function App() {
  const $isConnected = useStore(isConnected);

  const onReady = ({ server, client }: { server: RpgServerEngine, client: RpgClientEngine }) => {}

  return (
    <>
      <Web3Wrapper>
        {
          $isConnected ? (
            <RpgGame
              onReady={onReady}
            />
          ) : <SignupPage />
        }
      </Web3Wrapper>
    </>
  )
}

export default App
