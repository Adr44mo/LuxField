// SelectionManager: handles all selection logic and highlight updates for units
import { Unit } from '../entities/Unit';
import { Planet } from '../entities/Planet';

export class SelectionManager {
  selectedUnits: Unit[] = [];
  selectedUnit: Unit | null = null;
  private units: Unit[];
  private planets: Planet[];
  private myTeam: number;

  constructor(units: Unit[], planets: Planet[], myTeam: number) {
    this.units = units;
    this.planets = planets;
    this.myTeam = myTeam;
  }

  updateUnitsAndPlanets(units: Unit[], planets: Planet[]) {
    this.units = units;
    this.planets = planets;
  }

  clearSelection() {
    for (const u of this.units) u.setSelected(false);
    this.selectedUnit = null;
    this.selectedUnits = [];
  }

  selectUnit(unit: Unit) {
    this.clearSelection();
    unit.setSelected(true);
    this.selectedUnit = unit;
    this.selectedUnits = [unit];
  }

  selectUnits(units: Unit[]) {
    this.clearSelection();
    for (const u of units) {
      u.setSelected(true);
      this.selectedUnits.push(u);
    }
  }

  selectUnitsInRect(x1: number, y1: number, x2: number, y2: number) {
    this.clearSelection();
    for (const u of this.units) {
      if (u.owner === this.myTeam && u.circle.x >= x1 && u.circle.x <= x2 && u.circle.y >= y1 && u.circle.y <= y2) {
        u.setSelected(true);
        this.selectedUnits.push(u);
      }
    }
  }

  selectUnitsAroundPlanet(planet: Planet) {
    this.clearSelection();
    for (const u of this.units) {
      const dist = Math.sqrt((u.circle.x - planet.x) ** 2 + (u.circle.y - planet.y) ** 2);
      if (u.owner === this.myTeam && !u.target && dist < planet.radius + 60) {
        u.setSelected(true);
        this.selectedUnits.push(u);
      }
    }
  }

  updateHighlights() {
    for (const u of this.units) {
      u.setSelected(this.selectedUnits.includes(u));
    }
  }
}
