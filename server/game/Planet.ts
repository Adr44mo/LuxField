export type Unit = {
  id: string;
  angle: number;
  distance: number;
  color: number;
  owner: number;
  target?: { x: number; y: number } | null;
  x?: number;
  y?: number;
  isOrbiting?: boolean;
};

export type Planet = {
  x: number;
  y: number;
  radius: number;
  color: number;
  owner: number;
  maxUnits: number;
  productionSpeed: number;
  units: Unit[];
  lastProducedAt: number;
};
