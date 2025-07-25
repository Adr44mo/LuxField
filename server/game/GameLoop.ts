import type { GameState } from './GameState';

export function startGameLoop(gameState: GameState, broadcast: (gs: GameState) => void): ReturnType<typeof setInterval> {
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
        const id = `p${planet.owner}u${Math.floor(Math.random()*1e9)}`;
        const x = planet.x + Math.cos(angle) * 100;
        const y = planet.y + Math.sin(angle) * 100;
        planet.units.push({
          id,
          angle,
          distance: 100,
          color: planet.color,
          owner: planet.owner,
          target: null,
          x,
          y,
          isOrbiting: true
        });
        planet.lastProducedAt = now;
      }
      // Movement and orbit
      for (const unit of planet.units) {
        if (unit.target) {
          // Move toward target
          const dx = unit.target.x - (unit.x ?? (planet.x + Math.cos(unit.angle) * unit.distance));
          const dy = unit.target.y - (unit.y ?? (planet.y + Math.sin(unit.angle) * unit.distance));
          const dist = Math.sqrt(dx * dx + dy * dy);
          const speed = 2; // px per tick
          if (dist < speed) {
            unit.x = unit.target.x;
            unit.y = unit.target.y;
            unit.target = null;
            unit.isOrbiting = false;
          } else {
            const nx = dx / dist;
            const ny = dy / dist;
            unit.x = (unit.x ?? (planet.x + Math.cos(unit.angle) * unit.distance)) + nx * speed;
            unit.y = (unit.y ?? (planet.y + Math.sin(unit.angle) * unit.distance)) + ny * speed;
            unit.isOrbiting = false;
          }
        } else {
          // Only orbit if close to planet (within 110px)
          const px = planet.x + Math.cos(unit.angle) * unit.distance;
          const py = planet.y + Math.sin(unit.angle) * unit.distance;
          const ux = unit.x ?? px;
          const uy = unit.y ?? py;
          const dPlanet = Math.sqrt((ux - planet.x) ** 2 + (uy - planet.y) ** 2);
          if (dPlanet < 110) {
            unit.angle += 0.01;
            unit.x = planet.x + Math.cos(unit.angle) * unit.distance;
            unit.y = planet.y + Math.sin(unit.angle) * unit.distance;
            unit.isOrbiting = true;
          } else {
            unit.isOrbiting = false;
          }
        }
      }
    }
    // Collision/fight: check all units for overlap (enemy only)
    const allUnits: any[] = gameState.planets.flatMap(p => p.units.map(u => ({...u, planet: p})));
    const toRemove = new Set<string>();
    for (let i = 0; i < allUnits.length; ++i) {
      for (let j = i + 1; j < allUnits.length; ++j) {
        const a = allUnits[i], b = allUnits[j];
        if (a.owner !== b.owner) {
          const dx = (a.x ?? 0) - (b.x ?? 0);
          const dy = (a.y ?? 0) - (b.y ?? 0);
          if (dx * dx + dy * dy < 24 * 24) { // collision radius
            toRemove.add(a.id);
            toRemove.add(b.id);
          }
        }
      }
    }
    for (const planet of gameState.planets) {
      planet.units = planet.units.filter(u => !toRemove.has(u.id));
    }
    broadcast(gameState);
  }, TICK_MS);
}
