export default {
  title: "Primitives"
}

export const Panel = () => `
  <main class="rpg-story-page">
    <section class="rpg-story-grid">
      <div class="rpg-ui-panel">
        <h2 class="rpg-story-panel-title">Panel</h2>
        <p class="rpg-story-copy">Basic framed surface for compact RPG information.</p>
      </div>

      <div class="rpg-ui-window">
        <div class="rpg-ui-window-title">Window</div>
        <p class="rpg-story-copy">A larger framed surface with a title label.</p>
      </div>
    </section>
  </main>
`

export const Button = () => `
  <main class="rpg-story-page">
    <section class="rpg-ui-window">
      <div class="rpg-ui-window-title">Buttons</div>
      <div class="rpg-story-row">
        <button class="rpg-ui-btn">Default</button>
        <button class="rpg-ui-btn" data-variant="primary">Primary</button>
        <button class="rpg-ui-btn" data-variant="success">Success</button>
        <button class="rpg-ui-btn" data-variant="warning">Warning</button>
        <button class="rpg-ui-btn" data-variant="danger">Danger</button>
        <button class="rpg-ui-btn" data-disabled="true">Disabled</button>
      </div>
    </section>
  </main>
`

export const Input = () => `
  <main class="rpg-story-page">
    <section class="rpg-ui-window">
      <div class="rpg-ui-window-title">Inputs</div>
      <div class="rpg-story-form">
        <label class="rpg-story-field">
          <span>Hero name</span>
          <input class="rpg-ui-input" value="Aria">
        </label>
        <label class="rpg-story-field">
          <span>Guild</span>
          <input class="rpg-ui-input" placeholder="Moon Order">
        </label>
        <label class="rpg-ui-checkbox">
          <input type="checkbox" checked>
          Auto-run in towns
        </label>
        <label class="rpg-ui-checkbox">
          <input type="checkbox">
          Skip battle intro
        </label>
      </div>
    </section>
  </main>
`

export const Menu = () => `
  <main class="rpg-story-page">
    <section class="rpg-story-grid">
      <div class="rpg-ui-menu">
        <div class="rpg-ui-menu-header">Command</div>
        <button class="rpg-ui-menu-item" data-selected="true">Attack</button>
        <button class="rpg-ui-menu-item">Magic</button>
        <button class="rpg-ui-menu-item">Items</button>
        <button class="rpg-ui-menu-item" data-disabled="true">Escape</button>
      </div>

      <div class="rpg-ui-menu">
        <div class="rpg-ui-menu-tabs">
          <button class="rpg-ui-menu-tab" data-active="true">Items</button>
          <button class="rpg-ui-menu-tab">Skills</button>
          <button class="rpg-ui-menu-tab">Quest</button>
        </div>
        <button class="rpg-ui-menu-item" data-selected="true">
          <span class="rpg-ui-menu-row">
            <span class="rpg-ui-menu-row-main"><span class="rpg-ui-menu-row-icon">S</span>Iron Sword</span>
            <span class="rpg-ui-menu-row-end">x1</span>
          </span>
        </button>
        <button class="rpg-ui-menu-item">
          <span class="rpg-ui-menu-row">
            <span class="rpg-ui-menu-row-main"><span class="rpg-ui-menu-row-icon">P</span>Hi-Potion</span>
            <span class="rpg-ui-menu-row-end">x8</span>
          </span>
        </button>
      </div>
    </section>
  </main>
`

export const Dialog = () => `
  <main class="rpg-story-page">
    <section class="rpg-ui-dialog">
      <div class="rpg-ui-dialog-speaker">Elder Rowan</div>
      <div class="rpg-ui-dialog-body">
        <div class="rpg-ui-dialog-content">
          The ruins open only when the three sigils are aligned.
          <div class="rpg-ui-dialog-choices">
            <button class="rpg-ui-dialog-choice" data-selected="true">Accept the quest</button>
            <button class="rpg-ui-dialog-choice">Ask for a reward</button>
            <button class="rpg-ui-dialog-choice">Leave</button>
          </div>
        </div>
        <div class="rpg-ui-dialog-face">NPC</div>
      </div>
      <div class="rpg-ui-dialog-indicator"></div>
    </section>
  </main>
`

export const Bar = () => `
  <main class="rpg-story-page">
    <section class="rpg-ui-window">
      <div class="rpg-ui-window-title">Bars</div>
      <div class="rpg-story-resource">
        <div class="rpg-ui-bar" data-type="health"><span class="rpg-ui-bar-label">HP 1820 / 2400</span><div class="rpg-ui-bar-fill" style="width: 76%"></div></div>
        <div class="rpg-ui-bar" data-type="mana"><span class="rpg-ui-bar-label">MP 530 / 840</span><div class="rpg-ui-bar-fill" style="width: 63%"></div></div>
        <div class="rpg-ui-bar" data-type="experience"><span class="rpg-ui-bar-label">EXP 42%</span><div class="rpg-ui-bar-fill" style="width: 42%"></div></div>
        <div class="rpg-ui-bar" data-type="stamina"><span class="rpg-ui-bar-label">STA 70%</span><div class="rpg-ui-bar-fill" style="width: 70%"></div></div>
      </div>
    </section>
  </main>
`

export const Inventory = () => `
  <main class="rpg-story-page">
    <section class="rpg-ui-window">
      <div class="rpg-ui-window-title">Inventory</div>
      <div class="rpg-ui-inventory rpg-story-inventory-wide">
        <button class="rpg-ui-inventory-slot" data-rarity="common"><span class="rpg-ui-inventory-slot-icon">P</span><span class="rpg-ui-inventory-slot-quantity">8</span></button>
        <button class="rpg-ui-inventory-slot" data-rarity="uncommon"><span class="rpg-ui-inventory-slot-icon">H</span></button>
        <button class="rpg-ui-inventory-slot" data-rarity="rare" data-selected="true"><span class="rpg-ui-inventory-slot-icon">S</span></button>
        <button class="rpg-ui-inventory-slot" data-rarity="epic"><span class="rpg-ui-inventory-slot-icon">W</span></button>
        <button class="rpg-ui-inventory-slot" data-rarity="legendary"><span class="rpg-ui-inventory-slot-icon">C</span></button>
        <button class="rpg-ui-inventory-slot" data-disabled="true">?</button>
        <button class="rpg-ui-inventory-slot"></button>
        <button class="rpg-ui-inventory-slot"></button>
      </div>
    </section>
  </main>
`

export const Hotbar = () => `
  <main class="rpg-story-page">
    <section class="rpg-ui-window">
      <div class="rpg-ui-window-title">Hotbar</div>
      <div class="rpg-ui-hotbar">
        <button class="rpg-ui-hotbar-slot" data-selected="true">1</button>
        <button class="rpg-ui-hotbar-slot">2</button>
        <button class="rpg-ui-hotbar-slot">3</button>
        <button class="rpg-ui-hotbar-slot">4</button>
        <button class="rpg-ui-hotbar-slot" data-disabled="true">5</button>
      </div>
    </section>
  </main>
`

export const HUD = () => `
  <main class="rpg-story-page">
    <section class="rpg-story-stage">
      <div class="rpg-ui-hud">
        <div class="rpg-ui-avatar">
          <span>R</span>
          <div class="rpg-ui-avatar-level">24</div>
        </div>
        <div class="rpg-ui-status-bars">
          <div class="rpg-ui-status-bar"><span class="rpg-ui-status-bar-label">HP 1820</span><div class="rpg-ui-status-bar-fill" data-type="health" style="width: 76%"></div></div>
          <div class="rpg-ui-status-bar"><span class="rpg-ui-status-bar-label">MP 530</span><div class="rpg-ui-status-bar-fill" data-type="mana" style="width: 63%"></div></div>
        </div>
      </div>
    </section>
  </main>
`

export const CharacterCard = () => `
  <main class="rpg-story-page">
    <section class="rpg-ui-character-card">
      <div class="rpg-ui-character-card-header">
        <div class="rpg-ui-character-card-avatar">A</div>
        <div class="rpg-ui-character-card-info">
          <div class="rpg-ui-character-card-name">Aria <span class="rpg-ui-character-card-level">Lv. 24</span></div>
          <div class="rpg-ui-character-card-class">Hero / Swordmaster</div>
        </div>
      </div>
      <div>
        <div class="rpg-ui-character-card-section-title">Vitals</div>
        <div class="rpg-story-resource">
          <div class="rpg-ui-bar" data-type="health"><span class="rpg-ui-bar-label">HP</span><div class="rpg-ui-bar-fill" style="width: 82%"></div></div>
          <div class="rpg-ui-bar" data-type="mana"><span class="rpg-ui-bar-label">MP</span><div class="rpg-ui-bar-fill" style="width: 58%"></div></div>
        </div>
      </div>
    </section>
  </main>
`

export const Stats = () => `
  <main class="rpg-story-page">
    <section class="rpg-ui-window">
      <div class="rpg-ui-window-title">Stats</div>
      <div class="rpg-story-stats">
        <div class="rpg-ui-equip-stat" data-type="positive"><span>Attack</span><strong>+18</strong><span class="rpg-ui-equip-stat-current">42 -> 60</span></div>
        <div class="rpg-ui-equip-stat" data-type="positive"><span>Speed</span><strong>+4</strong><span class="rpg-ui-equip-stat-current">21 -> 25</span></div>
        <div class="rpg-ui-equip-stat" data-type="negative"><span>Defense</span><strong>-2</strong><span class="rpg-ui-equip-stat-current">31 -> 29</span></div>
      </div>
    </section>
  </main>
`

export const Tooltip = () => `
  <main class="rpg-story-page">
    <section class="rpg-ui-window rpg-story-tooltip-stage">
      <div class="rpg-ui-window-title">Tooltip</div>
      <button class="rpg-ui-btn">Hover target</button>
      <div class="rpg-ui-tooltip" data-visible="true" style="left: 52px; top: 88px;">Restores 120 HP</div>
    </section>
  </main>
`

export const Toast = () => `
  <main class="rpg-story-page">
    <section class="rpg-ui-window">
      <div class="rpg-ui-window-title">Toasts</div>
      <div class="rpg-story-resource">
        <div class="rpg-ui-toast" data-type="success"><span class="rpg-ui-toast-icon">OK</span><span class="rpg-ui-toast-content"><strong class="rpg-ui-toast-title">Quest updated</strong><span class="rpg-ui-toast-message">Find the moon gate.</span></span></div>
        <div class="rpg-ui-toast" data-type="warning"><span class="rpg-ui-toast-icon">!</span><span class="rpg-ui-toast-content"><strong class="rpg-ui-toast-title">Low health</strong><span class="rpg-ui-toast-message">Use a potion soon.</span></span></div>
        <div class="rpg-ui-toast" data-type="danger"><span class="rpg-ui-toast-icon">X</span><span class="rpg-ui-toast-content"><strong class="rpg-ui-toast-title">Poisoned</strong><span class="rpg-ui-toast-message">Damage each turn.</span></span></div>
      </div>
    </section>
  </main>
`

export const SaveLoad = () => `
  <main class="rpg-story-page">
    <section class="rpg-ui-save-load">
      <div class="rpg-ui-save-load-header">
        <div class="rpg-ui-save-load-title">Load Game</div>
        <div class="rpg-ui-save-load-subtitle">Choose a saved journey.</div>
      </div>
      <div class="rpg-ui-save-load-list">
        <button class="rpg-ui-save-load-slot" data-selected="true">
          <span class="rpg-ui-save-load-slot-index">Slot 1</span>
          <span class="rpg-ui-save-load-slot-meta"><span class="rpg-ui-save-load-slot-line">Moon Gate</span><span class="rpg-ui-save-load-slot-line">Lv. 24</span></span>
        </button>
        <button class="rpg-ui-save-load-slot">
          <span class="rpg-ui-save-load-slot-index">Slot 2</span>
          <span class="rpg-ui-save-load-slot-meta"><span class="rpg-ui-save-load-slot-line">Old Harbor</span><span class="rpg-ui-save-load-slot-line">Lv. 16</span></span>
        </button>
        <button class="rpg-ui-save-load-slot" data-empty="true"><span class="rpg-ui-save-load-slot-empty">Empty slot</span></button>
      </div>
    </section>
  </main>
`

export const Shop = () => `
  <main class="rpg-story-page rpg-story-shop-page">
    <section class="rpg-ui-shop rpg-story-shop-embed">
      <div class="rpg-ui-shop-header">
        <div class="rpg-ui-shop-merchant"><div class="rpg-ui-shop-merchant-avatar">M</div><div class="rpg-ui-shop-merchant-info"><h2>Mira's Forge</h2><p>Reliable steel for uncertain roads.</p></div></div>
        <div class="rpg-ui-shop-gold">2 840 G</div>
      </div>
      <div class="rpg-ui-shop-body">
        <div class="rpg-ui-shop-left">
          <div class="rpg-ui-shop-tabs"><button class="rpg-ui-shop-tab" data-active="true">Weapons</button><button class="rpg-ui-shop-tab">Armor</button><button class="rpg-ui-shop-tab">Items</button></div>
          <div class="rpg-ui-shop-content">
            <div class="rpg-ui-shop-grid">
              <button class="rpg-ui-shop-card" data-selected="true"><span class="rpg-ui-shop-card-icon">S</span><span class="rpg-ui-shop-card-name">Crystal Blade</span><span class="rpg-ui-shop-card-price">950 G</span></button>
              <button class="rpg-ui-shop-card"><span class="rpg-ui-shop-card-icon">A</span><span class="rpg-ui-shop-card-name">Ash Bow</span><span class="rpg-ui-shop-card-price">620 G</span></button>
              <button class="rpg-ui-shop-card" data-disabled="true"><span class="rpg-ui-shop-card-icon">H</span><span class="rpg-ui-shop-card-name">Hero Spear</span><span class="rpg-ui-shop-card-price">4 200 G</span></button>
            </div>
          </div>
        </div>
      </div>
    </section>
  </main>
`

export const MainMenu = () => `
  <main class="rpg-story-page">
    <section class="rpg-story-menu-shell">
      <div class="rpg-ui-main-menu-layout">
        <div class="rpg-ui-main-menu-left">
          <div class="rpg-ui-menu">
            <button class="rpg-ui-menu-item" data-selected="true">Items</button>
            <button class="rpg-ui-menu-item">Equip</button>
            <button class="rpg-ui-menu-item">Status</button>
            <button class="rpg-ui-menu-item">Save</button>
          </div>
        </div>
        <div class="rpg-ui-main-menu-right">
          <div class="rpg-ui-menu-panel">
            <div class="rpg-ui-menu-panel-header">Party</div>
            <div class="rpg-ui-main-menu-status-card">
              <div class="rpg-ui-main-menu-status-block rpg-ui-main-menu-status-block-full"><span class="rpg-ui-main-menu-section-title">Aria</span><div class="rpg-ui-main-menu-status-bar"><div class="rpg-ui-main-menu-status-bar-fill hp" style="width: 82%"></div></div></div>
              <div class="rpg-ui-main-menu-status-block"><span class="rpg-ui-main-menu-status-label">Gold</span><div class="rpg-ui-main-menu-status-value">2840</div></div>
              <div class="rpg-ui-main-menu-status-block"><span class="rpg-ui-main-menu-status-label">Time</span><div class="rpg-ui-main-menu-status-value">08:42</div></div>
            </div>
          </div>
        </div>
      </div>
    </section>
  </main>
`

export const TitleScreen = () => `
  <main class="rpg-story-page">
    <section class="rpg-story-screen">
      <div class="rpg-ui-title-screen">
        <div class="rpg-ui-title-screen-header">
          <h1 class="rpg-ui-title-screen-title">Elderfall</h1>
          <p class="rpg-ui-title-screen-subtitle">Chronicles of the Moon Gate</p>
        </div>
        <div class="rpg-ui-title-screen-menu">
          <button class="rpg-ui-title-screen-button" data-selected="true">New Game</button>
          <button class="rpg-ui-title-screen-button">Continue</button>
          <button class="rpg-ui-title-screen-button" data-disabled="true">Online</button>
        </div>
        <div class="rpg-ui-title-screen-version">v5.0</div>
      </div>
    </section>
  </main>
`

export const GameOver = () => `
  <main class="rpg-story-page">
    <section class="rpg-story-screen">
      <div class="rpg-ui-gameover-screen">
        <div class="rpg-ui-gameover-header">
          <h1 class="rpg-ui-gameover-title">Game Over</h1>
          <p class="rpg-ui-gameover-subtitle">The party has fallen.</p>
        </div>
        <div class="rpg-ui-gameover-menu">
          <button class="rpg-ui-gameover-button" data-selected="true">Retry</button>
          <button class="rpg-ui-gameover-button">Load Save</button>
          <button class="rpg-ui-gameover-button">Title Screen</button>
        </div>
      </div>
    </section>
  </main>
`
