# Reuse of GUI components

You should know that you can reuse GUI elements:

- Window
- Cursor

## Prerequisites

You must have a menu installed on your project (or you must create it yourself)
To install default menu: 

1. `npx rpgjs add @rpgjs/default-gui`

## The windows

In a VueJS file, use the `rpg-window` component:

```vue
<template>
    <rpg-window>Hello World</rpg-window>
</template>
```
You can pass options:

```vue
<template>
    <rpg-window width="200px">Hello World</rpg-window>
</template>
```

Here is the list of options:
- `width`
- `height`
- `position`: `top`, `bottom`, `middle`, or `bottom-middle`
- `fullWidth`: boolean
- `arrow`: display an arrow. `up` or `down`

## Cursor

In a VueJS file, use the `rpg-window` component:

```vue
<template>
    <rpg-choice :choices="choices" @selected="selected"></rpg-choice>
</template>

<script>
export default {
    data() {
        return  {
            choices: [ 
                { text: 'One', value: 1 }, 
                { text: 'Two', value: 2 } 
            ]
        }
    },
    methods: {
        selected(choice) {
            console.log(choice.value)
        }
    }
}
</script>
```

Here is the list of options:
- `column`: Number of columns for the cursor (`1` by default)
- `align`: Text alignment. `right`, `center` or `left` (or other value of `text-align` CSS). `left` by default
- `active`: Possible to move the cursor. `true` by default

Events:
- `selected`: A choice has been selected. You receive the choice in parameter
- `canScroll`: Indicates whether elements are outside the window and whether j can scroll or not (Useful if you want to display an arrow to indicate that the player can scroll or not)
- `change`: The cursor was positioned on another choice. You receive the choice in parameter

If you want to customize the content of a choice:

```vue
<template>
    <rpg-choice :choices="choices">
        <template v-slot:default="{ choice }">
            <p>
                <span>{{ choice.text }}</span> 
                <span>{{ choice.nb }}</span> 
            </p>
        </template>
    </rpg-choice>
</template>

<script>
export default {
    data() {
        return  {
            choices: [ 
                { text: 'Potion', value: 'potion', nb: 4 }, 
                { text: 'Sword', value: 'sword', nb: 8 } 
            ]
        }
    }
}
</script>
```