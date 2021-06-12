<template>
    <i class="arrow" :class="{ [direction]: true, center }" :style="style"></i>  
</template>

<script>
export default {
  props: {
    direction: {
      type: String,
      default: 'down'
    },
    size: {
      type: Number,
      default: 0.5
    },
    center: {
      type: Boolean,
      default: false
    }
  },
  computed: {
    style() {
      return {
        'border-width': `0 ${this.size}em`,
        'border-top': `${this.size}em solid white`

      }
    }
  }
}
</script>

<style scoped lang="scss">
@keyframes uparrow {
  0% { transform: translateY(0); opacity: 0.4 }
  100% { transform: translateY(-0.4em); opacity: 0.9 }
}
@keyframes downarrow {
  0% { transform: translateY(0); opacity: 0.4 }
  100% { transform: translateY(0.4em); opacity: 0.9 }
}
@keyframes rightarrow {
  0% { transform: translateX(0) rotate(-90deg); opacity: 0.4 }
  100% { transform: translateX(-0.4em) rotate(-90deg); opacity: 0.9 }
}

.arrow {
    border-color:transparent;
    border-style:solid;
    border-width:0 0.5em;
    display: inline-block;
    height:0;
    opacity:0.4;
    text-indent:-9999px;
    transform-origin: 50% 50%;
    width:0;
    border-top: 0.5em solid $window-arrow-color;
}

.up {
  animation: uparrow 0.6s infinite alternate ease-in-out;
}

.down {
  animation: downarrow 0.6s infinite alternate ease-in-out;
  margin-bottom: 10px;
}

.right {
  animation: rightarrow 0.6s infinite alternate ease-in-out;
  transform: rotate(-90deg);
}

.center {
    position: absolute;
    left: calc(50% - 0.5em / 2);
    bottom: 0;
}
</style>