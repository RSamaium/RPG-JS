#  Save the player's progress

## It is necessary to know

- The goal is to save the player's status and put the data in the database of your choice (SQL, NoSQL, LocalStorage (for browser), etc.).

## Example 

Two methods will be necessary:

* [player.load(json)](/commands/common.html#load-progress)
* [player.save()](/commands/common.html#save-progress)

Example (with axios request)

Add a file in <PathTo to="eventDir" file="npc.ts" />

```ts 
import { RpgEvent, EventData, RpgPlayer } from '@rpgjs/server'

@EventData({
    name: 'EV-1'
})
export default class CharaEvent extends RpgEvent {
    onInit() {
        this.setGraphic('chara')
    }
    async onAction(player: RpgPlayer) {
        const choice = await player.showChoices('Do you whant save your progress?', [
            { text: 'Yes', value: true },
            { text: 'No', value: false }
        ])
        if (choice.value) {
            const json = player.save()
            try {
                await axios.post('https://my-backend-game/save', {
                    data: json,
                    playerId: 123 // An identifier that you must have defined when the player was loaded in the game (be careful, do not use player.id which changes every time you log in)
                })
                player.showNotification('Your progress has been saved')
            }
            catch (err) {
                console.log(err)
                player.showNotification('Save failed')
            }
        }
    }
}
```

> See [Create Event](/guide/create-event.html) to add event in map

## Screens

You decide when you want to save the player's game.

If you want screens to save or load a game, use the following plugins:
- [Plugin Save Screen (for RPG)](/plugins/save.html)
- [Plugin Title Screen (with load screen or login)](/plugins/title-screen.html)