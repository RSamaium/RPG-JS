<template>
  <div class="combat-effects">
    <div v-for="effect in effects" :key="effect.id" 
         class="damage-number" 
         :class="effect.type"
         :style="{ left: effect.x + 'px', top: effect.y + 'px' }">
      {{ effect.value }}
    </div>
    <div v-if="flash" class="screen-flash" :class="flashType"></div>
  </div>
</template>

<script>
export default {
  name: 'CombatEffects',
  inject: ['rpgGuiInteraction'],
  data() {
    return {
      effects: [],
      flash: false,
      flashType: 'hit'
    }
  },
  mounted() {
    this.rpgGuiInteraction('combat-effects', (data) => {
      if (data.damage) {
        this.addDamageNumber(data.damage);
      }
      if (data.flash) {
        this.triggerFlash(data.flash);
      }
    });
  },
  methods: {
    addDamageNumber({ value, x, y, type = 'normal' }) {
      const id = Date.now() + Math.random();
      this.effects.push({ id, value, x, y, type });
      setTimeout(() => {
        this.effects = this.effects.filter(e => e.id !== id);
      }, 1000);
    },
    triggerFlash(type) {
      this.flashType = type;
      this.flash = true;
      setTimeout(() => {
        this.flash = false;
      }, 100);
    }
  }
}
</script>

<style scoped>
.combat-effects {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  pointer-events: none;
  z-index: 100;
}

.damage-number {
  position: absolute;
  font-family: 'Inter', sans-serif;
  font-weight: 900;
  font-size: 24px;
  color: #ff5252;
  text-shadow: 2px 2px 0 #000;
  animation: float-up 1s ease-out forwards;
}

.damage-number.critical {
  font-size: 36px;
  color: #ffeb3b;
}

.damage-number.heal {
  color: #4caf50;
}

@keyframes float-up {
  0% { transform: translateY(0) scale(1); opacity: 1; }
  100% { transform: translateY(-100px) scale(1.5); opacity: 0; }
}

.screen-flash {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(255, 255, 255, 0.3);
  animation: flash-anim 0.1s ease-out;
}

.screen-flash.hit { background: rgba(255, 0, 0, 0.2); }
.screen-flash.crit { background: rgba(255, 255, 255, 0.5); }

@keyframes flash-anim {
  from { opacity: 1; }
  to { opacity: 0; }
}
</style>
