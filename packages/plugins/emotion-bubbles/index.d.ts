import { RpgPlayer } from '@rpgjs/server'

declare module "client!*" {
    const value: any;
    export default value;
}

declare module "server!*" {
    const value: any;
    export default value;
}

declare module '@rpgjs/server' {
    export interface RpgPlayer {
        showEmotionBubble: (emotion: string) => void
    }
}