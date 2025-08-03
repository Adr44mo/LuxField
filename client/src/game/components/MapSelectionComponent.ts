import Phaser from 'phaser';
import { ColorManager } from '../../utils/ColorManager';

interface MapInfo {
  id: string;
  name: string;
  description: string;
  minPlayers: number;
  maxPlayers: number;
  width: number;
  height: number;
}

export class MapSelectionComponent {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private mapButton: Phaser.GameObjects.Text;
  private descriptionText: Phaser.GameObjects.Text;
  private availableMaps: MapInfo[] = [];
  private currentMapIndex: number = 0;

  constructor(scene: Phaser.Scene, x: number, y: number, width: number, height: number) {
    this.scene = scene;
    
    // Create background
    const bg = scene.add.rectangle(0, 0, width, height, ColorManager.UI_BACKGROUND, 0.8);
    bg.setStrokeStyle(2, ColorManager.UI_BORDER);
    
    // Title
    const titleText = scene.add.text(0, -height/2 + 20, 'Map Selection', {
      fontSize: '18px',
      color: '#fff',
      fontFamily: 'Arial',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    
    // Map button
    this.mapButton = scene.add.text(0, -10, 'Map: Loading...', {
      fontSize: '16px',
      color: '#fff',
      backgroundColor: '#666666',
      padding: { left: 12, right: 12, top: 6, bottom: 6 },
      fontFamily: 'Arial'
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    
    // Description text
    this.descriptionText = scene.add.text(0, 25, '', {
      fontSize: '12px',
      color: '#ccc',
      fontFamily: 'Arial',
      align: 'center',
      wordWrap: { width: width - 40 }
    }).setOrigin(0.5);
    
    // Create container
    this.container = scene.add.container(x, y);
    this.container.add([bg, titleText, this.mapButton, this.descriptionText]);
  }

  updateMaps(availableMaps: MapInfo[], currentMapId: string, isHost: boolean, onMapSelect: (mapId: string) => void) {
    this.availableMaps = availableMaps;
    this.currentMapIndex = Math.max(0, this.availableMaps.findIndex(map => map.id === currentMapId));
    
    this.mapButton.removeAllListeners('pointerdown');
    this.mapButton.on('pointerdown', () => {
      if (isHost && this.availableMaps.length > 0) {
        this.currentMapIndex = (this.currentMapIndex + 1) % this.availableMaps.length;
        const selectedMap = this.availableMaps[this.currentMapIndex];
        onMapSelect(selectedMap.id);
      }
    });
    
    this.updateMapDisplay(isHost);
  }

  updateMapDisplay(isHost: boolean) {
    if (this.availableMaps.length > 0 && this.currentMapIndex >= 0) {
      const currentMap = this.availableMaps[this.currentMapIndex];
      this.mapButton.setText(`Map: ${currentMap.name}`);
      this.descriptionText.setText(
        `${currentMap.description}\n` +
        `Players: ${currentMap.minPlayers}-${currentMap.maxPlayers} | ` +
        `Size: ${currentMap.width}x${currentMap.height}`
      );
      
      if (isHost) {
        this.mapButton.setBackgroundColor('#666666');
        this.mapButton.setAlpha(1);
      } else {
        this.mapButton.setBackgroundColor('#888888');
        this.mapButton.setAlpha(0.7);
      }
    } else {
      this.mapButton.setText('Map: Loading...');
      this.descriptionText.setText('');
    }
  }

  getCurrentMap(): MapInfo | null {
    if (this.availableMaps.length > 0 && this.currentMapIndex >= 0) {
      return this.availableMaps[this.currentMapIndex];
    }
    return null;
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
