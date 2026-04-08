<template>
  <div class="skill-gui" v-if="show">
    <div class="gui-header">
      <h2>Heuristic Alignment & Skills</h2>
      <button class="close-btn" @click="close">×</button>
    </div>

    <div class="gui-content">
      <div class="alignment-section">
        <h3>Your Heuristic Signature</h3>
        <div class="signature-chart">
          <div 
            v-for="(val, index) in signature" 
            :key="index" 
            class="signature-bar"
            :style="{ height: val + '%', backgroundColor: getHeuristicColor(index) }"
            :title="'H' + index + ': ' + Math.floor(val) + '%'"
          ></div>
        </div>
        <div class="signature-labels">
          <span>Production</span>
          <span>Economy</span>
          <span>Conflict</span>
          <span>Chaos</span>
        </div>
      </div>

      <div class="skills-section">
        <h3>Unlocked Skills</h3>
        <div v-if="skills.length === 0" class="no-skills">
          No skills unlocked yet. Influence the world to evolve.
        </div>
        <div v-else class="skills-list">
          <div v-for="skill in skills" :key="skill.id" class="skill-card">
            <div class="skill-info">
              <span class="skill-name">{{ skill.name }}</span>
              <span class="skill-desc">{{ skill.description }}</span>
            </div>
            <div class="skill-level">Level {{ getSkillLevel(skill) }}</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'SkillGui',
  inject: ['rpgGuiInteraction'],
  data() {
    return {
      show: false,
      skills: [],
      signature: new Array(13).fill(0)
    }
  },
  mounted() {
    this.rpgGuiInteraction('skill-gui', (data) => {
      this.show = true;
      if (data.skills) this.skills = data.skills;
      if (data.signature) this.signature = data.signature;
    });
  },
  methods: {
    close() {
      this.show = false;
      this.rpgGuiInteraction('skill-gui.close');
    },
    getHeuristicColor(index) {
      const colors = [
        '#4caf50', '#8bc34a', '#ffeb3b', '#ffc107', '#ff9800', 
        '#ff5722', '#f44336', '#e91e63', '#9c27b0', '#673ab7', 
        '#3f51b5', '#2196f3', '#03a9f4'
      ];
      return colors[index % colors.length];
    },
    getSkillLevel(skill) {
      // Level calculation logic mirrored from server
      const alignmentVal = this.signature[skill.requiredAlignment.heuristicIndex];
      // Note: signature is percentage, but we need the raw value for level.
      // For simplicity in UI, we'll just show the skill object if it has level.
      return skill.level || 1;
    }
  }
}
</script>

<style scoped>
.skill-gui {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 500px;
  background: rgba(10, 10, 20, 0.95);
  border: 2px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  color: white;
  font-family: 'Inter', sans-serif;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(10px);
  z-index: 1000;
}

.gui-header {
  padding: 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.gui-header h2 {
  margin: 0;
  font-size: 1.2rem;
  letter-spacing: 1px;
  text-transform: uppercase;
  color: #03a9f4;
}

.close-btn {
  background: none;
  border: none;
  color: rgba(255, 255, 255, 0.5);
  font-size: 24px;
  cursor: pointer;
}

.gui-content {
  padding: 20px;
}

.alignment-section {
  margin-bottom: 30px;
}

.signature-chart {
  height: 100px;
  display: flex;
  align-items: flex-end;
  gap: 4px;
  background: rgba(0, 0, 0, 0.3);
  padding: 10px;
  border-radius: 8px;
}

.signature-bar {
  flex: 1;
  border-radius: 2px 2px 0 0;
  transition: height 0.3s ease;
}

.signature-labels {
  display: flex;
  justify-content: space-between;
  margin-top: 8px;
  font-size: 0.7rem;
  color: rgba(255, 255, 255, 0.5);
  text-transform: uppercase;
}

.skills-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-height: 250px;
  overflow-y: auto;
}

.skill-card {
  background: rgba(255, 255, 255, 0.05);
  padding: 12px;
  border-radius: 8px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-left: 4px solid #03a9f4;
}

.skill-name {
  display: block;
  font-weight: 600;
  margin-bottom: 4px;
}

.skill-desc {
  display: block;
  font-size: 0.8rem;
  color: rgba(255, 255, 255, 0.6);
}

.skill-level {
  font-weight: 700;
  color: #ffeb3b;
  font-size: 0.9rem;
}

.no-skills {
  text-align: center;
  padding: 20px;
  color: rgba(255, 255, 255, 0.4);
  font-style: italic;
}
</style>
