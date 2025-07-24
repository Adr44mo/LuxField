import Phaser from 'phaser';
import type { PlayerID, Stats } from '../types';
import { Planet } from './Planet';

export class Unit {
  scene: Phaser.Scene;
  planet: Planet;
  angle: number;
  distance: number;
  color: number;
  stats: Stats;
  circle: Phaser.GameObjects.Arc;

  constructor(scene: Phaser.Scene, planet: Planet, angle: number, distance: number, color: number, stats: Stats) {
    this.scene = scene;
    this.planet = planet;
    this.angle = angle;
    this.distance = distance;
    this.color = color;
    this.stats = stats;
    this.circle = scene.add.circle(0, 0, 12, color).setStrokeStyle(2, 0xffffff);
    this.updatePosition(0);
  }

  updatePosition(time: number) {
    // time is in seconds
    const x = this.planet.x + Math.cos(this.angle + time) * this.distance;
    const y = this.planet.y + Math.sin(this.angle + time) * this.distance;
    this.circle.x = x;
    this.circle.y = y;
  }
}
