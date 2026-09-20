import { expect, it } from "vitest";
import { PhysicsEngine, assignPolygonCollider, Vector2 } from "@rpgjs/physic";
import { buildStudioTerrainCollisionPolygons } from "../src/map-renderer/collision-polygons";

it('lets a character cross an erased passage while still blocking the adjacent bank', () => {
  const paint = { id: "paint", points: [{ x: 48, y: 72 }, { x: 144, y: 72 }], radius: 40 };
  const polygons = buildStudioTerrainCollisionPolygons({
    params: { width: 4, height: 3 },
    terrainMorphologyLayer: {
      width: 192, height: 144, tileSize: 48,
      features: [{
        id: "hole", kind: "hole", params: { depth: 20 }, strokes: [paint],
        operations: [
          { mode: "paint", stroke: paint },
          { mode: "erase", stroke: { id: "channel", points: [{ x: 96, y: 0 }, { x: 96, y: 144 }], radius: 18 } },
        ],
      }],
    },
  });
  const engine = new PhysicsEngine({ timeStep: 1 / 60 });
  for (const polygon of polygons) {
    const x = polygon.x + polygon.width / 2, y = polygon.y + polygon.height / 2;
    const body = engine.createStaticObstacle(polygon.id, { x, y, width: polygon.width, height: polygon.height });
    assignPolygonCollider(body, { vertices: polygon.points.map(([px, py]) => new Vector2(px - x, py - y)) });
    // All pieces must stay convex for the physics SAT tests, including sharp turns.
    polygon.points.forEach(([ax, ay], i, points) => {
      const [bx, by] = points[(i + 1) % points.length];
      const [cx, cy] = points[(i + 2) % points.length];
      expect((bx - ax) * (cy - by) - (by - ay) * (cx - bx)).toBeGreaterThanOrEqual(0);
    });
  }
  const hero = engine.createCharacter('hero', { x: 96, y: 8, hitbox: 8, speed: 120 });
  const blocked = engine.createCharacter('blocked', { x: 48, y: 8, hitbox: 8, speed: 120 });
  for (let tick = 0; tick < 60; tick++) engine.stepFrame({ hero: 'down', blocked: 'down' });
  expect(hero.position.y).toBeGreaterThan(110);
  expect(Math.abs(hero.position.x - 96)).toBeLessThan(1);
  expect(blocked.position.y).toBeLessThan(32);
});

