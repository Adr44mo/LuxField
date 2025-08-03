import { MapBase, MapConfig, PlayerInfo } from './MapBase';
import { GameEngine } from '../shared/entities/GameEngine';

export class DuelMap extends MapBase {
  config: MapConfig = {
    id: 'duel',
    name: 'Duel Arena',
    description: 'Small 1v1 map with intense close-quarters combat',
    minPlayers: 2,
    maxPlayers: 2,
    width: 800,
    height: 600
  };

  generateMap(gameEngine: GameEngine, players: PlayerInfo[]): void {
    const { width, height } = this.config;
    const centerX = width / 2;
    const centerY = height / 2;
    
    // Create two player bases on opposite sides
    if (players.length >= 1) {
      this.createPlanet(gameEngine, {
        id: 'base1',
        x: 150,
        y: centerY,
        radius: 50,
        color: players[0].color,
        owner: players[0].team,
        health: 120,
        maxHealth: 120,
        maxUnits: 12,
        productionSpeed: 1.5
      });
    }
    
    if (players.length >= 2) {
      this.createPlanet(gameEngine, {
        id: 'base2',
        x: width - 150,
        y: centerY,
        radius: 50,
        color: players[1].color,
        owner: players[1].team,
        health: 120,
        maxHealth: 120,
        maxUnits: 12,
        productionSpeed: 1.5
      });
    }
    
    // Central contested planet
    this.createPlanet(gameEngine, {
      id: 'center',
      x: centerX,
      y: centerY,
      radius: 40,
      color: 0x888888,
      owner: 0,
      health: 100,
      maxHealth: 100,
      maxUnits: 10,
      productionSpeed: 1.2
    });
    
    // Small resource planets
    this.createPlanet(gameEngine, {
      id: 'resource1',
      x: centerX,
      y: centerY - 120,
      radius: 30,
      color: 0x888888,
      owner: 0,
      health: 80,
      maxHealth: 80,
      maxUnits: 6,
      productionSpeed: 1
    });
    
    this.createPlanet(gameEngine, {
      id: 'resource2',
      x: centerX,
      y: centerY + 120,
      radius: 30,
      color: 0x888888,
      owner: 0,
      health: 80,
      maxHealth: 80,
      maxUnits: 6,
      productionSpeed: 1
    });
  }
}
