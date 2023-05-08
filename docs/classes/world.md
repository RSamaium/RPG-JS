# RpgWorld

Finding players can be interesting to carry out commands on a group of players. The other interest is to use the `RpgWord` module in an `ExpressJS` or other server.

Example with ExpressJS (in `src/server/rpg.ts`). We recover all the players of the game

```ts
import http from 'http'
import express from 'express'
import { Server } from 'socket.io'
import { RpgWorld } from '@rpgjs/server'

const app = express()
const server = http.createServer(app)

app.get('/players', (req, res) => {
    const players = RpgWorld.getPlayers()
    res.json(players)
})

// ....
```

Example in an event

```ts 
import { RpgEvent, EventData, RpgPlayer, RpgWorld } from '@rpgjs/server'

@EventData({
    name: 'EV-1'
})
export class CharaEvent extends RpgEvent {
    onAction(player: RpgPlayer) {
        const map = player.getCurrentMap()
        const players = RpgWorld.getPlayersOfMap(map.id)
        players.forEach(player => player.hp -= 100)
    }
}
```

## API

<!--@include: ../api/RpgWorld.md-->