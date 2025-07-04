<template>
  <div class="rpg-component-example" v-propagate>
    <!-- Header with basic info -->
    <div class="header">
      <h3>RPG Component Example</h3>
      <button @click="closeComponent" class="close-btn">×</button>
    </div>

    <!-- Player Information -->
    <div class="player-section" v-if="currentPlayer">
      <h4>Current Player</h4>
      <div class="player-info">
        <p><strong>Name:</strong> {{ currentPlayer.object.name || 'Unknown' }}</p>
        <p><strong>Level:</strong> {{ currentPlayer.object.level || 1 }}</p>
        <p><strong>HP:</strong> {{ currentPlayer.object.hp || 0 }} / {{ currentPlayer.object.maxHp || 100 }}</p>
      </div>
    </div>

    <!-- Objects List -->
    <div class="objects-section">
      <h4>Scene Objects ({{ objectCount }})</h4>
      <div class="objects-list">
        <div v-for="(obj, id) in visibleObjects" :key="id" class="object-item">
          <span class="object-id">{{ id }}</span>
          <span class="object-type">{{ obj.object.constructor.name }}</span>
        </div>
      </div>
    </div>

    <!-- Controls -->
    <div class="controls-section">
      <h4>Controls</h4>
      <div class="control-buttons">
        <button @click="toggleInputs">
          {{ inputsEnabled ? 'Disable' : 'Enable' }} Scene Inputs
        </button>
        <button @click="addBlurEffect">Toggle Blur Effect</button>
        <button @click="playSound">Play Sound</button>
        <button @click="testInteraction">Test GUI Interaction</button>
      </div>
    </div>

    <!-- Keypress Monitor -->
    <div class="keypress-section">
      <h4>Last Keypress</h4>
      <div class="keypress-info" v-if="lastKeypress">
        <p><strong>Key:</strong> {{ lastKeypress.inputName }}</p>
        <p><strong>Action:</strong> {{ lastKeypress.control?.actionName || 'None' }}</p>
      </div>
      <p v-else class="no-keypress">Press any key...</p>
    </div>

    <!-- Resources Info -->
    <div class="resources-section">
      <h4>Resources</h4>
      <p>Spritesheets: {{ spriteSheetCount }}</p>
      <p>Sounds: {{ soundCount }}</p>
    </div>
  </div>
</template>

<script>
export default {
  name: 'RpgComponentExample',
  // All available RPGJS Vue injections
  inject: [
    'rpgEngine',      // RpgClientEngine instance
    'rpgSocket',      // Function returning socket
    'rpgGui',         // RpgGui instance
    'rpgScene',       // Function returning current scene
    'rpgStage',       // PIXI.Container (main stage)
    'rpgResource',    // { spritesheets: Map, sounds: Map }
    'rpgObjects',     // Observable of all objects
    'rpgCurrentPlayer', // Observable of current player
    'rpgGuiClose',    // Function to close GUI
    'rpgGuiInteraction', // Function for GUI interaction
    'rpgKeypress',    // Observable of keypress events
    'rpgSound'        // Sound service
  ],
  data() {
    return {
      currentPlayer: null,
      objects: {},
      lastKeypress: null,
      inputsEnabled: true,
      blurEnabled: false,
      objectSubscription: null,
      playerSubscription: null,
      keypressSubscription: null
    }
  },
  computed: {
    objectCount() {
      return Object.keys(this.objects).length
    },
    visibleObjects() {
      // Show only first 5 objects for demo
      const entries = Object.entries(this.objects)
      return Object.fromEntries(entries.slice(0, 5))
    },
    spriteSheetCount() {
      return this.rpgResource?.spritesheets?.size || 0
    },
    soundCount() {
      return this.rpgResource?.sounds?.size || 0
    }
  },
  mounted() {
    console.log('RPG Component mounted with all injections available')
    console.log('Engine:', this.rpgEngine)
    console.log('Socket:', this.rpgSocket())
    console.log('Scene:', this.rpgScene())
    console.log('Stage:', this.rpgStage)

    // Subscribe to objects changes
    if (this.rpgObjects) {
      this.objectSubscription = this.rpgObjects.subscribe((objects) => {
        this.objects = objects
        console.log('Objects updated:', objects)
      })
    }

    // Subscribe to current player changes
    if (this.rpgCurrentPlayer) {
      this.playerSubscription = this.rpgCurrentPlayer.subscribe((player) => {
        this.currentPlayer = player
        console.log('Current player updated:', player)
      })
    }

    // Subscribe to keypress events
    if (this.rpgKeypress) {
      this.keypressSubscription = this.rpgKeypress.subscribe((keyData) => {
        this.lastKeypress = keyData
        console.log('Key pressed:', keyData)

        // Handle special keys
        if (keyData.control?.actionName === 'escape') {
          this.closeComponent()
        }
      })
    }

    // Listen to socket events
    const socket = this.rpgSocket()
    socket.on('component-example-data', (data) => {
      console.log('Received example data:', data)
    })
  },
  unmounted() {
    // Clean up subscriptions to prevent memory leaks
    if (this.objectSubscription) {
      this.objectSubscription.unsubscribe()
    }
    if (this.playerSubscription) {
      this.playerSubscription.unsubscribe()
    }
    if (this.keypressSubscription) {
      this.keypressSubscription.unsubscribe()
    }
  },
  methods: {
    closeComponent() {
      // Use rpgGuiClose to close this component
      this.rpgGuiClose('example-component', {
        closedBy: 'user',
        timestamp: Date.now()
      })
    },
    toggleInputs() {
      const scene = this.rpgScene()
      if (scene) {
        if (this.inputsEnabled) {
          scene.stopInputs()
        } else {
          scene.startInputs()
        }
        this.inputsEnabled = !this.inputsEnabled
      }
    },
    addBlurEffect() {
      if (this.rpgStage && window.PIXI) {
        if (this.blurEnabled) {
          this.rpgStage.filters = null
        } else {
          const blur = new window.PIXI.BlurFilter()
          blur.blur = 2
          this.rpgStage.filters = [blur]
        }
        this.blurEnabled = !this.blurEnabled
      }
    },
    playSound() {
      // Try to play a sound using rpgSound service
      const soundIds = Array.from(this.rpgResource.sounds.keys())
      if (soundIds.length > 0) {
        const firstSoundId = soundIds[0]
        this.rpgSound.play(firstSoundId)
        console.log(`Playing sound: ${firstSoundId}`)
      } else {
        console.log('No sounds available')
        // Fallback: try to play a common sound
        this.rpgSound.play('click')
      }
    },
    testInteraction() {
      // Test GUI interaction
      this.rpgGuiInteraction('example-component', 'test-action', {
        message: 'Hello from Vue component!',
        timestamp: Date.now(),
        playerData: this.currentPlayer
      })
    }
  }
}
</script>

<style scoped>
.rpg-component-example {
  position: fixed;
  top: 50px;
  right: 20px;
  width: 320px;
  max-height: 80vh;
  background: linear-gradient(135deg, #2c3e50, #34495e);
  color: #ecf0f1;
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  overflow-y: auto;
  font-family: 'Arial', sans-serif;
  z-index: 1000;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px 20px;
  background: rgba(52, 73, 94, 0.8);
  border-radius: 12px 12px 0 0;
  border-bottom: 2px solid #3498db;
}

.header h3 {
  margin: 0;
  color: #3498db;
  font-size: 1.2em;
}

.close-btn {
  background: #e74c3c;
  color: white;
  border: none;
  border-radius: 50%;
  width: 25px;
  height: 25px;
  cursor: pointer;
  font-size: 14px;
  line-height: 1;
}

.close-btn:hover {
  background: #c0392b;
}

.player-section,
.objects-section,
.controls-section,
.keypress-section,
.resources-section {
  padding: 15px 20px;
  border-bottom: 1px solid rgba(52, 73, 94, 0.5);
}

.player-section h4,
.objects-section h4,
.controls-section h4,
.keypress-section h4,
.resources-section h4 {
  margin: 0 0 10px 0;
  color: #3498db;
  font-size: 1em;
}

.player-info p {
  margin: 5px 0;
  font-size: 0.9em;
}

.objects-list {
  max-height: 100px;
  overflow-y: auto;
}

.object-item {
  display: flex;
  justify-content: space-between;
  padding: 4px 0;
  font-size: 0.8em;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.object-id {
  color: #f39c12;
  font-family: monospace;
}

.object-type {
  color: #95a5a6;
}

.control-buttons {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.control-buttons button {
  background: #3498db;
  color: white;
  border: none;
  padding: 8px 12px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.9em;
  transition: background 0.3s;
}

.control-buttons button:hover {
  background: #2980b9;
}

.keypress-info p {
  margin: 5px 0;
  font-size: 0.9em;
}

.no-keypress {
  color: #95a5a6;
  font-style: italic;
  font-size: 0.9em;
}

.resources-section p {
  margin: 5px 0;
  font-size: 0.9em;
  color: #95a5a6;
}

/* Scrollbar styling */
.rpg-component-example::-webkit-scrollbar {
  width: 6px;
}

.rpg-component-example::-webkit-scrollbar-track {
  background: rgba(52, 73, 94, 0.3);
}

.rpg-component-example::-webkit-scrollbar-thumb {
  background: #3498db;
  border-radius: 3px;
}

.rpg-component-example::-webkit-scrollbar-thumb:hover {
  background: #2980b9;
}
</style>