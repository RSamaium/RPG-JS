import { entryPoint } from '@rpgjs/standalone'
import globalConfig from './config/client'

import defaultGui from '@rpgjs/default-gui' 
import mobileGui from '@rpgjs/mobile-gui'

export default entryPoint([
    defaultGui,
    mobileGui
], { 
    globalConfig
})
