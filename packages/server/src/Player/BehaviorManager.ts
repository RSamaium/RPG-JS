import { RpgPlayer, Position } from './Player'
import * as Kompute from 'kompute/build/Kompute'
import * as YUKA from 'yuka'
import PF from 'pathfinding'

export class BehaviorManager {
    behaviorInterval
    steerable: Kompute

    getVector3D(x, y, z): any {
        return new YUKA.Vector3(x, y, z)
    }

    setBehavior(otherPlayer: RpgPlayer) {
        const map = this['mapInstance']
        const shapes = map.getShapes()

       // const grid = new PF.Grid(map.width, map.height)
        //const finder = new PF.AStarFinder();

        const block: any = shapes.find(shape => shape.name == 'stop')
        /*this.steerable.maxAcceleration = 1000


        
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
        }*/
        const time = new YUKA.Time()
        const target = new YUKA.Vector3(20, 20);
        const seekBehavior = new YUKA.SeekBehavior( target );
        const pursuitBehavior = new YUKA.PursuitBehavior( otherPlayer.steerable, 2 )
        
        const obstacle1 = new YUKA.GameEntity();
        obstacle1.position.copy(this.getVector3D(block.hitbox.pos.x + block.hitbox.w / 2, 0, block.hitbox.pos.y + block.hitbox.h / 2))
        obstacle1.boundingRadius = (block.hitbox.w / 2) * Math.sqrt(2)
        this['mapInstance'].entityManager.add( obstacle1 );

        const obstacleAvoidanceBehavior = new YUKA.ObstacleAvoidanceBehavior( [obstacle1] );
        obstacleAvoidanceBehavior.dBoxMinLength = 16
        obstacleAvoidanceBehavior.brakingWeight = 0.1
        const steeringForce = new YUKA.Vector3();
        const displacement = new YUKA.Vector3();
        const acceleration = new YUKA.Vector3();
        const velocitySmooth = new YUKA.Vector3()
        this.steerable.maxSpeed = this.speed * (200/3) 
        this.steerable.boundingRadius = 8 * Math.sqrt(2)
        const self = this
        this.steerable.move = this['move'].bind(this)
		this.steerable.steering.add( pursuitBehavior )
        
        time.update().getDelta() 

        YUKA.Vehicle.prototype.update = function(delta) {
            this.steering.calculate( delta, steeringForce );

            // acceleration = force / mass

            acceleration.copy( steeringForce ).divideScalar( this.mass );

            // update velocity

            this.velocity.add( acceleration.multiplyScalar( delta ) );

            // make sure vehicle does not exceed maximum speed

            if ( this.getSpeedSquared() > ( this.maxSpeed * this.maxSpeed ) ) {

                this.velocity.normalize();
                this.velocity.multiplyScalar( this.maxSpeed );

            }

            // calculate displacement

            displacement.copy( this.velocity ).multiplyScalar( delta );

            // calculate target position

            target.copy( this.position ).add( displacement );


            // update position

            const { x, y, z } = target

            if (self['isCollided']({
                x,
                y: z,
                z: y
            })) {
                //console.log(x, y, z)
            }
            else {
                this.position.copy( target )
            }

            return this;
        }
       
       // this.steerable.steering.add( obstacleAvoidanceBehavior ) 
        
        const move = () => {
            const deltaTime = time.update().getDelta()
            const entity = this.steerable
            this['mapInstance'].entityManager.update( deltaTime )
            /*entity.steering.calculate( deltaTime, steeringForce );
            acceleration.copy( steeringForce )
            acceleration.multiplyScalar( deltaTime )*/
           // displacement.copy( entity.velocity ).multiplyScalar( deltaTime );
            const { x, y, z } = this.steerable.position
            this['position'].x = x 
            this['position'].y = z
            this['position'].z = y 
        }
        //console.log(this.behaviorInterval)
        if (!this.behaviorInterval) this.behaviorInterval = setInterval(move, 16) 
    }

    stopBehavior() {
        if (this.behaviorInterval) clearInterval(this.behaviorInterval)
    }
}

export interface BehaviorManager{ 
    speed: number
}