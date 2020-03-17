import { GameEngine, SimplePhysicsEngine, TwoVector } from 'lance-gg';
import Fighter from './Fighter';
import Platform from './Platform';

export default class BrawlerGameEngine extends GameEngine {

    constructor(options) {
        super(options);

        // game variables
        Object.assign(this, {
            dinoCount: 2, spaceWidth: 160, spaceHeight: 90,
            fighterWidth: 7, fighterHeight: 12, jumpSpeed: 1.5,
            walkSpeed: 0.6, killDistance: 18, dinoKillDistance: 12,
            platformUnit: 8, platformHeight: 5
        });

        this.physicsEngine = new SimplePhysicsEngine({
            gravity: new TwoVector(0, -0.05),
            collisions: { type: 'bruteForce', autoResolve: true },
            gameEngine: this
        });

        this.inputsApplied = [];
        this.on('preStep', this.moveAll.bind(this));
    }

    registerClasses(serializer) {
        serializer.registerClass(Platform);
        serializer.registerClass(Fighter);
    }

    processInput(inputData, playerId) {

        super.processInput(inputData, playerId);

        // handle keyboard presses:
        // right, left - set direction and move fighter in that direction.
        // up          - start jump sequence
        // space       - start the fight sequence
        let fighter = this.world.queryObject({ playerId: playerId, instanceType: Fighter });
        if (fighter) {

            // if fighter is dying or fighting, ignore actions
            if (fighter.action === Fighter.ACTIONS.DIE ||
                fighter.action === Fighter.ACTIONS.FIGHT) {
                return;
            } else if (fighter.action === Fighter.ACTIONS.JUMP) {
                // else fighter is jumping, so fighter can move
                if (inputData.input === 'right') {
                    fighter.position.x += this.walkSpeed;
                    fighter.direction = 1;
                } else if (inputData.input === 'left') {
                    fighter.position.x -= this.walkSpeed;
                    fighter.direction = -1;
                }
            } else {
                // else fighter is either idle, or running
                let nextAction = null;
                if (inputData.input === 'right') {
                    fighter.position.x += this.walkSpeed;
                    fighter.direction = 1;
                    nextAction = Fighter.ACTIONS.RUN;
                } else if (inputData.input === 'left') {
                    fighter.position.x -= this.walkSpeed;
                    fighter.direction = -1;
                    nextAction = Fighter.ACTIONS.RUN;
                } else if (inputData.input === 'up') {
                    if (fighter.velocity.length() === 0)
                        fighter.velocity.y = this.jumpSpeed;
                    nextAction = Fighter.ACTIONS.JUMP;
                } else if (inputData.input === 'space') {
                    nextAction = Fighter.ACTIONS.FIGHT;
                    
                } else {
                    nextAction = Fighter.ACTIONS.IDLE;
                }
                if (fighter.action !== nextAction)
                    fighter.progress = 99;
                fighter.action = nextAction;
            }
            // update physics, and remember that an input was applied on this turn
            fighter.refreshToPhysics();
            this.inputsApplied.push(playerId);
        }
    }

    // logic for every game step
    moveAll(stepInfo) {

        if (stepInfo.isReenact)
            return;

        // advance animation progress for all fighters
        let fighters = this.world.queryObjects({ instanceType: Fighter });

        // update action progress
        for (let f1 of fighters) {
            f1.progress -= 6;
            if (f1.progress < 0) f1.progress = 0;

            // stop jumps
            if (f1.action === Fighter.ACTIONS.JUMP &&
                f1.velocity.y === 0) {
                f1.action = Fighter.ACTIONS.IDLE;
            }
        }
    }

    // create fighter
    addFighter(playerId) {
        let f = new Fighter(this, null, { playerId, position: this.randomPosition() });
        f.height = this.fighterHeight;
        f.width = this.fighterWidth;
        f.direction = 1;
        f.progress = 0;
        f.action = 0;
        f.kills = 0;
        this.addObjectToWorld(f);
        return f;
    }

    // create a platform
    addPlatform(desc) {
        let p = new Platform(this, null, { playerId: 0, position: new TwoVector(desc.x, desc.y) });
        p.width = desc.width;
        p.height = this.platformHeight;
        p.isStatic = 1;
        this.addObjectToWorld(p);
        return p;
    }

    // random position for new object
    randomPosition() {
        return new TwoVector(this.spaceWidth / 4 + Math.random() * this.spaceWidth/2, 70);
    }
}
