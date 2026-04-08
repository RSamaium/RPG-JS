<template>
  <div class="quest-journal" v-if="quest">
    <div class="quest-header">
      <h3>Active Quest</h3>
    </div>
    <div class="quest-body">
      <div class="quest-chain" v-if="quest.chainIndex !== undefined">
        Part {{ quest.chainIndex + 1 }} of the Saga
      </div>
      <div class="quest-title">{{ quest.title }}</div>
      <div class="quest-description">{{ quest.description }}</div>
      <div class="quest-progress">
        <div class="progress-text">{{ quest.task }}: {{ quest.currentCount }} / {{ quest.targetCount }}</div>
        <div class="progress-bar-bg">
          <div class="progress-bar-fill" :style="{ width: (quest.currentCount / quest.targetCount) * 100 + '%' }"></div>
        </div>
      </div>
      <div class="quest-footer">
        <div class="quest-reward">Reward: {{ quest.reward }} Gold</div>
        <div class="quest-impact" v-if="quest.worldImpact">
          <span class="impact-icon">🌍</span> Affects World State
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'QuestJournal',
  inject: ['rpgGuiInteraction'],
  data() {
    return {
      quest: null
    }
  },
  mounted() {
    this.rpgGuiInteraction('quest-journal', (data) => {
      if (data.quest) this.quest = data.quest;
    });
  }
}
</script>

<style scoped>
.quest-journal {
  position: absolute;
  top: 10px;
  left: 10px;
  width: 240px;
  background: rgba(0, 0, 0, 0.85);
  color: white;
  padding: 12px;
  border-radius: 8px;
  font-family: 'Inter', sans-serif;
  border-left: 4px solid #fbc02d;
  box-shadow: 0 4px 15px rgba(0,0,0,0.5);
  pointer-events: none;
  z-index: 100;
}

h3 {
  margin: 0 0 10px 0;
  font-size: 14px;
  color: #fbc02d;
  text-transform: uppercase;
  letter-spacing: 1.5px;
  font-weight: 800;
}

.quest-chain {
  font-size: 9px;
  color: #fbc02d;
  text-transform: uppercase;
  margin-bottom: 4px;
  opacity: 0.8;
}

.quest-title {
  font-weight: 800;
  font-size: 15px;
  margin-bottom: 6px;
  color: #fff;
}

.quest-description {
  font-size: 12px;
  color: #bbb;
  margin-bottom: 12px;
  line-height: 1.4;
}

.quest-progress {
  margin-bottom: 12px;
}

.progress-text {
  font-size: 11px;
  margin-bottom: 5px;
  font-weight: 600;
}

.progress-bar-bg {
  height: 8px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 4px;
  overflow: hidden;
}

.progress-bar-fill {
  height: 100%;
  background: linear-gradient(90deg, #fbc02d, #ffeb3b);
  box-shadow: 0 0 10px rgba(251, 192, 45, 0.5);
  transition: width 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

.quest-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-top: 1px solid rgba(255,255,255,0.1);
  padding-top: 8px;
}

.quest-reward {
  font-size: 12px;
  font-weight: 800;
  color: #ffeb3b;
}

.quest-impact {
  font-size: 10px;
  color: #4fc3f7;
  font-weight: 600;
}

@media (max-width: 600px) {
  .quest-journal {
    width: 180px;
    padding: 8px;
    top: 5px;
    left: 5px;
  }
  h3 { font-size: 11px; }
  .quest-title { font-size: 12px; }
  .quest-description { display: none; }
  .quest-chain { font-size: 8px; }
}
</style>
