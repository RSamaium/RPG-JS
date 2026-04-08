<template>
  <div class="mobile-actions" v-if="isMobile">
    <button @click="action('combat')" class="action-btn combat">⚔️</button>
    <button @click="action('craft')" class="action-btn craft">🛠️</button>
    <button @click="action('trade')" class="action-btn trade">💰</button>
    <button @click="action('dungeon')" class="action-btn dungeon">🏰</button>
    <button @click="action('oracle')" class="action-btn oracle">👁️</button>
    <button @click="action('skill')" class="action-btn skill">🧬</button>
    <button @click="action('build')" class="action-btn build">🏗️</button>
    <button @click="action('attack_structure')" class="action-btn attack">💣</button>
  </div>
</template>

<script>
export default {
  name: 'MobileActions',
  inject: ['rpgSocket'],
  data() {
    return {
      isMobile: /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
    }
  },
  methods: {
    action(type) {
      this.rpgSocket().emit('player.input', { action: type });
    }
  }
}
</script>

<style scoped>
.mobile-actions {
  position: absolute;
  bottom: 20px;
  right: 120px;
  display: flex;
  gap: 10px;
  z-index: 1000;
}

.action-btn {
  width: 50px;
  height: 50px;
  border-radius: 25px;
  border: 2px solid rgba(255, 255, 255, 0.5);
  background: rgba(0, 0, 0, 0.6);
  color: white;
  font-size: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 4px 6px rgba(0,0,0,0.3);
}

.action-btn:active {
  transform: scale(0.9);
  background: rgba(255, 255, 255, 0.2);
}

@media (min-width: 1024px) {
  .mobile-actions { display: none; }
}
</style>
