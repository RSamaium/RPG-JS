# Cinematic videos

`CinematicComponent` is a CanvasEngine GUI using a native inline video element. It fills the game surface, preserves the video's aspect ratio, fades in and out, hides the standard `hud`, and temporarily attenuates game music. It uses the shared `@rpgjs/ui-css/index.css` styles and `rpg.cinematic.*` translations (English and French defaults).

## RPGJS Studio

The Studio client module registers `studio-cinematic`. The `show_cinematic` block takes `{ video: "studio-media-id" }` and opens this GUI with `waitingAction: true` and `blockPlayerInput: true`. It resolves the video through the configured game data provider and its asset URL resolver. No map-to-video relation is saved.

The next event block runs after playback ends, the player skips, or the player dismisses a playback error. This works in standalone RPG and MMORPG modes. In MMORPG mode, only the triggering player's movement is blocked; other players and the world continue. Completion is a client acknowledgement, not proof that the player watched the video.

## Other games

Studio block options:

| Parameter | Default | Behavior |
| --- | --- | --- |
| `video` | required | Studio media ID. |
| `allowSkip` | `true` | `false` hides Skip and disables Escape skipping; errors remain dismissible. |
| `bgm` | `"duck"` | Attenuates music to 15%; `"pause"` pauses it and resumes its position afterwards. |
| `preload` | `true` | Best-effort buffering of up to three unique map-event videos on map entry. |

Adjacent standard cinematic blocks without children play in one playlist, keeping the HUD hidden and player input locked until completion. Each clip retains its options. Other blocks and child sequences end the group. Concurrent touch/action interactions from the same player are ignored until their event finishes; other players remain independent.

Register the reusable component in your client module's existing `gui` list:

```ts
import { CinematicComponent } from '@rpgjs/client';

// Inside the client module:
gui: [{ id: 'cinematic', component: CinematicComponent }]
```

Open it from the server or standalone event:

```ts
const result = await player.gui('cinematic').open(
  { src: '/assets/arrival.mp4', allowSkip: true },
  { waitingAction: true, blockPlayerInput: true },
);
// result.reason: 'ended' | 'skipped' | 'error'
```

The public data and completion types are `CinematicData` and `CinematicResult`. A wrapper may supply a `resolveSource(data)` callback to the component for asynchronous asset resolution, forwarding `data`, `onFinish`, and `guiOpenId`. Source resolution belongs to the client; send only serializable data from the server.

## Playback and recovery

For a reusable GUI playlist, pass `{ src: '/intro.mp4', allowSkip: false, bgm: 'pause', clips: [{ src: '/arrival.mp4', allowSkip: true, bgm: 'duck' }] }`. The top-level video plays first; `clips` contains subsequent videos. This serializable data works with server/standalone `player.gui().open()` and the client component. The next clip is buffered during playback. Network or decoding latency can still show a black loading frame; preloading cannot guarantee instant playback.

- Press Escape or click/tap the on-screen Skip button to skip the current clip immediately. Keyboard activation of the button is also supported. Holding Escape does not skip subsequent clips through key repeats. `allowSkip` defaults to true.
- If autoplay with sound is denied, use the central Play button. The video uses the master volume; the music mixer is attenuated independently without persisting a volume change.
- Failed media, failed source resolution, and a 20-second loading/stall timeout display an error with Return to game. This exit remains available when skipping is disabled.
- The 200 ms transitions respect reduced-motion preferences. Focus stays within the player and is restored on unmount.
- Video resources, timers and event listeners are released on unmount. Late asynchronous resolution cannot restart a closed player. Normal completion carries the GUI opening identifier to avoid closing a newer opening.
- Use browser-supported MP4 or WebM files. Cross-origin video servers must allow anonymous CORS. A native browser fullscreen request is not required; the player fills the game viewport on desktop and mobile.

Music attenuation uses `engine.music.duck(gain)`, returning an idempotent release callback. Multiple requests use the strongest attenuation, and releasing one preserves the others and the current mixer volume.

`engine.music.pause()` returns an idempotent release callback. All pause owners must release before music resumes. A changed map track replaces the previous one, and reset tracks are not restarted.
