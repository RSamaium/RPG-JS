# Use Gamepad

## Installation of the module

You must have a gamepad module installed on your project:

`npx rpgjs add @rpgjs/gamepad`

## Customize the gamepad notification

Put `gamepad` property in the configuration object in `rpg.toml`:

```toml
[gamepad.connect]
    message = "Your gamepad is connected !"
    time = 2000
    icon = "icon_id"
    sound = "sound_id"

[gamepad.disconnect]
    message = "Your gamepad is disconnected !"
    time = 2000
    icon = "icon_id"
    sound = "sound_id"
```

1. The class has two static methods, connect and disconnect.
2. Each of these methods has a message, time, icon and sound property.
3. The connect and disconnect methods are called when the gamepad is connected and disconnected.
4. The message property is the message that will be displayed in the notification.
5. The time property is the time in milliseconds that the notification will be displayed.
6. The icon property is the icon that will be displayed in the notification. [Remember to create the client-side spritesheet before](/guide/create-sprite.html)
7. The sound property is the sound that will be played when the notification is displayed. [Remember to create the client-side sound before](/guide/create-sound.html). If you don't want to put any sound, put the `null` value

