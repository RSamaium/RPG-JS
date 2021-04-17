import monitoringPlugin from '@rpgjs/plugin-monitoring'

export default [
    [monitoringPlugin, {
        init(_register) {
            console.log(_register)
        }
    }]
]