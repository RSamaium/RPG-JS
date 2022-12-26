# Elements

The elements allow you to vary the damage on another player

Create a file named `elements.ts`:

```ts
export enum Elements {
    Fire = 'fire',
    Water = 'water',
    Ice = 'ice'
}
```

> We give a string for each element because it will be easier to recognize the element on the client side.