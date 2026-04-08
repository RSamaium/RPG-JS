<template>
  <div class="oracle-gui" v-if="isOpen">
    <div class="oracle-header">
      <h3>The Oracle's Vision</h3>
      <button @click="close" class="close-btn">X</button>
    </div>
    <div class="oracle-content">
      <div v-for="(prophecy, index) in prophecies" :key="index" class="prophecy-card" :class="prophecy.severity">
        <div class="prophecy-category">{{ prophecy.category }}</div>
        <div class="prophecy-text">{{ prophecy.text }}</div>
      </div>
    </div>
    <div class="oracle-footer">
      <span>The threads of fate never lie...</span>
    </div>
  </div>
</template>

<script>
export default {
  name: 'OracleGui',
  inject: ['rpgGuiInteraction', 'rpgSocket'],
  data() {
    return {
      isOpen: false,
      prophecies: []
    }
  },
  mounted() {
    this.rpgGuiInteraction('oracle-gui', (data) => {
      if (data.open !== undefined) this.isOpen = data.open;
      if (data.prophecies) this.prophecies = data.prophecies;
    });
  },
  methods: {
    close() {
      this.isOpen = false;
      this.rpgSocket().emit('player.oracle.close');
    }
  }
}
</script>

<style scoped>
.oracle-gui {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 350px;
  max-width: 90vw;
  background: rgba(20, 10, 30, 0.9);
  color: #e0e0e0;
  border-radius: 15px;
  border: 2px solid #9c27b0;
  padding: 20px;
  font-family: 'Inter', sans-serif;
  pointer-events: auto;
  box-shadow: 0 0 30px rgba(156, 39, 176, 0.3);
  z-index: 1000;
}

.oracle-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid rgba(156, 39, 176, 0.3);
  padding-bottom: 10px;
  margin-bottom: 15px;
}

h3 { margin: 0; font-size: 20px; color: #ce93d8; text-transform: uppercase; letter-spacing: 2px; }

.close-btn {
  background: rgba(255, 255, 255, 0.1);
  border: none;
  color: white;
  padding: 5px 10px;
  border-radius: 5px;
  cursor: pointer;
}

.oracle-content {
  max-height: 300px;
  overflow-y: auto;
  padding-right: 5px;
}

.prophecy-card {
  background: rgba(255, 255, 255, 0.05);
  padding: 12px;
  border-radius: 8px;
  margin-bottom: 12px;
  border-left: 4px solid #9e9e9e;
}

.prophecy-card.high { border-left-color: #f44336; background: rgba(244, 67, 54, 0.1); }
.prophecy-card.medium { border-left-color: #ff9800; background: rgba(255, 152, 0, 0.1); }
.prophecy-card.low { border-left-color: #4caf50; background: rgba(76, 175, 80, 0.1); }

.prophecy-category {
  font-size: 10px;
  text-transform: uppercase;
  font-weight: bold;
  color: #ce93d8;
  margin-bottom: 4px;
}

.prophecy-text {
  font-size: 14px;
  line-height: 1.4;
  font-style: italic;
}

.oracle-footer {
  margin-top: 15px;
  text-align: center;
  font-size: 11px;
  color: #888;
  font-style: italic;
}

@media (max-width: 600px) {
  .oracle-gui { width: 95vw; padding: 15px; }
  .prophecy-text { font-size: 12px; }
}
</style>
