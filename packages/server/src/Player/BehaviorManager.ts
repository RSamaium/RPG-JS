import { RpgPlayer, Position } from './Player'
import * as Kompute from 'kompute/build/Kompute'

export class BehaviorManager {
    behaviorInterval
    steerable: Kompute

    getVector3D(x, y, z): any {
        return new Kompute.Vector3D(x, y, z)
    }

    setBehavior(otherPlayer: RpgPlayer) {
        this.steerable.maxAcceleration = 1000
        this.steerable.maxSpeed = this.speed * (200/3)
        this.steerable.setTargetEntity(otherPlayer.steerable)
        this.steerable.setHideTargetEntity(otherPlayer.steerable);
        this.steerable.setBehavior(new Kompute.PursueBehavior({maxPredictionTime: 3}))
        const delta = 1/60;
        const vectorPool = new Kompute.VectorPool(10)
        this.steerable.move = this['move'].bind(this)
        Kompute.Entity.prototype.update = function() {
            const speed = this.velocity.getLength();
            if (this.limitVelocity && speed > this.maxSpeed){
              this.velocity.copy(this.velocity.normalize().multiplyScalar(this.maxSpeed))
            }
            const vect = vectorPool.get().copy(this.velocity).multiplyScalar(delta);
            const nextPosition = new Kompute.Vector3D().copy(this.position).add(vect)  
            this.move(nextPosition as Position)
        }
        const move = () => {
            this.steerable.update()
           // this['position'] = this.steerable.position
        }
        if (!this.behaviorInterval) this.behaviorInterval = setInterval(move, 16) 
    }

    stopBehavior() {
        clearInterval(this.behaviorInterval)
    }
}

export interface BehaviorManager{ 
    speed: number
}