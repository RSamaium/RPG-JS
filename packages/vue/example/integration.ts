import { VueGui } from '@rpgjs/vue'
import { RpgClient, RpgClientEngine } from '@rpgjs/client'

// Example Vue component
const InventoryComponent = {
  name: 'InventoryComponent',
  template: `
    <div class="inventory-overlay" v-propagate>
      <h3>Inventory</h3>
      <div v-for="item in items" :key="item.id" class="item">
        <span>{{ item.name }}</span>
        <button @click="useItem(item)">Use</button>
      </div>
      <button @click="closeInventory">Close</button>
    </div>
  `,
  inject: ['engine', 'socket', 'gui'],
  data() {
    return {
      items: [
        { id: 1, name: 'Health Potion' },
        { id: 2, name: 'Magic Scroll' },
        { id: 3, name: 'Iron Sword' }
      ]
    }
  },
  methods: {
    useItem(item) {
      // Send action to server
      this.socket.emit('use-item', { itemId: item.id })
    },
    closeInventory() {
      // Hide the GUI
      this.gui.hide('inventory')
    }
  },
  style: `
    .inventory-overlay {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: rgba(0, 0, 0, 0.9);
      color: white;
      padding: 20px;
      border-radius: 10px;
      border: 2px solid #gold;
      min-width: 300px;
    }
    .item {
      display: flex;
      justify-content: space-between;
      margin: 10px 0;
      padding: 5px;
      background: rgba(255, 255, 255, 0.1);
      border-radius: 5px;
    }
  `
}

// Example Canvas Engine component (this will work with the main RpgGui)
const DialogComponent = function(props, context) {
  // Canvas Engine component logic
  return {
    // Component implementation
  }
}

@RpgClient({
  // Your client configuration
  gui: [
    // Vue component - will be filtered out from main RpgGui
    InventoryComponent,
    
    // Canvas Engine component - will be accepted by main RpgGui
    DialogComponent
  ]
})
export class MyRpgClient {
  onStart(engine: RpgClientEngine) {
    // Create the Vue GUI overlay
    const guiContainer = document.createElement('div')
    guiContainer.id = 'vue-gui-overlay'
    guiContainer.style.position = 'absolute'
    guiContainer.style.top = '0'
    guiContainer.style.left = '0'
    guiContainer.style.width = '100%'
    guiContainer.style.height = '100%'
    guiContainer.style.pointerEvents = 'none' // Allow canvas events to pass through
    
    // Add to DOM
    const gameContainer = document.querySelector('#rpg')
    if (gameContainer) {
      gameContainer.appendChild(guiContainer)
    }
    
    // Initialize Vue GUI
    const vueGui = new VueGui(guiContainer as HTMLDivElement, engine.guiService)
    
    // Example: Open inventory when 'I' key is pressed
    document.addEventListener('keydown', (event) => {
      if (event.key === 'i' || event.key === 'I') {
        engine.guiService.display('inventory')
      }
    })
  }
}

// Example of how to add Vue components programmatically
export function addVueInventory(engine: RpgClientEngine) {
  // Add the Vue component to the GUI system
  engine.guiService.add({
    name: 'inventory',
    component: InventoryComponent,
    display: false,
    autoDisplay: false
  })
}

// Example tooltip component that follows sprites
const PlayerTooltipComponent = {
  name: 'PlayerTooltip',
  template: `
    <div class="player-tooltip" v-if="spriteData">
      <div class="player-name">{{ spriteData.name }}</div>
      <div class="player-level">Level {{ spriteData.level }}</div>
      <div class="player-hp">HP: {{ spriteData.hp }}/{{ spriteData.maxHp }}</div>
    </div>
  `,
  props: ['spriteData'],
  style: `
    .player-tooltip {
      background: rgba(0, 0, 0, 0.8);
      color: white;
      padding: 8px 12px;
      border-radius: 4px;
      font-size: 12px;
      white-space: nowrap;
      border: 1px solid rgba(255, 255, 255, 0.2);
    }
    .player-name {
      font-weight: bold;
      color: #ffff99;
    }
    .player-level {
      color: #99ff99;
    }
    .player-hp {
      color: #ff9999;
    }
  `
}

export function addPlayerTooltips(engine: RpgClientEngine) {
  // Add tooltip component that attaches to sprites
  engine.guiService.add({
    name: 'player-tooltip',
    component: PlayerTooltipComponent,
    display: true,
    autoDisplay: true,
    // This component will attach to sprites
    attachToSprite: true
  })
}