<template>
    <rpg-save @saved="back"></rpg-save>
</template>

<script lang="ts">
import { Control } from '@rpgjs/client'

export default {
    inject: ['rpgKeypress'],
    mounted() {
        this.obsKeyPress = this.rpgKeypress.subscribe(({ control }) => {
            if (!control) return
            if (control.actionName == Control.Back) {
                this.back()
            }
        })
    },
    unmounted() {
        this.obsKeyPress.unsubscribe()
    },
    methods: {
        back() {
            this.$emit('changeLayout', 'MainLayout')
        }
    }
}
</script>

<style></style>