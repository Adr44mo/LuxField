// Core Planet class - shared between client and server
import { PlanetData, UnitData, Stats, PlayerID, Position } from '../types';
import { ColorManager } from '../ColorManager';

export class CorePlanet {
  claimingTeam: PlayerID | null = null;
  claimingProgress: number = 0;
  claimingTeamColor: number | null = null; // Store the actual claiming team color
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
  health: number;
  maxHealth: number;

  constructor(data: Partial<PlanetData> & { id: string; x: number; y: number }) {
    this.id = data.id;
    this.x = data.x;
    this.y = data.y;
    this.radius = data.radius || 40;
    this.color = data.color || ColorManager.NEUTRAL_COLOR;
    this.owner = data.owner || 0;
    this.stats = data.stats || { health: 100, damage: 10, production: 1 };
    this.maxUnits = data.maxUnits || 8;
    this.productionSpeed = data.productionSpeed || 1;
    this.lastProducedAt = 0;
    this.units = data.units || [];
    this.maxHealth = data.maxHealth || 100;
    this.health = data.health !== undefined ? data.health : this.maxHealth;
  }

  // Update planet color and all its units
  updateColor(newColor: number): void {
    this.color = newColor;
    this.units.forEach(unit => {
      unit.color = newColor;
    });
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
      units: this.units,
      health: this.health,
      maxHealth: this.maxHealth,
      claimingTeam: this.claimingTeam === null ? undefined : this.claimingTeam,
      claimingTeamColor: this.claimingTeamColor || undefined,
      claimingProgress: this.claimingProgress
    };

  }

  // Helper to get team color (now uses ColorManager)
  getTeamColor(teamId: PlayerID): number {
    return ColorManager.getTeamColor(teamId);
  }
  /**
   * Handle collision with a unit. Returns true if unit should be destroyed.
   */
  handleUnitCollision(unit: UnitData): boolean {
    // Claiming logic for neutral planets
    if (this.owner === 0) {
      if (this.claimingTeam === null || this.claimingTeam === unit.owner) {
        // Start or continue claiming by this team
        this.claimingTeam = unit.owner;
        this.claimingTeamColor = unit.color; // Store the actual unit's color
        this.claimingProgress += 10;
        this.health = Math.min(this.maxHealth, this.claimingProgress);
        if (this.claimingProgress >= this.maxHealth) {
          this.owner = this.claimingTeam;
          this.color = this.claimingTeamColor || unit.color; // Use the stored claiming color
          this.claimingTeam = null;
          this.claimingTeamColor = null;
          this.claimingProgress = 0;
        }
        return true;
      } else {
        // Enemy team attacks: reduce health and claiming progress
        this.health = Math.max(0, this.health - 10);
        this.claimingProgress = Math.max(0, this.claimingProgress - 10);
        if (this.health === 0) {
          // Only reset claiming if health reaches zero
          this.claimingTeam = null;
          this.claimingTeamColor = null;
          this.claimingProgress = 0;
        }
        return true;
      }
    } else if (unit.owner === this.owner && this.owner !== 0) {
      // Allied unit: heal planet only if not at full health
      if (this.health < this.maxHealth) {
        this.health = Math.min(this.maxHealth, this.health + 10);
        return true;
      }
      // If planet is full health, do nothing (no collision)
      return false;
    } else if (unit.owner !== this.owner && unit.owner !== 0) {
      // Enemy unit: damage planet
      this.health = Math.max(0, this.health - 10);
      if (this.health === 0) {
        this.owner = 0; // Set to neutral when health reaches zero
        this.color = ColorManager.NEUTRAL_COLOR; // Reset color to neutral gray
      }
      return true;
    }
    return false;
  }
}
