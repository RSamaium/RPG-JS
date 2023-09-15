# Add life bar, text or other above the player

## Goal

The aim is to use methods to display components around the character. The server has the authority to display and all data is synchronised with all players on the map.

So, These methods allow developers to display components above or below a player's graphic in an RPG-style game. The discussionThis article goes over various examples and use cases for these methods, including customizing the appearance of text components, using block-style layouts, and creating visual indicators such as health bars.

## Display name above the player

![name](/assets/name.png)

In <PathTo to="serverDir" file="player.ts" />

```ts
import { RpgPlayer, type RpgPlayerHooks, Components } from '@rpgjs/server'

const player: RpgPlayerHooks = {
    onConnected(player: RpgPlayer) {
        player.setHitbox(16, 16)
        player.setGraphic('hero')
        player.name = 'Sam'
        player.setComponentsTop(Components.text('{name}'))
    }
}

export default player
```

The line of code `player.setComponentsTop(Components.text('{name}'))` is setting a text component on top of the player's graphic, using the RpgPlayer's method `setComponentsTop()`.

The `Components.text()` function is being used to create a new text component, which will display the player's name. The `{name}` placeholder inside the text function is a template string that will be replaced with the actual name of the player, which in this case is "Sam". 

By calling `player.setComponentsTop()` and passing in the text component, the text will be rendered on top of the player's graphic. This is done server-side, so the server is responsible for rendering the component and synchronizing its layout with the client.

::: warning
Even if it is possible, it is not advisable to have this type of code:

```ts
player.setComponentsTop(Components.text(player.name))
```

Why? Because if the player's name changes, the entire component structure is sent back to the client (which takes up unnecessary bandwidth). Whereas if you put `{name}`, it is only the name that changes.
:::

### Add Style

![name2](/assets/name2.png)

```ts
import { RpgPlayer, type RpgPlayerHooks, Components } from '@rpgjs/server'

const player: RpgPlayerHooks = {
    onConnected(player: RpgPlayer) {
        player.name = 'Sam'
        player.setComponentsTop(Components.text('{name}', {
            fill: '#000000',
            fontSize: 20 
        }))
    }
}

export default player
```

In addition to the text, an options object is being passed as a second argument to `Components.text()`, with the properties `fill` and `fontSize`. The `fill` property specifies the color of the text, which in this case is black (`'#000000'`), and the `fontSize` property sets the size of the text to 20 pixels.

By calling `player.setComponentsTop()` and passing in the text component with the options, the text will be rendered on top of the player's graphic with the specified color and size. Again, this is done server-side and the layout is synchronized with the client.

### Add Multi Ligne

![multi](/assets/component-multi.png)

```ts
import { RpgPlayer, type RpgPlayerHooks, Components } from '@rpgjs/server'

const player: RpgPlayerHooks = {
    onConnected(player: RpgPlayer) {
        player.name = 'Sam'
        player.setComponentsTop([
            Components.text('HP: {hp}'),
            Components.text('{name}')
        ])
    }
}

export default player
```

The argument being passed to `setComponentsTop()` is an array of two text components. The first component displays the player's current HP, using the placeholder `{hp}` in the text string. The second component displays the player's name, using the `{name}` placeholder in the text string.

### Add column


```ts
import { RpgPlayer, type RpgPlayerHooks, Components } from '@rpgjs/server'

const player: RpgPlayerHooks = {
    onConnected(player: RpgPlayer) {
        player.name = 'Sam'
        player.setComponentsTop([
            [Components.text('{hp}'), Components.text('{name}')]
        ])
    }
}

export default player
```

The `setComponentsTop()` method is being called with an argument that is an array of arrays, which represents a table with a single row and two columns. The first column contains the HP component and the second column contains the name component.

### Add Style for layout

```ts
import { RpgPlayer, type RpgPlayerHooks, Components } from '@rpgjs/server'

const player: RpgPlayerHooks = {
    onConnected(player: RpgPlayer) {
        player.name = 'Sam'
        player.setComponentsTop([
            Components.text('HP: {hp}'),
            Components.text('{name}')
        ], {
            height: 30,
            width: 100,
            marginBottom: -10
        })
    }
}

export default player
```

The `setComponentsTop()` method takes two arguments: the first argument is the array of components to be rendered, and the second argument is an options object that specifies the layout of the block of components.

In this case, the second argument is an object with three properties:

- `height`: specifies the height of the block of components. In this case, the height is set to 30 pixels.
- `width`: specifies the width of the block of components. In this case, the width is set to 100 pixels.
- `marginBottom`: specifies the distance between the bottom of the block of components and the top of the player's graphic. In this case, the margin is set to -10 pixels, which means that the block of components will overlap the top of the player's graphic by 10 pixels.


::: tip
[View others properties](/commands/components.html#set-components-top)
:::

By calling `player.setComponentsTop()` with the array of text components and the block layout options, the text components will be rendered on top of the player's graphic with the specified block layout. 

## Display Hp Bar

![multi](/assets/hpbar2.png)

```ts
import { RpgPlayer, type RpgPlayerHooks, Components } from '@rpgjs/server'

const player: RpgPlayerHooks = {
    onConnected(player: RpgPlayer) {
        player.setComponentsTop(
            Components.hpBar(), {
            width: 42
        })
    }
}

export default player
```

In this case, the first argument is an array containing a single component: the HP bar component created using `Components.hpBar()`.

The second argument is an object with one property:

- `width`: specifies the width of the block of components. In this case, the width is set to 42 pixels.

By calling `player.setComponentsTop()` with the array of the HP bar component and the block layout options, the HP bar component will be rendered on top of the player's graphic with the specified block layout.

> You can display SP Bar with `Components.spBar()`

::: tip
You can use the bar and the text. See [Component.bar()](/commands/components.html#bar-component) options
:::

### Customise the text above the bar

![hpbar3](/assets/hpbar3.png)

```ts
import { RpgPlayer, type RpgPlayerHooks, Components } from '@rpgjs/server'

const player: RpgPlayerHooks = {
    onConnected(player: RpgPlayer) {
        player.setComponentsTop<any>(
            Components.hpBar({}, '{$percent}%'), {
                width: 42
            }
        )
    }
}

export default player
```

You can put any text, or read an existing property with the {} format. But there are a few more variables:

- `{$current}` current value
- `{$max}` maximum value
- `{$percent}` percentage

::: tip
Set the value to `null` to not display any text
:::


## Use other layout position

![shape-component](/assets/shape-component.png)


```ts
import { RpgPlayer, type RpgPlayerHooks, Components } from '@rpgjs/server'

const player: RpgPlayerHooks = {
    onConnected(player: RpgPlayer) {
        player.setComponentsBottom(
            Components.shape({
                type: 'rect',
                width: 32,
                height: 32,
                fill: '#ff0000',
                opacity: 0.5
            }), 
            {
                marginBottom: 16
            }
        )
    }
}

export default player
```

The `setComponentsBottom()` method takes two arguments: the first argument is the component to be rendered, and the second argument is an options object that specifies the layout of the block of components.

In this case, the first argument is the rectangular shape component created using `Components.shape()`, with the following properties:

- `type`: specifies the type of shape to render. In this case, it is set to 'rect'.
- `width`: specifies the width of the rectangle. In this case, it is set to 32 pixels.
- `height`: specifies the height of the rectangle. In this case, it is also set to 32 pixels.
- `fill`: specifies the color to fill the shape with. In this case, it is set to '#ff0000', which is red.
- `opacity`: specifies the opacity of the fill color. In this case, it is set to 0.5, which means it is semi-transparent.

The second argument is an object with one property:

- `marginBottom`: specifies the margin below the block of components. In this case, it is set to 16 pixels.

::: tip
[View others positions](/commands/components.html#player-api)
:::

## Display a custom properties (bar, text, etc.)

```ts
import { RpgPlayer, type RpgPlayerHooks, Components } from '@rpgjs/server'

declare module '@rpgjs/server' {
    export interface RpgPlayer {
        wood: number
    }
}

const player: RpgPlayerHooks = {
    props: {
        wood: Number
    },
    onConnected(player: RpgPlayer) {
        player.wood = 0
        player.setComponentsTop(
           Component.text('Wood: {wood}')
        )
    }
}

export default player
```

Other example

```ts
import { RpgPlayer, type RpgPlayerHooks, Components } from '@rpgjs/server'

declare module '@rpgjs/server' {
    export interface RpgPlayer {
        wood: number
    }
}

const player: RpgPlayerHooks = {
    props: {
        wood: Number
    },
    onConnected(player: RpgPlayer) {
        // This parameter allows you to set a maximum which changes according to the level of the player
        player.addParameter('maxWood', {
            start: 100, // level 1
            end: 500 // final level
        })
        player.wood = player.param.maxWood
        player.setComponentsTop(
            Components.bar('wood', 'param.maxWood')
        )
    }
}

export default player
```