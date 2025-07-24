export type Unit = {
  angle: number;
  distance: number;
  color: number;
  owner: number;
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
