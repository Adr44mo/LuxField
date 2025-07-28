import { MapBase, PlayerInfo } from './MapBase';
import { ClassicMap } from './ClassicMap';
import { BattlegroundMap } from './BattlegroundMap';
import { FortressMap } from './FortressMap';
import { GameEngine } from '../shared/entities/GameEngine';

export class MapManager {
  private static maps: Map<string, MapBase> = new Map([
    ['classic', new ClassicMap()],
    ['battleground', new BattlegroundMap()],
    ['fortress', new FortressMap()]
  ]);

  static getAllMaps() {
    return Array.from(this.maps.values()).map(map => ({
      id: map.config.id,
      name: map.config.name,
      description: map.config.description,
      minPlayers: map.config.minPlayers,
      maxPlayers: map.config.maxPlayers,
      width: map.config.width,
      height: map.config.height
    }));
  }

  static getMap(mapId: string): MapBase | null {
    return this.maps.get(mapId) || null;
  }

  static generateMap(mapId: string, gameEngine: GameEngine, players: PlayerInfo[]): boolean {
    const map = this.getMap(mapId);
    if (!map) {
      console.error(`Map ${mapId} not found`);
      return false;
    }

    if (players.length < map.config.minPlayers || players.length > map.config.maxPlayers) {
      console.error(`Map ${mapId} requires ${map.config.minPlayers}-${map.config.maxPlayers} players, got ${players.length}`);
      return false;
    }

    try {
      map.generateMap(gameEngine, players);
      return true;
    } catch (error) {
      console.error(`Error generating map ${mapId}:`, error);
      return false;
    }
  }

  static getMapDimensions(mapId: string): { width: number; height: number } | null {
    const map = this.getMap(mapId);
    if (!map) return null;
    return {
      width: map.config.width,
      height: map.config.height
    };
  }
}
