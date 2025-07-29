// This file contains the MainScene class with proper camera separation
// Game world rendered only in main camera, UI (stats, panels) rendered only in UI camera
// Zoom affects only main camera

import Phaser from 'phaser';
import { Planet, PlanetData } from '../entities/Planet';
import { Unit, UnitData } from '../entities/Unit';
import type { Stats } from '../types';
import { SelectionManager } from '../selection/SelectionManager';
import { InputManager } from '../input/InputManager';
import { PhoneInputManager } from '../input/PhoneInputManager';

export class MainScene extends Phaser.Scene {
  planets: Planet[] = [];
  units: Unit[] = [];
  endPanel: Phaser.GameObjects.Container | null = null;
  playerId: string = '';
  players: { id: string; color: number; team: number }[] = [];
  myTeam: number = 0;
  myColor: number = 0x888888;
  statsText!: Phaser.GameObjects.Text;
  selectionManager: SelectionManager | null = null;
  socket: any = null;
  mapDimensions: { width: number; height: number } = { width: 1200, height: 800 };

  inputManager: InputManager | null = null;
  phoneInputManager: PhoneInputManager | null = null;
  isMobileDevice: boolean = false;

  uiCamera!: Phaser.Cameras.Scene2D.Camera;
  gameState: any = null;
  gameTime: number = 0;
  lastGameTime: number = 0;
  lastGameTimeReceivedAt: number = 0;

  bg!: Phaser.GameObjects.Rectangle;
  uiLayer!: Phaser.GameObjects.Container;

  constructor() {
    super('MainScene');
  }

  init(data: any) {
    this.playerId = data?.playerId || '';
    this.players = data?.players || [];
    this.gameState = data?.gameState || null;
    this.mapDimensions = data?.mapDimensions || { width: 1200, height: 800 };
    this.socket = data?.socket;

    const me = this.players.find(p => p.id === this.playerId);
    if (me) {
      this.myTeam = me.team;
      this.myColor = me.color;
    }
  }

  create() {
    // Set up cameras
    this.cameras.main.setBounds(0, 0, this.mapDimensions.width, this.mapDimensions.height);
    this.uiCamera = this.cameras.add(0, 0, this.scale.width, this.scale.height);
    this.uiCamera.setScroll(0, 0);
    this.uiCamera.setZoom(1);

    // UI container
    this.uiLayer = this.add.container(0, 0);
    this.uiLayer.setDepth(1000);
    this.uiLayer.setScrollFactor(0);

    this.bg = this.add.rectangle(
      this.mapDimensions.width / 2,
      this.mapDimensions.height / 2,
      this.mapDimensions.width,
      this.mapDimensions.height,
      0x001122
    );
    this.bg.setDepth(-1);

    // Always position stats panel at top-left for visibility
    this.statsText = this.add.text(20, 20, '', {
      fontSize: '16px',
      color: '#fff',
      fontFamily: 'Arial',
      backgroundColor: '#222',
      padding: { left: 10, right: 10, top: 4, bottom: 4 }
    });
    this.statsText.setOrigin(0, 0);
    this.statsText.setDepth(1000);
    this.uiLayer.add(this.statsText);

    // Update UI camera and stats panel position on resize (mobile)
    this.scale.on('resize', (gameSize: Phaser.Structs.Size) => {
      this.uiCamera.setSize(gameSize.width, gameSize.height);
      this.statsText.setPosition(20, 20);
    });

    if (this.socket) {
      this.socket.on('gameState', (state: any) => {
        this.renderGameState(state);
        if (state.winner !== undefined && this.endPanel == null && (state.time ?? 0) > 1000) {
          this.showEndPanel(state.winner);
        }
      });
    }

    this.selectionManager = new SelectionManager(this.units, this.planets, this.myTeam);

    this.isMobileDevice = this.detectMobileDevice();
    if (this.isMobileDevice) {
      this.phoneInputManager = new PhoneInputManager(this, this.socket, this.myTeam);
      this.phoneInputManager.setSelectionManager(this.selectionManager);
      this.phoneInputManager.setUnitsAndPlanets(this.units, this.planets);
    } else {
      this.inputManager = new InputManager(this, this.socket, this.myTeam);
      this.inputManager.setSelectionManager(this.selectionManager);
      this.inputManager.setUnitsAndPlanets(this.units, this.planets);
    }

    if (this.gameState) {
      this.renderGameState(this.gameState);
    }
  }

  detectMobileDevice(): boolean {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  }

  renderGameState(state: any) {
    this.gameTime = state.time || 0;
    this.lastGameTime = this.gameTime;
    this.lastGameTimeReceivedAt = Date.now();

    for (const p of this.planets) {
      p.circle.destroy();
      p.healthArcGreen?.destroy();
      p.healthArcRed?.destroy();
    }
    for (const u of this.units) {
      u.circle.destroy();
      u.removeHighlight();
    }
    this.planets = [];
    this.units = [];

    if (state?.planets) {
      for (const p of state.planets) {
        const planet = new Planet(this, p as PlanetData);
        this.planets.push(planet);
        planet.updateColor(p.color);

        for (const u of p.units) {
          const unit = new Unit(this, planet, u as UnitData);
          this.units.push(unit);
          planet.units.push(unit);
        }
      }

      this.selectionManager?.updateUnitsAndPlanets(this.units, this.planets);
      this.inputManager?.setUnitsAndPlanets(this.units, this.planets);
      this.phoneInputManager?.setUnitsAndPlanets(this.units, this.planets);
    }

    this.updateStatsText();
    this.updateUICameraFilter();
  }

  updateUICameraFilter() {
    // Ignore everything except the UI container
    this.uiCamera.ignore(
      this.children.list.filter(obj => obj !== this.uiLayer)
    );
    this.cameras.main.ignore(this.uiLayer);
  }

  updateStatsText() {
    const myPlanets = this.planets.filter(p => p.owner === this.myTeam);
    const myUnits = myPlanets.reduce((sum, p) => sum + p.units.length, 0);
    this.statsText.setText(
      `Team ${this.myTeam} | Color #${this.myColor.toString(16)} | Planets ${myPlanets.length} | Units ${myUnits}`
    );
    this.statsText.setStyle({ backgroundColor: `#${this.myColor.toString(16)}` });
  }

  update() {
    if (this.inputManager && !this.isMobileDevice) {
      this.inputManager.updateCameraControls();
    }

    let interpFactor = 0;
    const updateInterval = 50;
    if (this.lastGameTimeReceivedAt && this.lastGameTime) {
      const timeSinceLastUpdate = Date.now() - this.lastGameTimeReceivedAt;
      interpFactor = Math.min(timeSinceLastUpdate / updateInterval, 1);
    }

    for (const unit of this.units) {
      const t = (this.lastGameTime / 1000) + interpFactor * (updateInterval / 1000);
      unit.updatePosition(t);
    }

    if (this.selectionManager && this.time.now % 5 === 0) {
      this.selectionManager.updateHighlights();
    }

    this.updateStatsText();
  }

  showEndPanel(winner: number) {
    const isWinner = this.myTeam === winner;
    const text = isWinner ? 'You Win!' : 'You Lose';
    const panel = this.add.container(this.cameras.main.width / 2, this.cameras.main.height / 2);
    const bg = this.add.rectangle(0, 0, 400, 200, 0x222222, 0.95).setOrigin(0.5);
    const resultText = this.add.text(0, -40, text, {
      fontSize: '48px',
      color: isWinner ? '#66ff66' : '#ff6666',
      fontFamily: 'Arial',
      align: 'center'
    }).setOrigin(0.5);
    const btn = this.add.text(0, 60, 'Return to Menu', {
      fontSize: '28px',
      color: '#fff',
      backgroundColor: '#444',
      padding: { left: 24, right: 24, top: 8, bottom: 8 },
      fontFamily: 'Arial'
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    btn.on('pointerdown', () => {
      this.scene.start('MenuScene', { socket: this.socket });
    });
    panel.add([bg, resultText, btn]);
    this.uiLayer.add(panel);
    this.endPanel = panel;

    this.updateUICameraFilter();
  }
}
