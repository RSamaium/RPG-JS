<template>
  
</template>

<script>
export default {
    name: 'hp',
    inject: ['rpgCurrentPlayer'],
    mounted() {
        this.rpgCurrentPlayer.subscribe((obj) => {
           // console.log(obj.object, obj.paramsChanged)
        })
    }
}
</script>

<style>

</style>