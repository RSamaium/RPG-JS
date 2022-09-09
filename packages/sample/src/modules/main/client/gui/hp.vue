<template>
<div id="menu">
    <rpg-window position="middle">
        Hello !
    </rpg-window>
</div>
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
#menu {
    position: absolute;
    height: 100%;
    width: 100%;
}
</style>