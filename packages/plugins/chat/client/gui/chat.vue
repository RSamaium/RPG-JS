<template>
  <div class="chat">
      <input type="text" @keyup="typing" @focus="stopMove" @blur="startMove">
  </div>
</template>

<script>
export default {
    name: 'rpg-chat',
    inject: ['rpgEngine'],
    methods: {
        typing() {
            
        },
        stopMove() {
            this.rpgEngine.controls.stop = true
        },
        startMove() {
            console.log('ll')
            this.rpgEngine.controls.stop = false
        }
    }
}
</script>

<style scoped lang="scss">
.chat {
    position: absolute;
    z-index: 101;
}
</style>