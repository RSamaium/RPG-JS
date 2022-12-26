<template>
    <code>{{ path }}</code>
</template>

<script>

const configDir = 'src/config'
const modDir = 'src/modules'
const baseModule = modDir + '/main'
const serverDir = baseModule + '/server'
const clientDir = baseModule + '/client'
const paths = {
    clientIndex: baseModule + '/client/index.ts',
    serverIndex: baseModule + '/server/index.ts',
    baseModule,
    serverDir,
    clientDir,
    tmxDir: serverDir + '/maps/tmx',
    mapDir: serverDir + '/maps',
    eventDir: serverDir + '/events',
    databaseDir: serverDir + '/database',
    moduleIndex: modDir + '/index.ts',
    modIndex: modDir + '/index.ts',
    modDir,
    configDir,
    playerFile: serverDir + '/player.ts',
    themeFile: configDir + '/theme.scss'
}

export default {
    props: ['to', 'file'],
    computed: {
        path() {
            return paths[this.to] + (this.file ? '/' + this.file : '')
        }
    }
}
</script>