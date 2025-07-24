import type { GameState } from './GameState';

export function startGameLoop(gameState: GameState, broadcast: (gs: GameState) => void): NodeJS.Timeout {
  const TICK_MS = 50;
  return setInterval(() => {
    gameState.time += TICK_MS;
    const now = Date.now();
    for (const planet of gameState.planets) {
      // Production
      if (
        planet.units.length < planet.maxUnits &&
        now - planet.lastProducedAt > 1000 / planet.productionSpeed
      ) {
        const angle = Math.random() * Math.PI * 2;
        planet.units.push({
          angle,
          distance: 100,
          color: planet.color,
          owner: planet.owner
        });
        planet.lastProducedAt = now;
      }
      // Animation (orbit)
      for (const unit of planet.units) {
        unit.angle += 0.01;
      }
    }
    broadcast(gameState);
  }, TICK_MS);
}
