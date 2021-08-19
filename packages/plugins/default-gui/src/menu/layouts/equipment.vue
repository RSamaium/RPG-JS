<template>
  <div class="equipment-menu">
        <rpg-window :fullWidth="true" height="80%">
           
        </rpg-window>
   </div>
</template>

<script>
export default {
    inject: ['rpgCurrentPlayer'],
    mounted() {
         this.obsCurrentPlayer = this.rpgCurrentPlayer.subscribe(({ object }) => {
           console.log(object)
        })
    },
}
</script>

<style>

</style>