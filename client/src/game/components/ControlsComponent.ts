import Phaser from 'phaser';
import { ColorManager } from '../../utils/ColorManager';

interface Player {
  id: string;
  color: number;
  team: number;
  host: boolean;
  ready: boolean;
}

export class ControlsComponent {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private readyButton: Phaser.GameObjects.Text;
  private startButton: Phaser.GameObjects.Text;
  private ready: boolean = false;

  constructor(scene: Phaser.Scene, x: number, y: number, width: number, height: number, isMobile: boolean = false) {
    this.scene = scene;
    
    // Create background
    const bg = scene.add.rectangle(0, 0, width, height, ColorManager.UI_BACKGROUND, 0.8);
    bg.setStrokeStyle(2, ColorManager.UI_BORDER);
    
    // Ready button
    this.readyButton = scene.add.text(-80, 0, 'READY', {
      fontSize: isMobile ? '20px' : '24px',
      color: '#fff',
      backgroundColor: '#228822',
      padding: { left: 16, right: 16, top: 8, bottom: 8 },
      fontFamily: 'Arial'
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    
    // Start button (host only)
    this.startButton = scene.add.text(80, 0, 'START GAME', {
      fontSize: isMobile ? '18px' : '22px',
      color: '#222',
      backgroundColor: '#fff',
      padding: { left: 16, right: 16, top: 8, bottom: 8 },
      fontFamily: 'Arial'
    }).setOrigin(0.5).setAlpha(0.5);
    
    this.startButton.disableInteractive();
    
    // Create container
    this.container = scene.add.container(x, y);
    this.container.add([bg, this.readyButton, this.startButton]);
  }

  setupCallbacks(
    onReady: () => void,
    onStart: () => void
  ) {
    this.readyButton.on('pointerdown', () => {
      if (!this.ready) {
        onReady();
        this.ready = true;
        this.readyButton.setAlpha(0.5);
        this.readyButton.disableInteractive();
        this.readyButton.setText('WAITING...');
      }
    });
    
    this.startButton.on('pointerdown', () => {
      onStart();
    });
  }

  updateControls(isHost: boolean, players: Player[], canStart: boolean) {
    // Update start button for host
    if (isHost && canStart) {
      this.startButton.setAlpha(1);
      this.startButton.setInteractive({ useHandCursor: true });
    } else {
      this.startButton.setAlpha(0.5);
      this.startButton.disableInteractive();
    }
  }

  resetReady() {
    this.ready = false;
    this.readyButton.setAlpha(1);
    this.readyButton.setInteractive({ useHandCursor: true });
    this.readyButton.setText('READY');
  }

  addToGroup(group: Phaser.GameObjects.Group) {
    group.add(this.container);
  }

  setVisible(visible: boolean) {
    this.container.setVisible(visible);
  }

  destroy() {
    this.container.destroy();
  }
}
