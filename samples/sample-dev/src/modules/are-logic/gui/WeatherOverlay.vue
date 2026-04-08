<template>
  <div class="environment-overlay">
    <!-- Day/Night Tint -->
    <div class="time-tint" :style="tintStyle"></div>
    
    <!-- Weather Effects -->
    <div v-if="weather === 'rain' || weather === 'storm'" class="weather-effect rain">
      <div v-for="n in 50" :key="n" class="drop" :style="dropStyle(n)"></div>
    </div>
    
    <div v-if="weather === 'fog'" class="weather-effect fog"></div>
    
    <!-- Time & Weather HUD -->
    <div class="env-hud">
      <div class="clock">{{ formattedTime }}</div>
      <div class="weather-icon">{{ weatherIcon }}</div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'WeatherOverlay',
  inject: ['rpgGuiInteraction'],
  data() {
    return {
      time: 480,
      weather: 'clear',
      day: 1
    }
  },
  computed: {
    formattedTime() {
      const hours = Math.floor(this.time / 60);
      const minutes = Math.floor(this.time % 60);
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    },
    weatherIcon() {
      const icons = {
        'clear': '☀️',
        'rain': '🌧️',
        'storm': '⛈️',
        'fog': '🌫️'
      };
      return icons[this.weather] || '☀️';
    },
    tintStyle() {
      // Calculate color based on time
      // 0-360: Night (0:00 - 6:00)
      // 360-480: Dawn (6:00 - 8:00)
      // 480-1080: Day (8:00 - 18:00)
      // 1080-1200: Dusk (18:00 - 20:00)
      // 1200-1440: Night (20:00 - 24:00)
      
      let opacity = 0;
      let color = 'rgba(0, 0, 50, 0.4)'; // Night color
      
      if (this.time < 360 || this.time > 1200) {
        opacity = 0.5; // Deep night
      } else if (this.time >= 360 && this.time < 480) {
        opacity = 0.5 * (1 - (this.time - 360) / 120); // Dawn transition
        color = 'rgba(100, 50, 0, 0.3)'; // Orange dawn
      } else if (this.time >= 1080 && this.time < 1200) {
        opacity = 0.5 * ((this.time - 1080) / 120); // Dusk transition
        color = 'rgba(100, 0, 50, 0.3)'; // Purple dusk
      } else {
        opacity = 0; // Full day
      }
      
      return {
        backgroundColor: color,
        opacity: opacity
      };
    }
  },
  mounted() {
    this.rpgGuiInteraction('weather-overlay', (data) => {
      if (data.time !== undefined) this.time = data.time;
      if (data.weather) this.weather = data.weather;
      if (data.day !== undefined) this.day = data.day;
    });
  },
  methods: {
    dropStyle(n) {
      const left = Math.random() * 100;
      const delay = Math.random() * 2;
      const duration = 0.5 + Math.random() * 0.5;
      return {
        left: `${left}%`,
        animationDelay: `${delay}s`,
        animationDuration: `${duration}s`
      };
    }
  }
}
</script>

<style scoped>
.environment-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  pointer-events: none;
  z-index: 50;
}

.time-tint {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  transition: opacity 2s ease, background-color 2s ease;
}

.env-hud {
  position: absolute;
  top: 10px;
  right: 150px; /* Offset from minimap */
  background: rgba(0, 0, 0, 0.6);
  padding: 5px 12px;
  border-radius: 20px;
  display: flex;
  align-items: center;
  color: white;
  font-family: 'Inter', sans-serif;
  font-weight: bold;
  font-size: 14px;
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.clock { margin-right: 8px; }

.weather-effect {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  overflow: hidden;
}

.rain .drop {
  position: absolute;
  top: -20px;
  width: 2px;
  height: 15px;
  background: rgba(255, 255, 255, 0.4);
  animation: fall linear infinite;
}

@keyframes fall {
  to { transform: translateY(100vh); }
}

.fog {
  background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, rgba(200,200,200,0.2) 100%);
  filter: blur(20px);
  animation: fog-move 20s linear infinite alternate;
}

@keyframes fog-move {
  from { transform: translateX(-10%); }
  to { transform: translateX(10%); }
}

@media (max-width: 600px) {
  .env-hud {
    top: 5px;
    right: 110px;
    font-size: 12px;
    padding: 3px 8px;
  }
}
</style>
