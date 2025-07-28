import { MapBase, MapConfig, PlayerInfo } from './MapBase';
import { GameEngine } from '../shared/entities/GameEngine';

export class BattlegroundMap extends MapBase {
  config: MapConfig = {
    id: 'battleground',
    name: 'Battleground',
    description: 'Fast-paced map with many neutral planets in the center',
    minPlayers: 2,
    maxPlayers: 4,
    width: 1400,
    height: 900
  };

  generateMap(gameEngine: GameEngine, players: PlayerInfo[]): void {
    const { width, height } = this.config;
    const centerX = width / 2;
    const centerY = height / 2;
    
    // Create player bases in corners/edges
    const playerPositions = [
      { x: 150, y: 150 },
      { x: width - 150, y: 150 },
      { x: 150, y: height - 150 },
      { x: width - 150, y: height - 150 }
    ];
    
    players.forEach((player, idx) => {
      const pos = playerPositions[idx % playerPositions.length];
      
      const planet = this.createPlanet(gameEngine, {
        id: `player_planet_${player.team}`,
        x: pos.x,
        y: pos.y,
        radius: 45,
        color: player.color,
        owner: player.team,
        maxUnits: 8,
        productionSpeed: 1.2,
        health: 120,
        maxHealth: 120
      });
      
      // Add starting units
      for (let i = 0; i < 3; i++) {
        this.createUnit(gameEngine, {
          id: `player_${player.team}_unit_${i}`,
          planetId: planet.id,
          angle: (i * Math.PI * 2) / 3,
          distance: 65,
          color: player.color,
          owner: player.team,
          health: 100,
          damage: 12,
          production: 1
        });
      }
    });
    
    // Add many neutral planets in center area for contested control
    const neutralPlanets = [
      // Center cluster
      { x: centerX, y: centerY, radius: 35, maxUnits: 10 },
      { x: centerX - 80, y: centerY, radius: 25, maxUnits: 5 },
      { x: centerX + 80, y: centerY, radius: 25, maxUnits: 5 },
      { x: centerX, y: centerY - 80, radius: 25, maxUnits: 5 },
      { x: centerX, y: centerY + 80, radius: 25, maxUnits: 5 },
      
      // Resource points
      { x: centerX - 250, y: centerY - 200, radius: 30, maxUnits: 6 },
      { x: centerX + 250, y: centerY - 200, radius: 30, maxUnits: 6 },
      { x: centerX - 250, y: centerY + 200, radius: 30, maxUnits: 6 },
      { x: centerX + 250, y: centerY + 200, radius: 30, maxUnits: 6 },
      
      // Strategic positions
      { x: centerX - 150, y: centerY - 150, radius: 20, maxUnits: 4 },
      { x: centerX + 150, y: centerY - 150, radius: 20, maxUnits: 4 },
      { x: centerX - 150, y: centerY + 150, radius: 20, maxUnits: 4 },
      { x: centerX + 150, y: centerY + 150, radius: 20, maxUnits: 4 }
    ];
    
    neutralPlanets.forEach((neutral, idx) => {
      this.createPlanet(gameEngine, {
        id: `neutral_${idx + 1}`,
        x: neutral.x,
        y: neutral.y,
        radius: neutral.radius,
        color: 0x888888,
        owner: 0,
        maxUnits: neutral.maxUnits,
        productionSpeed: 0.8,
        health: 80,
        maxHealth: 80
      });
    });
  }
}
