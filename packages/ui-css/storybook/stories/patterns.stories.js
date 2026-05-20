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

export const MMOMockupLayout = () => `
  <main class="rpg-story-page rpg-story-page-wide">
    <section class="rpg-ui-mmo-scene">
      <div class="rpg-ui-hud">
        <div class="rpg-ui-avatar"><span>A</span><div class="rpg-ui-avatar-level">15</div></div>
        <div class="rpg-ui-status-bars">
          <strong>Adventurer</strong>
          <div class="rpg-ui-status-bar"><span class="rpg-ui-status-bar-label">HP 741 / 741</span><div class="rpg-ui-status-bar-fill" data-type="health" style="width: 100%"></div></div>
          <div class="rpg-ui-status-bar"><span class="rpg-ui-status-bar-label">SP 534 / 534</span><div class="rpg-ui-status-bar-fill" data-type="mana" style="width: 100%"></div></div>
        </div>
      </div>

      <div class="rpg-ui-top-currencies">
        <span class="rpg-ui-currency-display"><span class="rpg-ui-currency-icon">G</span><span class="rpg-ui-currency-value">15,280</span></span>
        <span class="rpg-ui-currency-display"><span class="rpg-ui-currency-icon">D</span><span class="rpg-ui-currency-value">250</span></span>
        <span class="rpg-ui-currency-display"><span class="rpg-ui-currency-icon">H</span><span class="rpg-ui-currency-value">1,250</span></span>
      </div>

      <div class="rpg-ui-icon-bar">
        <button class="rpg-ui-icon-button">FR</button>
        <button class="rpg-ui-icon-button">ML</button>
        <button class="rpg-ui-icon-button" data-alert="true" data-count="2">NT</button>
        <button class="rpg-ui-icon-button">OP</button>
      </div>

      <section class="rpg-ui-chat-panel rpg-ui-panel">
        <div class="rpg-ui-chat-tabs"><span class="rpg-ui-chat-tab" data-active="true">General</span><span class="rpg-ui-chat-tab">Guild</span><span class="rpg-ui-chat-tab">Party</span></div>
        <div class="rpg-ui-chat-lines">
          <div class="rpg-ui-chat-line"><span class="rpg-ui-chat-time">[14:32]</span><span class="rpg-ui-chat-name">Lina</span>: Hello everyone.</div>
          <div class="rpg-ui-chat-line"><span class="rpg-ui-chat-time">[14:33]</span><span class="rpg-ui-chat-name">Elara</span>: On my way.</div>
          <div class="rpg-ui-chat-line"><span class="rpg-ui-chat-time">[14:35]</span><span class="rpg-ui-chat-name">System</span>: Welcome to Luminara Online.</div>
        </div>
        <div class="rpg-ui-chat-input">Press Enter to chat... <span class="rpg-ui-chat-send">GO</span></div>
      </section>

      <section class="rpg-ui-main-menu">
        <div class="rpg-ui-main-menu-layout">
          <nav class="rpg-ui-main-menu-left rpg-ui-menu rpg-ui-panel">
            <div class="rpg-ui-menu-header">Main</div>
            <div class="rpg-ui-main-menu-list">
              <button class="rpg-ui-menu-item" data-selected="true"><span class="rpg-ui-menu-row"><span class="rpg-ui-menu-row-main"><span class="rpg-ui-menu-row-icon">H</span><span>Overview</span></span></span></button>
              <button class="rpg-ui-menu-item"><span class="rpg-ui-menu-row"><span class="rpg-ui-menu-row-main"><span class="rpg-ui-menu-row-icon">B</span><span>Inventory</span></span></span></button>
              <button class="rpg-ui-menu-item"><span class="rpg-ui-menu-row"><span class="rpg-ui-menu-row-main"><span class="rpg-ui-menu-row-icon">S</span><span>Skills</span></span></span></button>
              <button class="rpg-ui-menu-item"><span class="rpg-ui-menu-row"><span class="rpg-ui-menu-row-main"><span class="rpg-ui-menu-row-icon">E</span><span>Equipment</span></span></span></button>
              <button class="rpg-ui-menu-item"><span class="rpg-ui-menu-row"><span class="rpg-ui-menu-row-main"><span class="rpg-ui-menu-row-icon">Q</span><span>Quests</span></span></span></button>
              <button class="rpg-ui-menu-item"><span class="rpg-ui-menu-row"><span class="rpg-ui-menu-row-main"><span class="rpg-ui-menu-row-icon">X</span><span>Logout</span></span></span></button>
            </div>
          </nav>
          <div class="rpg-ui-main-menu-right">
            <div class="rpg-ui-main-menu-dashboard rpg-ui-panel">
              <div class="rpg-ui-main-menu-title">Main Menu</div>
              <div class="rpg-ui-main-menu-dashboard-grid">
                <section class="rpg-ui-main-menu-card rpg-ui-main-menu-character-card">
                  <div class="rpg-ui-main-menu-section-title">Character Overview</div>
                  <div class="rpg-ui-main-menu-character">
                    <div class="rpg-ui-main-menu-portrait"><div class="rpg-ui-main-menu-portrait-avatar">A</div><div class="rpg-ui-main-menu-portrait-level">15</div></div>
                    <div class="rpg-ui-main-menu-character-info">
                      <div class="rpg-ui-main-menu-character-name">Adventurer</div>
                      <div class="rpg-ui-main-menu-character-meta">Level 15</div>
                      <div class="rpg-ui-main-menu-vitals">
                        <div class="rpg-ui-main-menu-vital-row"><span>EXP 2,458 / 5,000</span><div class="rpg-ui-main-menu-status-bar"><div class="rpg-ui-main-menu-status-bar-fill" data-type="experience" style="width: 49%"></div></div></div>
                        <div class="rpg-ui-main-menu-status-bar"><span class="rpg-ui-main-menu-status-bar-label">HP 741 / 741</span><div class="rpg-ui-main-menu-status-bar-fill" data-type="health" style="width: 100%"></div></div>
                        <div class="rpg-ui-main-menu-status-bar"><span class="rpg-ui-main-menu-status-bar-label">SP 534 / 534</span><div class="rpg-ui-main-menu-status-bar-fill" data-type="mana" style="width: 100%"></div></div>
                      </div>
                    </div>
                  </div>
                  <div class="rpg-ui-main-menu-currency-grid">
                    <div class="rpg-ui-main-menu-currency"><span class="rpg-ui-main-menu-currency-icon">G</span><span><span class="rpg-ui-main-menu-currency-label">Gold</span><strong>15,280</strong></span></div>
                    <div class="rpg-ui-main-menu-currency"><span class="rpg-ui-main-menu-currency-icon">H</span><span><span class="rpg-ui-main-menu-currency-label">Honor</span><strong>1,250</strong></span></div>
                  </div>
                </section>
                <section class="rpg-ui-main-menu-card rpg-ui-main-menu-stats-card">
                  <div class="rpg-ui-main-menu-section-title">Stats</div>
                  <div class="rpg-ui-main-menu-params">
                    <div class="rpg-ui-main-menu-param"><span>ATK</span><span>10</span></div>
                    <div class="rpg-ui-main-menu-param"><span>PDEF</span><span>10</span></div>
                    <div class="rpg-ui-main-menu-param"><span>SDEF</span><span>0</span></div>
                    <div class="rpg-ui-main-menu-param"><span>STR</span><span>67</span></div>
                    <div class="rpg-ui-main-menu-param"><span>DEX</span><span>54</span></div>
                    <div class="rpg-ui-main-menu-param"><span>INT</span><span>36</span></div>
                    <div class="rpg-ui-main-menu-param"><span>AGI</span><span>58</span></div>
                  </div>
                </section>
                <section class="rpg-ui-main-menu-card rpg-ui-main-menu-equipment-card"><div class="rpg-ui-main-menu-section-title">Equipment</div><div class="rpg-ui-main-menu-equipment-grid">${Array.from({ length: 10 }).map((_, index) => `<div class="rpg-ui-main-menu-equipment-slot" data-empty="${index > 7 ? "true" : "false"}">${index > 7 ? "" : index + 1}</div>`).join("")}</div></section>
                <section class="rpg-ui-main-menu-card rpg-ui-main-menu-activity-card"><div class="rpg-ui-main-menu-section-title">Recent Activity</div><div class="rpg-ui-main-menu-activity-list"><div class="rpg-ui-main-menu-activity-row"><span><strong>Crystal Blade</strong><small>Equipped weapon</small></span><span class="rpg-ui-main-menu-activity-meta">gear</span></div><div class="rpg-ui-main-menu-activity-row"><span><strong>Fire Slash</strong><small>Learned skill</small></span><span class="rpg-ui-main-menu-activity-meta">SP 10</span></div></div></section>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section class="rpg-ui-minimap-panel rpg-ui-panel"><div class="rpg-ui-minimap-title"><span>Luminara Island</span><span>&gt;</span></div><div class="rpg-ui-minimap-view"><span class="rpg-ui-minimap-marker" style="left: 55%; top: 48%"></span></div></section>
      <section class="rpg-ui-quest-tracker rpg-ui-panel"><div class="rpg-ui-quest-tracker-title">Quests</div><div class="rpg-ui-quest-list"><article class="rpg-ui-quest-card" data-state="tracked"><div><h4 class="rpg-ui-quest-title">Lost Harvest</h4><p class="rpg-ui-quest-desc">Talk to Lina the farmer.</p></div></article><article class="rpg-ui-quest-card"><div><h4 class="rpg-ui-quest-title">Village Defense</h4><p class="rpg-ui-quest-desc">Defeat 0/10 Slimes.</p></div></article></div></section>
      <div class="rpg-ui-bottom-hotbar"><div class="rpg-ui-hotbar"><div class="rpg-ui-hotbar-track">${Array.from({ length: 10 }).map((_, index) => `<button class="rpg-ui-hotbar-slot" data-selected="${index === 0 ? "true" : "false"}"><span class="rpg-ui-hotbar-key">${index === 9 ? 0 : index + 1}</span>${index < 6 ? index + 1 : ""}</button>`).join("")}</div></div></div>
      <div class="rpg-ui-quick-actions"><div class="rpg-ui-quick-action"><span class="rpg-ui-quick-action-icon">P</span><span>Character</span></div><div class="rpg-ui-quick-action"><span class="rpg-ui-quick-action-icon">B</span><span>Inventory</span></div><div class="rpg-ui-quick-action"><span class="rpg-ui-quick-action-icon">S</span><span>Skills</span></div><div class="rpg-ui-quick-action"><span class="rpg-ui-quick-action-icon">M</span><span>Shop</span></div></div>
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
