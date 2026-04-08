<template>
  <div class="are-logic-minimap">
    <canvas ref="minimapCanvas" width="100" height="100"></canvas>
  </div>
</template>

<script>
export default {
  name: 'AreLogicMinimap',
  inject: ['rpgGuiInteraction'],
  mounted() {
    this.rpgGuiInteraction('are-logic-minimap', (data) => {
      this.draw(data);
    });
  },
  methods: {
    draw(data) {
      const canvas = this.$refs.minimapCanvas;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, 100, 100);
      
      // Draw background
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.fillRect(0, 0, 100, 100);
      
      // Draw chunks
      if (data.world) {
        Object.keys(data.world).forEach(id => {
          const [x, y] = id.split('_').map(Number);
          const chunk = data.world[id];
          
          // Base color
          ctx.fillStyle = chunk.biome === 'forest' ? '#2e7d32' : 
                         chunk.biome === 'desert' ? '#fbc02d' : 
                         chunk.biome === 'ruins' ? '#757575' : '#81c784';
          ctx.fillRect(x * 5 + 50, y * 5 + 50, 4, 4);
          
          // Faction overlay
          if (data.factions) {
            const faction = data.factions.find(f => f.territory.includes(id));
            if (faction) {
              ctx.globalAlpha = 0.5;
              ctx.fillStyle = faction.color;
              ctx.fillRect(x * 5 + 50, y * 5 + 50, 4, 4);
              ctx.globalAlpha = 1.0;
            }
          }
        });
      }
      
      // Draw player
      if (data.player) {
        ctx.fillStyle = '#f44336';
        ctx.beginPath();
        ctx.arc(data.player.x * 5 + 50, data.player.y * 5 + 50, 2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
}
</script>

<style scoped>
.are-logic-minimap {
  position: absolute;
  bottom: 10px;
  right: 10px;
  width: 100px;
  height: 100px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-radius: 5px;
  overflow: hidden;
  pointer-events: none;
  z-index: 100;
}

@media (max-width: 600px) {
  .are-logic-minimap {
    bottom: 5px;
    right: 5px;
    width: 60px;
    height: 60px;
  }
  canvas { width: 60px; height: 60px; }
}
</style>
