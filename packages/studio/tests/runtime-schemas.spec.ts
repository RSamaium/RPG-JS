import { describe, expect, test } from "vitest";
import {
  itemSchema,
  skillSchema,
  variableSchema,
} from "../runtime/schemas/database";
import { schemaSetVariable } from "../runtime/blocks/executors/set-variable";
import { eventSchema, pageSchema } from "../runtime/schemas/event";
import { mapSchema } from "../runtime/schemas/map";

describe("Studio runtime schemas", () => {
  test("variable schema requires a name and uses the textarea format contract", () => {
    expect((variableSchema as any).required).toEqual(["name"]);
    expect((variableSchema as any).properties.description.format).toEqual({
      name: "textarea",
    });
  });

  test("event schema exposes computed map ids and removes the animate pattern", () => {
    expect((eventSchema as any).properties["@mapIds"]).toMatchObject({
      type: "array",
      items: { type: "string" },
    });
    expect((pageSchema as any).properties.pattern.enum).toEqual([
      "initial",
      "loop",
      "stop",
    ]);
  });

  test("database schemas use current Studio combat field names", () => {
    const itemCondition = (itemSchema as any).allOf[0];
    const weaponSchema = itemCondition.then;
    const armorSchema = itemCondition.else.then;

    expect(weaponSchema.required).toEqual(["atk"]);
    expect(armorSchema.required).toEqual(["pdef"]);
    expect((skillSchema as any).required).toEqual(["name", "spCost", "power"]);
    expect((skillSchema as any).properties.spCost).toMatchObject({
      type: "number",
      title: "SP Cost",
    });
    expect((skillSchema as any).properties).not.toHaveProperty(
      "casterAnimation",
    );
  });

  test("map schema exposes the map entry workflow collection id", () => {
    expect((mapSchema as any).properties.mapLoadBlockCollectionId).toMatchObject({
      type: ["string", "null"],
      title: "Map Entry Workflow",
    });
  });

  test("set variable schema exposes all supported value sources", () => {
    expect(schemaSetVariable.schema.properties.valueSource.enum).toEqual([
      "constant",
      "variable",
      "random",
      "player_x",
      "player_y",
      "player_direction",
      "map_id",
      "gold",
      "player_id",
      "player_name",
      "level",
      "hp",
      "sp",
      "area_target_id",
      "area_target_kind",
      "area_distance",
      "area_distance_ratio",
      "area_falloff_linear",
    ]);
  });
});
