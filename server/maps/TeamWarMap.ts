import { MapBase, MapConfig, PlayerInfo } from './MapBase';
import { GameEngine } from '../shared/entities/GameEngine';

export class TeamWarMap extends MapBase {
  config: MapConfig = {
    id: 'teamwar',
    name: 'Team War',
    description: 'Designed for 3v3 team battles with strategic chokepoints',
    minPlayers: 4,
    maxPlayers: 6,
    width: 1400,
    height: 900
  };

  generateMap(gameEngine: GameEngine, players: PlayerInfo[]): void {
    const { width, height } = this.config;
    const centerX = width / 2;
    const centerY = height / 2;
    
    // Create player bases - 3 on each side
    const leftSide = width * 0.2;
    const rightSide = width * 0.8;
    const playerCount = Math.min(players.length, 6);
    
    // Team 1 (left side) - teams 1, 2, 3
    for (let i = 0; i < Math.min(3, playerCount); i++) {
      const y = height * (0.2 + (i * 0.3));
      
      this.createPlanet(gameEngine, {
        id: `team1_base${i + 1}`,
        x: leftSide,
        y,
        radius: 45,
        color: players[i].color,
        owner: players[i].team,
        health: 130,
        maxHealth: 130,
        maxUnits: 12,
        productionSpeed: 1.6
      });
    }
    
    // Team 2 (right side) - teams 4, 5, 6
    for (let i = 3; i < playerCount; i++) {
      const y = height * (0.2 + ((i - 3) * 0.3));
      
      this.createPlanet(gameEngine, {
        id: `team2_base${i - 2}`,
        x: rightSide,
        y,
        radius: 45,
        color: players[i].color,
        owner: players[i].team,
        health: 130,
        maxHealth: 130,
        maxUnits: 12,
        productionSpeed: 1.6
      });
    }
    
    // Central bridge chokepoint
    this.createPlanet(gameEngine, {
      id: 'bridge',
      x: centerX,
      y: centerY,
      radius: 50,
      color: 0x888888,
      owner: 0,
      health: 180,
      maxHealth: 180,
      maxUnits: 15,
      productionSpeed: 2.2
    });
    
    // Strategic control points along the middle
    const controlPoints = [
      { x: centerX, y: centerY - 150 },
      { x: centerX, y: centerY + 150 },
      { x: centerX - 200, y: centerY },
      { x: centerX + 200, y: centerY }
    ];
    
    controlPoints.forEach((point, i) => {
      this.createPlanet(gameEngine, {
        id: `control${i + 1}`,
        x: point.x,
        y: point.y,
        radius: 35,
        color: 0x888888,
        owner: 0,
        health: 100,
        maxHealth: 100,
        maxUnits: 10,
        productionSpeed: 1.4
      });
    });
    
    // Side resource planets
    const leftResources = [
      { x: leftSide - 80, y: centerY - 100 },
      { x: leftSide - 80, y: centerY + 100 }
    ];
    
    const rightResources = [
      { x: rightSide + 80, y: centerY - 100 },
      { x: rightSide + 80, y: centerY + 100 }
    ];
    
    [...leftResources, ...rightResources].forEach((resource, i) => {
      this.createPlanet(gameEngine, {
        id: `resource${i + 1}`,
        x: resource.x,
        y: resource.y,
        radius: 30,
        color: 0x888888,
        owner: 0,
        health: 90,
        maxHealth: 90,
        maxUnits: 8,
        productionSpeed: 1.2
      });
    });
  }
}
