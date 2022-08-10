import { RpgPlayer } from "@rpgjs/server";
import { Converse } from 'newbot'

export class Interpreter {
    converse: Converse
    
    constructor(private player: RpgPlayer, private code: string) {
        this.code = code.trim()
        if (!this.code.startsWith('@')) {
            this.code = `
                @Event('start')
                start() {
                    ${this.code}
                }
            `
        }
        this.converse = new Converse({
            code: this.code,
            functions: {
                showChoices: player.showChoices.bind(player)
            }
        })
    }

    exec(): Promise<any> {
        return new Promise((resolve, reject) => {
            this.converse.onError((err) => {
                reject(err)
            })
            this.converse.exec('', this.player.id, {
                preUser: (user) => {
                    user.setVariable('default', 'player', this.player)
                },
                output: (output, done) => {
                    if (typeof output == 'string') {
                        this.player.showText(output).then(done)
                    }
                    else {
                        done()
                    }
                },
                // magicVariables: {
                //     player: this.player
                // }
            }).then(resolve)
        })
    }
}