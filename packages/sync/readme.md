# How use it ?

## Server

1. Create just a class :

```js
class Page {

}
```

2. Add this room in World:

```js
import { World } from './world'

World.transport(io) // io is socket.io variable
const room = Word.addRoom('room_id', Page)
```

3. Send packets to client:

```ts
setInterval(() => {
    World.send()
}, 20)
```

## Client

With `socket.io`

```html
<script src="https://cdnjs.cloudflare.com/ajax/libs/socket.io/3.0.1/socket.io.js"></script>
<script src="https://rawgit.com/kawanet/msgpack-lite/master/dist/msgpack.min.js"></script>
```

```js
const socket = io()
socket.on('w', (packet) => {
    const bufView = new Uint8Array(packet)
    const obj = msgpack.decode(bufView)
    console.log(obj)
})
socket.emit(':join', 'room_id')
```

# Add Room Properties:

```js
class Page {
    $schema = {
        title: String
    }
    title = ''
}
```

After adding the room, if you change the property, it will be transmitted to everyone.


```js
const room = Word.addRoom('room_id', Page)
room.title = 'my app' // is send to users in room
```