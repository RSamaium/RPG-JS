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

export const DAMAGE_PHYSIC = function(a, b) {
    return Math.round((a[ATK] - b[PDEF] / 2) * ((20 + a[STR]) / 20))
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