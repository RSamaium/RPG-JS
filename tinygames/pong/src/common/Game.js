import { GameEngine, BaseTypes, TwoVector, DynamicObject, KeyboardControls, SimplePhysicsEngine } from 'lance-gg';

const PADDING = 20;
const WIDTH = 400;
const HEIGHT = 400;
const PADDLE_WIDTH = 10;
const PADDLE_HEIGHT = 50;

// A paddle has a health attribute
class Paddle extends DynamicObject {

    constructor(gameEngine, options, props) {
        super(gameEngine, options, props);
        this.health = 0;
    }

    static get netScheme() {
        return Object.assign({
            health: { type: BaseTypes.TYPES.INT16 }
        }, super.netScheme);
    }

    syncTo(other) {
        super.syncTo(other);
        this.health = other.health;
    }
}

// a game object to represent the ball
class Ball extends DynamicObject {

    constructor(gameEngine, options, props) {
        super(gameEngine, options, props);
    }

    // avoid gradual synchronization of velocity
    get bending() {
        return { velocity: { percent: 0.0 } };
    }

    syncTo(other) {
        super.syncTo(other);
    }
}

export default class Game extends GameEngine {

    constructor(options) {
        super(options);
        this.physicsEngine = new SimplePhysicsEngine({ gameEngine: this });

        // common code
        this.on('postStep', this.gameLogic.bind(this));

        // server-only code
        this.on('server__init', this.serverSideInit.bind(this));
        this.on('server__playerJoined', this.serverSidePlayerJoined.bind(this));
        this.on('server__playerDisconnected', this.serverSidePlayerDisconnected.bind(this));

        // client-only code
        this.on('client__rendererReady', this.clientSideInit.bind(this));
        this.on('client__draw', this.clientSideDraw.bind(this));
    }

    registerClasses(serializer) {
        serializer.registerClass(Paddle);
        serializer.registerClass(Ball);
    }

    gameLogic() {
        let paddles = this.world.queryObjects({ instanceType: Paddle });
        let ball = this.world.queryObject({ instanceType: Ball });
        if (!ball || paddles.length !== 2) return;

        // CHECK LEFT EDGE:
        if (ball.position.x <= PADDING + PADDLE_WIDTH &&
            ball.position.y >= paddles[0].y && ball.position.y <= paddles[0].position.y + PADDLE_HEIGHT &&
            ball.velocity.x < 0) {

            // ball moving left hit player 1 paddle
            ball.velocity.x *= -1;
            ball.position.x = PADDING + PADDLE_WIDTH + 1;
        } else if (ball.position.x <= 0) {

            // ball hit left wall
            ball.velocity.x *= -1;
            ball.position.x = 0;
            console.log(`player 2 scored`);
            paddles[0].health--;
        }

        // CHECK RIGHT EDGE:
        if (ball.position.x >= WIDTH - PADDING - PADDLE_WIDTH &&
            ball.position.y >= paddles[1].position.y && ball.position.y <= paddles[1].position.y + PADDLE_HEIGHT &&
            ball.velocity.x > 0) {

            // ball moving right hits player 2 paddle
            ball.velocity.x *= -1;
            ball.position.x = WIDTH - PADDING - PADDLE_WIDTH - 1;
        } else if (ball.position.x >= WIDTH ) {

            // ball hit right wall
            ball.velocity.x *= -1;
            ball.position.x = WIDTH - 1;
            console.log(`player 1 scored`);
            paddles[1].health--;
        }

        // ball hits top or bottom edge
        if (ball.position.y <= 0) {
            ball.position.y = 1;
            ball.velocity.y *= -1;
        } else if (ball.position.y >= HEIGHT) {
            ball.position.y = HEIGHT - 1;
            ball.velocity.y *= -1;
        }
    }

    processInput(inputData, playerId) {
        super.processInput(inputData, playerId);

        // get the player paddle tied to the player socket
        let playerPaddle = this.world.queryObject({ playerId });
        if (playerPaddle) {
            if (inputData.input === 'up') {
                playerPaddle.position.y -= 5;
            } else if (inputData.input === 'down') {
                playerPaddle.position.y += 5;
            }
        }
    }

    //
    // SERVER ONLY CODE
    //
    serverSideInit() {
        // create the paddles and the ball
        this.addObjectToWorld(new Paddle(this, null, { playerID: 0, position: new TwoVector(PADDING, 0) }));
        this.addObjectToWorld(new Paddle(this, null, { playerID: 0, position: new TwoVector(WIDTH - PADDING, 0) }));
        this.addObjectToWorld(new Ball(this, null, {
            position: new TwoVector(WIDTH /2, HEIGHT / 2),
            velocity: new TwoVector(2, 2)
        }));
    }

    // attach newly connected player to next available paddle
    serverSidePlayerJoined(ev) {
        let paddles = this.world.queryObjects({ instanceType: Paddle });
        if (paddles[0].playerId === 0) {
            paddles[0].playerId = ev.playerId;
        } else if (paddles[1].playerId === 0) {
            paddles[1].playerId = ev.playerId;
        }
    }

    serverSidePlayerDisconnected(ev) {
        let paddles = this.world.queryObjects({ instanceType: Paddle });
        if (paddles[0].playerId === ev.playerId) {
            paddles[0].playerId = 0;
        } else if (paddles[1].playerId === ev.playerId) {
            paddles[1].playerId = 0;
        }
    }

    //
    // CLIENT ONLY CODE
    //
    clientSideInit() {
        this.controls = new KeyboardControls(this.renderer.clientEngine);
        this.controls.bindKey('up', 'up', { repeat: true } );
        this.controls.bindKey('down', 'down', { repeat: true } );
    }

    clientSideDraw() {

        function updateEl(el, obj) {
            let health = obj.health>0?obj.health:15;
            el.style.top = obj.position.y + 10 + 'px';
            el.style.left = obj.position.x + 'px';
            el.style.background = `#ff${health.toString(16)}f${health.toString(16)}f`;
        }

        let paddles = this.world.queryObjects({ instanceType: Paddle });
        let ball = this.world.queryObject({ instanceType: Ball });
        if (!ball || paddles.length !== 2) return;
        updateEl(document.querySelector('.ball'), ball);
        updateEl(document.querySelector('.paddle1'), paddles[0]);
        updateEl(document.querySelector('.paddle2'), paddles[1]);
    }
}
