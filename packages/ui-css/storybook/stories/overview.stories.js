export default {
  title: "Overview/All Components"
}

export const RPGInterface = () => `
  <main class="rpg-story-page">
    <section class="rpg-ui-window">
      <div class="rpg-ui-window-title">RPG UI CSS</div>
      <div class="rpg-story-grid">
        <div>
          <h2 class="rpg-story-panel-title">Framework agnostic</h2>
          <p class="rpg-story-copy">
            Static markup using exported CSS classes, data attributes and design tokens.
          </p>
        </div>
        <div class="rpg-story-row">
          <button class="rpg-ui-btn" data-variant="primary">Primary</button>
          <button class="rpg-ui-btn" data-variant="success">Success</button>
          <button class="rpg-ui-btn" data-variant="danger">Danger</button>
        </div>
      </div>
    </section>

    <section class="rpg-story-grid">
      <div class="rpg-ui-panel">
        <h2 class="rpg-story-panel-title">Status</h2>
        <div class="rpg-story-resource">
          <div class="rpg-ui-bar"><div class="rpg-ui-bar-fill" data-type="health" style="width: 72%"></div></div>
          <div class="rpg-ui-bar"><div class="rpg-ui-bar-fill" data-type="mana" style="width: 56%"></div></div>
          <div class="rpg-ui-bar"><div class="rpg-ui-bar-fill" data-type="xp" style="width: 38%"></div></div>
        </div>
      </div>

      <div class="rpg-ui-menu">
        <div class="rpg-ui-menu-header">Command</div>
        <button class="rpg-ui-menu-item" data-selected="true">Attack</button>
        <button class="rpg-ui-menu-item">Magic</button>
        <button class="rpg-ui-menu-item">Inventory</button>
        <button class="rpg-ui-menu-item" data-disabled="true">Escape</button>
      </div>

      <div class="rpg-ui-panel">
        <h2 class="rpg-story-panel-title">Inventory</h2>
        <div class="rpg-story-inventory-grid">
          <button class="rpg-ui-inventory-slot" data-rarity="common"><span class="rpg-story-icon">P</span></button>
          <button class="rpg-ui-inventory-slot" data-rarity="uncommon"><span class="rpg-story-icon">H</span></button>
          <button class="rpg-ui-inventory-slot" data-rarity="rare" data-selected="true"><span class="rpg-story-icon">S</span></button>
          <button class="rpg-ui-inventory-slot" data-rarity="legendary"><span class="rpg-story-icon">R</span></button>
        </div>
      </div>
    </section>
  </main>
`
