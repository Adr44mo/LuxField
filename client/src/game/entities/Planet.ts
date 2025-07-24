import Phaser from 'phaser';
import type { PlayerID, Stats } from '../types';

export class Planet {
  scene: Phaser.Scene;
  x: number;
  y: number;
  radius: number;
  color: number;
  owner: PlayerID;
  stats: Stats;
  circle: Phaser.GameObjects.Arc;

  maxUnits: number;
  productionSpeed: number; // units per second
  lastProducedAt: number; // ms
  units: any[] = [];

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    radius: number,
    color: number,
    owner: PlayerID,
    stats: Stats,
    maxUnits: number = 8,
    productionSpeed: number = 1 // 1 unit/sec
  ) {
    this.scene = scene;
    this.x = x;
    this.y = y;
    this.radius = radius;
    this.color = color;
    this.owner = owner;
    this.stats = stats;
    this.circle = scene.add.circle(x, y, radius, color).setStrokeStyle(4, 0xffffff);
    this.maxUnits = maxUnits;
    this.productionSpeed = productionSpeed;
    this.lastProducedAt = 0;
  }
}
