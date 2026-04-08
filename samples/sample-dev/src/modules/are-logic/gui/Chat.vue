<template>
  <div class="chat-container">
    <div class="chat-messages" ref="messagesContainer">
      <div v-for="(msg, index) in messages" :key="index" class="message" :class="msg.type">
        <span class="sender">[{{ msg.sender }}]:</span>
        <span class="text">{{ msg.text }}</span>
      </div>
    </div>
    <div class="chat-input-area">
      <input 
        v-model="inputText" 
        @keyup.enter="sendMessage" 
        placeholder="Press Enter to chat..."
        ref="chatInput"
      />
    </div>
  </div>
</template>

<script>
export default {
  name: 'HudChat',
  inject: ['rpgGuiInteraction', 'rpgSocket'],
  data() {
    return {
      messages: [],
      inputText: ''
    }
  },
  mounted() {
    this.rpgGuiInteraction('are-logic-chat', (data) => {
      if (data.message) {
        this.messages.push(data.message);
        if (this.messages.length > 50) this.messages.shift();
        this.$nextTick(() => {
          const container = this.$refs.messagesContainer;
          if (container) container.scrollTop = container.scrollHeight;
        });
      }
    });
    
    // Global key listener for focusing chat
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && document.activeElement !== this.$refs.chatInput) {
        this.$refs.chatInput.focus();
      }
    });
  },
  methods: {
    sendMessage() {
      if (!this.inputText.trim()) {
        this.$refs.chatInput.blur();
        return;
      }
      this.rpgSocket().emit('player.chat', this.inputText);
      this.inputText = '';
      this.$refs.chatInput.blur();
    }
  }
}
</script>

<style scoped>
.chat-container {
  position: absolute;
  bottom: 120px;
  left: 10px;
  width: 300px;
  max-width: 80vw;
  height: 150px;
  background: rgba(0, 0, 0, 0.5);
  color: white;
  display: flex;
  flex-direction: column;
  border-radius: 5px;
  font-family: 'Inter', sans-serif;
  pointer-events: auto;
  z-index: 100;
}

@media (max-width: 600px) {
  .chat-container {
    bottom: 80px;
    left: 5px;
    width: 200px;
    height: 100px;
  }
  .chat-messages { font-size: 10px; }
  input { font-size: 10px; }
}

.chat-messages {
  flex-grow: 1;
  overflow-y: auto;
  padding: 5px;
  font-size: 12px;
}

.message {
  margin-bottom: 4px;
  word-wrap: break-word;
}

.message.npc {
  color: #ffeb3b;
}

.message.system {
  color: #4caf50;
  font-style: italic;
}

.sender {
  font-weight: bold;
  margin-right: 5px;
}

.chat-input-area {
  padding: 5px;
  background: rgba(0, 0, 0, 0.3);
}

input {
  width: 100%;
  background: transparent;
  border: none;
  border-bottom: 1px solid rgba(255, 255, 255, 0.3);
  color: white;
  outline: none;
  font-size: 12px;
}

input::placeholder {
  color: rgba(255, 255, 255, 0.5);
}
</style>
