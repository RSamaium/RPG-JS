import { AABB } from '../core/math/AABB';
import { Vector2 } from '../core/math/Vector2';
import { Entity } from '../physics/Entity';
import { Collider, CollisionInfo, ContactPoint } from './Collider';
import { CircleCollider } from './CircleCollider';
import { Ray, RaycastHit } from './Ray';

/**
 * AABB (Axis-Aligned Bounding Box) collider implementation
 * 
 * Represents a rectangular collision shape aligned with the axes.
 * 
 * @example
 * ```typescript
 * const entity = new Entity({ position: { x: 0, y: 0 }, width: 10, height: 10 });
 * const collider = new AABBCollider(entity);
 * ```
 */
export class AABBCollider implements Collider {
  private entity: Entity;

  /**
   * Creates a new AABB collider
   * 
   * @param entity - Entity this collider belongs to
   */
  constructor(entity: Entity) {
    this.entity = entity;
  }

  /**
   * Gets the AABB bounds
   * 
   * @returns AABB
   */
  public getBounds(): AABB {
    const center = this.entity.position;
    const halfWidth = this.entity.width / 2;
    const halfHeight = this.entity.height / 2;

    return new AABB(
      center.x - halfWidth,
      center.y - halfHeight,
      center.x + halfWidth,
      center.y + halfHeight
    );
  }

  /**
   * @inheritdoc
   */
  public testCollision(other: Collider): CollisionInfo | null {
    if (other instanceof CircleCollider) {
      // Circle-AABB collision is handled by CircleCollider
      const collision = other.testCollision(this);
      if (collision) {
        // Swap entities and reverse normal
        return {
          entityA: collision.entityB,
          entityB: collision.entityA,
          contacts: collision.contacts.map((c) => ({
            point: c.point,
            normal: c.normal.mul(-1),
            depth: c.depth,
          })),
          normal: collision.normal.mul(-1),
          depth: collision.depth,
        };
      }
      return null;
    } else if (other instanceof AABBCollider) {
      return this.testAABBAABB(other);
    }
    return null;
  }

  /**
   * Tests collision with another AABB
   * 
   * @param other - Other AABB collider
   * @returns Collision info or null
   */
  private testAABBAABB(other: AABBCollider): CollisionInfo | null {
    const aabbA = this.getBounds();
    const aabbB = other.getBounds();

    if (!aabbA.intersects(aabbB)) {
      return null;
    }

    // Calculate intersection
    const intersection = aabbA.intersection(aabbB);
    if (!intersection) {
      return null;
    }

    // Calculate penetration depth and normal
    const overlapX = Math.min(
      aabbA.maxX - aabbB.minX,
      aabbB.maxX - aabbA.minX
    );
    const overlapY = Math.min(
      aabbA.maxY - aabbB.minY,
      aabbB.maxY - aabbA.minY
    );

    let normal: Vector2;
    let depth: number;

    if (overlapX < overlapY) {
      // Collision on X axis
      depth = overlapX;
      normal = aabbA.getCenterX() < aabbB.getCenterX()
        ? new Vector2(1, 0)
        : new Vector2(-1, 0);
    } else {
      // Collision on Y axis
      depth = overlapY;
      normal = aabbA.getCenterY() < aabbB.getCenterY()
        ? new Vector2(0, 1)
        : new Vector2(0, -1);
    }

    const contactPoint = intersection.getCenter();

    return {
      entityA: this.entity,
      entityB: other.entity,
      contacts: [
        {
          point: contactPoint,
          normal,
          depth,
        },
      ],
      normal,
      depth,
    };
  }

  /**
   * @inheritdoc
   */
  public getContactPoints(other: Collider): ContactPoint[] {
    const collision = this.testCollision(other);
    return collision?.contacts ?? [];
  }

  /**
   * @inheritdoc
   */
  public getEntity(): Entity {
    return this.entity;
  }

  /**
   * @inheritdoc
   */
  public raycast(ray: Ray): RaycastHit | null {
    const bounds = this.getBounds();
    // A ray parallel to an axis never crosses that slab: it is either inside it
    // for its whole length or outside. Dividing would give 0/0 on an edge.
    const slab = (min: number, max: number, origin: number, direction: number): [number, number] | null => {
      if (direction === 0) {
        return origin < min || origin > max ? null : [-Infinity, Infinity];
      }
      const a = (min - origin) / direction;
      const b = (max - origin) / direction;
      return a < b ? [a, b] : [b, a];
    };
    const slabX = slab(bounds.minX, bounds.maxX, ray.origin.x, ray.direction.x);
    const slabY = slab(bounds.minY, bounds.maxY, ray.origin.y, ray.direction.y);
    if (!slabX || !slabY) {
      return null;
    }

    const [t1, t2] = slabX;
    const [t3, t4] = slabY;

    const tNear = Math.max(t1, t3);
    const tFar = Math.min(t2, t4);

    if (tNear > tFar || tFar < 0) {
      return null;
    }

    if (tNear > ray.length) {
      return null;
    }

    const t = tNear < 0 ? tFar : tNear;
    if (t < 0) return null; // Should be covered by tFar < 0 check but safe

    const point = ray.getPoint(t);

    // Calculate normal
    let normal = new Vector2(0, 0);
    if (Math.abs(point.x - bounds.minX) < 1e-5) normal.set(-1, 0);
    else if (Math.abs(point.x - bounds.maxX) < 1e-5) normal.set(1, 0);
    else if (Math.abs(point.y - bounds.minY) < 1e-5) normal.set(0, -1);
    else if (Math.abs(point.y - bounds.maxY) < 1e-5) normal.set(0, 1);

    return {
      entity: this.entity,
      point,
      normal,
      distance: t,
    };
  }
}

