# React Hooks

## Introduction

React hooks are a powerful feature in React that allow you to use state and other React features without writing a class. In the context of RPGJS, a framework for creating RPG games, React hooks can be particularly useful for managing game state and interactions. 

## 1. `useEventPropagator()`

This hook is used to propagate events within the canvas element of your RPGJS game.

### Importing

```javascript
import { useEventPropagator } from '@rpgjs/client/react';
```

### Usage

```javascript
export default function Test() {
    const propagate = useEventPropagator();

    return <div ref={propagate}>test</div>;
}
```

In this example, the `useEventPropagator` hook is used to create a `propagate` function. This function is then passed to a `div` element as a reference (`ref`). This setup allows events within the `div` to be propagated through the RPGJS game canvas.

---

## 2. `RpgReactContext`

This hook provides access to the RPGJS context, allowing you to interact with various game states like the current player's health points (HP).

### Importing

```javascript
import { RpgReactContext } from '@rpgjs/client/react';
import { useContext, useEffect, useState } from 'react';
```

### Usage

```javascript
export default function MyGUI({ foo }) {
  const { rpgCurrentPlayer } = useContext(RpgReactContext);
  const [hp, setHp] = useState(0);

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

In this example, `RpgReactContext` is used to access the current player's state. The `useContext` hook retrieves the `rpgCurrentPlayer` from `RpgReactContext`. We then use `useState` to manage the player's HP locally. The `useEffect` hook is used to subscribe to changes in the player's HP, updating the local state accordingly. When the component unmounts, the subscription is unsubscribed.