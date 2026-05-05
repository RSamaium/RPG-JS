export default {
  title: "Patterns"
}

export const HUD = () => `
  <main class="rpg-story-page">
    <section class="rpg-story-stage">
      <div class="rpg-ui-hud">
        <div class="rpg-ui-avatar">
          <span>R</span>
          <div class="rpg-ui-avatar-level">24</div>
        </div>
        <div class="rpg-ui-status-bars">
          <div class="rpg-ui-status-bar">
            <span class="rpg-ui-status-bar-label">HP 1820 / 2400</span>
            <div class="rpg-ui-status-bar-fill" data-type="health" style="width: 76%"></div>
          </div>
          <div class="rpg-ui-status-bar">
            <span class="rpg-ui-status-bar-label">MP 530 / 840</span>
            <div class="rpg-ui-status-bar-fill" data-type="mana" style="width: 63%"></div>
          </div>
        </div>
      </div>

      <div class="rpg-ui-minimap">
        <div class="rpg-ui-minimap-marker" style="left: 44%; top: 52%"></div>
      </div>

      <div class="rpg-ui-dock">
        <button class="rpg-ui-dock-slot" data-selected="true">S</button>
        <button class="rpg-ui-dock-slot">P<span class="rpg-ui-dock-slot-qty">5</span></button>
        <button class="rpg-ui-dock-slot">M<span class="rpg-ui-dock-slot-qty">2</span></button>
        <button class="rpg-ui-dock-slot" data-disabled="true">?</button>
      </div>

      <button class="rpg-ui-fab">ATK</button>
    </section>
  </main>
`

export const Shop = () => `
  <main class="rpg-story-page">
    <section class="rpg-ui-shop">
      <div class="rpg-ui-shop-header">
        <div class="rpg-ui-shop-merchant">
          <div class="rpg-ui-shop-merchant-avatar">M</div>
          <div class="rpg-ui-shop-merchant-info">
            <h2>Mira's Forge</h2>
            <p>Reliable steel for uncertain roads.</p>
          </div>
        </div>
        <div class="rpg-ui-shop-gold">2 840 G</div>
      </div>

      <div class="rpg-ui-shop-body">
        <div class="rpg-ui-shop-left">
          <div class="rpg-ui-shop-tabs">
            <button class="rpg-ui-shop-tab" data-active="true">Weapons</button>
            <button class="rpg-ui-shop-tab">Armor</button>
            <button class="rpg-ui-shop-tab">Items</button>
          </div>

          <div class="rpg-ui-shop-content">
            <div class="rpg-ui-shop-grid">
              <button class="rpg-ui-shop-card" data-selected="true">
                <span class="rpg-ui-shop-card-icon">S</span>
                <span class="rpg-ui-shop-card-name">Crystal Blade</span>
                <span class="rpg-ui-shop-card-price">950 G</span>
                <span class="rpg-ui-shop-card-tag">Equipped</span>
              </button>
              <button class="rpg-ui-shop-card">
                <span class="rpg-ui-shop-card-icon">A</span>
                <span class="rpg-ui-shop-card-name">Ash Bow</span>
                <span class="rpg-ui-shop-card-price">620 G</span>
              </button>
              <button class="rpg-ui-shop-card" data-disabled="true">
                <span class="rpg-ui-shop-card-icon">H</span>
                <span class="rpg-ui-shop-card-name">Hero Spear</span>
                <span class="rpg-ui-shop-card-price">4 200 G</span>
              </button>
            </div>

            <aside class="rpg-ui-shop-details">
              <div class="rpg-ui-shop-details-header">
                <div class="rpg-ui-shop-details-icon">S</div>
                <div>
                  <h2>Crystal Blade</h2>
                  <p>Rare one-hand sword</p>
                </div>
              </div>
              <p class="rpg-ui-shop-details-desc">A light blade forged for fast melee attacks.</p>
              <div class="rpg-ui-shop-stats">
                <div class="rpg-ui-shop-stat"><span>Attack</span><strong data-type="positive">+18</strong></div>
                <div class="rpg-ui-shop-stat"><span>Speed</span><strong data-type="positive">+4</strong></div>
                <div class="rpg-ui-shop-stat"><span>Defense</span><strong data-type="negative">-2</strong></div>
              </div>
              <div class="rpg-ui-shop-actions">
                <button class="rpg-ui-shop-btn">Buy</button>
                <button class="rpg-ui-shop-btn" data-variant="secondary">Compare</button>
              </div>
            </aside>
          </div>
        </div>
      </div>
    </section>
  </main>
`

export const SaveLoadAndMenus = () => `
  <main class="rpg-story-page">
    <section class="rpg-story-grid">
      <div class="rpg-ui-save-load">
        <div class="rpg-ui-save-load-header">Load Game</div>
        <button class="rpg-ui-save-load-slot" data-selected="true">
          <span class="rpg-ui-save-load-slot-title">Slot 1 - Moon Gate</span>
          <span class="rpg-ui-save-load-slot-meta">Lv. 24 - 08:42</span>
        </button>
        <button class="rpg-ui-save-load-slot">
          <span class="rpg-ui-save-load-slot-title">Slot 2 - Old Harbor</span>
          <span class="rpg-ui-save-load-slot-meta">Lv. 16 - 04:10</span>
        </button>
        <button class="rpg-ui-save-load-slot" data-empty="true">Empty slot</button>
      </div>

      <div class="rpg-ui-main-menu">
        <div class="rpg-ui-main-menu-header">
          <h2>Party</h2>
          <span>2 840 G</span>
        </div>
        <div class="rpg-ui-main-menu-status">
          <div class="rpg-ui-main-menu-status-block rpg-ui-main-menu-status-block-full">
            <span class="rpg-ui-main-menu-section-title">Aria</span>
            <div class="rpg-ui-bar"><div class="rpg-ui-bar-fill" data-type="health" style="width: 80%"></div></div>
          </div>
          <div class="rpg-ui-main-menu-stat"><span>ATK</span><strong data-type="positive">42</strong></div>
          <div class="rpg-ui-main-menu-stat"><span>DEF</span><strong>31</strong></div>
        </div>
      </div>
    </section>
  </main>
`

export const TitleAndGameOver = () => `
  <main class="rpg-story-page">
    <section class="rpg-story-grid">
      <div class="rpg-ui-title-screen">
        <h1 class="rpg-ui-title-screen-title">Elderfall</h1>
        <p class="rpg-ui-title-screen-subtitle">Chronicles of the Moon Gate</p>
        <div class="rpg-ui-title-screen-menu">
          <button class="rpg-ui-title-screen-button" data-selected="true">New Game</button>
          <button class="rpg-ui-title-screen-button">Continue</button>
          <button class="rpg-ui-title-screen-button" data-disabled="true">Online</button>
        </div>
      </div>

      <div class="rpg-ui-gameover-screen">
        <h1 class="rpg-ui-gameover-title">Game Over</h1>
        <p class="rpg-ui-gameover-subtitle">The party has fallen in the deep woods.</p>
        <div class="rpg-ui-gameover-menu">
          <button class="rpg-ui-gameover-button" data-selected="true">Retry</button>
          <button class="rpg-ui-gameover-button">Load Save</button>
          <button class="rpg-ui-gameover-button">Title Screen</button>
        </div>
      </div>
    </section>
  </main>
`
