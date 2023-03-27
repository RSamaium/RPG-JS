import { inputs } from '../inputs'
import rpgConfig from '../../../rpg.json'

export default {
    inputs,
    screenTitle: {
        title: rpgConfig.name
    },
    // matchMakerService() {
    //     return {
    //         url: 'http://localhost',
    //         port: 3000
    //     }
    // }
}