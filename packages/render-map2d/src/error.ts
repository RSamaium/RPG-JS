export class TerrainMapValidationError extends TypeError {
  constructor(
    public readonly path: string,
    message: string,
  ) {
    super(`${path}: ${message}`);
    this.name = "TerrainMapValidationError";
  }
}
