import { GameEngine } from '../shared/entities/GameEngine';
import { CorePlanet } from '../shared/entities/CorePlanet';
import { CoreUnit } from '../shared/entities/CoreUnit';

export interface MapConfig {
  id: string;
  name: string;
  description: string;
  minPlayers: number;
  maxPlayers: number;
  width: number;
  height: number;
}

export interface PlayerInfo {
  id: string;
  team: number;
  color: number;
}

export abstract class MapBase {
  abstract config: MapConfig;
  
  abstract generateMap(gameEngine: GameEngine, players: PlayerInfo[]): void;
  
  protected createPlanet(gameEngine: GameEngine, params: {
    id: string;
    x: number;
    y: number;
    radius: number;
    color: number;
    owner: number;
    maxUnits?: number;
    productionSpeed?: number;
    health?: number;
    maxHealth?: number;
  }) {
    const planet = new CorePlanet({
      id: params.id,
      x: params.x,
      y: params.y,
      radius: params.radius,
      color: params.color,
      owner: params.owner,
      maxUnits: params.maxUnits || 8,
      productionSpeed: params.productionSpeed || 1,
      health: params.health || 100,
      maxHealth: params.maxHealth || 100
    });
    gameEngine.addPlanet(planet);
    return planet;
  }
  
  protected createUnit(gameEngine: GameEngine, params: {
    id: string;
    planetId: string;
    angle: number;
    distance: number;
    color: number;
    owner: number;
    health?: number;
    damage?: number;
    production?: number;
  }) {
    const unit = new CoreUnit({
      id: params.id,
      planetId: params.planetId,
      angle: params.angle,
      distance: params.distance,
      color: params.color,
      owner: params.owner,
      stats: {
        health: params.health || 100,
        damage: params.damage || 10,
        production: params.production || 1
      },
      isOrbiting: true
    });
    gameEngine.addUnit(unit);
    return unit;
  }
}
