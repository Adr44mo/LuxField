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
  claimingTeam: { id: number; color: number } | null = null;
  claimingProgress: number = 0;
  id: string;
  x: number;
  y: number;
  radius: number;
  color: number;
  owner: number;
  maxUnits: number;
  productionSpeed: number;
  circle: Phaser.GameObjects.Arc;
  units: any[] = [];
  health: number;
  maxHealth: number;
  healthArcGreen: Phaser.GameObjects.Arc | null = null;
  healthArcRed: Phaser.GameObjects.Arc | null = null;

  constructor(scene: Phaser.Scene, data: any) {
    this.id = data.id;
    this.x = data.x;
    this.y = data.y;
    this.radius = data.radius;
    this.color = data.color;
    this.owner = data.owner;
    this.maxUnits = data.maxUnits;
    this.productionSpeed = data.productionSpeed;
    this.units = [];
    this.health = data.health ?? 100;
    this.maxHealth = data.maxHealth ?? 100;
    this.claimingTeam = data.claimingTeam ? { id: data.claimingTeam, color: data.claimingTeamColor } : null;
    this.claimingProgress = data.claimingProgress ?? 0;
    // Create Phaser circle for rendering
    this.circle = scene.add.circle(this.x, this.y, this.radius, this.color).setStrokeStyle(4, 0xffffff);
    this.healthArcGreen = null;
    this.healthArcRed = null;
    this.drawHealthArcs(scene);
  }

  drawHealthArcs(scene: Phaser.Scene): void {
    if (this.healthArcGreen) this.healthArcGreen.destroy();
    if (this.healthArcRed) this.healthArcRed.destroy();
    const percent = this.health / this.maxHealth;
    const r = this.radius + 8;
    // Owner color arc for current health, or claiming color if claiming
    const color = this.claimingTeam ? this.claimingTeam.color : this.color;

    this.healthArcGreen = scene.add.arc(
      this.x,
      this.y,
      r,
      270,
      270 + 360 * percent,
      false,
      color,
      0 // no fill
    );
    this.healthArcGreen.setStrokeStyle(6, color, 1);
    this.healthArcGreen.setClosePath(false);
    // Red arc for missing health
    this.healthArcRed = scene.add.arc(
      this.x,
      this.y,
      r,
      270 + 360 * percent,
      270 + 360,
      false,
      0x888888,
      0 // no fill
    );
    this.healthArcRed.setStrokeStyle(6, 0x888888, 1);
    this.healthArcRed.setClosePath(false);
  }

  updateHealth(scene: Phaser.Scene, health: number) {
    this.health = health;
    this.drawHealthArcs(scene);
  }

  destroy() {
    this.circle.destroy();
    if (this.healthArcGreen) this.healthArcGreen.destroy();
    if (this.healthArcRed) this.healthArcRed.destroy();
  }

  updateColor(color: number) {
    this.color = color;
    this.circle.setFillStyle(color);
  }
}
