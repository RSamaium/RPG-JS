import { Store } from 'vuex'
import players from './modules/player'

export default new Store({
    modules: {
        players
    }
})