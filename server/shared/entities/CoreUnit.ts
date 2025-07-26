// Core Unit class - shared between client and server
import { UnitData, Stats, PlayerID, Position } from '../types';

export class CoreUnit {
  id: string;
  planetId: string;
  angle: number;
  distance: number;
  color: number;
  owner: PlayerID;
  stats: Stats;
  x?: number;
  y?: number;
  target?: Position | null;
  isOrbiting: boolean;
  moveSpeed: number = 50; // pixels per second

  constructor(data: UnitData) {
    this.id = data.id;
    this.planetId = data.planetId;
    this.angle = data.angle;
    this.distance = data.distance;
    this.color = data.color;
    this.owner = data.owner;
    this.stats = data.stats;
    this.x = data.x;
    this.y = data.y;
    this.target = data.target;
    this.isOrbiting = data.isOrbiting;
  }

  // Update unit position based on time
  updatePosition(planetX: number, planetY: number, deltaTime: number): void {
    if (this.target && !this.isOrbiting) {
      // Moving to target - smoother movement
      const dx = this.target.x - (this.x || 0);
      const dy = this.target.y - (this.y || 0);
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance > 3) {
        // Still moving - use smooth interpolation
        const moveDistance = this.moveSpeed * deltaTime;
        const ratio = Math.min(moveDistance / distance, 1);
        this.x = (this.x || 0) + dx * ratio;
        this.y = (this.y || 0) + dy * ratio;
      } else {
        // Reached target
        this.x = this.target.x;
        this.y = this.target.y;
        this.target = null;
        this.isOrbiting = false;
      }
    } else if (this.isOrbiting) {
      // Orbiting planet - smooth rotation
      this.angle += deltaTime * 0.8; // slightly faster rotation
      this.x = planetX + Math.cos(this.angle) * this.distance;
      this.y = planetY + Math.sin(this.angle) * this.distance;
    }
  }

  // Set movement target
  setTarget(target: Position): void {
    this.target = target;
    this.isOrbiting = false;
  }

  // Check if unit is at a position
  isAtPosition(pos: Position, threshold: number = 10): boolean {
    if (!this.x || !this.y) return false;
    const dx = this.x - pos.x;
    const dy = this.y - pos.y;
    return Math.sqrt(dx * dx + dy * dy) <= threshold;
  }

  // Check if unit collides with another unit
  collidesWith(other: CoreUnit, threshold: number = 15): boolean {
    if (!this.x || !this.y || !other.x || !other.y) return false;
    const dx = this.x - other.x;
    const dy = this.y - other.y;
    return Math.sqrt(dx * dx + dy * dy) <= threshold;
  }

  toData(): UnitData {
    return {
      id: this.id,
      planetId: this.planetId,
      angle: this.angle,
      distance: this.distance,
      color: this.color,
      owner: this.owner,
      stats: this.stats,
      x: this.x,
      y: this.y,
      target: this.target,
      isOrbiting: this.isOrbiting
    };
  }
}
