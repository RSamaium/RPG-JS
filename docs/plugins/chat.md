# Chat (for MMORPG)

## Goal

Players can talk together on the same map

![chat](/assets/plugins/chat.png)

## Installation

1. `npm install @rpgjs/chat`
2. In <PathTo to="modIndex" /> file, add:

```ts
import chat from '@rpgjs/chat'

export default [
   chat
   // more modules here
]
```