export enum Effect {
    NONE = 'NONE',
    CAN_NOT_SKILL = 'CAN_NOT_SKILL',
    CAN_NOT_ITEM = 'CAN_NOT_ITEM',
    ALWAYS_ATTACK_ENEMIES = 'ALWAYS_ATTACK_ENEMIES',
    CAN_NOT_EVADE = 'CAN_NOT_EVADE',
    CAN_NOT_GET_EXP = 'CAN_NOT_GET_EXP',
    CAN_NOT_GET_GOLD = 'CAN_NOT_GET_GOLD',
    PHARMACOLOGY = 'PHARMACOLOGY',
    // Increases the chances of making a critical hit
    CRITICAL_BONUS = 'CRITICAL_BONUS',
    SUPER_GUARD = 'SUPER_GUARD',
    GUARD = 'GUARD',
    // the chances of making a critical strike are set to 0
    PREVENT_CRITICAL = 'PREVENT_CRITICAL',
    HALF_SP_COST = 'HALF_SP_COST',
    DOUBLE_EXP_GAIN = 'DOUBLE_EXP_GAIN',
    AUTO_HP_RECOVER = 'AUTO_HP_RECOVER',
    // He's the first to attack
    FAST_ATTACK = 'FAST_ATTACK',
    // The hero can attack twice
    DUAL_ATTACK = 'DUAL_ATTACK',
    // Each turn, the hero loses 10% of his health points.
    SLIP_DAMAGE = 'SLIP_DAMAGE',
    
}
