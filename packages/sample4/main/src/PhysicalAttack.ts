import { RpgPlayer } from "@rpgjs/server";
import { Vector2d } from "@rpgjs/common/src/Vector2d";
import ArrowBullet from "../events/ArrowBullet";
import { PositionXY } from "@rpgjs/types";
import { Direction } from "@rpgjs/types";

const rotate = function(currentPosition: PositionXY, targetPosition: PositionXY) {
    const deltaX = targetPosition.x - currentPosition.x;
    const deltaY = targetPosition.y - currentPosition.y;

    // Use Math.atan2 to calculate the angle in radians
    const radians = Math.atan2(deltaY, deltaX);

    // Convert radians to degrees
    const degrees = radians * (180 / Math.PI);

    // Ensure the angle is in the range [0, 360)
    const positiveDegrees = (degrees + 360) % 360;

    return positiveDegrees;
}

export const PhysicalAttack = {
    shoot: (attacker: RpgPlayer, targetVector: Vector2d) => {
        const map = attacker.getCurrentMap();

        if (!map) {
            return;
        }

        const startPosition = attacker.position.copy();

        const startVector = new Vector2d(startPosition.x, startPosition.y);
        const distance = 300;

        targetVector.subtract(startVector.copy());
        targetVector.normalize();
        targetVector.multiply(distance);
        targetVector.add(startVector);

        const events = map.createDynamicEvent({
            x: startPosition.x,
            y: startPosition.y,
            event: ArrowBullet,
        });

        const event = Object.values(events)[0];

        const rotation = rotate(event.position, targetVector);

        event.angle = rotation;

        event
            .moveToPosition(targetVector, {
                onComplete: () => event.remove(),
            })
            .subscribe({
                next: () => {
                    const movedDistance = event.position.distanceWith(startPosition);

                    if (movedDistance > distance) {
                        event.remove();
                    }

                    if (event.tilesCollision.length > 0 || event.shapesCollision.length > 0) {
                        event.remove();
                    }

                    event.otherPlayersCollision
                        .filter((player) => player.id !== attacker.id)
                        .filter((player) => player.name !== 'arrow-bullet')
                        .forEach((player) => {
                            player.hp -= 1;
                            event.remove();
                            if (player.hp <= 0) {
                                player.remove();
                            }
                        });
                },
                complete: () => event.remove(),
                error: () => event.remove(),
            });
    }
}
