declare module "*.vue" {
    import Vue from 'vue'
    export default Vue
}

declare module "*.world" {
    const value: any;
    export default value;
}

declare module "server!*" {
    const value: any;
    export default value;
}

declare module "client!*" {
    const value: any;
    export default value;
}

declare module "development!*" {
    const value: any;
    export default value;
}

declare module "production!*" {
    const value: any;
    export default value;
}

declare module "rpg!*" {
    const value: any;
    export default value;
}

declare module "mmorpg!*" {
    const value: any;
    export default value;
}

declare module '@rpgjs/server/express' {
    import { ModuleType } from '@rpgjs/common'
    type ExpressServerOptions = {
        basePath: string,
        globalConfig?: any,
    }
    export function expressServer(modules: ModuleType[], options: ExpressServerOptions): Promise<any>
}