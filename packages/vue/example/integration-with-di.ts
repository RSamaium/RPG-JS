import { provideVueGui } from '@rpgjs/vue'
import { RpgClient, RpgClientEngine } from '@rpgjs/client'
import { createModule } from '@rpgjs/common'

// Example Vue component for inventory
const InventoryVueComponent = {
  name: 'InventoryComponent',
  template: `
    <div class="inventory-overlay" v-propagate>
      <div class="inventory-header">
        <h3>Inventory</h3>
        <button @click="closeInventory" class="close-btn">×</button>
      </div>
      <div class="inventory-grid">
        <div 
          v-for="item in items" 
          :key="item.id" 
          class="inventory-item"
          @click="selectItem(item)"
          :class="{ selected: selectedItem?.id === item.id }"
        >
          <img :src="item.icon" :alt="item.name" />
          <span class="item-name">{{ item.name }}</span>
          <span class="item-quantity">{{ item.quantity }}</span>
        </div>
      </div>
      <div class="inventory-actions" v-if="selectedItem">
        <button @click="useItem(selectedItem)" class="use-btn">Use</button>
        <button @click="dropItem(selectedItem)" class="drop-btn">Drop</button>
      </div>
    </div>
  `,
  inject: ['engine', 'socket', 'gui'],
  data() {
    return {
      items: [],
      selectedItem: null
    }
  },
  mounted() {
    // Listen for inventory updates from server
    this.socket.on('inventory-update', (items) => {
      this.items = items
    })
    
    // Request initial inventory data
    this.socket.emit('get-inventory')
  },
  methods: {
    selectItem(item) {
      this.selectedItem = item
    },
    useItem(item) {
      this.socket.emit('use-item', { itemId: item.id })
      this.selectedItem = null
    },
    dropItem(item) {
      this.socket.emit('drop-item', { itemId: item.id })
      this.selectedItem = null
    },
    closeInventory() {
      this.gui.hide('inventory')
    }
  }
}

// Example Vue component for player tooltip
const PlayerTooltipVueComponent = {
  name: 'PlayerTooltip',
  template: `
    <div class="player-tooltip" v-if="spriteData && spriteData.name">
      <div class="tooltip-header">
        <span class="player-name">{{ spriteData.name }}</span>
        <span class="player-level">Lv.{{ spriteData.level || 1 }}</span>
      </div>
      <div class="tooltip-stats">
        <div class="stat-bar hp-bar">
          <span class="stat-label">HP</span>
          <div class="bar-container">
            <div class="bar-fill" :style="{ width: hpPercentage + '%' }"></div>
            <span class="bar-text">{{ spriteData.hp || 0 }}/{{ spriteData.maxHp || 100 }}</span>
          </div>
        </div>
        <div class="stat-bar mp-bar" v-if="spriteData.mp !== undefined">
          <span class="stat-label">MP</span>
          <div class="bar-container">
            <div class="bar-fill" :style="{ width: mpPercentage + '%' }"></div>
            <span class="bar-text">{{ spriteData.mp || 0 }}/{{ spriteData.maxMp || 100 }}</span>
          </div>
        </div>
      </div>
    </div>
  `,
  props: ['spriteData'],
  computed: {
    hpPercentage() {
      if (!this.spriteData) return 0
      return Math.max(0, Math.min(100, (this.spriteData.hp / this.spriteData.maxHp) * 100))
    },
    mpPercentage() {
      if (!this.spriteData || this.spriteData.mp === undefined) return 0
      return Math.max(0, Math.min(100, (this.spriteData.mp / this.spriteData.maxMp) * 100))
    }
  }
}

// Example Canvas Engine component (for comparison)
const DialogCanvasComponent = function(props, context) {
  // Canvas Engine component implementation
  return {
    // Canvas component logic here
    render: () => `<div>Dialog Content</div>`
  }
}

// Create the Vue GUI module using dependency injection
export function createVueGuiModule() {
  return createModule("VueGUI", [
    provideVueGui({
      selector: '#vue-gui-overlay',
      createIfNotFound: true
    })
  ])
}

// Alternative module with custom mount element
export function createCustomVueGuiModule() {
  return createModule("CustomVueGUI", [
    provideVueGui({
      mountElement: '#custom-ui-container',
      createIfNotFound: false
    })
  ])
}

// Main client configuration using the new dependency injection pattern
@RpgClient({
  providers: [
    // Provide Vue GUI service with dependency injection
    provideVueGui({
      selector: '#vue-gui-overlay',
      createIfNotFound: true
    })
  ],
  gui: [
    // Vue components - will be automatically filtered and handled by VueGui
    {
      name: 'inventory',
      component: InventoryVueComponent,
      display: false,
      autoDisplay: false
    },
    {
      name: 'player-tooltip',
      component: PlayerTooltipVueComponent,
      display: true,
      autoDisplay: true,
      attachToSprite: true
    },
    
    // Canvas Engine component - will be handled by main RpgGui
    {
      name: 'dialog',
      component: DialogCanvasComponent,
      display: false,
      autoDisplay: false
    }
  ]
})
export class MyRpgClientWithDI {
  onStart(engine: RpgClientEngine) {
    // The VueGui service is now automatically available through dependency injection
    // No need to manually create it!
    
    // Example: Open inventory when 'I' key is pressed
    document.addEventListener('keydown', (event) => {
      if (event.key === 'i' || event.key === 'I') {
        engine.guiService.display('inventory')
      }
      
      // Open dialog with 'T' key
      if (event.key === 't' || event.key === 'T') {
        engine.guiService.display('dialog', { 
          text: 'Hello from Canvas Engine dialog!' 
        })
      }
    })
    
    // Example: Display player info tooltip on hover
    document.addEventListener('mousemove', (event) => {
      // Logic to show/hide player tooltips based on mouse position
      // This would typically be handled by the game engine's sprite system
    })
  }
}

// Example of accessing VueGui service through dependency injection
export function setupVueGuiHooks(engine: RpgClientEngine) {
  // If you need direct access to the VueGui service
  // (This is optional - the service works automatically)
  
  // You can inject the VueGui service if needed
  // const vueGui = inject(engine.context, VueGuiToken)
  
  // Setup any additional Vue-specific hooks or configurations
  console.log('VueGui service is running automatically through dependency injection')
}

// Usage in modules array
export default [
  createVueGuiModule() // Include this in your modules array
]