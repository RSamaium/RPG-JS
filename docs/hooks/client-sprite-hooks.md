---
title: "Client Sprite Hooks"
description: "Guide for Client Sprite Hooks in RPGJS."
---

# Client Sprite Hooks

Sprite hooks allow you to customize the behavior of sprites (players and events) on the client side. These hooks are defined in the `sprite` property of your client module.

## Usage

```ts
import { RpgSprite, RpgSpriteHooks, defineModule } from '@rpgjs/client'

const sprite: RpgSpriteHooks = {
    onInit(sprite: RpgSprite) {
        console.log(`Sprite ${sprite.id} initialized`)
    },
    onChanges(sprite: RpgSprite, data: any, old: any) {
        console.log(`Sprite ${sprite.id} data changed`)
    }
}

export default defineModule({
    sprite
})
```

## Available Hooks

### onInit

**Description:** Called when a sprite is initialized on the client

**Parameters:**
- `sprite: RpgSprite` - The sprite instance

**Example:**
```ts
const sprite: RpgSpriteHooks = {
    onInit(sprite: RpgSprite) {
        console.log(`🎭 Sprite ${sprite.id} initialized`)
        
        // Set default properties
        sprite.opacity = 1.0
        sprite.scale = { x: 1, y: 1 }
        
        // Initialize based on sprite type
        if (sprite.type === 'player') {
            // Add player-specific visual effects
            sprite.addGlow('#00ff00', 0.3)
            sprite.showNameplate(sprite.name)
            
            // Add health bar
            sprite.healthBar = sprite.addChild('health-bar', {
                width: 32,
                height: 4,
                offsetY: -40
            })
        }
        
        if (sprite.type === 'npc') {
            // Add interaction indicator
            sprite.interactionIcon = sprite.addChild('interaction-icon', {
                graphic: 'exclamation',
                visible: false,
                offsetY: -50
            })
        }
        
        if (sprite.type === 'enemy') {
            // Add enemy visual effects
            sprite.addGlow('#ff0000', 0.2)
            sprite.showHealthBar()
        }
        
        // Play spawn animation
        sprite.playAnimation('spawn')
    }
}
```

### onDestroy

**Description:** Called when a sprite is removed from the scene

**Parameters:**
- `sprite: RpgSprite` - The sprite instance

**Example:**
```ts
const sprite: RpgSpriteHooks = {
    onDestroy(sprite: RpgSprite) {
        console.log(`🗑️ Sprite ${sprite.id} destroyed`)
        
        // Clean up visual effects
        if (sprite.glow) {
            sprite.removeGlow()
        }
        
        if (sprite.nameplate) {
            sprite.nameplate.destroy()
        }
        
        if (sprite.healthBar) {
            sprite.healthBar.destroy()
        }
        
        // Play destruction animation
        if (sprite.type === 'enemy') {
            sprite.playAnimation('death', () => {
                // Animation complete callback
                sprite.showParticleEffect('explosion')
            })
        }
        
        // Clean up event listeners
        sprite.removeAllListeners()
        
        // Clear timers
        if (sprite.timers) {
            sprite.timers.forEach(timer => clearTimeout(timer))
        }
    }
}
```

### onBeforeRemove

**Description:** Called when the server requests sprite removal, before the
sprite disappears from the scene. Return a promise to keep the sprite visible
while a transition runs.

The server does not decide how the transition is rendered. It only sends a
removal context with `event.remove()`. The client reads that context in
`onBeforeRemove` and can play an animation, sound, particle effect, GUI
transition, or any combination of effects.

**Parameters:**
- `sprite: RpgSprite` - The sprite instance
- `context.reason?: string` - Removal reason, such as `"defeated"`
- `context.data?: any` - Custom data sent by `event.remove()`
- `context.transition?: object` - Optional transition metadata. This is a
  project-defined payload; RPGJS forwards it to the client.
- `context.timeoutMs?: number` - Safety timeout used by the server before the
  event is removed from the map.

**Server example:**
```ts
event.remove({
    reason: 'defeated',
    transition: {
        type: 'enemy-death',
        animation: 'die',
        graphic: 'slime_die',
        sound: 'slime-death',
        duration: 700
    },
    timeoutMs: 700
})
```

**Client example:**
```ts
import { inject, RpgClientEngine, RpgSprite, RpgSpriteHooks } from '@rpgjs/client'

const sprite: RpgSpriteHooks = {
    async onBeforeRemove(sprite: RpgSprite, context) {
        if (context.reason !== 'defeated') return

        const engine = inject(RpgClientEngine)
        const transition = context.transition
        const tasks = []

        if (transition?.animation) {
            const timeoutMs = context.timeoutMs ?? transition.duration ?? 700

            if (transition.graphic) {
                tasks.push(sprite.setAnimation(transition.animation, transition.graphic, 1, {
                    timeoutMs
                }))
            } else {
                tasks.push(sprite.setAnimation(transition.animation, 1, {
                    timeoutMs
                }))
            }
        }

        if (transition?.sound) {
            tasks.push(engine.playSound(transition.sound))
        }

        await Promise.all(tasks)
    }
}
```

`sprite.setAnimation()` returns a promise for finite animations. Awaiting it keeps
the sprite visible until the animation finishes, is interrupted, or reaches the
configured timeout.

`timeoutMs` is the maximum time the server keeps the removed sprite visible on
clients. Set it to at least the expected duration of the client transition. The
client hook may finish earlier, but the event is removed from the map when the
server timeout expires.

### onChanges

**Description:** Called when sprite data changes (from server updates)

**Parameters:**
- `sprite: RpgSprite` - The sprite instance
- `data: any` - New data
- `old: any` - Previous data

**Example:**
```ts
const sprite: RpgSpriteHooks = {
    onChanges(sprite: RpgSprite, data: any, old: any) {
        console.log(`📊 Sprite ${sprite.id} data updated`)
        
        // Handle health changes
        if (data.hp !== old.hp) {
            const healthPercent = data.hp / data.maxHp
            
            // Update health bar
            if (sprite.healthBar) {
                sprite.healthBar.setPercent(healthPercent)
            }
            
            // Show damage/healing numbers
            const difference = data.hp - old.hp
            if (difference < 0) {
                // Damage taken
                sprite.showFloatingText(`-${Math.abs(difference)}`, '#ff0000')
                sprite.playAnimation('hit')
                sprite.shake(200, 3)
            } else if (difference > 0) {
                // Healing received
                sprite.showFloatingText(`+${difference}`, '#00ff00')
                sprite.playAnimation('heal')
            }
            
            // Low health warning
            if (healthPercent < 0.25) {
                sprite.addGlow('#ff0000', 0.5)
                sprite.startBlinking()
            } else {
                sprite.removeGlow()
                sprite.stopBlinking()
            }
        }
        
        // Handle level changes
        if (data.level !== old.level) {
            sprite.showFloatingText('LEVEL UP!', '#ffff00', { 
                size: 24, 
                duration: 3000 
            })
            sprite.playAnimation('level-up')
            sprite.showParticleEffect('level-up-sparkles')
        }
        
        // Handle equipment changes
        if (data.equipment !== old.equipment) {
            sprite.updateEquipmentVisuals(data.equipment)
        }
        
        // Handle state changes
        if (data.states !== old.states) {
            sprite.updateStateVisuals(data.states, old.states)
        }
        
        // Handle name changes
        if (data.name !== old.name) {
            if (sprite.nameplate) {
                sprite.nameplate.setText(data.name)
            }
        }
    }
}
```

### onUpdate

**Description:** Called at each frame for sprite updates

**Parameters:**
- `sprite: RpgSprite` - The sprite instance
- `obj: any` - Update data

**Example:**
```ts
const sprite: RpgSpriteHooks = {
    onUpdate(sprite: RpgSprite, obj: any) {
        // Update custom animations
        if (sprite.customAnimations) {
            sprite.customAnimations.forEach(animation => {
                animation.update(obj.deltaTime)
            })
        }
        
        // Update floating elements
        if (sprite.nameplate) {
            sprite.nameplate.followSprite(sprite)
        }
        
        if (sprite.healthBar) {
            sprite.healthBar.followSprite(sprite)
        }
        
        // Update particle effects
        if (sprite.particleEffects) {
            sprite.particleEffects.forEach(effect => {
                effect.update(obj.deltaTime)
            })
        }
        
        // Handle breathing animation for idle sprites
        if (sprite.isIdle && !sprite.isMoving) {
            const breathingScale = 1 + Math.sin(obj.time * 0.002) * 0.02
            sprite.scale.y = breathingScale
        }
        
        // Update glow effects
        if (sprite.glowEffect) {
            const glowIntensity = 0.3 + Math.sin(obj.time * 0.005) * 0.2
            sprite.glowEffect.intensity = glowIntensity
        }
        
        // Update interaction indicators
        if (sprite.interactionIcon && sprite.type === 'npc') {
            const player = sprite.scene.getPlayerSprite()
            if (player && sprite.distanceTo(player) < 64) {
                sprite.interactionIcon.visible = true
                sprite.interactionIcon.y = -50 + Math.sin(obj.time * 0.01) * 5
            } else {
                sprite.interactionIcon.visible = false
            }
        }
    }
}
```

### onMove

**Description:** Called when the sprite's position changes

**Parameters:**
- `sprite: RpgSprite` - The sprite instance

**Example:**
```ts
const sprite: RpgSpriteHooks = {
    onMove(sprite: RpgSprite) {
        console.log(`🚶 Sprite ${sprite.id} moved to (${sprite.x}, ${sprite.y})`)
        
        // Create footstep particles
        if (sprite.type === 'player' && sprite.isOnGround) {
            sprite.createFootstepParticles()
        }
        
        // Update shadow position
        if (sprite.shadow) {
            sprite.shadow.x = sprite.x
            sprite.shadow.y = sprite.y + sprite.height
        }
        
        // Play movement sound
        if (sprite.isMoving && !sprite.movementSound?.isPlaying) {
            const terrain = sprite.scene.getTerrainAt(sprite.x, sprite.y)
            sprite.playMovementSound(terrain)
        }
        
        // Update camera if this is the main player
        if (sprite.isMainPlayer) {
            sprite.scene.camera.followSprite(sprite)
        }
        
        // Check for area triggers
        const areas = sprite.scene.getAreasAt(sprite.x, sprite.y)
        areas.forEach(area => {
            if (!sprite.currentAreas.includes(area.id)) {
                sprite.onEnterArea(area)
            }
        })
        
        // Update lighting if sprite has a light source
        if (sprite.lightSource) {
            sprite.lightSource.x = sprite.x
            sprite.lightSource.y = sprite.y
        }
    }
}
```

## Complete Example

```ts
import { RpgSprite, RpgSpriteHooks, defineModule } from '@rpgjs/client'

const sprite: RpgSpriteHooks = {
    onInit(sprite: RpgSprite) {
        console.log(`🎭 Initializing sprite: ${sprite.id} (${sprite.type})`)
        
        // Common initialization
        sprite.opacity = 1.0
        sprite.customData = {}
        sprite.visualEffects = []
        sprite.timers = []
        
        // Type-specific initialization
        switch (sprite.type) {
            case 'player':
                this.initializePlayer(sprite)
                break
            case 'npc':
                this.initializeNPC(sprite)
                break
            case 'enemy':
                this.initializeEnemy(sprite)
                break
            case 'item':
                this.initializeItem(sprite)
                break
        }
        
        // Play spawn animation
        sprite.playAnimation('spawn', () => {
            sprite.isReady = true
        })
    },
    
    onDestroy(sprite: RpgSprite) {
        console.log(`🗑️ Destroying sprite: ${sprite.id}`)
        
        // Clean up visual effects
        sprite.visualEffects.forEach(effect => effect.destroy())
        
        // Clear timers
        sprite.timers.forEach(timer => clearTimeout(timer))
        
        // Remove UI elements
        if (sprite.nameplate) sprite.nameplate.destroy()
        if (sprite.healthBar) sprite.healthBar.destroy()
        if (sprite.interactionIcon) sprite.interactionIcon.destroy()
        
        // Play destruction effect
        if (sprite.type === 'enemy') {
            sprite.scene.addParticleEffect('explosion', sprite.x, sprite.y)
        }
    },
    
    onChanges(sprite: RpgSprite, data: any, old: any) {
        // Health changes
        if (data.hp !== old.hp) {
            this.handleHealthChange(sprite, data.hp, old.hp, data.maxHp)
        }
        
        // Level changes
        if (data.level !== old.level) {
            this.handleLevelUp(sprite, data.level, old.level)
        }
        
        // Equipment changes
        if (JSON.stringify(data.equipment) !== JSON.stringify(old.equipment)) {
            this.updateEquipmentVisuals(sprite, data.equipment)
        }
        
        // State changes
        if (JSON.stringify(data.states) !== JSON.stringify(old.states)) {
            this.updateStateEffects(sprite, data.states, old.states)
        }
    },
    
    onUpdate(sprite: RpgSprite, { deltaTime, time }) {
        // Update custom animations
        sprite.visualEffects.forEach(effect => effect.update(deltaTime))
        
        // Update UI elements
        if (sprite.nameplate) {
            sprite.nameplate.x = sprite.x
            sprite.nameplate.y = sprite.y - sprite.height - 10
        }
        
        // Breathing animation for idle sprites
        if (!sprite.isMoving && sprite.isReady) {
            const breathScale = 1 + Math.sin(time * 0.003) * 0.01
            sprite.scale.y = breathScale
        }
        
        // Update interaction indicators
        if (sprite.interactionIcon) {
            const player = sprite.scene.getMainPlayer()
            const distance = sprite.distanceTo(player)
            sprite.interactionIcon.visible = distance < 64
            
            if (sprite.interactionIcon.visible) {
                sprite.interactionIcon.y = sprite.y - sprite.height - 20 + Math.sin(time * 0.01) * 3
            }
        }
    },
    
    onMove(sprite: RpgSprite) {
        // Create movement particles
        if (sprite.type === 'player' && sprite.isMoving) {
            const terrain = sprite.scene.getTerrainAt(sprite.x, sprite.y)
            this.createMovementParticles(sprite, terrain)
        }
        
        // Update camera for main player
        if (sprite.isMainPlayer) {
            sprite.scene.camera.centerOn(sprite.x, sprite.y)
        }
        
        // Update lighting
        if (sprite.lightSource) {
            sprite.lightSource.position.set(sprite.x, sprite.y)
        }
    },
    
    // Helper methods
    initializePlayer(sprite: RpgSprite) {
        sprite.addGlow('#00ff00', 0.2)
        sprite.nameplate = sprite.scene.addUI('nameplate', {
            text: sprite.name,
            x: sprite.x,
            y: sprite.y - sprite.height - 10
        })
        sprite.healthBar = sprite.scene.addUI('health-bar', {
            maxValue: sprite.maxHp,
            currentValue: sprite.hp,
            x: sprite.x - 16,
            y: sprite.y - sprite.height - 25
        })
    },
    
    initializeNPC(sprite: RpgSprite) {
        sprite.interactionIcon = sprite.scene.addUI('interaction-icon', {
            graphic: 'chat-bubble',
            x: sprite.x,
            y: sprite.y - sprite.height - 20,
            visible: false
        })
    },
    
    initializeEnemy(sprite: RpgSprite) {
        sprite.addGlow('#ff0000', 0.3)
        sprite.healthBar = sprite.scene.addUI('enemy-health-bar', {
            maxValue: sprite.maxHp,
            currentValue: sprite.hp,
            x: sprite.x - 16,
            y: sprite.y - sprite.height - 30
        })
    },
    
    initializeItem(sprite: RpgSprite) {
        sprite.addGlow('#ffff00', 0.4)
        sprite.startFloating()
    },
    
    handleHealthChange(sprite: RpgSprite, newHp: number, oldHp: number, maxHp: number) {
        const difference = newHp - oldHp
        
        if (difference < 0) {
            // Damage
            sprite.showFloatingText(`-${Math.abs(difference)}`, '#ff0000')
            sprite.playAnimation('hit')
            sprite.shake(150, 2)
        } else if (difference > 0) {
            // Healing
            sprite.showFloatingText(`+${difference}`, '#00ff00')
            sprite.playAnimation('heal')
        }
        
        // Update health bar
        if (sprite.healthBar) {
            sprite.healthBar.setValue(newHp, maxHp)
        }
        
        // Low health effects
        const healthPercent = newHp / maxHp
        if (healthPercent < 0.25) {
            sprite.addStatusEffect('low-health')
        } else {
            sprite.removeStatusEffect('low-health')
        }
    },
    
    handleLevelUp(sprite: RpgSprite, newLevel: number, oldLevel: number) {
        sprite.showFloatingText('LEVEL UP!', '#ffff00', { size: 24, duration: 3000 })
        sprite.playAnimation('level-up')
        sprite.scene.addParticleEffect('level-up-sparkles', sprite.x, sprite.y)
        sprite.scene.playSound('level-up')
    }
}

export default defineModule({
    sprite
})
```
