<template>
  <div class="trading-gui" v-if="isOpen">
    <div class="trading-header">
      <h3>Market - {{ npcName }}</h3>
      <div v-if="reputation" class="reputation-badge" :class="reputation.level.toLowerCase()">
        {{ reputation.level }} ({{ reputation.score }})
      </div>
      <button @click="close" class="close-btn">X</button>
    </div>
    <div class="trading-content">
      <div class="item-list">
        <div v-for="(item, index) in items" :key="index" class="item-row">
          <span class="item-name">{{ item.name }}</span>
          <span class="item-price">{{ item.price }} Gold</span>
          <div class="actions">
            <button @click="buy(item)" class="buy-btn">Buy</button>
            <button @click="sell(item)" class="sell-btn">Sell</button>
          </div>
        </div>
      </div>
    </div>
    <div class="trading-footer">
      <span>Your Gold: {{ gold }}</span>
    </div>
  </div>
</template>

<script>
export default {
  name: 'TradingGui',
  inject: ['rpgGuiInteraction', 'rpgSocket'],
  data() {
    return {
      isOpen: false,
      npcName: 'Merchant',
      items: [],
      gold: 0,
      reputation: null
    }
  },
  mounted() {
    this.rpgGuiInteraction('trading-gui', (data) => {
      if (data.open !== undefined) this.isOpen = data.open;
      if (data.npcName) this.npcName = data.npcName;
      if (data.items) this.items = data.items;
      if (data.gold !== undefined) this.gold = data.gold;
      if (data.reputation) this.reputation = data.reputation;
    });
  },
  methods: {
    buy(item) {
      this.rpgSocket().emit('player.trade', { itemId: item.id, type: 'buy' });
    },
    sell(item) {
      this.rpgSocket().emit('player.trade', { itemId: item.id, type: 'sell' });
    },
    close() {
      this.isOpen = false;
      this.rpgSocket().emit('player.trade.close');
    }
  }
}
</script>

<style scoped>
.trading-gui {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 320px;
  max-width: 90vw;
  background: rgba(0, 0, 0, 0.85);
  color: white;
  border-radius: 10px;
  border: 2px solid #fbc02d;
  padding: 15px;
  font-family: 'Inter', sans-serif;
  pointer-events: auto;
  box-shadow: 0 0 20px rgba(0,0,0,0.5);
}

.trading-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid rgba(255, 255, 255, 0.2);
  padding-bottom: 10px;
  margin-bottom: 15px;
}

h3 { margin: 0; font-size: 18px; color: #fbc02d; }

.close-btn {
  background: #f44336;
  border: none;
  color: white;
  padding: 5px 10px;
  border-radius: 5px;
  cursor: pointer;
}

.reputation-badge {
  font-size: 10px;
  padding: 2px 6px;
  border-radius: 10px;
  background: #444;
  text-transform: uppercase;
  font-weight: bold;
}

.reputation-badge.exalted { background: #4caf50; color: white; }
.reputation-badge.friendly { background: #8bc34a; color: white; }
.reputation-badge.hated { background: #f44336; color: white; }
.reputation-badge.hostile { background: #ff5722; color: white; }
.reputation-badge.neutral { background: #9e9e9e; color: white; }

.item-list {
  max-height: 200px;
  overflow-y: auto;
}

.item-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.item-name { flex-grow: 1; font-size: 14px; }
.item-price { margin: 0 10px; font-weight: bold; color: #ffeb3b; }

.actions button {
  padding: 4px 8px;
  margin-left: 5px;
  border: none;
  border-radius: 3px;
  cursor: pointer;
  font-size: 12px;
}

.buy-btn { background: #4caf50; color: white; }
.sell-btn { background: #2196f3; color: white; }

.trading-footer {
  margin-top: 15px;
  padding-top: 10px;
  border-top: 1px solid rgba(255, 255, 255, 0.2);
  text-align: right;
  font-weight: bold;
}

/* Mobile optimizations */
@media (max-width: 600px) {
  .trading-gui { width: 95vw; padding: 10px; }
  .item-name { font-size: 12px; }
  .actions button { padding: 6px 10px; font-size: 14px; }
}
</style>
