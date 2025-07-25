// Shared types for both client and server
export type PlayerID = number;

export interface Stats {
  health: number;
  damage: number;
  production: number;
}

export interface Position {
  x: number;
  y: number;
}

export interface PlanetData {
  id: string;
  x: number;
  y: number;
  radius: number;
  color: number;
  owner: PlayerID;
  stats: Stats;
  maxUnits: number;
  productionSpeed: number;
  units: UnitData[];
}

export interface UnitData {
  id: string;
  planetId: string;
  angle: number;
  distance: number;
  color: number;
  owner: PlayerID;
  stats: Stats;
  x?: number;
  y?: number;
  target?: Position | null;
  isOrbiting: boolean;
}

export interface GameState {
  time: number;
  planets: PlanetData[];
}

export interface PlayerCommand {
  type: 'move' | 'select';
  playerId: PlayerID;
  data: any;
}

export interface MoveCommand {
  unitIds: string[];
  target: Position;
}
