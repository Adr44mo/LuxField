// Client-side Planet wrapper that extends CorePlanet with Phaser rendering
import Phaser from 'phaser';

export interface PlanetData {
  id: string;
  x: number;
  y: number;
  radius: number;
  color: number;
  owner: number;
  maxUnits: number;
  productionSpeed: number;
  units: any[];
}

export class Planet {
  id: string;
  x: number;
  y: number;
  radius: number;
  color: number;
  owner: number;
  maxUnits: number;
  productionSpeed: number;
  circle: Phaser.GameObjects.Arc;
  units: any[] = []; // Client units for compatibility

  constructor(scene: Phaser.Scene, data: PlanetData) {
    this.id = data.id;
    this.x = data.x;
    this.y = data.y;
    this.radius = data.radius;
    this.color = data.color;
    this.owner = data.owner;
    this.maxUnits = data.maxUnits;
    this.productionSpeed = data.productionSpeed;
    this.units = [];
    
    // Create Phaser circle for rendering
    this.circle = scene.add.circle(this.x, this.y, this.radius, this.color).setStrokeStyle(4, 0xffffff);
  }
}
