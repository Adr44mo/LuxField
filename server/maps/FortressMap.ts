import { MapBase, MapConfig, PlayerInfo } from './MapBase';
import { GameEngine } from '../shared/entities/GameEngine';

export class FortressMap extends MapBase {
  config: MapConfig = {
    id: 'fortress',
    name: 'Fortress',
    description: 'Defensive map with fortified positions and chokepoints',
    minPlayers: 2,
    maxPlayers: 4,
    width: 1600,
    height: 1000
  };

  generateMap(gameEngine: GameEngine, players: PlayerInfo[]): void {
    const { width, height } = this.config;
    const centerX = width / 2;
    const centerY = height / 2;
    
    // Create player fortresses in corners
    const fortressPositions = [
      { x: 200, y: 200 },
      { x: width - 200, y: 200 },
      { x: 200, y: height - 200 },
      { x: width - 200, y: height - 200 }
    ];
    
    players.forEach((player, idx) => {
      const pos = fortressPositions[idx % fortressPositions.length];
      
      // Main fortress planet
      const fortress = this.createPlanet(gameEngine, {
        id: `fortress_${player.team}`,
        x: pos.x,
        y: pos.y,
        radius: 60,
        color: player.color,
        owner: player.team,
        maxUnits: 15,
        productionSpeed: 2,
        health: 200,
        maxHealth: 200
      });
      
      // Defense satellites around fortress
      for (let i = 0; i < 3; i++) {
        const angle = (i * Math.PI * 2) / 3;
        const satX = pos.x + Math.cos(angle) * 120;
        const satY = pos.y + Math.sin(angle) * 120;
        
        this.createPlanet(gameEngine, {
          id: `satellite_${player.team}_${i}`,
          x: satX,
          y: satY,
          radius: 25,
          color: player.color,
          owner: player.team,
          maxUnits: 5,
          productionSpeed: 0.8,
          health: 80,
          maxHealth: 80
        });
      }
      
      // Add starting units
      for (let i = 0; i < 5; i++) {
        this.createUnit(gameEngine, {
          id: `player_${player.team}_unit_${i}`,
          planetId: fortress.id,
          angle: (i * Math.PI * 2) / 5,
          distance: 80,
          color: player.color,
          owner: player.team,
          health: 150,
          damage: 20,
          production: 1
        });
      }
    });
    
    // Add neutral strategic points and chokepoints
    const strategicPoints = [
      // Center control point
      { x: centerX, y: centerY, radius: 50, maxUnits: 12 },
      
      // Chokepoint controls
      { x: centerX - 300, y: centerY, radius: 35, maxUnits: 8 },
      { x: centerX + 300, y: centerY, radius: 35, maxUnits: 8 },
      { x: centerX, y: centerY - 250, radius: 35, maxUnits: 8 },
      { x: centerX, y: centerY + 250, radius: 35, maxUnits: 8 },
      
      // Resource outposts
      { x: centerX - 400, y: centerY - 300, radius: 30, maxUnits: 6 },
      { x: centerX + 400, y: centerY - 300, radius: 30, maxUnits: 6 },
      { x: centerX - 400, y: centerY + 300, radius: 30, maxUnits: 6 },
      { x: centerX + 400, y: centerY + 300, radius: 30, maxUnits: 6 }
    ];
    
    strategicPoints.forEach((point, idx) => {
      this.createPlanet(gameEngine, {
        id: `strategic_${idx + 1}`,
        x: point.x,
        y: point.y,
        radius: point.radius,
        color: 0x888888,
        owner: 0,
        maxUnits: point.maxUnits,
        productionSpeed: 1,
        health: 120,
        maxHealth: 120
      });
    });
  }
}
