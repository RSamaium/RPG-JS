<template>
  <div class="are-logic-hud">
    <div class="heuristic-panel">
      <h3>World Heuristics</h3>
      <div v-for="(val, index) in heuristics" :key="index" class="h-row">
        <span class="h-label">H{{ index + 1 }}:</span>
        <div class="h-bar-bg">
          <div class="h-bar-fill" :style="{ width: Math.min(100, val * 100) + '%' }"></div>
        </div>
        <span class="h-value">{{ val.toFixed(2) }}</span>
      </div>
    </div>
    <div class="lore-panel" v-if="lore">
      <p>{{ lore }}</p>
    </div>
    <div class="structures-panel" v-if="structures && structures.length > 0">
      <h3>Nearby Structures</h3>
      <div v-for="s in structures" :key="s.id" class="s-row">
        <span class="s-name">{{ s.name }}</span>
        <div class="s-hp-bg">
          <div class="s-hp-fill" :style="{ width: (s.health / s.maxHealth * 100) + '%' }"></div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'AreLogicHud',
  inject: ['rpgGuiInteraction'],
  data() {
    return {
      heuristics: new Array(13).fill(0),
      lore: '',
      structures: []
    }
  },
  mounted() {
    this.rpgGuiInteraction('are-logic-hud', (data) => {
      if (data.heuristics) this.heuristics = data.heuristics;
      if (data.lore) this.lore = data.lore;
      if (data.structures) this.structures = data.structures;
    });
  }
}
</script>

<style scoped>
.are-logic-hud {
  position: absolute;
  top: 10px;
  right: 10px;
  width: 200px;
  max-width: 40vw;
  background: rgba(0, 0, 0, 0.7);
  color: white;
  padding: 8px;
  border-radius: 5px;
  font-family: 'Inter', sans-serif;
  pointer-events: none;
  z-index: 100;
}

h3 {
  margin: 0 0 8px 0;
  font-size: 12px;
  text-align: center;
  border-bottom: 1px solid rgba(255, 255, 255, 0.2);
  padding-bottom: 4px;
}

.h-row, .s-row {
  display: flex;
  align-items: center;
  margin-bottom: 3px;
  font-size: 9px;
}

.s-name {
  width: 70px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.s-hp-bg {
  flex-grow: 1;
  height: 4px;
  background: rgba(255, 255, 255, 0.1);
  margin-left: 5px;
  border-radius: 2px;
  overflow: hidden;
}

.s-hp-fill {
  height: 100%;
  background: #f44336;
  transition: width 0.3s ease;
}

@media (max-width: 600px) {
  .are-logic-hud {
    top: 5px;
    right: 5px;
    width: 150px;
    padding: 5px;
  }
  .h-row, .s-row { font-size: 8px; }
  .h-label { width: 20px; }
}
</style>

.h-label {
  width: 25px;
}

.h-bar-bg {
  flex-grow: 1;
  height: 6px;
  background: rgba(255, 255, 255, 0.1);
  margin: 0 5px;
  border-radius: 3px;
  overflow: hidden;
}

.h-bar-fill {
  height: 100%;
  background: #4caf50;
  transition: width 0.3s ease;
}

.h-value {
  width: 30px;
  text-align: right;
}

.lore-panel, .structures-panel {
  margin-top: 10px;
  padding-top: 5px;
  border-top: 1px solid rgba(255, 255, 255, 0.2);
  font-size: 11px;
}

.lore-panel {
  font-style: italic;
  text-align: center;
}
</style>
