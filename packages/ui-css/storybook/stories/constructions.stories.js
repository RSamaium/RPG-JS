export default {
  title: "Constructions"
}

export const DialogBox = () => `
  <main class="rpg-story-page">
    <section class="rpg-story-stage">
      <div class="rpg-ui-dialog-container" data-position="bottom" data-full-width="false">
        <div class="rpg-ui-dialog rpg-story-dialog">
          <div class="rpg-ui-dialog-speaker">King Loric</div>
          <div class="rpg-ui-dialog-body">
            <div class="rpg-ui-dialog-face">NPC</div>
            <div class="rpg-ui-dialog-content">
              Brave traveler, the northern bridge is sealed by old magic. Will you carry the crest to the shrine?
              <div class="rpg-ui-dialog-choices">
                <button class="rpg-ui-dialog-choice" data-selected="true">Yes, my king</button>
                <button class="rpg-ui-dialog-choice">Tell me more</button>
                <button class="rpg-ui-dialog-choice">Not yet</button>
              </div>
            </div>
          </div>
          <div class="rpg-ui-dialog-indicator"></div>
        </div>
      </div>
    </section>
  </main>
`

export const CommandMenu = () => `
  <main class="rpg-story-page">
    <section class="rpg-story-battle">
      <div class="rpg-story-enemy">SLIME</div>
      <div class="rpg-story-party-row">
        <div class="rpg-ui-character-card">
          <div class="rpg-ui-character-card-header">
            <div class="rpg-ui-character-card-avatar">A</div>
            <div class="rpg-ui-character-card-info">
              <div class="rpg-ui-character-card-name">Aria <span class="rpg-ui-character-card-level">24</span></div>
              <div class="rpg-ui-character-card-class">Hero</div>
            </div>
          </div>
          <div class="rpg-story-resource">
            <div class="rpg-ui-bar" data-type="health"><span class="rpg-ui-bar-label">HP</span><div class="rpg-ui-bar-fill" style="width: 78%"></div></div>
            <div class="rpg-ui-bar" data-type="mana"><span class="rpg-ui-bar-label">MP</span><div class="rpg-ui-bar-fill" style="width: 52%"></div></div>
          </div>
        </div>

        <div class="rpg-ui-menu">
          <div class="rpg-ui-menu-header">Command</div>
          <button class="rpg-ui-menu-item" data-selected="true">Attack</button>
          <button class="rpg-ui-menu-item">Spell</button>
          <button class="rpg-ui-menu-item">Item</button>
          <button class="rpg-ui-menu-item">Defend</button>
        </div>
      </div>
    </section>
  </main>
`

export const HUD = () => `
  <main class="rpg-story-page">
    <section class="rpg-story-stage">
      <div class="rpg-ui-hud">
        <div class="rpg-ui-avatar"><span>A</span><div class="rpg-ui-avatar-level">24</div></div>
        <div class="rpg-ui-status-bars">
          <div class="rpg-ui-status-bar"><span class="rpg-ui-status-bar-label">HP 1820 / 2400</span><div class="rpg-ui-status-bar-fill" data-type="health" style="width: 76%"></div></div>
          <div class="rpg-ui-status-bar"><span class="rpg-ui-status-bar-label">MP 530 / 840</span><div class="rpg-ui-status-bar-fill" data-type="mana" style="width: 63%"></div></div>
        </div>
      </div>
      <div class="rpg-ui-minimap"><div class="rpg-ui-minimap-marker" style="left: 44%; top: 52%"></div></div>
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

export const InventoryMenu = () => `
  <main class="rpg-story-page">
    <section class="rpg-story-split">
      <div class="rpg-ui-menu">
        <div class="rpg-ui-menu-tabs">
          <button class="rpg-ui-menu-tab" data-active="true">Items</button>
          <button class="rpg-ui-menu-tab">Gear</button>
          <button class="rpg-ui-menu-tab">Key</button>
        </div>
        <button class="rpg-ui-menu-item" data-selected="true">Hi-Potion <span class="rpg-ui-menu-row-end">x8</span></button>
        <button class="rpg-ui-menu-item">Antidote <span class="rpg-ui-menu-row-end">x3</span></button>
        <button class="rpg-ui-menu-item">Moon Crest <span class="rpg-ui-menu-row-end">x1</span></button>
      </div>
      <div class="rpg-ui-window">
        <div class="rpg-ui-window-title">Bag</div>
        <div class="rpg-ui-inventory rpg-story-inventory-wide">
          <button class="rpg-ui-inventory-slot" data-rarity="common" data-selected="true">P<span class="rpg-ui-inventory-slot-quantity">8</span></button>
          <button class="rpg-ui-inventory-slot" data-rarity="uncommon">A<span class="rpg-ui-inventory-slot-quantity">3</span></button>
          <button class="rpg-ui-inventory-slot" data-rarity="rare">C</button>
          <button class="rpg-ui-inventory-slot" data-rarity="legendary">M</button>
          <button class="rpg-ui-inventory-slot"></button>
          <button class="rpg-ui-inventory-slot"></button>
        </div>
        <p class="rpg-story-copy">Restores 120 HP to one ally.</p>
      </div>
    </section>
  </main>
`

export const EquipmentMenu = () => `
  <main class="rpg-story-page">
    <section class="rpg-story-split">
      <div class="rpg-ui-character-card">
        <div class="rpg-ui-character-card-header">
          <div class="rpg-ui-character-card-avatar">A</div>
          <div class="rpg-ui-character-card-info">
            <div class="rpg-ui-character-card-name">Aria <span class="rpg-ui-character-card-level">24</span></div>
            <div class="rpg-ui-character-card-class">Swordmaster</div>
          </div>
        </div>
        <div class="rpg-story-stats">
          <div class="rpg-ui-equip-stat"><span>Attack</span><strong>42</strong></div>
          <div class="rpg-ui-equip-stat"><span>Defense</span><strong>31</strong></div>
          <div class="rpg-ui-equip-stat"><span>Speed</span><strong>21</strong></div>
        </div>
      </div>
      <div class="rpg-ui-menu-panel">
        <div class="rpg-ui-menu-panel-header">Equip weapon</div>
        <div class="rpg-ui-menu-panel-body">
          <div class="rpg-ui-menu">
            <button class="rpg-ui-menu-item" data-selected="true">Crystal Blade</button>
            <button class="rpg-ui-menu-item">Iron Sword</button>
            <button class="rpg-ui-menu-item" data-disabled="true">Hero Spear</button>
          </div>
          <div class="rpg-ui-menu-panel-details">
            <div class="rpg-ui-menu-panel-details-title">Crystal Blade</div>
            <div class="rpg-ui-menu-panel-details-desc">A light blade forged for fast melee attacks.</div>
            <div class="rpg-ui-equip-stats">
              <div class="rpg-ui-equip-stat" data-type="positive"><span>Attack</span><strong>+18</strong><span class="rpg-ui-equip-stat-current">42 -> 60</span></div>
              <div class="rpg-ui-equip-stat" data-type="negative"><span>Defense</span><strong>-2</strong><span class="rpg-ui-equip-stat-current">31 -> 29</span></div>
            </div>
          </div>
        </div>
      </div>
    </section>
  </main>
`

export const PremiumCharacterMenu = () => `
  <main class="rpg-story-page">
    <section class="rpg-ui-window rpg-story-premium-menu">
      <div class="rpg-ui-window-title">Camp Menu</div>

      <nav class="rpg-story-premium-nav">
        <button class="rpg-ui-menu-item" data-selected="true"><span class="rpg-story-nav-icon">C</span>Character</button>
        <button class="rpg-ui-menu-item"><span class="rpg-story-nav-icon">I</span>Inventory</button>
        <button class="rpg-ui-menu-item"><span class="rpg-story-nav-icon">S</span>Skills</button>
        <button class="rpg-ui-menu-item"><span class="rpg-story-nav-icon">Q</span>Quests</button>
        <button class="rpg-ui-menu-item"><span class="rpg-story-nav-icon">M</span>Map</button>
      </nav>

      <section class="rpg-story-premium-hero">
        <div class="rpg-story-premium-portrait">A</div>
        <div class="rpg-story-premium-identity">
          <span class="rpg-story-kicker">Moon Order</span>
          <h2>Aria Valen</h2>
          <p>Lv. 24 Swordmaster</p>
        </div>
        <div class="rpg-story-premium-currency">
          <span>Gold</span>
          <strong>2 840</strong>
        </div>
      </section>

      <section class="rpg-story-premium-vitals">
        <div>
          <span class="rpg-story-stat-label">Health</span>
          <div class="rpg-ui-bar" data-type="health"><span class="rpg-ui-bar-label">1820 / 2400</span><div class="rpg-ui-bar-fill" style="width: 76%"></div></div>
        </div>
        <div>
          <span class="rpg-story-stat-label">Mana</span>
          <div class="rpg-ui-bar" data-type="mana"><span class="rpg-ui-bar-label">530 / 840</span><div class="rpg-ui-bar-fill" style="width: 63%"></div></div>
        </div>
        <div>
          <span class="rpg-story-stat-label">Experience</span>
          <div class="rpg-ui-bar" data-type="experience"><span class="rpg-ui-bar-label">42%</span><div class="rpg-ui-bar-fill" style="width: 42%"></div></div>
        </div>
      </section>

      <section class="rpg-story-premium-grid">
        <div class="rpg-story-premium-card">
          <h3>Attributes</h3>
          <div class="rpg-story-stat-line"><span>Attack</span><strong>60</strong></div>
          <div class="rpg-story-stat-line"><span>Defense</span><strong>29</strong></div>
          <div class="rpg-story-stat-line"><span>Speed</span><strong>25</strong></div>
          <div class="rpg-story-stat-line"><span>Spirit</span><strong>34</strong></div>
        </div>

        <div class="rpg-story-premium-card">
          <h3>Equipment</h3>
          <div class="rpg-story-loadout">
            <span class="rpg-ui-inventory-slot" data-rarity="rare">S</span>
            <span><strong>Crystal Blade</strong><small>+18 Attack, +4 Speed</small></span>
          </div>
          <div class="rpg-story-loadout">
            <span class="rpg-ui-inventory-slot" data-rarity="uncommon">A</span>
            <span><strong>Traveler Coat</strong><small>Light armor</small></span>
          </div>
        </div>

        <div class="rpg-story-premium-card rpg-story-premium-card-wide">
          <h3>Active Quest</h3>
          <p class="rpg-story-copy">Carry the royal crest to the northern shrine before nightfall.</p>
          <div class="rpg-story-quest-progress"><span style="width: 68%"></span></div>
          <div class="rpg-story-stat-line"><span>Progress</span><strong>68%</strong></div>
        </div>
      </section>
    </section>
  </main>
`

export const CharacterStatusDeluxe = () => `
  <main class="rpg-story-page">
    <section class="rpg-ui-window rpg-story-deluxe-status">
      <div class="rpg-ui-window-title">Status</div>

      <aside class="rpg-story-deluxe-sidebar">
        <div class="rpg-story-party-card" data-selected="true">
          <div class="rpg-story-party-avatar">A</div>
          <span><strong>Aria Valen</strong><small>Lv. 24 Swordmaster</small></span>
        </div>
        <div class="rpg-story-party-card">
          <div class="rpg-story-party-avatar">N</div>
          <span><strong>Nox</strong><small>Lv. 23 Arcanist</small></span>
        </div>
        <div class="rpg-story-party-card">
          <div class="rpg-story-party-avatar">L</div>
          <span><strong>Luma</strong><small>Lv. 22 Ranger</small></span>
        </div>
      </aside>

      <section class="rpg-story-deluxe-focus">
        <div class="rpg-story-deluxe-hero">
          <div>
            <span class="rpg-story-kicker">Moon Order Captain</span>
            <h2 class="rpg-story-deluxe-name">Aria Valen</h2>
            <p class="rpg-story-copy">Frontline duelist with high speed and counter stance mastery.</p>
          </div>
          <div class="rpg-story-deluxe-emblem">A</div>
        </div>

        <div class="rpg-story-deluxe-bars">
          <div><span class="rpg-story-stat-label">Health</span><div class="rpg-ui-bar" data-type="health"><span class="rpg-ui-bar-label">1820 / 2400</span><div class="rpg-ui-bar-fill" style="width: 76%"></div></div></div>
          <div><span class="rpg-story-stat-label">Mana</span><div class="rpg-ui-bar" data-type="mana"><span class="rpg-ui-bar-label">530 / 840</span><div class="rpg-ui-bar-fill" style="width: 63%"></div></div></div>
          <div><span class="rpg-story-stat-label">Experience</span><div class="rpg-ui-bar" data-type="experience"><span class="rpg-ui-bar-label">42%</span><div class="rpg-ui-bar-fill" style="width: 42%"></div></div></div>
        </div>

        <div class="rpg-story-deluxe-grid">
          <div class="rpg-story-premium-card">
            <h3>Core Stats</h3>
            <div class="rpg-story-stat-line" data-emphasis="true"><span>Power Rating</span><strong>684</strong></div>
            <div class="rpg-story-stat-line"><span>Attack</span><strong>60</strong></div>
            <div class="rpg-story-stat-line"><span>Defense</span><strong>29</strong></div>
            <div class="rpg-story-stat-line"><span>Speed</span><strong>25</strong></div>
          </div>
          <div class="rpg-story-premium-card">
            <h3>Traits</h3>
            <div class="rpg-story-chip-row">
              <span class="rpg-story-chip">Counter +12%</span>
              <span class="rpg-story-chip">Blade Arts</span>
              <span class="rpg-story-chip">Moon Guard</span>
              <span class="rpg-story-chip">Ice Resist</span>
            </div>
          </div>
        </div>

        <div class="rpg-story-help-strip">Confirm: Equip / Cancel: Back / L-R: Switch character</div>
      </section>

      <aside class="rpg-story-deluxe-detail">
        <div class="rpg-story-premium-card">
          <h3>Equipment</h3>
          <div class="rpg-story-loadout"><span class="rpg-ui-inventory-slot" data-rarity="rare">S</span><span><strong>Crystal Blade</strong><small>+18 Attack, +4 Speed</small></span></div>
          <div class="rpg-story-loadout"><span class="rpg-ui-inventory-slot" data-rarity="uncommon">A</span><span><strong>Traveler Coat</strong><small>Light armor</small></span></div>
          <div class="rpg-story-loadout"><span class="rpg-ui-inventory-slot" data-rarity="epic">R</span><span><strong>Lunar Ring</strong><small>Mana recovery</small></span></div>
        </div>
        <div class="rpg-story-premium-card">
          <h3>Next Skill</h3>
          <p class="rpg-story-copy">Moon Splitter unlocks after 2 more swordmaster marks.</p>
          <div class="rpg-story-quest-progress"><span style="width: 72%"></span></div>
          <div class="rpg-story-stat-line"><span>Training</span><strong>72%</strong></div>
        </div>
      </aside>
    </section>
  </main>
`

export const Shop = () => `
  <main class="rpg-story-page rpg-story-shop-page">
    <section class="rpg-ui-shop rpg-story-shop-embed">
      <div class="rpg-ui-shop-header">
        <div class="rpg-ui-shop-merchant">
          <div class="rpg-ui-shop-merchant-avatar">M</div>
          <div class="rpg-ui-shop-merchant-info"><h2>Mira's Forge</h2><p>Reliable steel for uncertain roads.</p></div>
        </div>
        <div class="rpg-ui-shop-gold">2 840 G</div>
      </div>
      <div class="rpg-ui-shop-body">
        <div class="rpg-ui-shop-left">
          <div class="rpg-ui-shop-tabs"><button class="rpg-ui-shop-tab" data-active="true">Weapons</button><button class="rpg-ui-shop-tab">Armor</button><button class="rpg-ui-shop-tab">Items</button></div>
          <div class="rpg-ui-shop-content">
            <div class="rpg-ui-shop-grid">
              <button class="rpg-ui-shop-card" data-selected="true"><span class="rpg-ui-shop-card-icon">S</span><span class="rpg-ui-shop-card-name">Crystal Blade</span><span class="rpg-ui-shop-card-price">950 G</span><span class="rpg-ui-shop-card-tag">Equipped</span></button>
              <button class="rpg-ui-shop-card"><span class="rpg-ui-shop-card-icon">A</span><span class="rpg-ui-shop-card-name">Ash Bow</span><span class="rpg-ui-shop-card-price">620 G</span></button>
              <button class="rpg-ui-shop-card" data-disabled="true"><span class="rpg-ui-shop-card-icon">H</span><span class="rpg-ui-shop-card-name">Hero Spear</span><span class="rpg-ui-shop-card-price">4 200 G</span></button>
            </div>
            <aside class="rpg-ui-shop-details">
              <div class="rpg-ui-shop-details-header"><div class="rpg-ui-shop-details-icon">S</div><div><h2>Crystal Blade</h2><p>Rare one-hand sword</p></div></div>
              <p class="rpg-ui-shop-details-desc">A light blade forged for fast melee attacks.</p>
              <div class="rpg-ui-shop-stats">
                <div class="rpg-ui-shop-stat"><span>Attack</span><strong data-type="positive">+18</strong></div>
                <div class="rpg-ui-shop-stat"><span>Speed</span><strong data-type="positive">+4</strong></div>
                <div class="rpg-ui-shop-stat"><span>Defense</span><strong data-type="negative">-2</strong></div>
              </div>
              <div class="rpg-ui-shop-actions"><button class="rpg-ui-shop-btn">Buy</button><button class="rpg-ui-shop-btn" data-variant="secondary">Compare</button></div>
            </aside>
          </div>
        </div>
      </div>
    </section>
  </main>
`

export const SaveLoad = () => `
  <main class="rpg-story-page">
    <section class="rpg-story-screen-menu">
      <div class="rpg-ui-save-load">
        <div class="rpg-ui-save-load-header">
          <div class="rpg-ui-save-load-title">Adventure Log</div>
          <div class="rpg-ui-save-load-subtitle">Select a file to continue.</div>
        </div>
        <div class="rpg-ui-save-load-list">
          <button class="rpg-ui-save-load-slot" data-selected="true"><span class="rpg-ui-save-load-slot-index">Slot 1</span><span class="rpg-ui-save-load-slot-meta"><span class="rpg-ui-save-load-slot-line">Moon Gate</span><span class="rpg-ui-save-load-slot-line">Lv. 24 - 08:42</span></span></button>
          <button class="rpg-ui-save-load-slot"><span class="rpg-ui-save-load-slot-index">Slot 2</span><span class="rpg-ui-save-load-slot-meta"><span class="rpg-ui-save-load-slot-line">Old Harbor</span><span class="rpg-ui-save-load-slot-line">Lv. 16 - 04:10</span></span></button>
          <button class="rpg-ui-save-load-slot" data-empty="true"><span class="rpg-ui-save-load-slot-empty">Empty slot</span></button>
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
          <button class="rpg-ui-title-screen-button">Settings</button>
        </div>
      </div>
    </section>
  </main>
`
