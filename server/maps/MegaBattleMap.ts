import { MapBase, MapConfig, PlayerInfo } from './MapBase';
import { GameEngine } from '../shared/entities/GameEngine';

export class MegaBattleMap extends MapBase {
  config: MapConfig = {
    id: 'megabattle',
    name: 'Mega Battle',
    description: 'Large 8-player free-for-all map with multiple resource zones',
    minPlayers: 4,
    maxPlayers: 8,
    width: 1600,
    height: 1200
  };

  generateMap(gameEngine: GameEngine, players: PlayerInfo[]): void {
    const { width, height } = this.config;
    const centerX = width / 2;
    const centerY = height / 2;
    
    // Create player bases in a circle formation
    const playerCount = Math.min(players.length, 8);
    const radius = 350;
    
    for (let i = 0; i < playerCount; i++) {
      const angle = (i / playerCount) * Math.PI * 2;
      const x = centerX + Math.cos(angle) * radius;
      const y = centerY + Math.sin(angle) * radius;
      
      this.createPlanet(gameEngine, {
        id: `base${i + 1}`,
        x,
        y,
        radius: 45,
        color: players[i].color,
        owner: players[i].team,
        health: 150,
        maxHealth: 150,
        maxUnits: 15,
        productionSpeed: 1.8
      });
    }
    
    // Central fortress
    this.createPlanet(gameEngine, {
      id: 'fortress',
      x: centerX,
      y: centerY,
      radius: 60,
      color: 0x888888,
      owner: 0,
      health: 200,
      maxHealth: 200,
      maxUnits: 20,
      productionSpeed: 2
    });
    
    // Inner ring of strategic planets
    const innerRadius = 150;
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2;
      const x = centerX + Math.cos(angle) * innerRadius;
      const y = centerY + Math.sin(angle) * innerRadius;
      
      this.createPlanet(gameEngine, {
        id: `inner${i + 1}`,
        x,
        y,
        radius: 35,
        color: 0x888888,
        owner: 0,
        health: 120,
        maxHealth: 120,
        maxUnits: 12,
        productionSpeed: 1.5
      });
    }
    
    // Outer ring of resource planets
    const outerRadius = 500;
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2;
      const x = centerX + Math.cos(angle) * outerRadius;
      const y = centerY + Math.sin(angle) * outerRadius;
      
      // Make sure planets stay within bounds
      if (x > 100 && x < width - 100 && y > 100 && y < height - 100) {
        this.createPlanet(gameEngine, {
          id: `outer${i + 1}`,
          x,
          y,
          radius: 25,
          color: 0x888888,
          owner: 0,
          health: 80,
          maxHealth: 80,
          maxUnits: 8,
          productionSpeed: 1
        });
      }
    }
    
    // Corner strategic points
    const corners = [
      { x: 200, y: 200 },
      { x: width - 200, y: 200 },
      { x: 200, y: height - 200 },
      { x: width - 200, y: height - 200 }
    ];
    
    corners.forEach((corner, i) => {
      this.createPlanet(gameEngine, {
        id: `corner${i + 1}`,
        x: corner.x,
        y: corner.y,
        radius: 40,
        color: 0x888888,
        owner: 0,
        health: 100,
        maxHealth: 100,
        maxUnits: 10,
        productionSpeed: 1.3
      });
    });
  }
}
