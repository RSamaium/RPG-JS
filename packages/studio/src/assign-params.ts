import { RpgPlayer } from "@rpgjs/server";
import { ProjectBasic } from "@common/types/project";
import {
  isStartingEquipmentCompatible,
  resolveStartingEquipmentType,
  resolveStudioItemType,
} from "./starting-equipment";

const resolveDatabaseItem = (player: RpgPlayer, itemId: string) => {
  try {
    return (player as any).databaseById?.(itemId);
  } catch {
    return null;
  }
};

export function assignParams(player: RpgPlayer, config: ProjectBasic) {
  player.level = config.initialLevel ?? 1;
  player.finalLevel = config.finalLevel ?? 99;
  player.expCurve = config.expCurve ?? {
    basis: 30,
    extra: 20,
    accelerationA: 30,
    accelerationB: 30,
  };

  if (config.parameters) {
    for (const paramName in config.parameters) {
      player.setParameter(paramName, config.parameters[paramName]);
    }
  }

  if (config.startingInventory) {
    for (const item of config.startingInventory) {
      if (!item.itemId) continue;
      const amount = Number(item.amount);
      if (!Number.isFinite(amount) || amount <= 0) continue;
      player.addItem(item.itemId, amount);
    }
  }
   
  if (config.startingEquipment) {
    for (const type in config.startingEquipment) {
      const itemId = config.startingEquipment[type];
      if (!itemId) continue;
      const item = resolveDatabaseItem(player, itemId);
      if (!isStartingEquipmentCompatible(type, item)) {
        const expectedType = resolveStartingEquipmentType(type);
        const actualType = resolveStudioItemType(item) ?? "unknown";
        console.warn(
          expectedType
            ? `[StudioGame] starting equipment ${type}=${itemId} must reference a ${expectedType}, received ${actualType}`
            : `[StudioGame] starting equipment field ${type} is not supported`,
        );
        continue;
      }
      player.equip(itemId, 'auto');
    }
  }
}
