# Building GUI with React

## Prerequisites

- You must be familiar with the [React](https://react.dev) library
- Since v4.1.0

::: warning
**Experimental Feature**: This feature is still in its experimental stage and may not be stable.
:::

## Step 1: Installation

Begin by installing the necessary dependencies:

```bash
npm install react react-dom
```

## Step 2: Set Up a Basic GUI

In the file <PathTo to="guiDir" file="mygui.tsx" />, create a simple React component:

```tsx
export default function MyGUI() {
  return (
    <div>
      <h1>Hello World</h1>
    </div>
  );
}
```
Name function is used for identifying the GUI. Id is `my-gui`. 

> Id is Kebab Case of the name function

## Step 3: Incorporate Context

For more dynamic data, you can utilize the context from the RPG client and some React hooks.

```tsx
import { RpgReactContext } from '@rpgjs/client/react';
import { useContext, useEffect, useState } from 'react';

export default function MyGUI({ foo }) {
  const { rpgCurrentPlayer } = useContext(RpgReactContext);
  const [hp, setHp] = useState(0);

  console.log(foo);

  useEffect(() => {
    const subscription = rpgCurrentPlayer.subscribe(({ object }) => {
      setHp(object.hp);
    });
    
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return (
    <div>
      <h1>{hp}</h1>
    </div>
  );
}
```

## Step 4: Interact with the Server Side

On the server side, you have the capability to open the GUI for players. 

In the file <PathTo to="serverDir" file="player.ts" />:

```ts
import { RpgPlayer, RpgPlayerHooks } from '@rpgjs/server';

const player: RpgPlayerHooks = {
  onJoinMap(player: RpgPlayer) {
    player.gui('my-gui').open({
      foo: 'bar' // You can send props to the GUI
    }); 
  }
};

export default player;
```