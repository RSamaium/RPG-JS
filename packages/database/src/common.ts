import { DatabaseTypes } from "./interfaces/types"

export interface Data {
     /** 
     * The id of the item. The identifier makes it possible to find an object in the database. By default, the identifier is the name of the class
     * @prop {string} [id]
     * @memberof Item
     * @memberof Weapon
     * @memberof Armor
     * @memberof Class
     * @memberof Enemy
     * @memberof Skill
     * @memberof State
     * @memberof Actor
     * */ 
    id?: string
     /** 
     * The name of the item. 
     * @prop {string} [name]
     * @memberof Item
     * @memberof Weapon
     * @memberof Armor
     * @memberof Class
     * @memberof Enemy
     * @memberof Skill
     * @memberof State
     * @memberof Actor
     * */ 
    name?: string,
     /** 
     * The description of the item. 
     * @prop {string} [description]
     * @memberof Item
     * @memberof Weapon
     * @memberof Armor
     * @memberof Class
     * @memberof Enemy
     * @memberof Skill
     * @memberof State
     * @memberof Actor
     * */ 
    description?: string
}

export function merge(options, type: DatabaseTypes, _static = {}) {
    
    const transformToRate = (optionName: string, propName: string) => {
        if (options[optionName]) {
            options[optionName] = options[optionName].map(element => {
                if (!element.rate) {
                    return {
                        rate: 1,
                        [propName]: element
                    }
                }
                return element
            })
        }
    }

    transformToRate('elements', 'element')
    transformToRate('elementsDefense', 'element')
    transformToRate('elementsEfficiency', 'element')

    transformToRate('addStates', 'state')
    transformToRate('removeStates', 'state')
    transformToRate('statesDefense', 'state')
    transformToRate('statesEfficiency', 'state')

    return (target) => {
        const id = options.id || target.name.toLowerCase()
        target.id = id
        target.prototype.id = id
        target._type = type
        for (let key in _static) {
            target[key] = options[key]
        }
        for (let key in options) {
            target.prototype[key] = options[key]
        }
        target.prototype.toJSON = function() {
            return this.id
        }
    }
}

export interface RpgClassDatabase<T> {
    new ()
}
