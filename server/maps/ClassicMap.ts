import { MapBase, MapConfig, PlayerInfo } from './MapBase';
import { GameEngine } from '../shared/entities/GameEngine';

export class ClassicMap extends MapBase {
  config: MapConfig = {
    id: 'classic',
    name: 'Classic',
    description: 'Traditional symmetrical map with player bases on opposite sides',
    minPlayers: 2,
    maxPlayers: 4,
    width: 1200,
    height: 800
  };

  generateMap(gameEngine: GameEngine, players: PlayerInfo[]): void {
    const { width, height } = this.config;
    const centerX = width / 2;
    const centerY = height / 2;
    
    // Create player planets in a circle formation
    const angleStep = (Math.PI * 2) / players.length;
    const playerRadius = Math.min(width, height) * 0.35;
    
    players.forEach((player, idx) => {
      const angle = idx * angleStep;
      const x = centerX + Math.cos(angle) * playerRadius;
      const y = centerY + Math.sin(angle) * playerRadius;
      
      const planet = this.createPlanet(gameEngine, {
        id: `player_planet_${player.team}`,
        x,
        y,
        radius: 50,
        color: player.color,
        owner: player.team,
        maxUnits: 10,
        productionSpeed: 1.5,
        health: 150,
        maxHealth: 150
      });
      
      // Add starting units
      for (let i = 0; i < 4; i++) {
        this.createUnit(gameEngine, {
          id: `player_${player.team}_unit_${i}`,
          planetId: planet.id,
          angle: (i * Math.PI * 2) / 4,
          distance: 70,
          color: player.color,
          owner: player.team,
          health: 120,
          damage: 15,
          production: 1
        });
      }
    });
    
    // Add neutral planets
    const neutralPlanets = [
      { x: centerX, y: centerY, radius: 40, maxUnits: 8 },
      { x: centerX - 200, y: centerY - 150, radius: 30, maxUnits: 6 },
      { x: centerX + 200, y: centerY - 150, radius: 30, maxUnits: 6 },
      { x: centerX - 200, y: centerY + 150, radius: 30, maxUnits: 6 },
      { x: centerX + 200, y: centerY + 150, radius: 30, maxUnits: 6 }
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
        productionSpeed: 0.7,
        health: 100,
        maxHealth: 100
      });
    });
  }
}
