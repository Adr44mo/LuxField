import Phaser from 'phaser';
import { SelectionManager } from '../selection/SelectionManager';
import { Planet } from '../entities/Planet';
import { Unit } from '../entities/Unit';

export class InputManager {
  private scene: Phaser.Scene;
  private selectionManager: SelectionManager | null = null;
  private socket: any = null;
  private dragStart: Phaser.Math.Vector2 | null = null;
  private dragRect: Phaser.GameObjects.Graphics | null = null;
  private cameraSpeed: number = 5;
  private planets: Planet[] = [];
  private units: Unit[] = [];
  private myTeam: number = 0;

  constructor(scene: Phaser.Scene, socket: any, myTeam: number) {
    this.scene = scene;
    this.socket = socket;
    this.myTeam = myTeam;
    this.setupInputHandlers();
  }

  setSelectionManager(selectionManager: SelectionManager) {
    this.selectionManager = selectionManager;
  }

  setUnitsAndPlanets(units: Unit[], planets: Planet[]) {
    this.units = units;
    this.planets = planets;
  }

  private setupInputHandlers() {
    this.setupPointerEvents();
    this.setupKeyboardControls();
  }

  private setupPointerEvents() {
    this.scene.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      this.handlePointerDown(pointer);
    });

    this.scene.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      this.handlePointerMove(pointer);
    });

    this.scene.input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      this.handlePointerUp(pointer);
    });
  }

  private handlePointerDown(pointer: Phaser.Input.Pointer) {
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
    const clickedUnit = this.units.find(u => {
      const dx = wx - u.circle.x;
      const dy = wy - u.circle.y;
      return Math.sqrt(dx * dx + dy * dy) < 14 && u.owner === this.myTeam;
    });
    if (clickedUnit) {
      this.selectionManager.selectUnit(clickedUnit);
      console.log('[DEBUG] Clicked unit:', clickedUnit.id, 'Selected:', !!this.selectionManager.selectedUnit);
    } else if (this.selectionManager.selectedUnits.length > 0) {
      // Send move command for all selected units
      this.sendMoveCommand(wx, wy);
      this.selectionManager.clearSelection();
    } else {
      // Start drag selection
      this.startDragSelection(wx, wy);
    }
  }

  private handlePointerMove(pointer: Phaser.Input.Pointer) {
    if (this.dragStart && this.dragRect) {
      this.updateDragSelection(pointer.worldX, pointer.worldY);
    }
  }

  private handlePointerUp(pointer: Phaser.Input.Pointer) {
    if (this.dragStart && this.dragRect && this.selectionManager) {
      this.finishDragSelection(pointer.worldX, pointer.worldY);
    }
  }

  private sendMoveCommand(x: number, y: number) {
    if (!this.selectionManager) return;
    
    const unitIds = this.selectionManager.selectedUnits.map(u => u.id);
    this.socket.emit('moveUnits', {
      unitIds: unitIds,
      x: x,
      y: y
    });
  }

  private startDragSelection(x: number, y: number) {
    this.dragStart = new Phaser.Math.Vector2(x, y);
    if (!this.dragRect) {
      this.dragRect = this.scene.add.graphics();
    }
    this.dragRect.clear();
    this.dragRect.lineStyle(2, 0xffff00, 1);
    this.dragRect.strokeRect(x, y, 1, 1);
  }

  private updateDragSelection(x: number, y: number) {
    if (!this.dragStart || !this.dragRect) return;
    
    this.dragRect.clear();
    this.dragRect.lineStyle(2, 0xffff00, 1);
    const rectX = Math.min(this.dragStart.x, x);
    const rectY = Math.min(this.dragStart.y, y);
    const rectW = Math.abs(x - this.dragStart.x);
    const rectH = Math.abs(y - this.dragStart.y);
    this.dragRect.strokeRect(rectX, rectY, rectW, rectH);
  }

  private finishDragSelection(x: number, y: number) {
    if (!this.dragStart || !this.dragRect || !this.selectionManager) return;
    
    const x1 = Math.min(this.dragStart.x, x);
    const y1 = Math.min(this.dragStart.y, y);
    const x2 = Math.max(this.dragStart.x, x);
    const y2 = Math.max(this.dragStart.y, y);
    
    this.selectionManager.selectUnitsInRect(x1, y1, x2, y2);
    this.dragRect.clear();
    this.dragStart = null;
  }

  private setupKeyboardControls() {
    // Keyboard controls will be handled in update method
  }

  public updateCameraControls() {
    // Camera controls (ZQSD movement for French keyboard)
    const keys = this.scene.input.keyboard?.addKeys('Z,S,Q,D') as any;
    if (keys) {
      if (keys.Z?.isDown) {
        this.scene.cameras.main.scrollY -= this.cameraSpeed;
      }
      if (keys.S?.isDown) {
        this.scene.cameras.main.scrollY += this.cameraSpeed;
      }
      if (keys.Q?.isDown) {
        this.scene.cameras.main.scrollX -= this.cameraSpeed;
      }
      if (keys.D?.isDown) {
        this.scene.cameras.main.scrollX += this.cameraSpeed;
      }
    }
  }

  public setCameraSpeed(speed: number) {
    this.cameraSpeed = speed;
  }

  public destroy() {
    if (this.dragRect) {
      this.dragRect.destroy();
    }
  }
}
