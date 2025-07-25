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
  /**
   * Remove the last drawn highlight and create a new one if selected.
   * Always call this after changing selection or position.
   */
  redrawHighlight() {
    if (this.highlight) {
      this.highlight.destroy();
      this.highlight = null;
    }
    if (this.selected) {
      this.highlight = this.scene.add.circle(this.circle.x, this.circle.y, 18, 0xffff00, 0.3).setStrokeStyle(3, 0xffff00);
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
    // Always redraw highlight to follow the unit
    if (this.selected) {
      this.redrawHighlight();
    } else if (this.highlight) {
      this.highlight.destroy();
      this.highlight = null;
    }
  }
  setSelected(selected: boolean) {
    this.selected = selected;
    this.redrawHighlight();
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
}
