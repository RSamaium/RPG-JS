import { PhysicalObject2D } from 'lance-gg';

let game = null;
let p2 = null;

export default class Bullet extends PhysicalObject2D {

    onAddToWorld() {
        game = this.gameEngine;
        p2 = game.physicsEngine.p2;

        this.physicsObj = new p2.Body({
            mass: this.mass, damping: 0, angularDamping: 0,
            position: [this.position.x, this.position.y],
            velocity: [this.velocity.x, this.velocity.y]
        });

         // Create bullet shape
        let shape = new p2.Circle({
            radius: game.bulletRadius,
            collisionGroup: game.BULLET, // Belongs to the BULLET group
            collisionMask: game.ASTEROID // Can only collide with the ASTEROID group
        });
        this.physicsObj.addShape(shape);
        game.physicsEngine.world.addBody(this.physicsObj);
    }

    onRemoveFromWorld(gameEngine) {
        game.physicsEngine.world.removeBody(this.physicsObj);
    }

    syncTo(other) {
        super.syncTo(other);
    }

    toString() {
        return `Bullet::${super.toString()}`;
    }
}
