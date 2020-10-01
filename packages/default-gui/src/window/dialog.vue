<template>
    <window :position="position" :fullWidth="fullWidth" class="dialog">
        {{ msg }}
        <choices :choices="choices" @selected="close" v-if="isChoice" />
        <Arrow direction="down" class="arrow-center" v-else-if="!autoClose" />
    </window>
</template>

<script>
import Window from './window.vue'
import Choices from './choice.vue'
import Arrow from './arrow.vue'

export default {
    name: 'rpg-dialog',
    props: ['message', 'choices', 'position', 'fullWidth', 'autoClose', 'typewriterEffect'],
    data() {
        return {
            msg: ''
        }
    },
    async mounted() {
        let interval
        if (!this.isChoice && !this.autoClose) {
            this.$rpgKeypress = ((name) => {
                if (name == 'space' || name == 'enter') {
                    this.close()
                }
                return false
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
            this.$rpgGuiClose(indexSelect)
        }
    },
    components: {
        Window,
        Choices,
        Arrow
    }
}
</script>

<style scoped>
.arrow-center {
    position: absolute;
    left: calc(50% - 0.5em / 2);
    bottom: 0;
}

.dialog {
    position: absolute;
    left: 0;
    bottom: 0;
    right: 0;
    top: 0;
    display: flex;
    justify-content: center;
    min-width: 300px;
}
</style>