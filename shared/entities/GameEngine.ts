// Game Engine - authoritative game logic
import { CorePlanet } from '../entities/CorePlanet';
import { CoreUnit } from '../entities/CoreUnit';
import { GameState, PlayerID, Position, MoveCommand } from '../types';

export class GameEngine {
  planets: Map<string, CorePlanet> = new Map();
  units: Map<string, CoreUnit> = new Map();
  currentTime: number = 0;
  lastUpdateTime: number = 0;

  constructor() {
    this.currentTime = Date.now();
    this.lastUpdateTime = this.currentTime;
  }

  // Add planet to game
  addPlanet(planet: CorePlanet): void {
    this.planets.set(planet.id, planet);
  }

  // Add unit to game
  addUnit(unit: CoreUnit): void {
    this.units.set(unit.id, unit);
  }

  // Remove unit from game
  removeUnit(unitId: string): boolean {
    const unit = this.units.get(unitId);
    if (unit) {
      // Remove from planet
      const planet = this.planets.get(unit.planetId);
      if (planet) {
        planet.removeUnit(unitId);
      }
      this.units.delete(unitId);
      return true;
    }
    return false;
  }

  // Move units command
  moveUnits(command: MoveCommand, playerId: PlayerID): boolean {
    let moved = false;
    for (const unitId of command.unitIds) {
      const unit = this.units.get(unitId);
      if (unit && unit.owner === playerId) {
        unit.setTarget(command.target);
        moved = true;
      }
    }
    return moved;
  }

  // Get units owned by player
  getPlayerUnits(playerId: PlayerID): CoreUnit[] {
    return Array.from(this.units.values()).filter(unit => unit.owner === playerId);
  }

  // Get units in rectangular area
  getUnitsInRect(x1: number, y1: number, x2: number, y2: number, playerId?: PlayerID): CoreUnit[] {
    return Array.from(this.units.values()).filter(unit => {
      if (playerId !== undefined && unit.owner !== playerId) return false;
      if (!unit.x || !unit.y) return false;
      return unit.x >= x1 && unit.x <= x2 && unit.y >= y1 && unit.y <= y2;
    });
  }

  // Get units around planet
  getUnitsAroundPlanet(planetId: string, playerId?: PlayerID): CoreUnit[] {
    const planet = this.planets.get(planetId);
    if (!planet) return [];
    
    return Array.from(this.units.values()).filter(unit => {
      if (playerId !== undefined && unit.owner !== playerId) return false;
      if (!unit.x || !unit.y || unit.target) return false;
      
      const dx = unit.x - planet.x;
      const dy = unit.y - planet.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      return distance <= planet.radius + 30;
    });
  }

  // Update game state
  update(): GameState {
    this.currentTime = Date.now();
    const deltaTime = (this.currentTime - this.lastUpdateTime) / 1000; // seconds
    this.lastUpdateTime = this.currentTime;

    // Update all units with smooth movement
    for (const unit of this.units.values()) {
      const planet = this.planets.get(unit.planetId);
      if (planet) {
        unit.updatePosition(planet.x, planet.y, deltaTime);
      }
    }

    // Handle collisions
    this.handleCollisions();

    // Produce new units
    for (const planet of this.planets.values()) {
      if (planet.owner > 0) { // Only for owned planets
        const newUnit = planet.produceUnit(this.currentTime);
        if (newUnit) {
          this.addUnit(new CoreUnit(newUnit));
        }
      }
    }

    // Return current game state
    return this.getGameState();
  }

  // Handle unit collisions
  private handleCollisions(): void {
    const allUnits = Array.from(this.units.values());
    
    for (let i = 0; i < allUnits.length; i++) {
      const unit1 = allUnits[i];
      if (!unit1.x || !unit1.y) continue;
      
      for (let j = i + 1; j < allUnits.length; j++) {
        const unit2 = allUnits[j];
        if (!unit2.x || !unit2.y) continue;
        
        // Only collide enemy units
        if (unit1.owner !== unit2.owner && unit1.collidesWith(unit2)) {
          this.removeUnit(unit1.id);
          this.removeUnit(unit2.id);
          break; // unit1 is destroyed, exit inner loop
        }
      }
    }
  }

  // Get current game state
  getGameState(): GameState {
    const planetsData = Array.from(this.planets.values()).map(planet => {
      const planetData = planet.toData();
      // Update planet units with current unit data
      planetData.units = Array.from(this.units.values())
        .filter(unit => unit.planetId === planet.id)
        .map(unit => unit.toData());
      return planetData;
    });

    return {
      time: this.currentTime,
      planets: planetsData
    };
  }
}
