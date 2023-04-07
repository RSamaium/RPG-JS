export class Vector2d {
    constructor(public x: number, public y: number, public z: number = 0) {}

    set(vector: Vector2d) {
        this.x = vector.x
        this.y = vector.y
        this.z = vector.z
        return this
    }
    
    add(vector: Vector2d) {
        this.x += vector.x
        this.y += vector.y
        return this
    }

    subtract(vector: Vector2d) {
        this.x -= vector.x
        this.y -= vector.y
        return this
    }

    multiply(scalar: number) {
        this.x *= scalar
        this.y *= scalar
        return this
    }

    divide(scalar: number) {
        this.x /= scalar
        this.y /= scalar
        return this
    }

    distanceWith(vector: Vector2d): number {
        const dx = this.x - vector.x
        const dy = this.y - vector.y
        return Math.sqrt(dx ** 2 + dy ** 2)
    }

    magnitude(): number {
        return Math.sqrt(this.x * this.x + this.y * this.y)
    }

    copy(): Vector2d {
        return new Vector2d(this.x, this.y, this.z)
    }

    normalize() {
        return this.divide(this.magnitude())
    }

    isEqual(vector: Vector2d): boolean {
        return this.x === vector.x && 
        this.y === vector.y &&
        this.z === vector.z
    }

    hasDifferentValues(vector: Vector2d): boolean {
        return this.x !== vector.x || 
        this.y !== vector.y ||
        this.z !== vector.z
    }
}

export class Vector2dZero extends Vector2d {
    constructor() {
        super(0, 0)
    }
}
