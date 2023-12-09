# Directive for VueJS

## `v-propagate`

The `v-propagate` directive is straightforward to use. Simply add it to any element in your VueJS template to enable event propagation for that element within the RPGJS canvas.

### Example

```vue
<template>
    <div v-propagate>
        Test
    </div>
</template>
```

In this example, the `v-propagate` directive is attached to a `div` element. Any events that occur within this `div` will be propagated through the RPGJS game canvas. This is particularly useful for integrating VueJS-based GUI elements with the RPGJS game canvas, allowing for seamless interaction between the GUI and the game.