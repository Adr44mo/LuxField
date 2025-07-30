// Quadtree for spatial partitioning (collision optimization)
export class Quadtree {
  boundary: { x: number; y: number; w: number; h: number };
  capacity: number;
  units: any[];
  divided: boolean;
  northeast?: Quadtree;
  northwest?: Quadtree;
  southeast?: Quadtree;
  southwest?: Quadtree;

  constructor(boundary: { x: number; y: number; w: number; h: number }, capacity: number) {
    this.boundary = boundary;
    this.capacity = capacity;
    this.units = [];
    this.divided = false;
  }

  insert(unit: any): boolean {
    if (!this.contains(unit)) return false;
    if (this.units.length < this.capacity) {
      this.units.push(unit);
      return true;
    }
    if (!this.divided) this.subdivide();
    return (
      this.northeast!.insert(unit) ||
      this.northwest!.insert(unit) ||
      this.southeast!.insert(unit) ||
      this.southwest!.insert(unit)
    );
  }

  contains(unit: any): boolean {
    return (
      unit.x >= this.boundary.x - this.boundary.w &&
      unit.x < this.boundary.x + this.boundary.w &&
      unit.y >= this.boundary.y - this.boundary.h &&
      unit.y < this.boundary.y + this.boundary.h
    );
  }

  subdivide(): void {
    const { x, y, w, h } = this.boundary;
    this.northeast = new Quadtree({ x: x + w / 2, y: y - h / 2, w: w / 2, h: h / 2 }, this.capacity);
    this.northwest = new Quadtree({ x: x - w / 2, y: y - h / 2, w: w / 2, h: h / 2 }, this.capacity);
    this.southeast = new Quadtree({ x: x + w / 2, y: y + h / 2, w: w / 2, h: h / 2 }, this.capacity);
    this.southwest = new Quadtree({ x: x - w / 2, y: y + h / 2, w: w / 2, h: h / 2 }, this.capacity);
    this.divided = true;
  }

  query(range: { x: number; y: number; w: number; h: number }, found: any[] = []): any[] {
    if (!this.intersects(range)) return found;
    for (const unit of this.units) {
      if (
        unit.x >= range.x - range.w &&
        unit.x < range.x + range.w &&
        unit.y >= range.y - range.h &&
        unit.y < range.y + range.h
      ) {
        found.push(unit);
      }
    }
    if (this.divided) {
      this.northeast!.query(range, found);
      this.northwest!.query(range, found);
      this.southeast!.query(range, found);
      this.southwest!.query(range, found);
    }
    return found;
  }

  intersects(range: { x: number; y: number; w: number; h: number }): boolean {
    return !(
      range.x - range.w > this.boundary.x + this.boundary.w ||
      range.x + range.w < this.boundary.x - this.boundary.w ||
      range.y - range.h > this.boundary.y + this.boundary.h ||
      range.y + range.h < this.boundary.y - this.boundary.h
    );
  }
}
