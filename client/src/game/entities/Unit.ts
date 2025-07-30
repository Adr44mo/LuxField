import Phaser from 'phaser';
import type { PlayerID, Stats } from '../types';
import { Planet } from './Planet';

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
  target?: { x: number; y: number } | null;
  isOrbiting: boolean;
}

export class Unit {
  scene: Phaser.Scene;
  planet: Planet;
  id: string;
  angle: number;
  distance: number;
  color: number;
  owner: number;
  stats: Stats;
  circle: Phaser.GameObjects.Arc;
  highlight: Phaser.GameObjects.Arc | null = null;
  selected: boolean = false;
  x?: number;
  y?: number;
  target?: { x: number; y: number } | null;

  constructor(scene: Phaser.Scene, planet: Planet, data: UnitData) {
    this.scene = scene;
    this.planet = planet;
    this.id = data.id;
    this.angle = data.angle;
    this.distance = data.distance;
    this.color = data.color;
    this.owner = data.owner;
    this.stats = data.stats;
    this.x = data.x;
    this.y = data.y;
    this.target = data.target;
    this.circle = scene.add.circle(0, 0, 12, data.color).setStrokeStyle(2, 0xffffff);
    this.updatePosition(0);
  }

  
  redrawHighlight() {
    if (this.highlight) {
      this.highlight.destroy();
      this.highlight = null;
    }
    if (this.selected) {
      this.highlight = this.scene.add.circle(this.circle.x, this.circle.y, 18, 0xffff00, 0.3).setStrokeStyle(3, 0xffff00);

      // Make sure highlight is excluded from UI camera
      const uiCamera = this.scene.cameras?.cameras?.find(cam => cam.name === 'UICamera');
      if (uiCamera) {
        uiCamera.ignore(this.highlight);
      }
    }
  }

  /**
   * Remove and destroy the highlight if it exists.
   */
  removeHighlight() {
    if (this.highlight) {
      this.highlight.destroy();
      this.highlight = null;
    }
  }

  updatePosition(time: number) {
    // Use backend x/y if present, else orbit
    let x = this.x, y = this.y;
    if (x === undefined || y === undefined) {
      x = this.planet.x + Math.cos(this.angle + time) * this.distance;
      y = this.planet.y + Math.sin(this.angle + time) * this.distance;
    }
    this.circle.x = x;
    this.circle.y = y;
    
    // Update highlight position to follow unit
    if (this.highlight) {
      this.highlight.x = x;
      this.highlight.y = y;
    }
  }

  setSelected(selected: boolean) {
    const wasSelected = this.selected;
    this.selected = selected;
    
    // Only redraw if selection state changed
    if (true){//wasSelected !== selected) 
      this.redrawHighlight();
    }
    
    if (selected) {
      // Debug: log selection
      // eslint-disable-next-line no-console
      console.log(`[DEBUG] Unit selected: id=${this.id}, owner=${this.owner}`);
    } else {
      // Debug: log deselection
      // eslint-disable-next-line no-console
      console.log(`[DEBUG] Unit deselected: id=${this.id}, owner=${this.owner}`);
    }
  }

  static removeOrphanHighlights(scene: Phaser.Scene, units: Unit[]) {
    // Collect all highlight objects currently referenced by units
    const referenced = new Set<Phaser.GameObjects.Arc>();
    for (const unit of units) {
      if (unit.highlight) referenced.add(unit.highlight);
    }
    // Remove only highlight circles that are not referenced by any unit
    scene.children.list.forEach(obj => {
      if (
        obj instanceof Phaser.GameObjects.Arc &&
        obj.strokeColor === 0xffff00 &&
        obj.fillColor === 0xffff00 &&
        obj.radius === 18 &&
        !referenced.has(obj)
      ) {
        obj.destroy();
      }
    });
  }
}
