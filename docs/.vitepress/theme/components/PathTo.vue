<template>
    <code>{{ path }}</code>
</template>

<script>

const configDir = 'src/config'
const modDir = 'src/modules'
const baseModule = 'main'
const paths = {
    clientIndex: baseModule + '/client/index.ts',
    serverIndex: baseModule + '/server/index.ts',
    baseModule,
    serverDir: baseModule,
    clientDir: baseModule,
    tmxDir: baseModule + '/maps',
    mapDir: baseModule + '/maps',
    eventDir: baseModule + '/events',
    databaseDir: baseModule + '/database',
    moduleIndex: modDir + '/index.ts',
    modIndex: modDir + '/index.ts',
    modDir,
    guiDir: baseModule + '/gui',
    configDir,
    playerFile: baseModule + '/player.ts',
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