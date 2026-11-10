export const BOW_ID = "bow";

const itemId = (item: any) => (typeof item?.id === "function" ? item.id() : item?.id);

/**
 * Attack animation of a character, shared by the server and the client
 * prediction: a bow plays the `shoot` animation of the LPC spritesheet.
 */
export const attackAnimation = (entity: any) => {
  const equipments = typeof entity?.equipments === "function" ? entity.equipments() : [];
  return (equipments ?? []).some((item: any) => itemId(item) === BOW_ID) ? "shoot" : "attack";
};
