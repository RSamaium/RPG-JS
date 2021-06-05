import { RpgModule, RpgClient } from '@rpgjs/client'
import DialogUi from './window/dialog.vue'
import ChoiceUi from './window/choice.vue'
import MenuUi from './menu/main.vue'
import ShopUi from './shop/main.vue'
import WindowUi from './window/window.vue'
import DisconnectUi from './notifications/disconnected.vue'

@RpgModule<RpgClient>({
    gui: [
        DialogUi,
        MenuUi,
        WindowUi,
        ChoiceUi,
        DisconnectUi,
        ShopUi
    ]
})
export default class RpgClientEngine {}