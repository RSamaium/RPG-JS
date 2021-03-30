declare module "*.vue" {
    import Vue from 'vue'
    export default Vue
}

declare module "server!*" {
    const value: any;
    export default value;
}

declare module "client!*" {
    const value: any;
    export default value;
}