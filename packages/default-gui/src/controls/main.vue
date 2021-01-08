<template>
    <div class="controls">
        <div class="d-pad" ref="dPad"></div>
        <div class="actions">
            <div class="action" @click="action"></div>
        </div>
        <div class="menu-access" @click="openMenu"></div>
    </div>
</template>

<script>
import nipplejs from 'nipplejs'

const DIRECTION_CODES = {
    'left': 37,
    'up': 38,
    'right': 39,
    'down': 40
}

const simulateKey = (keyCode) => {
    const event = new Event('keydown')
    event.keyCode = keyCode
    document.dispatchEvent(event)
    setTimeout(() => {
        const eventUp = new Event('keyup')
        eventUp.keyCode = keyCode
        document.dispatchEvent(eventUp)
    }, 200)
}

export default {
    name: 'rpg-controls',
    mounted() {
        const manager  = nipplejs.create({
            zone: this.$refs.dPad
        })
        let directions = {}
        let lastMoving = {}
        let moving = false
        manager.on('added', function (evt, nipple) {
            const keyup = (keyCode) => {
                const event = new Event('keyup')
                event.keyCode = keyCode
                document.dispatchEvent(event)
            }
            const end = () => {
                moving = false
                for (let keyCode of Object.values(DIRECTION_CODES)) {
                    keyup(keyCode)
                }
            }
            nipple.on('end', end)
            nipple.on('move', (evt, data) => {
               if (data.direction) {
                    const degree = data.angle.degree
                    const { x, y, angle } = data.direction
                    directions = {
                        [angle]: true
                    }
                    for (let i = 0 ; i < 4 ; i++) {
                        const corner = 90 * i + 45
                        if (degree < corner + 20 && degree > corner - 20) {
                            directions = {
                                [x]: true,
                                [y]: true
                            }
                        }
                    }

                    for (let dir in DIRECTION_CODES) {
                        if (!directions[dir]) {
                            keyup(DIRECTION_CODES[dir])
                        }
                    }
                   
                    moving = true
               }
            })
            setInterval(() => {
                if (moving) {
                    for (let dir in directions) {
                        const event = new Event('keydown')
                        event.keyCode = DIRECTION_CODES[dir]
                        document.dispatchEvent(event)
                    }
                }
            }, 200)
        })
        
    },
    methods: {
        openMenu() {
            simulateKey(27)
        },
        action() {
            simulateKey(32)
        }
    }
}
</script>

<style scoped>
.controls {
    height: 100%;
}

.d-pad {
    width: 70%;
    position: absolute;
    height: 100%;
}

.actions {
    width: 30%;
    position: absolute;
    right: 0;
    height: 100%;
}

.action {
    background-image: url('../assets/controls/flatDark35.png');
    width: 80px;
    height: 80px;
    opacity: 0.8;
    bottom: 10px;
    position: absolute;
    right: 10px;
}

.menu-access {
    background-image: url('../assets/controls/flatDark32.png');
    width: 48px;
    height: 48px;
    opacity: 0.8;
    top: 10px;
    position: absolute;
    right: 10px;
}
</style>