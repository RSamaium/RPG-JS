<template>
  <div class="background">
      <div class="title" v-if="step == 'title'">
          <h1>{{ title }}</h1>
      </div>
      <div v-if="!isMMO" class="full" :class="`step-${step}`">
          <rpg-window 
        width="200px" 
        position="bottom-middle" 
        class="margin-bottom" 
        v-if="step == 'title'"
        >
          <rpg-choice :choices="menuChoice" @selected="selected"></rpg-choice>
        </rpg-window>
        <rpg-load v-else></rpg-load>
    </div>
    <rpg-login v-else class="margin-bottom"></rpg-login>
  </div>
</template>

<script lang="ts">
import { Control } from '@rpgjs/client'

const name = 'rpg-title-screen'

export default {
    name,
    inject: ['rpgEngine', 'rpgGui', 'rpgGuiInteraction', 'rpgKeypress', 'rpgSound'],
    data() {
        return {
            menu: [
                { text:  'Start Game', value: 'start' },
                { text: 'Load Game', value: 'load' },
                { text: 'Options', value: 'options' }
            ],
            step: 'title',
            title: ''
        }
    },
    mounted() {
        const { titleScreen } = this.rpgEngine.globalConfig
        if (titleScreen) {
            this.title = titleScreen.title
            if (titleScreen.music) {
                this.rpgSound.get(titleScreen.music).play()
            }
        }
        this.obsKeyPress = this.rpgKeypress.subscribe(({ control }) => {
            if (!control) return
            if (control.actionName == Control.Back) {
                this.step = 'title'
            }
        })
    },
    unmounted() {
        this.obsKeyPress.unsubscribe()
    },
    methods: {
        selected(index) {
            const { value } = this.menu[index]
            switch (value) {
                case 'start':
                    this.rpgGuiInteraction('rpg-title-screen', 'start-game')
                    break
                case 'load':
                    this.step = 'load'
                    break
                case 'options':
                    this.rpgGui.hide(name)
                    this.rpgGui.display('rpg-options')
                    break
            }
        }
    },
    computed: {
        menuChoice() {
            return this.menu.filter(menu => {
                if (menu.value == 'load' && !this.rpgGui.exists('rpg-load')) {
                    return false
                }
                else if (menu.value == 'options' && !this.rpgGui.exists('rpg-options')) {
                    return false
                }
                return true
            })
        },
        isMMO() {
            return this.rpgEngine.gameType == 'mmorpg'
        }
    }
}
</script>

<style scoped lang="scss">
$title-screen-font-size: 40px !default;
$title-screen-font-color: white !default;
$title-screen-font-border-color: black !default;
$title-screen-background: url('./assets/default.png') !default;

.title {
    position: absolute;
    display: flex;
    width: 100%;
    justify-content: center;
    margin-top: 50px;
    font-family: $window-font-family;
    font-size: $title-screen-font-size;
    & h1 {
        color: white;
        text-shadow: 
            -1px -1px 0 $title-screen-font-border-color, 
            1px -1px 0 $title-screen-font-border-color, 
            -1px 1px 0 $title-screen-font-border-color, 
            1px 1px 0 $title-screen-font-border-color;
    }
}

.background {
    position: absolute;
    background: $title-screen-background;
    width: 100%;
    height: 100%;
    display: flex;
    background-size: cover;
    z-index: 100;
}

.margin-bottom {
    margin-bottom: 50px;
}

.full {
    width: 100%;
}

.step-title {
    display: flex;
}
</style>