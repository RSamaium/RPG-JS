# Display a notification

## Prerequisites

You must have a menu installed on your project (or you must create it yourself)
To install default menu: 

`npx rpgjs add @rpgjs/default-gui`

## Use Notification

You have two ways to display a notification:

- The message property is the message that will be displayed in the notification.
- The time property is the time in milliseconds that the notification will be displayed.
- The icon property is the icon that will be displayed in the notification. [Remember to create the client-side spritesheet before](/guide/create-sprite.html)
- The sound property is the sound that will be played when the notification is displayed. [Remember to create the client-side sound before](/guide/create-sound.html). If you don't want to put any sound, put the `null` value

### Client Side

Use `RpgGui`:

```ts
import { RpgGui, PrebuiltGui } from '@rpgjs/client'

RpgGui.display(PrebuiltGui.Notification, {
    message: 'You have unlocked the secret passage',
    time: 2000,
    icon: 'icon_id',
    sound: 'sound_id'
})
```

[RpgGui API](/classes/gui.html)

### Server Side

Use `player.showNotification()`:

```ts
player.showNotification('You have unlocked the secret passage', {
    time: 2000,
    icon: 'icon_id',
    sound: 'sound_id'
})
```

[player.showNotification()](/commands/gui.html#displays-a-notification)

## Custom Notification UI

Go to <PathTo to="themeFile" /> file and add notification SCSS variables

Example:

```scss
$notification-background-color: rgba(0, 0, 0, 0.7);
$notification-font-color: white;
$notification-font-family: 'lato';
```