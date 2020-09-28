export const MAXHP: string = 'maxHp'
export const MAXSP: string = 'maxSp'
export const STR: string = 'str'
export const ATK: string = 'atk'
export const DEF: string = 'def'

export const MAXHP_CURVE = {
    start: 523,
    end: 7318
}
export const MAXSP_CURVE = {
    start: 523,
    end: 7318
}
export const STR_CURVE = {
    start: 523,
    end: 7318
}

export const DAMAGE_PHYSIC = function(a, b) {
    return a[ATK] * (100 / (100 + b[DEF]))
}