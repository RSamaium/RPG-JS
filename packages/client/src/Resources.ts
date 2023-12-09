import { RpgClientEngine } from "./RpgClientEngine"

/**
* Get/Set images in resources
 ```ts
    import { RpgResource } from '@rpg/client'
    const fileLink = RpgResource.spritesheets.get('resource_id')
  ```
* @title Get/Set image link
* @prop { Map< string, string > } spritesheets
* @memberof Resources
*/
/**
* Get/Set sounds in resources
 ```ts
    import { RpgResource } from '@rpg/client'
    const fileLink = RpgResource.sounds.get('resource_id')
  ```
* @title Get/Set sound link
* @prop { Map< string, string > } sounds
* @memberof Resources
*/
export function _initResource(memory: Map<string, any>, _resources, prop: string, engine: RpgClientEngine) {
    for (let resource of _resources) {
        const pluralProp = prop + 's'
        if (resource[pluralProp]) {
            for (let key in resource[pluralProp]) {
                const instance = new resource()
                instance[prop] = engine.getResourceUrl(resource[pluralProp][key])
                memory.set(key, instance)
            }
        }
        else {
            const instance = new resource(engine)
            instance[prop] = engine.getResourceUrl(instance[prop])
            memory.set(resource.id, instance)
        }
    }
}