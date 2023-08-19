<template>
    <code>{{ path }}</code>
</template>

<script>
import {
  preferAutoloadKey,
} from './preferences'

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
    themeFile: 'theme.scss'
}

const pathsModule = {
    clientIndex: baseModule + '/client/index.ts',
    serverIndex: baseModule + '/server/index.ts',
    baseModule,
    serverDir: baseModule + '/server',
    clientDir: baseModule + '/client',
    tmxDir: baseModule + '/server/maps',
    mapDir: baseModule + '/server/maps',
    eventDir: baseModule + '/server/events',
    databaseDir: baseModule + '/server/database',
    moduleIndex: modDir + '/index.ts',
    modIndex: modDir + '/index.ts',
    modDir,
    guiDir: baseModule + '/client/gui',
    configDir,
    playerFile: baseModule + '/server/player.ts',
    themeFile: 'theme.scss'
}

export default {
    props: ['to', 'file'],
    computed: {
        path() {
            const preferAutoload = localStorage.getItem(preferAutoloadKey)
            return (preferAutoload == 'true' ? paths[this.to] : pathsModule[this.to]) + (this.file ? '/' + this.file : '')
        }
    }
}
</script>