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

export class TeamSelectionComponent {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private teamButtons: Phaser.GameObjects.Text[] = [];
  private selectedTeam: number = 1;
  private maxTeams: number = 8;

  constructor(scene: Phaser.Scene, x: number, y: number, width: number, height: number) {
    this.scene = scene;
    
    // Create background
    const bg = scene.add.rectangle(0, 0, width, height, ColorManager.UI_BACKGROUND, 0.8);
    bg.setStrokeStyle(2, ColorManager.UI_BORDER);
    
    // Title
    const titleText = scene.add.text(0, -height/2 + 20, 'Select Team', {
      fontSize: '18px',
      color: '#fff',
      fontFamily: 'Arial',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    
    // Create container
    this.container = scene.add.container(x, y);
    this.container.add([bg, titleText]);
  }

  updateForMap(mapInfo: MapInfo | null, onTeamSelect: (team: number) => void, isMobile: boolean = false) {
    // Clear existing team buttons
    this.teamButtons.forEach(btn => btn.destroy());
    this.teamButtons = [];
    
    // Determine max teams based on map
    this.maxTeams = mapInfo ? mapInfo.maxPlayers : ColorManager.getMaxTeams();
    
    // Create team buttons based on map's max players
    const teamNames = [];
    for (let i = 1; i <= this.maxTeams; i++) {
      teamNames.push(`Team ${i}`);
    }
    
    for (let i = 0; i < this.maxTeams; i++) {
      const row = Math.floor(i / 4);
      const col = i % 4;
      const x = -150 + col * 100;
      const y = -10 + row * 30;
      
      const color = ColorManager.getTeamColor(i + 1);
      const btn = this.scene.add.text(x, y, teamNames[i], {
        fontSize: isMobile ? '12px' : '14px',
        color: '#fff',
        backgroundColor: Phaser.Display.Color.IntegerToColor(color).rgba,
        padding: { left: 8, right: 8, top: 4, bottom: 4 },
        fontFamily: 'Arial'
      }).setOrigin(0.5).setInteractive({ useHandCursor: true });
      
      btn.on('pointerdown', () => {
        this.selectedTeam = i + 1;
        onTeamSelect(i + 1);
        this.updateTeamButtons();
      });
      
      this.container.add(btn);
      this.teamButtons.push(btn);
    }
    
    this.updateTeamButtons();
    
    // Add map info text
    if (mapInfo) {
      const mapInfoText = this.scene.add.text(0, 50, 
        `Max ${mapInfo.maxPlayers} players`, {
        fontSize: '12px',
        color: '#aaa',
        fontFamily: 'Arial',
        align: 'center'
      }).setOrigin(0.5);
      this.container.add(mapInfoText);
    }
  }

  updateTeamButtons() {
    this.teamButtons.forEach((btn, i) => {
      btn.setAlpha(this.selectedTeam === i + 1 ? 1 : 0.7);
    });
  }

  setSelectedTeam(team: number) {
    this.selectedTeam = team;
    this.updateTeamButtons();
  }

  getSelectedTeam(): number {
    return this.selectedTeam;
  }

  getMaxTeams(): number {
    return this.maxTeams;
  }

  addToGroup(group: Phaser.GameObjects.Group) {
    group.add(this.container);
  }

  setVisible(visible: boolean) {
    this.container.setVisible(visible);
  }

  destroy() {
    this.teamButtons.forEach(btn => btn.destroy());
    this.container.destroy();
  }
}
