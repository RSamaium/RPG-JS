import type { RpgContext } from "../foundation";

export const UpdateMapToken = "UpdateMapToken";

export abstract class UpdateMapService {
  constructor(protected context: RpgContext) {}

  abstract update(map: any): Promise<void>;
}
