<template>
  <div class="background">
      <div class="title">
          <h1>My Rpg Game</h1>
      </div>
      <rpg-window 
        width="200px" 
        position="bottom-middle" 
        class="margin-bottom" 
        >
          <rpg-choice :choices="menu" @selected="selected"></rpg-choice>
      </rpg-window>
  </div>
</template>

<script>
const name = 'rpg-title-screen'

export default {
    name,
    inject: ['rpgEngine', 'rpgGui'],
    data() {
        return {
            menu: [
                { text:  'Start Game', value: 'start' },
                { text: 'Load Game', value: 'load' }
            ]
        }
    },
    methods: {
        selected(index) {
            const { value } = this.menu[index]
            if (value == 'start') {
                this.rpgEngine.connection()
                this.rpgGui.hide(name)
            }
        }
    }
}
</script>

<style scoped lang="scss">
$title-screen-font-size: 40px !default;
$title-screen-font-color: white !default;
$title-screen-font-border-color: black !default;
$title-screen-background: url('./assets/default.png') !default;

.title {
    position: absolute;
    display: flex;
    width: 100%;
    justify-content: center;
    margin-top: 50px;
    font-family: $window-font-family;
    font-size: $title-screen-font-size;
    & h1 {
        color: white;
        text-shadow: 
            -1px -1px 0 $title-screen-font-border-color, 
            1px -1px 0 $title-screen-font-border-color, 
            -1px 1px 0 $title-screen-font-border-color, 
            1px 1px 0 $title-screen-font-border-color;
    }
}

.background {
    position: absolute;
    background: $title-screen-background;
    width: 100%;
    height: 100%;
    display: flex;
}

.margin-bottom {
    margin-bottom: 50px;
}
</style>