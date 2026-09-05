# Mobile Controls

RPGJS ships a CanvasEngine mobile overlay through `withMobile()`. It renders a
virtual joystick and action buttons over the game canvas, and forwards touches to
the same controls used by keyboard and gamepad input.

## Enable Mobile Controls

Add `withMobile()` to your client modules:

```ts
import { provideClientModules, withMobile } from '@rpgjs/client'

export default {
  providers: [
    provideClientModules([
      withMobile()
    ])
  ]
}
```

By default, the overlay is displayed only on mobile user agents and waits until
the current player controls are available.

## Configure the Overlay

Use `enabled: "always"` while testing from a desktop browser:

```ts
withMobile({
  enabled: 'always',
  joystick: {
    outerColor: '#d7e7ff',
    innerColor: '#ffffff',
    scale: 0.82,
    moveInterval: 40,
    threshold: 0.15
  },
  buttons: {
    action: true,
    back: true,
    dash: true
  }
})
```

Available options:

| Option | Description |
| --- | --- |
| `id` | GUI id. Defaults to `mobile-gui`. |
| `enabled` | `"auto"`, `"always"`, `"never"`, or a predicate. Defaults to `"auto"`. |
| `layout` | Positions the overlay. Use `joystickSide`, `margin`, `buttonsMargin`, `joystickMargin`, and `gap` to tune placement. |
| `components` | Replaces the default CanvasEngine joystick or button components. |
| `joystick` | Set to `false` to hide it, or pass colors, scale, and movement settings. `outerScale` and `innerScale` are available when using custom joystick sprites. |
| `buttons.action` | Shows the A button and triggers the `action` control. |
| `buttons.back` | Shows the B button and triggers the `back` control. |
| `buttons.dash` | Shows the D button and triggers the `dash` control. |

## Customize Components

The default overlay is built with CanvasEngine components. You can replace the
joystick, individual buttons, or both. Custom components receive the same control
props as the default component plus `defaultProps`, so they can wrap CanvasEngine
`Joystick` and `Button` without reimplementing RPGJS input behavior.

```ts
import { provideClientModules, withMobile } from '@rpgjs/client'
import MobileButton from './components/mobile-button.ce'
import MobileJoystick from './components/mobile-joystick.ce'

export default {
  providers: [
    provideClientModules([
      withMobile({
        layout: {
          joystickSide: 'right',
          joystickMargin: [30, 68, 30, 30],
          gap: 16
        },
        components: {
          joystick: MobileJoystick,
          buttons: {
            action: MobileButton,
            dash: MobileButton
          }
        },
        buttons: {
          action: { enabled: true, width: 70, height: 70 },
          back: false,
          dash: { enabled: true, width: 58, height: 58 }
        }
      })
    ])
  ]
}
```

For one-off tweaks, pass CanvasEngine props directly on `joystick` or a button
option. For larger visual changes, prefer `components` and wrap the default
props inside your `.ce` component.

## Runtime Behavior

Mobile controls are client-side input helpers. In standalone mode and MMORPG
mode they send the same movement and action inputs as keyboard/gamepad controls;
they do not create gameplay authority on the client.

The virtual joystick uses CanvasEngine's `Joystick` component for input. RPGJS
movement is cardinal, so diagonal joystick positions are resolved to the nearest
single RPGJS movement control before being repeated.

Holding the joystick continues movement without requiring further pointer movement.
Changing direction preserves the current joystick power. Releasing the joystick or
returning it below the configured threshold stops repetition. In MMORPG mode, the
overlay follows replacement current-player controls so a player remount does not
require releasing and pressing the joystick again.
