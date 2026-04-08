export interface HousingPlot {
  id: string;
  ownerId: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  furniture: FurnitureItem[];
  customTextures: CustomTexture[];
}

export interface FurnitureItem {
  id: string;
  type: string;
  x: number;
  y: number;
  rotation: number;
  textureId?: string;
}

export interface CustomTexture {
  id: string;
  name: string;
  dataUrl: string;
  uploadedAt: number;
}

const housingPlots = new Map<string, HousingPlot>();
const playerHouses = new Map<string, string>();

export function createHouse(
  playerId: string,
  name: string
): HousingPlot {
  const existing = playerHouses.get(playerId);
  if (existing) {
    return housingPlots.get(existing)!;
  }

  const plot: HousingPlot = {
    id: `house-${playerId}-${Date.now()}`,
    ownerId: playerId,
    name,
    x: 0,
    y: 0,
    width: 400,
    height: 400,
    furniture: [],
    customTextures: [],
  };

  housingPlots.set(plot.id, plot);
  playerHouses.set(playerId, plot.id);
  return plot;
}

export function getPlayerHouse(playerId: string): HousingPlot | null {
  const houseId = playerHouses.get(playerId);
  if (!houseId) return null;
  return housingPlots.get(houseId) || null;
}

export function placeFurniture(
  playerId: string,
  item: Omit<FurnitureItem, "id">
): FurnitureItem | null {
  const house = getPlayerHouse(playerId);
  if (!house) return null;

  const furniture: FurnitureItem = {
    ...item,
    id: `furn-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
  };
  house.furniture.push(furniture);
  return furniture;
}

export function removeFurniture(
  playerId: string,
  furnitureId: string
): boolean {
  const house = getPlayerHouse(playerId);
  if (!house) return false;

  const idx = house.furniture.findIndex((f) => f.id === furnitureId);
  if (idx === -1) return false;
  house.furniture.splice(idx, 1);
  return true;
}

export function uploadCustomTexture(
  playerId: string,
  name: string,
  dataUrl: string
): CustomTexture | null {
  const house = getPlayerHouse(playerId);
  if (!house) return null;

  const MAX_TEXTURE_SIZE = 512 * 1024;
  if (dataUrl.length > MAX_TEXTURE_SIZE) return null;

  const texture: CustomTexture = {
    id: `tex-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    name,
    dataUrl,
    uploadedAt: Date.now(),
  };

  house.customTextures.push(texture);
  return texture;
}

export function getCustomTextures(playerId: string): CustomTexture[] {
  const house = getPlayerHouse(playerId);
  return house?.customTextures || [];
}

export function removeCustomTexture(
  playerId: string,
  textureId: string
): boolean {
  const house = getPlayerHouse(playerId);
  if (!house) return false;

  const idx = house.customTextures.findIndex((t) => t.id === textureId);
  if (idx === -1) return false;
  house.customTextures.splice(idx, 1);
  return true;
}
