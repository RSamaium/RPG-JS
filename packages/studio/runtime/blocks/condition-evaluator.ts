import type {
  ComparisonOperator,
  ConditionalBranchParams,
  ExecutionEvent,
  ExecutionPlayer
} from './types';
import { getItemCount } from './executors/utils';

export type ConditionEvaluationContext = {
  player: ExecutionPlayer | null;
  event: ExecutionEvent | null;
  evaluateCustomCondition?: (condition: string) => boolean;
};

export type PageConditions = {
  switch1?: string;
  switch2?: string;
  variable?: string;
  variableValue?: number;
  selfSwitch?: string;
  item?: string;
  goldComparison?: 'greater_equal' | 'less_equal' | 'equal';
  goldValueType?: 'constant' | 'variable';
  goldAmount?: number;
  goldVariableId?: string;
  level?: number;
  equippedItem?: string;
  equipped?: boolean;
  actor?: string;
};

const compareNumbers = (
  left: number,
  right: number,
  comparison?: ComparisonOperator
): boolean => {
  switch (comparison) {
    case 'equal':
      return left === right;
    case 'not_equal':
      return left !== right;
    case 'greater':
      return left > right;
    case 'greater_equal':
      return left >= right;
    case 'less':
      return left < right;
    case 'less_equal':
      return left <= right;
    default:
      return false;
  }
};

const resolveCompareValue = (
  player: ExecutionPlayer,
  valueType?: 'constant' | 'variable',
  constantValue?: number,
  compareVariableId?: string
): number => {
  if (valueType === 'variable') {
    const compareVar = player.getVariable(compareVariableId ?? '');
    return typeof compareVar === 'number' ? compareVar : 0;
  }
  return constantValue ?? 0;
};

const getPlayerLevel = (player: ExecutionPlayer): number => {
  const anyPlayer = player as any;
  if (typeof anyPlayer.level === 'number') {
    return anyPlayer.level;
  }
  if (typeof anyPlayer.getLevel === 'function') {
    const level = anyPlayer.getLevel();
    return typeof level === 'number' ? level : 0;
  }
  return 0;
};

const matchesItemId = (item: any, itemId: string): boolean => {
  if (!item) return false;
  if (typeof item === 'string' || typeof item === 'number') {
    return String(item) === itemId;
  }
  return (
    item.id === itemId ||
    item._id === itemId ||
    item.itemId === itemId ||
    item.name === itemId
  );
};

const hasEquippedItem = (player: ExecutionPlayer, itemId: string): boolean => {
  const anyPlayer = player as any;
  if (typeof anyPlayer.isEquipped === 'function') {
    return Boolean(anyPlayer.isEquipped(itemId));
  }
  if (typeof anyPlayer.hasEquipment === 'function') {
    return Boolean(anyPlayer.hasEquipment(itemId));
  }

  const safeGetEquipment = () => {
    try {
      return typeof anyPlayer.getEquipment === 'function' ? anyPlayer.getEquipment() : null;
    } catch {
      return null;
    }
  };

  const equipment =
    (typeof anyPlayer.getEquipments === 'function' ? anyPlayer.getEquipments() : null) ??
    safeGetEquipment() ??
    anyPlayer.equipments ??
    anyPlayer.equipment ??
    null;

  if (!equipment) return false;

  if (Array.isArray(equipment)) {
    return equipment.some(item => matchesItemId(item, itemId));
  }

  if (equipment instanceof Map) {
    for (const value of equipment.values()) {
      if (matchesItemId(value, itemId)) return true;
    }
    return false;
  }

  if (typeof equipment === 'object') {
    return Object.values(equipment).some(item => matchesItemId(item, itemId));
  }

  return matchesItemId(equipment, itemId);
};

export const evaluateConditionalBranch = (
  params: ConditionalBranchParams,
  context: ConditionEvaluationContext
): boolean => {
  const { player, event } = context;

  switch (params.conditionType) {
    case 'variable': {
      if (!player) return false;
      const variableValue = player.getVariable(params.variableId ?? '');
      const numericVariableValue = typeof variableValue === 'number' ? variableValue : 0;
      const compareValue = resolveCompareValue(
        player,
        params.valueType,
        params.constantValue,
        params.compareVariableId
      );
      return compareNumbers(numericVariableValue, compareValue, params.comparison);
    }

    case 'level': {
      if (!player) return false;
      const level = getPlayerLevel(player);
      const compareValue = resolveCompareValue(
        player,
        params.valueType,
        params.constantValue,
        params.compareVariableId
      );
      return compareNumbers(level, compareValue, params.comparison ?? 'greater_equal');
    }

    case 'switch': {
      if (!player) return false;
      const switchValue = player.getVariable(params.switchId ?? '');
      const expectedValue = params.switchValue ?? true;
      return expectedValue ? switchValue == 1 : switchValue == 0;
    }

    case 'self_switch': {
      if (!player || !event) return false;
      const selfSwitchVariableName = event.id + '_' + (params.selfSwitchName ?? 'A');
      const selfSwitchValue = player.getVariable(selfSwitchVariableName);
      const expectedValue = params.selfSwitchValue ?? true;
      return expectedValue ? selfSwitchValue == 1 : selfSwitchValue == 0;
    }

    case 'item': {
      if (!player) return false;
      const itemId = params.itemId ?? '';
      switch (params.itemComparison) {
        case 'has':
          return player.hasItem(itemId);
        case 'not_has':
          return !player.hasItem(itemId);
        case 'count_greater': {
          const itemCount = params.itemCount ?? 1;
          const playerItemCount = getItemCount(player, itemId);
          return playerItemCount > itemCount;
        }
        case 'count_equal': {
          const itemCount = params.itemCount ?? 0;
          const playerItemCount = getItemCount(player, itemId);
          return playerItemCount === itemCount;
        }
        default:
          return false;
      }
    }

    case 'equipped': {
      if (!player) return false;
      const itemId = params.itemId ?? '';
      if (!itemId) return false;
      const expectedEquipped = params.equipped ?? true;
      const isEquipped = hasEquippedItem(player, itemId);
      return expectedEquipped ? isEquipped : !isEquipped;
    }

    case 'gold': {
      if (!player) return false;
      if (params.condition) {
        const [operator, amount] = params.condition.split(' ');
        const playerGold = player.gold;
        const goldAmount = parseInt(amount, 10);
        switch (operator) {
          case '>=': return playerGold >= goldAmount;
          case '<=': return playerGold <= goldAmount;
          case '>': return playerGold > goldAmount;
          case '<': return playerGold < goldAmount;
          case '==': return playerGold === goldAmount;
          default: return false;
        }
      }

      let goldCompareValue: number;
      if (params.goldValueType === 'variable') {
        const goldVar = player.getVariable(params.goldVariableId ?? '');
        goldCompareValue = typeof goldVar === 'number' ? goldVar : 0;
      } else {
        goldCompareValue = params.goldAmount ?? 0;
      }

      const playerGold = player.gold;
      switch (params.goldComparison) {
        case 'greater_equal': return playerGold >= goldCompareValue;
        case 'less_equal': return playerGold <= goldCompareValue;
        case 'equal': return playerGold === goldCompareValue;
        default: return false;
      }
    }

    case 'player': {
      if (!player) return false;
      switch (params.playerProperty) {
        case 'name':
          return player.name === params.playerName;
        case 'direction': {
          // RpgPlayer.direction is a signal, a plain value is kept for custom players
          const direction: unknown = player.direction;
          return (typeof direction === 'function' ? direction() : direction) === params.playerDirection;
        }
        case 'position':
          return player.x?.() === params.playerX && player.y?.() === params.playerY;
        default:
          return false;
      }
    }

    case 'custom': {
      try {
        if (!context.evaluateCustomCondition) return false;
        return context.evaluateCustomCondition(params.condition ?? 'false');
      } catch (error) {
        console.warn('Error evaluating custom condition:', error);
        return false;
      }
    }
  }

  return false;
};

export const matchesPageConditions = (
  conditions: PageConditions | null | undefined,
  context: ConditionEvaluationContext
): boolean => {
  if (!conditions || Object.keys(conditions).length === 0) {
    return true;
  }

  const checks: ConditionalBranchParams[] = [];

  if (conditions.switch1) {
    checks.push({ conditionType: 'switch', switchId: conditions.switch1, switchValue: true });
  }
  if (conditions.switch2) {
    checks.push({ conditionType: 'switch', switchId: conditions.switch2, switchValue: true });
  }
  if (conditions.selfSwitch) {
    const rawSelfSwitch = String(conditions.selfSwitch);
    if (/^[A-F]$/.test(rawSelfSwitch)) {
      checks.push({
        conditionType: 'self_switch',
        selfSwitchName: rawSelfSwitch as 'A' | 'B' | 'C' | 'D' | 'E' | 'F',
        selfSwitchValue: true
      });
    }
  }
  if (conditions.variable) {
    checks.push({
      conditionType: 'variable',
      variableId: conditions.variable,
      comparison: 'greater_equal',
      valueType: 'constant',
      constantValue: conditions.variableValue ?? 0
    });
  }
  if (conditions.item) {
    checks.push({
      conditionType: 'item',
      itemId: conditions.item,
      itemComparison: 'has'
    });
  }
  if (conditions.goldComparison || conditions.goldAmount !== undefined || conditions.goldVariableId) {
    checks.push({
      conditionType: 'gold',
      goldComparison: conditions.goldComparison || 'greater_equal',
      goldValueType: conditions.goldValueType || 'constant',
      goldAmount: typeof conditions.goldAmount === 'number' ? conditions.goldAmount : 0,
      goldVariableId: conditions.goldVariableId
    });
  }
  if (typeof conditions.level === 'number') {
    checks.push({
      conditionType: 'level',
      comparison: 'greater_equal',
      valueType: 'constant',
      constantValue: conditions.level
    });
  }
  if (conditions.equippedItem) {
    checks.push({
      conditionType: 'equipped',
      itemId: conditions.equippedItem,
      equipped: conditions.equipped ?? true
    });
  }

  return checks.every(check => evaluateConditionalBranch(check, context));
};
