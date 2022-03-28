<template>
    <window :position="position" :fullWidth="fullWidth" class="dialog">
        <p>{{ msg }}</p>
        <choices :choices="choices" @selected="close" v-if="isChoice" />
        <Arrow direction="down" :center="true" v-else-if="!autoClose" />
    </window>
</template>

<script lang="ts">
import Window from './window.vue'
import Choices from './choice.vue'
import Arrow from './arrow.vue'
import { Control } from '@rpgjs/client'

export default {
    name: 'rpg-dialog',
    inject: ['rpgEngine', 'rpgKeypress', 'rpgGuiClose', 'rpgGui'],
    props: ['message', 'choices', 'position', 'fullWidth', 'autoClose', 'typewriterEffect'],
    data() {
        return {
            msg: ''
        }
    },
    async mounted() {
        let interval
        this.rpgEngine.controls.stopInputs()
        if (!this.isChoice && !this.autoClose) {
            this.obsKeyPress = this.rpgKeypress.subscribe(({ control }) => {
                if (control && control.actionName == Control.Action) {
                    this.close()
                }
            })
        }
        let index = 0
        const typewriter = () => {
            if (index >= this.message.length) {
                clearInterval(interval)
            } else {
                this.msg = this.msg + this.message[index]
                index++
            }
        }
        if (!this.typewriterEffect) {
            this.msg = this.message
        }
        else {
            interval = setInterval(typewriter, 20)
        }
    },
    computed: {
        isChoice() {
            return this.choices && this.choices.length > 0
        }
    },
    methods: {
        close(indexSelect) {
            this.rpgGuiClose('rpg-dialog', indexSelect)
            this.rpgEngine.controls.listenInputs()
        }
    },
    unmounted() {
        if (this.obsKeyPress) this.obsKeyPress.unsubscribe()
    },
    components: {
        Window,
        Choices,
        Arrow
    }
}
</script>

<style scoped>
.dialog {
    position: absolute;
    left: 0;
    bottom: 0;
    right: 0;
    top: 0;
    display: flex;
    justify-content: center;
    min-width: 300px;
    z-index: 101;
}
</style>