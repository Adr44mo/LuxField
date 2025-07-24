import Phaser from 'phaser';
import { Planet } from '../entities/Planet';
import { Unit } from '../entities/Unit';
import type { Stats } from '../types';

export class MainScene extends Phaser.Scene {
  planets: Planet[] = [];
  units: Unit[] = [];
  playerId: string = '';
  players: { id: string; color: number; team: number }[] = [];
  myTeam: number = 0;
  myColor: number = 0x888888;
  statsText!: Phaser.GameObjects.Text;

  constructor() {
    super('MainScene');
  }

  gameState: any = null;
  gameTime: number = 0;
  lastGameTime: number = 0;
  lastGameTimeReceivedAt: number = 0;

  init(data: any) {
    this.playerId = data?.playerId || '';
    this.players = data?.players || [];
    this.gameState = data?.gameState || null;
    const me = this.players.find(p => p.id === this.playerId);
    if (me) {
      this.myTeam = me.team;
      this.myColor = me.color;
    }
  }

  create() {
    // Affiche l'équipe/couleur et stats du joueur
    this.statsText = this.add.text(20, 20, '', {
      fontSize: '20px',
      color: '#fff',
      fontFamily: 'Arial',
      backgroundColor: '#222',
      padding: { left: 10, right: 10, top: 5, bottom: 5 }
    });
    this.updateStatsText();

    // Listen for gameState updates from backend
    const socket = (this.scene.settings.data as any)?.socket;
    if (socket) {
      socket.on('gameState', (state: any) => {
        this.renderGameState(state);
      });
    }
    // Render initial state if present
    if (this.gameState) {
      this.renderGameState(this.gameState);
    }
  }

  renderGameState(state: any) {
    this.gameTime = state.time || 0;
    this.lastGameTime = this.gameTime;
    this.lastGameTimeReceivedAt = Date.now();
    // Remove old planets/units
    for (const p of this.planets) p.circle.destroy();
    for (const u of this.units) u.circle.destroy();
    this.planets = [];
    this.units = [];
    if (state && state.planets) {
      for (const p of state.planets) {
        const baseStats: Stats = { health: 100, damage: 10, production: 1 };
        const planet = new Planet(
          this,
          p.x,
          p.y,
          p.radius,
          p.color,
          p.owner,
          baseStats,
          p.maxUnits,
          p.productionSpeed
        );
        this.planets.push(planet);
        // Units
        for (const u of p.units) {
          const unit = new Unit(this, planet, u.angle, u.distance, u.color, baseStats);
          this.units.push(unit);
          planet.units.push(unit);
        }
      }
    }
    this.updateStatsText();
  }

  updateStatsText() {
    const myPlanets = this.planets.filter(p => p.owner === this.myTeam);
    const myUnits = myPlanets.reduce((sum, p) => sum + p.units.length, 0);
    this.statsText.setText(
      `Team: ${this.myTeam}\nColor: #${this.myColor.toString(16)}\nPlanets: ${myPlanets.length}\nUnits: ${myUnits}`
    );
    this.statsText.setStyle({ backgroundColor: `#${this.myColor.toString(16)}` });
  }

  update() {
    // Animate units using backend time
    // Interpolate gameTime for smooth animation
    let interpTime = this.lastGameTime;
    if (this.lastGameTimeReceivedAt) {
      interpTime += Date.now() - this.lastGameTimeReceivedAt;
    }
    for (const unit of this.units) {
      unit.updatePosition(interpTime / 1000); // convert ms to seconds for smoothness
    }
    this.updateStatsText();
  }
}
