<template>
    <rpg-dialog message="Oops, you are disconnected. Please wait!" position="middle" :autoClose="true" />
</template>

<script>
export default {
    name: 'rpg-disconnect',
    inject: ['rpgStage', 'rpgEngine'],
    mounted() {
        const blur = new this.rpgEngine.PIXI.BlurFilter()
        this.rpgStage.filters = [blur]
    },
    unmounted() {
        this.rpgStage.filters = []
    }
}
</script>