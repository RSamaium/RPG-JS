<template>
    <div class="tooltip">
        my message
    </div>
</template>

<script>
export default {
    name: 'rpg-tooltip',
    rpgAttachToSprite: true,
    props: ['spriteData'],
    inject: ['rpgEngine', 'rpgScene'],
    data() {
        return {
            text: '',
            message: ''
        }
    },
    mounted() {
        const sprite = this.rpgScene().getSprite(this.spriteData.id)
        
    },
    methods: {
        
    }
}
</script>

<style lang="scss">
.tooltip {
    width: 90px;
    height: 75px;
    border-radius: 70px;
    position: absolute;
    background: #fff;
    z-index: 2;
    padding: 0 15px;
    box-shadow: 0 10px 30px rgba(#414856, 0.05);
    opacity: 0;
    top: 0;
    display: flex;
    justify-content: space-around;
    align-items: center;
    transition: opacity .15s ease-in, top .15s ease-in, width .15s ease-in;
    &::after {
      content: "";
      width: 20px;
      height: 20px;
      background: #fff;
      border-radius: 3px;
      position: absolute;
      left: 50%;
      margin-left: -10px;
      bottom: -8px;
      transform: rotate(45deg);
      z-index: 0;
    }

    animation: stretch-animation 1s ease-out forwards .15s;
        top: -90px;
        opacity: 1;
  }
@keyframes pang-animation {
  0% {
    transform: scale(0);
    opacity: 0;
  }
  40% {
    transform: scale(1);
    opacity: 1;
  }
  100% {
    transform: scale(1.1);
    opacity: 0;
  }
}
@keyframes plus-animation {
  0% {
    transform: rotate(0) scale(1);
  }
  20% {
    transform: rotate(60deg) scale(.93);
  }
  55% {
    transform: rotate(35deg) scale(.97);
  }
  80% {
    transform: rotate(48deg) scale(.94);
  }
  100% {
    transform: rotate(45deg) scale(.95);
  }
}
@keyframes plus-animation-reverse {
  0% {
    transform: rotate(45deg) scale(.95);
  }
  20% {
    transform: rotate(-15deg);
  }
  55% {
    transform: rotate(10deg);
  }
  80% {
    transform: rotate(-3deg);
  }
  100% {
    transform: rotate(0) scale(1);
  }
}
@keyframes stretch-animation {
  0% {
    transform: scale(1,1)
  }
  10% {
    transform: scale(1.1,.9)
  }
  30% {
    transform: scale(.9,1.1)
  }
  50% {
    transform: scale(1.05,.95)
  }
  100% {
    transform: scale(1,1)
  }
}
</style>
