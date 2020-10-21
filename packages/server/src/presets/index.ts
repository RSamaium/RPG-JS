import { Utils } from '@rpgjs/common'

const { random } = Utils

export const MAXHP: string = 'maxHp'
export const MAXSP: string = 'maxSp'
export const ATK: string = 'atk'
export const PDEF: string = 'pdef'
export const SDEF: string = 'sdef'
export const STR: string = 'str'
export const AGI: string = 'agi'
export const INT: string = 'int'
export const DEX: string = 'dex'

export const MAXHP_CURVE = {
    start: 741,
    end: 7467
}
export const MAXSP_CURVE = {
    start: 534,
    end: 5500
}
export const STR_CURVE = {
    start: 67,
    end: 635
}
export const AGI_CURVE = {
    start: 58,
    end: 582
}
export const INT_CURVE = {
    start: 36,
    end: 7318
}
export const DEX_CURVE = {
    start: 54,
    end: 564
}

export const DAMAGE_CRITICAL = function(damage, a, b) {
    if (random(0, 100) < 4 * a[DEX] / b[AGI]) {
        damage *= 2
    }
    return damage
}

export const DAMAGE_PHYSIC = function(a, b) {
    let damage = Math.round((a[ATK] - b[PDEF] / 2) * ((20 + a[STR]) / 20))
    if (damage < 0) damage = 0
    return damage
}

export const DAMAGE_GUARD = function(damage) {
    return damage / 2
}

export const COEFFICIENT_ELEMENTS = function(a, b, bDef) {
    return ((a.rate + 1) * (b.rate + 1)) / (bDef.rate == 0 ? bDef.rate * 4 : 1)
}

export const DAMAGE_SKILL = function(a, b, skill) {
    let power = skill.power + (a[ATK] * (skill.coefficient[ATK] || 0))
    if (power > 0) {
        power -= b[PDEF] * (skill.coefficient[PDEF] || 0) / 2
        power -= b[SDEF] * (skill.coefficient[SDEF] || 0) / 2
        power = Math.max(power, 0)
    }
    let rate = 20;
    [STR, DEX, AGI, INT].forEach(val => rate += a[val] * (skill.coefficient[val] || 0))
    return Math.round(power * rate / 20)
}