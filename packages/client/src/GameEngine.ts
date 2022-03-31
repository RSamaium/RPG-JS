import { RpgCommonGame } from "@rpgjs/common";
import { RpgRenderer } from "./Renderer";
import { RpgClientEngine } from "./RpgClientEngine";

export class GameEngineClient extends RpgCommonGame {
    playerId: string
    standalone: boolean
    clientEngine: RpgClientEngine
    renderer: RpgRenderer

    constructor() {
        super('client')
    }
}