<template>
  <div class="chat">
      <ul ref="chat-list">
          <li v-for="(msg, i) in messages" :key="i" :class="`type-${msg.type}`">{{ msg.message }}</li>
      </ul>
      <input 
        type="text" 
        placeholder="Write yout message and press Enter"
        @focus="stopMove" 
        @blur="startMove" 
        v-model="text" 
        @keypress.enter="send">
  </div>
</template>

<script>
const GUI_CONTROLS = 'rpg-controls'

export default {
    name: 'rpg-chat',
    inject: ['rpgEngine', 'rpgGui', 'rpgSocket'],
    data() {
        return {
            text: '',
            messages: []
        }
    },
    mounted() {
        const socket = this.rpgSocket()
        socket.on('chat-message', ({ message, type }) => {
            this.messages.push({
                message,
                type
            })
            const el = this.$refs['chat-list']
            el.scrollTop = el.scrollHeight + 100
        })
    },
    methods: {
        stopMove() {
            if (this.rpgGui.exists(GUI_CONTROLS)) this.rpgGui.hide(GUI_CONTROLS)
            this.rpgEngine.controls.stop = true
        },
        startMove() {
             if (this.rpgGui.exists(GUI_CONTROLS)) this.rpgGui.display(GUI_CONTROLS)
            this.rpgEngine.controls.stop = false
        },
        send() {
            if (!this.text) return
            const socket = this.rpgSocket()
            socket.emit('chat-message', this.text)
            this.text = ''
        }
    }
}
</script>

<style scoped lang="scss">
.chat {
    position: absolute;
    z-index: 101;
    bottom: 0;
    background: rgba(0, 0, 0, 0.7);
    z-index: 70;
}

.chat input {
    padding: 10px;
     width: 300px;
}

.chat ul {
    list-style: none;
    color: white;
    font-family: $window-font-family;
    padding: 0;
    margin-left: 10px;
    max-height: 200px;
    overflow: auto;
}

.chat li.type-info {
    color: #59da25;
}
</style>