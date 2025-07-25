// SelectionUtils: helper functions for selection logic
import { Unit } from '../entities/Unit';
import { Planet } from '../entities/Planet';

export function isPointInCircle(x: number, y: number, cx: number, cy: number, r: number) {
  const dx = x - cx;
  const dy = y - cy;
  return Math.sqrt(dx * dx + dy * dy) < r;
}

export function getUnitsInRect(units: Unit[], x1: number, y1: number, x2: number, y2: number, team: number) {
  return units.filter(u => u.owner === team && u.circle.x >= x1 && u.circle.x <= x2 && u.circle.y >= y1 && u.circle.y <= y2);
}

export function getUnitsAroundPlanet(units: Unit[], planet: Planet, team: number) {
  return units.filter(u => {
    const dist = Math.sqrt((u.circle.x - planet.x) ** 2 + (u.circle.y - planet.y) ** 2);
    return u.owner === team && !u.target && dist < planet.radius + 60;
  });
}
