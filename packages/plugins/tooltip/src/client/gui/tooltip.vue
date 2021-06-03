<template>
    <div>
        test
    </div>
</template>

<script>
export default {
    name: 'tooltip',
    inject: ['rpgScene'],
    mounted() {
        this.rpgScene.valuesChange.subscribe((obj) => {
             console.log(obj.data, obj.partial)
         })
    }
}
</script>

<style scoped>
div {
    position: absolute;
}
</style>