import type { Planet } from './Planet';

export type GameState = {
  planets: Planet[];
  time: number; // ms since game start
};

export function createInitialGameState(): GameState {
  const COLORS = [0x3399ff, 0xff6666];
  const now = Date.now();
  return {
    planets: [
      {
        x: 300, y: 300, radius: 60, color: COLORS[0], owner: 1, maxUnits: 10, productionSpeed: 0.5,
        units: Array.from({ length: 3 }, (_, i) => ({
          id: `p1u${i}`,
          angle: (i / 3) * Math.PI * 2,
          distance: 100,
          color: COLORS[0],
          owner: 1,
          target: null,
          x: 300 + Math.cos((i / 3) * Math.PI * 2) * 100,
          y: 300 + Math.sin((i / 3) * Math.PI * 2) * 100
        })),
        lastProducedAt: now
      },
      {
        x: 600, y: 300, radius: 60, color: COLORS[1], owner: 2, maxUnits: 6, productionSpeed: 1.5,
        units: Array.from({ length: 2 }, (_, i) => ({
          id: `p2u${i}`,
          angle: (i / 2) * Math.PI * 2,
          distance: 100,
          color: COLORS[1],
          owner: 2,
          target: null,
          x: 600 + Math.cos((i / 2) * Math.PI * 2) * 100,
          y: 300 + Math.sin((i / 2) * Math.PI * 2) * 100
        })),
        lastProducedAt: now
      }
    ],
    time: 0
  };
}
