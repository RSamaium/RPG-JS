# Use Module structure

## Why ?

If you don't want to use the autoload world, or you are using RPGJS version 3, or you are creating a plugin, here's how to create a module

When you create a module, create a folder. Here is the structure:

```
mymodule
    ├── client
    │   └── index.ts
    ├── server
    │   └── index.ts
    ├── index.ts
```

- the client folder will contain the module for the client part (spritesheets, sprites hooks, etc.)
- the server, will contain the server part (maps, player hooks, events, etc.)

the <PathTo to="modDir" file="mymodule/index.ts" /> file contains the following code:

```ts
import client from 'client!./client'
import server from 'server!./server'

export default {
    client,
    server
}
```
