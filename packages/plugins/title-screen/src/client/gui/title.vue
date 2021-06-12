<template>
  <div class="background">
      <rpg-window width="200px" position="bottom-middle" class="margin-bottom">
          <rpg-choice :choices="[{
                text: 'Start'
            }, {
                text: 'Load'
            }]">
            </rpg-choice>
      </rpg-window>
  </div>
</template>

<script>
export default {
    name: 'rpg-title-screen'
}
</script>

<style scoped>
.background {
    position: absolute;
    background: url('./assets/default.png');
    width: 100%;
    height: 100%;
    display: flex;
}

.margin-bottom {
    margin-bottom: 50px;
}
</style>