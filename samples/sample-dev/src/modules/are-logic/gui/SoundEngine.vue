<template>
  <div class="sound-engine" style="display: none;">
    <!-- Hidden component for audio management -->
    <audio ref="bgmPeaceful" loop src="https://cdn.pixabay.com/audio/2022/01/18/audio_d0a13f69d2.mp3"></audio>
    <audio ref="bgmWar" loop src="https://cdn.pixabay.com/audio/2022/03/10/audio_c8c8a73456.mp3"></audio>
    <audio ref="bgmChaos" loop src="https://cdn.pixabay.com/audio/2022/01/21/audio_31743c5825.mp3"></audio>
    <audio ref="bgmMarket" loop src="https://cdn.pixabay.com/audio/2021/08/09/audio_884b9a3233.mp3"></audio>
    <audio ref="bgmForest" loop src="https://cdn.pixabay.com/audio/2022/03/15/audio_24921f6498.mp3"></audio>
    <audio ref="bgmDesert" loop src="https://cdn.pixabay.com/audio/2022/01/18/audio_6590218671.mp3"></audio>
    <audio ref="bgmMountains" loop src="https://cdn.pixabay.com/audio/2022/03/24/audio_338787768e.mp3"></audio>
  </div>
</template>

<script>
export default {
  name: 'SoundEngine',
  inject: ['rpgGuiInteraction'],
  data() {
    return {
      currentMood: 'peaceful',
      heuristics: [],
      biome: 'plains',
      isMuted: false,
      volume: 0.5
    }
  },
  watch: {
    heuristics: {
      handler(newH) {
        this.updateMood(newH);
      },
      deep: true
    },
    biome(newBiome) {
      this.updateMood(this.heuristics);
    }
  },
  mounted() {
    this.rpgGuiInteraction('are-logic-hud', (data) => {
      if (data.heuristics) {
        this.heuristics = data.heuristics;
      }
      if (data.biome) {
        this.biome = data.biome;
      }
    });

    // Start peaceful music on first interaction (browser policy)
    window.addEventListener('click', this.initAudio, { once: true });
    window.addEventListener('touchstart', this.initAudio, { once: true });
  },
  methods: {
    initAudio() {
      this.playMood('peaceful');
    },
    updateMood(h) {
      if (!h || h.length === 0) return;

      let nextMood = 'peaceful';
      
      // Biome-specific overrides (High Priority)
      if (this.biome === 'forest') nextMood = 'forest';
      else if (this.biome === 'desert') nextMood = 'desert';
      else if (this.biome === 'mountains') nextMood = 'mountains';
      
      // Heuristic-specific overrides (Higher Priority)
      if (h[8] > 0.6) nextMood = 'war';
      else if (h[11] > 0.6) nextMood = 'chaos';
      else if (h[2] > 0.7) nextMood = 'market';

      if (nextMood !== this.currentMood) {
        this.transitionMood(this.currentMood, nextMood);
        this.currentMood = nextMood;
      }
    },
    transitionMood(oldMood, newMood) {
      console.log(`Transitioning mood: ${oldMood} -> ${newMood}`);
      const oldAudio = this.getAudioByMood(oldMood);
      const newAudio = this.getAudioByMood(newMood);

      if (oldAudio) this.fadeOut(oldAudio);
      if (newAudio) this.fadeIn(newAudio);
    },
    getAudioByMood(mood) {
      const maps = {
        'peaceful': this.$refs.bgmPeaceful,
        'war': this.$refs.bgmWar,
        'chaos': this.$refs.bgmChaos,
        'market': this.$refs.bgmMarket,
        'forest': this.$refs.bgmForest,
        'desert': this.$refs.bgmDesert,
        'mountains': this.$refs.bgmMountains
      };
      return maps[mood];
    },
    playMood(mood) {
      const audio = this.getAudioByMood(mood);
      if (audio) {
        audio.volume = this.volume;
        audio.play().catch(e => console.warn("Audio play blocked", e));
      }
    },
    fadeIn(audio) {
      audio.volume = 0;
      audio.play().catch(e => console.warn("Audio play blocked", e));
      let vol = 0;
      const interval = setInterval(() => {
        vol += 0.05;
        if (vol >= this.volume) {
          audio.volume = this.volume;
          clearInterval(interval);
        } else {
          audio.volume = vol;
        }
      }, 100);
    },
    fadeOut(audio) {
      let vol = audio.volume;
      const interval = setInterval(() => {
        vol -= 0.05;
        if (vol <= 0) {
          audio.volume = 0;
          audio.pause();
          clearInterval(interval);
        } else {
          audio.volume = vol;
        }
      }, 100);
    }
  }
}
</script>
