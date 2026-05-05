export default {
  title: "Primitives"
}

export const ButtonsInputsPanels = () => `
  <main class="rpg-story-page">
    <section class="rpg-ui-window">
      <div class="rpg-ui-window-title">Primitives</div>
      <div class="rpg-story-grid">
        <div>
          <h2 class="rpg-story-panel-title">Buttons</h2>
          <div class="rpg-story-row">
            <button class="rpg-ui-btn">Default</button>
            <button class="rpg-ui-btn" data-variant="primary">Primary</button>
            <button class="rpg-ui-btn" data-variant="success">Success</button>
            <button class="rpg-ui-btn" data-variant="warning">Warning</button>
            <button class="rpg-ui-btn" data-variant="danger">Danger</button>
            <button class="rpg-ui-btn" data-disabled="true">Disabled</button>
          </div>
        </div>

        <div>
          <h2 class="rpg-story-panel-title">Inputs</h2>
          <div class="rpg-story-resource">
            <input class="rpg-ui-input" value="Aria, level 18">
            <input class="rpg-ui-input" placeholder="Character name">
            <label class="rpg-ui-checkbox">
              <input type="checkbox" checked>
              Hardcore mode
            </label>
          </div>
        </div>
      </div>
    </section>

    <section class="rpg-story-grid">
      <div class="rpg-ui-panel">
        <h2 class="rpg-story-panel-title">Panel</h2>
        <p class="rpg-story-copy">A compact surface for cards, prompts and grouped interface blocks.</p>
      </div>

      <div class="rpg-ui-window">
        <div class="rpg-ui-window-title">Window</div>
        <p class="rpg-story-copy">A framed container with a built-in title marker.</p>
      </div>
    </section>
  </main>
`

export const MenuDialogAndBars = () => `
  <main class="rpg-story-page">
    <section class="rpg-story-split">
      <div class="rpg-ui-menu">
        <div class="rpg-ui-menu-tabs">
          <button class="rpg-ui-menu-tab" data-active="true">Items</button>
          <button class="rpg-ui-menu-tab">Skills</button>
          <button class="rpg-ui-menu-tab">Quests</button>
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
        <button class="rpg-ui-menu-item" data-disabled="true">Ancient Key</button>
      </div>

      <div class="rpg-ui-dialog">
        <div class="rpg-ui-dialog-speaker">Elder Rowan</div>
        <p class="rpg-ui-dialog-text">The ruins open only when the three sigils are aligned.</p>
        <div class="rpg-ui-dialog-choices">
          <button class="rpg-ui-dialog-choice" data-selected="true">Accept the quest</button>
          <button class="rpg-ui-dialog-choice">Ask for a reward</button>
          <button class="rpg-ui-dialog-choice">Leave</button>
        </div>
      </div>
    </section>

    <section class="rpg-ui-panel">
      <h2 class="rpg-story-panel-title">Bars</h2>
      <div class="rpg-story-resource">
        <div class="rpg-ui-bar"><span class="rpg-ui-bar-label">HP</span><div class="rpg-ui-bar-fill" data-type="health" style="width: 82%"></div></div>
        <div class="rpg-ui-bar"><span class="rpg-ui-bar-label">MP</span><div class="rpg-ui-bar-fill" data-type="mana" style="width: 64%"></div></div>
        <div class="rpg-ui-bar"><span class="rpg-ui-bar-label">XP</span><div class="rpg-ui-bar-fill" data-type="xp" style="width: 48%"></div></div>
        <div class="rpg-ui-bar"><span class="rpg-ui-bar-label">STA</span><div class="rpg-ui-bar-fill" data-type="stamina" style="width: 70%"></div></div>
      </div>
    </section>
  </main>
`

export const InventoryHotbarToast = () => `
  <main class="rpg-story-page">
    <section class="rpg-story-grid">
      <div class="rpg-ui-panel">
        <h2 class="rpg-story-panel-title">Inventory</h2>
        <div class="rpg-story-inventory-grid">
          <button class="rpg-ui-inventory-slot" data-rarity="common">P</button>
          <button class="rpg-ui-inventory-slot" data-rarity="uncommon">B</button>
          <button class="rpg-ui-inventory-slot" data-rarity="rare" data-selected="true">S</button>
          <button class="rpg-ui-inventory-slot" data-rarity="epic">W</button>
          <button class="rpg-ui-inventory-slot" data-rarity="legendary">C</button>
          <button class="rpg-ui-inventory-slot" data-disabled="true">?</button>
          <button class="rpg-ui-inventory-slot"></button>
          <button class="rpg-ui-inventory-slot"></button>
        </div>
      </div>

      <div class="rpg-ui-panel">
        <h2 class="rpg-story-panel-title">Hotbar</h2>
        <div class="rpg-ui-hotbar">
          <button class="rpg-ui-hotbar-slot" data-selected="true">1</button>
          <button class="rpg-ui-hotbar-slot">2</button>
          <button class="rpg-ui-hotbar-slot">3</button>
          <button class="rpg-ui-hotbar-slot" data-disabled="true">4</button>
        </div>
      </div>

      <div class="rpg-ui-panel">
        <h2 class="rpg-story-panel-title">Toasts</h2>
        <div class="rpg-story-resource">
          <div class="rpg-ui-toast" data-type="success"><strong class="rpg-ui-toast-title">Quest updated</strong><span>Find the moon gate.</span></div>
          <div class="rpg-ui-toast" data-type="warning"><strong class="rpg-ui-toast-title">Low health</strong><span>Use a potion soon.</span></div>
        </div>
      </div>
    </section>
  </main>
`
