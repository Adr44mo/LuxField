// SelectionManager: handles all selection logic and highlight updates for units
import { Unit } from '../entities/Unit';
import { Planet } from '../entities/Planet';
import { Scene } from 'phaser';

export class SelectionManager {
  selectedUnits: Unit[] = [];
  selectedUnit: Unit | null = null;
  selectedUnitIds: string[] = []; // Track by ID to preserve across state updates
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
    
    // Restore selection by ID after state update
    this.selectedUnits = [];
    this.selectedUnit = null;
    
    for (const unitId of this.selectedUnitIds) {
      const unit = this.units.find(u => u.id === unitId);
      if (unit && unit.owner === this.myTeam) {
        unit.setSelected(true);
        this.selectedUnits.push(unit);
        if (!this.selectedUnit) this.selectedUnit = unit;
      }
    }
    
    // Clean up invalid IDs
    this.selectedUnitIds = this.selectedUnits.map(u => u.id);
  }

  clearSelection() {
    for (const u of this.units) u.setSelected(false);
    this.selectedUnit = null;
    this.selectedUnits = [];
    this.selectedUnitIds = [];
  }

  selectUnit(unit: Unit) {
    this.clearSelection();
    unit.setSelected(true);
    this.selectedUnit = unit;
    this.selectedUnits = [unit];
    this.selectedUnitIds = [unit.id];
  }

  selectUnits(units: Unit[]) {
    this.clearSelection();
    for (const u of units) {
      u.setSelected(true);
      this.selectedUnits.push(u);
      this.selectedUnitIds.push(u.id);
    }
  }

  selectUnitsInRect(x1: number, y1: number, x2: number, y2: number) {
    this.clearSelection();
    for (const u of this.units) {
      if (u.owner === this.myTeam && u.circle.x >= x1 && u.circle.x <= x2 && u.circle.y >= y1 && u.circle.y <= y2) {
        u.setSelected(true);
        this.selectedUnits.push(u);
        this.selectedUnitIds.push(u.id);
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
        this.selectedUnitIds.push(u.id);
      }
    }
  }

  updateHighlights() {
    // Only update highlights if needed - don't constantly redraw
    for (const u of this.units) {
      const shouldBeSelected = this.selectedUnitIds.includes(u.id);
      if (u.selected !== shouldBeSelected) {
        u.setSelected(shouldBeSelected);
      }
    }
  }
}
