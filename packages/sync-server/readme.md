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
const room = Word.addRoom('room_id', new Page())
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
<script src="sync-client.js"></script>
```

```js
const socket = io()
socket.emit(':join', 'room_id')
World.listen(socket).value.subscribe((val: { data: any, partial: any }) => {
    console.log(val)
})
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

# Define Schema

## Normal Schema

Typescript
```ts
@Schema({
    title: String
})
export class Page {
    title: string = ''
}
```

Javascript
```js
export class Page {
    $schema = {
        title: String
    }
    title = ''
}
```

## Array Properties

Typescript
```ts
@Schema({
     list: [String]
})
export class Page {
    title: string[] = ['yo']
}
```

Javascript
```js
export class Page {
    $schema = {
        list: [String]
    }
    title = ['yo']
}
```

## with collection :

Typescript
```ts
@Schema({
     list: [{ id: Number, name: String }]
})
export class Page {
    list: { id: Number, name: String }[] = []
    constructor() {
        this.list.push({
            id: 1,
            name: 'yo'
        })
    }
}
```

Javascript
```js
export class Page {
    $schema = {
        list: [{ id: Number, name: String }]
    }
    list = []
    
    constructor() {
        this.list.push({
            id: 1,
            name: 'yo'
        })
    }
}
```

## Object generic key

Typescript
```ts
@Schema({
     list: [{ id: Number }]
})
export class Page {
    list: any = {}
    constructor() {
        this.list['mykey'] = {
            id: 1
        }
    }
}
```

Javascript
```js
export class Page {
    $schema = {
        list: [{ id: Number }]
    } 
    list = {}
    
    constructor() {
        this.list['mykey'] = {
            id: 1
        }
    }
}
```