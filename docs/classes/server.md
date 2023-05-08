# RpgServer

## RpgServer EntryPoint

You need to create a class that inherits RpgServerEngine

```ts
import modules from './to/path/modules'
import { entryPoint } from '@rpgjs/server'

const rpgGame = entryPoint(modules, {
     io, // io is socket.io instance
     basePath: __dirname
}) 

rpgGame.start()
```
1. Put the `modules` in the entry point with entryPoint. You need to put the socket.io instance and the project path (to find the maps)
2. the function returns an instance of `RpgServerEngine`. As soon as your server is ready (listening on the port, etc.), start the RPG server.

## Entry Point properties

<!--@include: ../api/RpgServerEntryPoint.md-->

## @RpgModule< RpgServer > decorator

<!--@include: ../api/RpgServer.md-->