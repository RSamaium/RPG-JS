import { Vector2d, Vector2dZero } from '@rpgjs/common/src/Vector2d';
import { RpgServerEngine } from '@rpgjs/server';
import { Direction } from '@rpgjs/types';
import { Observable, Subject, mergeMap, takeUntil, map, tap, from } from 'rxjs'

export interface ExtendedMoveManager {
    position: Vector2d,
    speed: number,
    destroyMove$: Subject<boolean>;
    _destroy$: Subject<void>;
    server: RpgServerEngine;
    changeDirection: (direction: Direction) => void;
    isCollided(nextPosition: Vector2d): Promise<boolean>;
    stopMoveTo: () => void;
}

export interface MovePlayerToPositionOptions {
    onComplete: () => void;
}

export class ExtendedMoveManager {
    async computeNextPosition(nextPosition: Vector2d, target: Vector2d): Promise<Vector2d> {
        const pullDistance = target.distanceWith(nextPosition)
        if (pullDistance <= this.speed) {
            return nextPosition.set(target)
        }

        const pull = (target.copy().subtract(nextPosition)).multiply((1 / pullDistance))

        await this.isCollided(nextPosition);

        pull
            .multiply(1)
            .normalize()

        return nextPosition.add(pull.multiply(this.speed))
    }

    moveToPosition(targetPosition: Vector2d, options: MovePlayerToPositionOptions): Observable<Vector2d> {
        const lastPositions: Vector2d[] = []
        let i = 0
        let count = 0
        this.stopMoveTo()
        this.destroyMove$ = new Subject()

        const { onComplete } = options;

        /** @ts-ignore */
        return this.server.tick
            .pipe(
                /** @ts-ignore */
                takeUntil(this.destroyMove$),
                takeUntil(this._destroy$),
                mergeMap(() => from(this.computeNextPosition(this.position.copy(), targetPosition))),
                map(newPosition => {
                    return this.position.set(newPosition);
                }),
                tap((position: Vector2d) => {
                    lastPositions[i] = position.copy()
                    i++
                    count++
                    if (i >= 3) {
                        i = 0
                    }
                    else if (this.position.isEqual(targetPosition)) {
                        onComplete?.()
                    }
                    else {
                        count = 0
                    }
                })
            );
    }
}
