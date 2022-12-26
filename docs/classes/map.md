# RpgMap

## @MapData decorator

<ApiContent page="MapData" />

## RpgMap Hooks

Full Example:

```ts
import { MapData, RpgMap, RpgPlayer } from '@rpgjs/server'

@MapData({
     id: 'medieval',
     file: require('./tmx/town.tmx')
})
class TownMap extends RpgMap {
    // When the player enters the map
    onEnter(player: RpgPlayer) {}
    
    // When the player leaves the map
    onLeave(player: RpgPlayer) {}
}
```

## RpgMap methods

<ApiContent page="Map" />