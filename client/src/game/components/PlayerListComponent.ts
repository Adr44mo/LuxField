import Phaser from 'phaser';
import { ColorManager } from '../../utils/ColorManager';

interface Player {
  id: string;
  color: number;
  team: number;
  host: boolean;
  ready: boolean;
}

export class PlayerListComponent {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private copyLobbyBtn?: Phaser.GameObjects.Text;
  private kickButtons: Phaser.GameObjects.Text[] = [];

  constructor(scene: Phaser.Scene, x: number, y: number, width: number, height: number) {
    this.scene = scene;
    
    // Create background
    const bg = scene.add.rectangle(0, 0, width, height, ColorManager.UI_BACKGROUND, 0.8);
    bg.setStrokeStyle(2, ColorManager.UI_BORDER);
    
    // Create container
    this.container = scene.add.container(x, y);
    this.container.add(bg);
  }

  updatePlayerList(lobbyId: string, players: Player[], playerId: string, isHost: boolean, onKickPlayer: (playerId: string) => void) {
    // Clear existing content EXCEPT the copy button
    this.container.each((child: any) => {
      if (child !== this.copyLobbyBtn && child.type !== 'Rectangle') {
        child.destroy();
      }
    });
    
    // Clear old kick buttons
    this.kickButtons.forEach(btn => btn.destroy());
    this.kickButtons = [];
    
    if (!lobbyId) {
      const noLobbyText = this.scene.add.text(0, 0, 'No lobby joined.', {
        fontSize: '18px', color: '#fff', fontFamily: 'Arial', align: 'center'
      }).setOrigin(0.5);
      this.container.add(noLobbyText);
      return;
    }
    
    if (players.length === 0) {
      const waitingText = this.scene.add.text(0, 0, 'Waiting for players...', {
        fontSize: '18px', color: '#fff', fontFamily: 'Arial', align: 'center'
      }).setOrigin(0.5);
      this.container.add(waitingText);
      return;
    }
    
    // Lobby ID with copy button
    const lobbyIdText = this.scene.add.text(0, -60, `Lobby ID: ${lobbyId}`, {
      fontSize: '16px', color: '#fff', fontFamily: 'Arial', fontStyle: 'bold'
    }).setOrigin(0.5);
    this.container.add(lobbyIdText);
    
    // Create copy button if it doesn't exist
    if (!this.copyLobbyBtn) {
      this.copyLobbyBtn = this.scene.add.text(120, -60, 'Copy', {
        fontSize: '14px', color: '#fff', backgroundColor: '#228822', 
        padding: { left: 8, right: 8, top: 4, bottom: 4 }, fontFamily: 'Arial'
      }).setOrigin(0.5).setInteractive({ useHandCursor: true });
      
      this.copyLobbyBtn.on('pointerdown', () => {
        this.copyToClipboard(lobbyId);
      });
    }
    this.container.add(this.copyLobbyBtn);
    
    // Player list
    players.forEach((p, idx) => {
      const teamInfo = ColorManager.getTeamInfo(ColorManager.getTeamIdByColor(p.color));
      const colorName = teamInfo?.name || 'Unknown';
      const playerText = this.scene.add.text(0, -20 + idx * 20, 
        `${colorName} Team ${p.team} ${p.id === playerId ? '(You)' : ''}${p.host ? ' [Host]' : ''}${p.ready ? ' [Ready]' : ''}`, {
        fontSize: '12px', color: '#fff', fontFamily: 'Arial'
      }).setOrigin(0.5);
      this.container.add(playerText);
      
      // Kick button for host
      if (isHost && p.id !== playerId) {
        const kickBtn = this.scene.add.text(120, -20 + idx * 20, 'Kick', {
          fontSize: '10px', color: '#fff', backgroundColor: '#aa2222', 
          padding: { left: 6, right: 6, top: 2, bottom: 2 }, fontFamily: 'Arial'
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });
        
        kickBtn.on('pointerdown', () => {
          onKickPlayer(p.id);
        });
        
        this.container.add(kickBtn);
        this.kickButtons.push(kickBtn);
      }
    });
  }

  private copyToClipboard(text: string) {
    const fallbackCopy = (text: string) => {
      const tempInput = document.createElement('input');
      tempInput.value = text;
      document.body.appendChild(tempInput);
      tempInput.select();
      try {
        document.execCommand('copy');
        if (this.copyLobbyBtn) this.copyLobbyBtn.setText('Copied!');
        setTimeout(() => {
          if (this.copyLobbyBtn) this.copyLobbyBtn.setText('Copy');
        }, 1000);
      } catch (err) {
        alert('Copy failed');
      }
      document.body.removeChild(tempInput);
    };
    
    if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
      navigator.clipboard.writeText(text).then(() => {
        if (this.copyLobbyBtn) this.copyLobbyBtn.setText('Copied!');
        setTimeout(() => {
          if (this.copyLobbyBtn) this.copyLobbyBtn.setText('Copy');
        }, 1000);
      }).catch(() => {
        fallbackCopy(text);
      });
    } else {
      fallbackCopy(text);
    }
  }

  addToGroup(group: Phaser.GameObjects.Group) {
    group.add(this.container);
  }

  setVisible(visible: boolean) {
    this.container.setVisible(visible);
  }

  destroy() {
    this.kickButtons.forEach(btn => btn.destroy());
    this.copyLobbyBtn?.destroy();
    this.container.destroy();
  }
}
