import { random } from "@rpgjs/common"
import { DEX, AGI, ATK, PDEF, SDEF, STR, INT } from "@rpgjs/common"

export { DEX, AGI, ATK, PDEF, SDEF, STR, INT } from "@rpgjs/common"

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
    // A skill without power or coefficients, or a parameter that is not set, counts as 0.
    const coefficient = skill.coefficient ?? {}
    const value = (params, key) => Number(params[key]) || 0
    let power = (Number(skill.power) || 0) + (value(a, ATK) * (coefficient[ATK] || 0))
    if (power > 0) {
        power -= value(b, PDEF) * (coefficient[PDEF] || 0) / 2
        power -= value(b, SDEF) * (coefficient[SDEF] || 0) / 2
        power = Math.max(power, 0)
    }
    let rate = 20;
    [STR, DEX, AGI, INT].forEach(val => rate += value(a, val) * (coefficient[val] || 0))
    return Math.round(power * rate / 20)
}
