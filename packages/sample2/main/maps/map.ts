import { MapData, RpgMap } from '@rpgjs/server'

@MapData({
     id: 'map',
     file: require('../worlds/maps/map.tmx')
})
export default class TownMap extends RpgMap {
    onLoad() {
        console.log('Map loaded')
    }
 } 