import Phaser from 'phaser';
import { SelectionManager } from '../selection/SelectionManager';
import { Planet } from '../entities/Planet';
import { Unit } from '../entities/Unit';

export class PhoneInputManager {
  private scene: Phaser.Scene;
  private selectionManager: SelectionManager | null = null;
  private socket: any = null;
  private dragStart: Phaser.Math.Vector2 | null = null;
  private dragRect: Phaser.GameObjects.Graphics | null = null;
  private planets: Planet[] = [];
  private units: Unit[] = [];
  private myTeam: number = 0;

  // Touch/mobile specific properties
  private isDraggingCamera: boolean = false;
  private lastPanPosition: { x: number; y: number } | null = null;
  private touchStartTime: number = 0;
  private touchStartPos: { x: number; y: number } | null = null;
  private isLongPress: boolean = false;
  private longPressThreshold: number = 500; // milliseconds
  private panThreshold: number = 10; // pixels

  constructor(scene: Phaser.Scene, socket: any, myTeam: number) {
    this.scene = scene;
    this.socket = socket;
    this.myTeam = myTeam;
    this.setupMobileInputHandlers();
  }

  setSelectionManager(selectionManager: SelectionManager) {
    this.selectionManager = selectionManager;
  }

  setUnitsAndPlanets(units: Unit[], planets: Planet[]) {
    this.units = units;
    this.planets = planets;
  }

  private setupMobileInputHandlers() {
    // Mobile touch events
    this.scene.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      this.handleTouchStart(pointer);
    });

    this.scene.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      this.handleTouchMove(pointer);
    });

    this.scene.input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      this.handleTouchEnd(pointer);
    });

    // Pinch to zoom (if needed later)
    this.scene.input.on('wheel', (pointer: any, deltaX: number, deltaY: number) => {
      this.handleZoom(deltaY);
    });
  }

  private handleTouchStart(pointer: Phaser.Input.Pointer) {
    this.touchStartTime = Date.now();
    this.touchStartPos = { x: pointer.x, y: pointer.y };
    this.lastPanPosition = { x: pointer.x, y: pointer.y };
    this.isLongPress = false;
    this.isDraggingCamera = false;

    // Set up long press detection
    setTimeout(() => {
      if (this.touchStartPos && !this.isDraggingCamera) {
        const currentTime = Date.now();
        if (currentTime - this.touchStartTime >= this.longPressThreshold) {
          this.isLongPress = true;
          this.handleLongPress(pointer);
        }
      }
    }, this.longPressThreshold);
  }

  private handleTouchMove(pointer: Phaser.Input.Pointer) {
    if (!this.touchStartPos || !this.lastPanPosition) return;

    const deltaX = pointer.x - this.lastPanPosition.x;
    const deltaY = pointer.y - this.lastPanPosition.y;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

    // If we've moved more than threshold, start camera panning
    if (distance > this.panThreshold) {
      this.isDraggingCamera = true;
      this.panCamera(-deltaX, -deltaY);
      this.lastPanPosition = { x: pointer.x, y: pointer.y };
    }

    // Update drag selection if active
    if (this.dragStart && this.dragRect && !this.isDraggingCamera) {
      this.updateDragSelection(pointer.worldX, pointer.worldY);
    }
  }

  private handleTouchEnd(pointer: Phaser.Input.Pointer) {
    const touchDuration = Date.now() - this.touchStartTime;
    
    if (this.isDraggingCamera) {
      // End camera panning
      this.isDraggingCamera = false;
    } else if (this.isLongPress) {
      // Handle long press action (e.g., context menu)
      this.handleLongPressEnd(pointer);
    } else if (touchDuration < 200) {
      // Quick tap - handle selection/movement
      this.handleTap(pointer);
    }

    // Finish drag selection if active
    if (this.dragStart && this.dragRect && this.selectionManager && !this.isDraggingCamera) {
      this.finishDragSelection(pointer.worldX, pointer.worldY);
    }

    // Reset touch state
    this.touchStartPos = null;
    this.lastPanPosition = null;
    this.isLongPress = false;
  }

  private handleTap(pointer: Phaser.Input.Pointer) {
    if (!this.selectionManager) return;
    
    const wx = pointer.worldX;
    const wy = pointer.worldY;
    
    // Check if tapped on a planet
    const clickedPlanet = this.planets.find(p => {
      const dx = wx - p.x;
      const dy = wy - p.y;
      return Math.sqrt(dx * dx + dy * dy) < p.radius;
    });
    if (clickedPlanet && clickedPlanet.owner === this.myTeam) {
      this.selectionManager.selectUnitsAroundPlanet(clickedPlanet);
      return;
    }
    
    // Check if tapped on a unit
    const clickedUnit = this.units.find(u => {
      const dx = wx - u.circle.x;
      const dy = wy - u.circle.y;
      return Math.sqrt(dx * dx + dy * dy) < 20 && u.owner === this.myTeam; // Larger hit area for mobile
    });
    if (clickedUnit) {
      this.selectionManager.selectUnit(clickedUnit);
      console.log('[DEBUG] Tapped unit:', clickedUnit.id);
    } else if (this.selectionManager.selectedUnits.length > 0) {
      // Send move command for selected units
      this.sendMoveCommand(wx, wy);
      this.selectionManager.clearSelection();
    }
  }

  private handleLongPress(pointer: Phaser.Input.Pointer) {
    if (!this.selectionManager) return;
    
    // Start drag selection on long press
    const wx = pointer.worldX;
    const wy = pointer.worldY;
    this.startDragSelection(wx, wy);
  }

  private handleLongPressEnd(pointer: Phaser.Input.Pointer) {
    // Long press ended - could show context menu or perform special action
    console.log('[DEBUG] Long press ended');
  }

  private panCamera(deltaX: number, deltaY: number) {
    this.scene.cameras.main.scrollX += deltaX;
    this.scene.cameras.main.scrollY += deltaY;
  }

  private handleZoom(deltaY: number) {
    const camera = this.scene.cameras.main;
    const zoomFactor = 0.1;
    
    if (deltaY > 0) {
      // Zoom out
      camera.zoom = Math.max(0.5, camera.zoom - zoomFactor);
    } else {
      // Zoom in
      camera.zoom = Math.min(2, camera.zoom + zoomFactor);
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
    this.dragRect.lineStyle(3, 0xffff00, 1); // Thicker line for mobile
    this.dragRect.strokeRect(x, y, 1, 1);
  }

  private updateDragSelection(x: number, y: number) {
    if (!this.dragStart || !this.dragRect) return;
    
    this.dragRect.clear();
    this.dragRect.lineStyle(3, 0xffff00, 1);
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

  public destroy() {
    if (this.dragRect) {
      this.dragRect.destroy();
    }
  }

  // Mobile-specific methods
  public isMobile(): boolean {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  }
}
