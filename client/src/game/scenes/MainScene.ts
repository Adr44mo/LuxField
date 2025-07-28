import Phaser from 'phaser';
import { Planet, PlanetData } from '../entities/Planet';
import { Unit, UnitData } from '../entities/Unit';
import type { Stats } from '../types';
import { SelectionManager } from '../selection/SelectionManager';

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
  dragStart: Phaser.Math.Vector2 | null = null;
  dragRect: Phaser.GameObjects.Graphics | null = null;
  socket: any = null;
  mapDimensions: { width: number; height: number } = { width: 1200, height: 800 };

  constructor() {
    super('MainScene');
  }

  gameState: any = null;
  gameTime: number = 0;
  lastGameTime: number = 0;
  lastGameTimeReceivedAt: number = 0;

  init(data: any) {
    console.log('[DEBUG] MainScene: init called with data:', data);
    this.playerId = data?.playerId || '';
    this.players = data?.players || [];
    this.gameState = data?.gameState || null;
    this.mapDimensions = data?.mapDimensions || { width: 1200, height: 800 };
    this.socket = data?.socket;
    
    console.log('[DEBUG] MainScene: initialized with:', {
      playerId: this.playerId,
      playersCount: this.players.length,
      hasGameState: !!this.gameState,
      mapDimensions: this.mapDimensions,
      hasSocket: !!this.socket
    });
    
    const me = this.players.find(p => p.id === this.playerId);
    if (me) {
      this.myTeam = me.team;
      this.myColor = me.color;
      console.log('[DEBUG] MainScene: Found my player data:', { team: this.myTeam, color: this.myColor });
    } else {
      console.warn('[DEBUG] MainScene: Could not find my player in players array');
    }
  }

  create() {
    // Set up camera bounds based on map dimensions
    this.cameras.main.setBounds(0, 0, this.mapDimensions.width, this.mapDimensions.height);
    
    // Create a background
    const bg = this.add.rectangle(this.mapDimensions.width / 2, this.mapDimensions.height / 2, 
                                 this.mapDimensions.width, this.mapDimensions.height, 0x001122);
    bg.setDepth(-1);
    
    // Affiche l'équipe/couleur et stats du joueur
    this.statsText = this.add.text(20, 20, '', {
      fontSize: '20px',
      color: '#fff',
      fontFamily: 'Arial',
      backgroundColor: '#222',
      padding: { left: 10, right: 10, top: 5, bottom: 5 }
    });
    this.statsText.setScrollFactor(0); // Keep UI fixed on screen
    this.updateStatsText();

    // Listen for gameState updates from backend
    this.socket = this.socket || (this.scene.settings.data as any)?.socket;
    if (this.socket) {
      this.socket.on('gameState', (state: any) => {
        this.renderGameState(state);
        // Only show end panel if game has run for at least 1 second
        if (state.winner !== undefined && this.endPanel == null && (state.time ?? 0) > 1000) {
          this.showEndPanel(state.winner);
        }
      });
    }

    // SelectionManager setup
    this.selectionManager = new SelectionManager(this.units, this.planets, this.myTeam);

    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (!this.selectionManager) return;
      // Use world coordinates for all pointer logic
      const wx = pointer.worldX;
      const wy = pointer.worldY;
      // Check if clicked on a planet
      const clickedPlanet = this.planets.find(p => {
        const dx = wx - p.x;
        const dy = wy - p.y;
        return Math.sqrt(dx * dx + dy * dy) < p.radius;
      });
      if (clickedPlanet && clickedPlanet.owner === this.myTeam) {
        this.selectionManager.selectUnitsAroundPlanet(clickedPlanet);
        return;
      }
      // Check if clicked on a unit (own units only)
      const clicked = this.units.find(u => {
        const dx = wx - u.circle.x;
        const dy = wy - u.circle.y;
        return Math.sqrt(dx * dx + dy * dy) < 14 && u.owner === this.myTeam;
      });
      if (clicked) {
        this.selectionManager.selectUnit(clicked);
        // Debug: log selection state
        // eslint-disable-next-line no-console
        console.log('[DEBUG] Clicked unit:', clicked.id, 'Selected:', !!this.selectionManager.selectedUnit);
      } else if (this.selectionManager.selectedUnits.length > 0) {
        // Send move command for all selected units
        const unitIds = this.selectionManager.selectedUnits.map(u => u.id);
        this.socket.emit('moveUnits', {
          unitIds: unitIds,
          x: wx,
          y: wy
        });
        this.selectionManager.clearSelection();
      } else {
        // Start drag selection
        this.dragStart = new Phaser.Math.Vector2(wx, wy);
        if (!this.dragRect) {
          this.dragRect = this.add.graphics();
        }
        this.dragRect.clear();
        this.dragRect.lineStyle(2, 0xffff00, 1);
        this.dragRect.strokeRect(wx, wy, 1, 1);
      }
    });

    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (this.dragStart && this.dragRect) {
        const wx = pointer.worldX;
        const wy = pointer.worldY;
        this.dragRect.clear();
        this.dragRect.lineStyle(2, 0xffff00, 1);
        const x = Math.min(this.dragStart.x, wx);
        const y = Math.min(this.dragStart.y, wy);
        const w = Math.abs(wx - this.dragStart.x);
        const h = Math.abs(wy - this.dragStart.y);
        this.dragRect.strokeRect(x, y, w, h);
      }
    });

    this.input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      if (this.dragStart && this.dragRect && this.selectionManager) {
        const wx = pointer.worldX;
        const wy = pointer.worldY;
        const x1 = Math.min(this.dragStart.x, wx);
        const y1 = Math.min(this.dragStart.y, wy);
        const x2 = Math.max(this.dragStart.x, wx);
        const y2 = Math.max(this.dragStart.y, wy);
        this.selectionManager.selectUnitsInRect(x1, y1, x2, y2);
        this.dragRect.clear();
        this.dragStart = null;
      }
    });
    // Render initial state if present
    if (this.gameState) {
      this.renderGameState(this.gameState);
    }
  }

  renderGameState(state: any) {
    this.gameTime = state.time || 0;
    this.lastGameTime = this.gameTime;
    this.lastGameTimeReceivedAt = Date.now();
    // Remove old planets/units and all their graphics
    for (const p of this.planets) {
      p.circle.destroy();
      if (p.healthArcGreen) p.healthArcGreen.destroy();
      if (p.healthArcRed) p.healthArcRed.destroy();
    }
    for (const u of this.units) {
      u.circle.destroy();
      u.removeHighlight();
    }
    this.planets = [];
    this.units = [];
    if (state && state.planets) {
      for (const p of state.planets) {
        const planet = new Planet(this, p as PlanetData);
        this.planets.push(planet);
        planet.updateColor(p.color);
        // Units
        for (const u of p.units) {
          const unit = new Unit(this, planet, u as UnitData);
          this.units.push(unit);
          planet.units.push(unit);
        }
      }
      // Update selectionManager with new units/planets
      if (this.selectionManager) {
        this.selectionManager.updateUnitsAndPlanets(this.units, this.planets);
      }
    }
    //Unit.removeOrphanHighlights(this, this.units);
    this.updateStatsText();
  }

  clearSelection() {
    if (this.selectionManager) this.selectionManager.clearSelection();
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
    // Camera controls (WASD movement)
    const cameraSpeed = 5;
    const keys = this.input.keyboard?.addKeys('Z,S,Q,D') as any;
    if (keys) {
      if (keys.Z?.isDown) {
        this.cameras.main.scrollY -= cameraSpeed;
      }
      if (keys.S?.isDown) {
        this.cameras.main.scrollY += cameraSpeed;
      }
      if (keys.Q?.isDown) {
        this.cameras.main.scrollX -= cameraSpeed;
      }
      if (keys.D?.isDown) {
        this.cameras.main.scrollX += cameraSpeed;
      }
    }
    
    // Improved interpolation: smoothly interpolate between backend updates
    let interpFactor = 0;
    const updateInterval = 50; // ms, should match backend broadcast interval
    if (this.lastGameTimeReceivedAt && this.lastGameTime) {
      const timeSinceLastUpdate = Date.now() - this.lastGameTimeReceivedAt;
      interpFactor = Math.min(timeSinceLastUpdate / updateInterval, 1);
    }

    for (const unit of this.units) {
      // If you want to interpolate between previous and current positions, you need to store previous positions.
      // For now, we use backend time + interpolation factor for smoother movement.
      const t = (this.lastGameTime / 1000) + interpFactor * (updateInterval / 1000);
      unit.updatePosition(t);
    }

    // Update highlights via SelectionManager (less frequently)
    if (this.selectionManager && this.time.now % 5 === 0) {
      this.selectionManager.updateHighlights();
    }

    this.updateStatsText();
  }
  showEndPanel(winner: number) {
    const isWinner = this.myTeam === winner;
    const text = isWinner ? 'You Win!' : 'You Lose';
    const panel = this.add.container(this.cameras.main.width / 2, this.cameras.main.height / 2);
    panel.setScrollFactor(0); // Keep panel fixed on screen
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
    this.endPanel = panel;
  }
}
