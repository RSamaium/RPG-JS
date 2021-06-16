<template>
    <div class="back" @click="back"></div>
</template>

<script>
export default {
    inject: ['rpgEngine'],
    methods: {
        back() {
            this.rpgEngine.controls.applyControl('back')
        }
    }
}
</script>

<style scoped>
.back {
    background-image: url('../assets/controls/back.png');
    width: 48px;
    height: 48px;
    opacity: 0.8;
    top: 10px;
    position: absolute;
    right: 10px;
}
</style>