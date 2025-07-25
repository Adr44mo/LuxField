// Core Planet class - shared between client and server
import { PlanetData, UnitData, Stats, PlayerID, Position } from '../types';

export class CorePlanet {
  id: string;
  x: number;
  y: number;
  radius: number;
  color: number;
  owner: PlayerID;
  stats: Stats;
  maxUnits: number;
  productionSpeed: number;
  lastProducedAt: number;
  units: UnitData[] = [];

  constructor(data: Partial<PlanetData> & { id: string; x: number; y: number }) {
    this.id = data.id;
    this.x = data.x;
    this.y = data.y;
    this.radius = data.radius || 40;
    this.color = data.color || 0x888888;
    this.owner = data.owner || 0;
    this.stats = data.stats || { health: 100, damage: 10, production: 1 };
    this.maxUnits = data.maxUnits || 8;
    this.productionSpeed = data.productionSpeed || 1;
    this.lastProducedAt = 0;
    this.units = data.units || [];
  }

  // Core game logic methods
  canProduceUnit(currentTime: number): boolean {
    return this.units.length < this.maxUnits && 
           currentTime - this.lastProducedAt >= (1000 / this.productionSpeed);
  }

  produceUnit(currentTime: number): UnitData | null {
    if (!this.canProduceUnit(currentTime)) return null;
    
    const unit: UnitData = {
      id: `unit_${this.id}_${currentTime}_${Math.random().toString(36)}`,
      planetId: this.id,
      angle: Math.random() * Math.PI * 2,
      distance: this.radius + 20,
      color: this.color,
      owner: this.owner,
      stats: { ...this.stats },
      isOrbiting: true
    };
    
    this.units.push(unit);
    this.lastProducedAt = currentTime;
    return unit;
  }

  removeUnit(unitId: string): boolean {
    const index = this.units.findIndex(u => u.id === unitId);
    if (index >= 0) {
      this.units.splice(index, 1);
      return true;
    }
    return false;
  }

  getUnitsInRange(center: Position, range: number): UnitData[] {
    return this.units.filter(unit => {
      if (!unit.x || !unit.y) return false;
      const dx = unit.x - center.x;
      const dy = unit.y - center.y;
      return Math.sqrt(dx * dx + dy * dy) <= range;
    });
  }

  toData(): PlanetData {
    return {
      id: this.id,
      x: this.x,
      y: this.y,
      radius: this.radius,
      color: this.color,
      owner: this.owner,
      stats: this.stats,
      maxUnits: this.maxUnits,
      productionSpeed: this.productionSpeed,
      units: this.units
    };
  }
}
