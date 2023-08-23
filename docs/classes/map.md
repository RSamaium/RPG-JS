# RpgMap

## @MapData decorator

<!--@include: ../api/MapData.md-->

## RpgMap Hooks

Full Example:

```ts
import { MapData, RpgMap, RpgPlayer } from '@rpgjs/server'

@MapData({
     id: 'medieval',
     file: require('./tmx/town.tmx')
})
class TownMap extends RpgMap {
    // When map is loaded
    onLoad() {}

    // When the player enters the map
    onJoin(player: RpgPlayer) {}
    
    // When the player leaves the map
    onLeave(player: RpgPlayer) {
        super.onLeave(player)
    }
}
```

## RpgMap methods

<!--@include: ../api/Map.md-->