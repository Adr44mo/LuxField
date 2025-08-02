
import Phaser from 'phaser';
import { ColorManager } from '../../utils/ColorManager';
// The socket will be injected from main.ts
export class MenuScene extends Phaser.Scene {
  copyLobbyBtn?: Phaser.GameObjects.Text;
  socket!: ReturnType<typeof import('socket.io-client').io>;
  playerId: string = '';
  lobbyId: string = '';
  players: { id: string; color: number; team: number; host: boolean; ready: boolean }[] = [];
  started: boolean = false;
  ready: boolean = false;
  isHost: boolean = false;
  selectedTeam: number = 1;
  selectedColor: number = ColorManager.getTeamColor(1);
  createLobbyBtn!: Phaser.GameObjects.Text;
  joinLobbyBtn!: Phaser.GameObjects.Text;
  lobbyUIGroup!: Phaser.GameObjects.Group;
  readyButton!: Phaser.GameObjects.Text;
  startButton!: Phaser.GameObjects.Text;
  playerListContainer!: Phaser.GameObjects.Container;
  teamContainer!: Phaser.GameObjects.Container;
  mapContainer!: Phaser.GameObjects.Container;
  controlsContainer!: Phaser.GameObjects.Container;
  kickButtons: Phaser.GameObjects.Text[] = [];
  colorButtons: Phaser.GameObjects.Text[] = [];
  teamButtons: Phaser.GameObjects.Text[] = [];
  mapButton!: Phaser.GameObjects.Text;
  mapId: string = 'classic';
  availableMaps: any[] = [];
  currentMapIndex: number = 0;
  
  // Available colors are now managed by ColorManager

  constructor() {
    super('MenuScene');
  }

  init(data: any) {
    if (data && data.socket) {
      this.socket = data.socket;
    }
  }

  create() {
    const { width, height } = this.sys.game.canvas;
    const isMobile = width < 800; // Detect mobile devices
    
    // Title
    this.add.text(width / 2, 40, 'LuxField', {
      fontSize: isMobile ? '32px' : '48px',
      color: '#fff',
      fontFamily: 'Arial',
    }).setOrigin(0.5);

    // Main menu buttons
    this.createLobbyBtn = this.add.text(width / 2 - (isMobile ? 80 : 120), isMobile ? 80 : 120, 'Create Lobby', {
      fontSize: isMobile ? '18px' : '24px', 
      color: '#fff', 
      backgroundColor: '#228822', 
      padding: { left: 12, right: 12, top: 6, bottom: 6 }, 
      fontFamily: 'Arial'
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    
    this.joinLobbyBtn = this.add.text(width / 2 + (isMobile ? 80 : 120), isMobile ? 80 : 120, 'Join Lobby', {
      fontSize: isMobile ? '18px' : '24px', 
      color: '#fff', 
      backgroundColor: '#222288', 
      padding: { left: 12, right: 12, top: 6, bottom: 6 }, 
      fontFamily: 'Arial'
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    this.createLobbyBtn.on('pointerdown', () => {
      this.socket.emit('createLobby');
    });
    this.joinLobbyBtn.on('pointerdown', () => {
      const lobbyId = prompt('Enter lobby ID:');
      if (lobbyId) this.socket.emit('joinLobby', { lobbyId });
    });

    // Lobby UI Group
    this.lobbyUIGroup = this.add.group();

    // Create organized containers
    this.createPlayerListContainer(width, height, isMobile);
    this.createTeamSelectionContainer(width, height, isMobile);
    this.createMapSelectionContainer(width, height, isMobile);
    this.createControlsContainer(width, height, isMobile);

    // Hide lobby UI initially
    this.lobbyUIGroup.setVisible(false);

    // Socket.io events
    this.socket.on('connect', () => {
      this.playerId = this.socket.id || '';
    });
    this.socket.on('lobbyUpdate', (data: any) => {
      this.lobbyId = data.lobbyId;
      this.players = data.players;
      this.isHost = data.hostId === this.playerId;
      this.mapId = data.mapId || 'classic';
      this.availableMaps = data.availableMaps || [];
      
      // Find current map index
      this.currentMapIndex = this.availableMaps.findIndex(map => map.id === this.mapId);
      if (this.currentMapIndex === -1) this.currentMapIndex = 0;
      
      // Show lobby UI only if in a lobby
      this.lobbyUIGroup.setVisible(!!this.lobbyId);
      this.createLobbyBtn.setVisible(!this.lobbyId);
      this.joinLobbyBtn.setVisible(!this.lobbyId);
      this.updatePlayerList();
      this.updateHostControls();
      this.updateTeamButtons();
      this.updateMapButton();
    });
    this.socket.on('kicked', () => {
      alert('You were kicked from the lobby.');
      this.scene.restart();
    });
    this.socket.on('start', (data: any) => {
      console.log('[DEBUG] MenuScene: Received start event', data);
      this.started = true;
      this.startButton.setAlpha(1);
      this.startButton.setInteractive({ useHandCursor: true });
      // Start the game with the shared state
      console.log('[DEBUG] MenuScene: Starting MainScene with data:', {
        playerId: this.playerId,
        players: this.players,
        gameState: data?.gameState,
        mapDimensions: data?.mapDimensions
      });
      this.scene.start('MainScene', {
        playerId: this.playerId,
        players: this.players,
        gameState: data?.gameState,
        socket: this.socket,
        mapDimensions: data?.mapDimensions
      });
    });
  }

  createPlayerListContainer(width: number, height: number, isMobile: boolean) {
    const startY = isMobile ? 120 : 140;
    
    // Player list background
    const listBg = this.add.rectangle(width / 2, startY + 80, width - 40, 160, ColorManager.UI_BACKGROUND, 0.8);
    listBg.setStrokeStyle(2, ColorManager.UI_BORDER);
    this.lobbyUIGroup.add(listBg);
    
    // Title
    const titleText = this.add.text(width / 2, startY, 'Lobby Info', {
      fontSize: isMobile ? '18px' : '20px',
      color: '#fff',
      fontFamily: 'Arial',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    this.lobbyUIGroup.add(titleText);
    
    // Create container for player list content
    this.playerListContainer = this.add.container(width / 2, startY + 80);
    this.lobbyUIGroup.add(this.playerListContainer);
  }

  createTeamSelectionContainer(width: number, height: number, isMobile: boolean) {
    const startY = isMobile ? 300 : 320;
    
    // Team selection background
    const teamBg = this.add.rectangle(width / 2, startY + 40, width - 40, 100, ColorManager.UI_BACKGROUND, 0.8);
    teamBg.setStrokeStyle(2, ColorManager.UI_BORDER);
    this.lobbyUIGroup.add(teamBg);
    
    // Title
    const titleText = this.add.text(width / 2, startY, 'Select Team', {
      fontSize: isMobile ? '16px' : '18px',
      color: '#fff',
      fontFamily: 'Arial',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    this.lobbyUIGroup.add(titleText);
    
    // Team buttons (8 teams for more players)
    const teamNames = ['Team 1', 'Team 2', 'Team 3', 'Team 4', 'Team 5', 'Team 6', 'Team 7', 'Team 8'];
    this.teamButtons = [];
    
    for (let i = 0; i < 8; i++) {
      const row = Math.floor(i / 4);
      const col = i % 4;
      const x = width / 2 - 150 + col * 100;
      const y = startY + 25 + row * 30;
      
      const color = ColorManager.getTeamColor(i + 1);
      const btn = this.add.text(x, y, teamNames[i], {
        fontSize: isMobile ? '12px' : '14px',
        color: '#fff',
        backgroundColor: Phaser.Display.Color.IntegerToColor(color).rgba,
        padding: { left: 8, right: 8, top: 4, bottom: 4 },
        fontFamily: 'Arial'
      }).setOrigin(0.5).setInteractive({ useHandCursor: true });
      
      btn.on('pointerdown', () => {
        this.selectedTeam = i + 1;
        this.selectedColor = color;
        this.socket.emit('chooseTeam', { team: i + 1 });
        this.socket.emit('chooseColor', { color: color }); // Also send color update
        this.updateTeamButtons();
      });
      
      this.lobbyUIGroup.add(btn);
      this.teamButtons.push(btn);
    }
    
    this.updateTeamButtons();
  }

  createMapSelectionContainer(width: number, height: number, isMobile: boolean) {
    const startY = isMobile ? 460 : 480;
    
    // Map selection background
    const mapBg = this.add.rectangle(width / 2, startY + 30, width - 40, 80, ColorManager.UI_BACKGROUND, 0.8);
    mapBg.setStrokeStyle(2, ColorManager.UI_BORDER);
    this.lobbyUIGroup.add(mapBg);
    
    // Title
    const titleText = this.add.text(width / 2, startY, 'Map Selection', {
      fontSize: isMobile ? '16px' : '18px',
      color: '#fff',
      fontFamily: 'Arial',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    this.lobbyUIGroup.add(titleText);
    
    // Map button
    this.mapButton = this.add.text(width / 2, startY + 30, 'Map: Loading...', {
      fontSize: isMobile ? '14px' : '16px',
      color: '#fff',
      backgroundColor: '#666666',
      padding: { left: 12, right: 12, top: 6, bottom: 6 },
      fontFamily: 'Arial'
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    
    this.mapButton.on('pointerdown', () => {
      if (this.isHost && this.availableMaps.length > 0) {
        this.currentMapIndex = (this.currentMapIndex + 1) % this.availableMaps.length;
        const selectedMap = this.availableMaps[this.currentMapIndex];
        this.socket.emit('chooseMap', { mapId: selectedMap.id });
      }
    });
    
    this.lobbyUIGroup.add(this.mapButton);
  }

  createControlsContainer(width: number, height: number, isMobile: boolean) {
    const startY = isMobile ? 580 : 600;
    
    // Controls background
    const controlsBg = this.add.rectangle(width / 2, startY + 40, width - 40, 100, ColorManager.UI_BACKGROUND, 0.8);
    controlsBg.setStrokeStyle(2, ColorManager.UI_BORDER);
    this.lobbyUIGroup.add(controlsBg);
    
    // Ready button
    this.readyButton = this.add.text(width / 2 - 80, startY + 30, 'READY', {
      fontSize: isMobile ? '20px' : '24px',
      color: '#fff',
      backgroundColor: '#228822',
      padding: { left: 16, right: 16, top: 8, bottom: 8 },
      fontFamily: 'Arial'
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    
    this.readyButton.on('pointerdown', () => {
      if (!this.ready && this.lobbyId) {
        this.socket.emit('ready', { lobbyId: this.lobbyId });
        this.ready = true;
        this.readyButton.setAlpha(0.5);
        this.readyButton.disableInteractive();
        this.readyButton.setText('WAITING...');
      }
    });
    this.lobbyUIGroup.add(this.readyButton);
    
    // Start button (host only)
    this.startButton = this.add.text(width / 2 + 80, startY + 30, 'START GAME', {
      fontSize: isMobile ? '18px' : '22px',
      color: '#222',
      backgroundColor: '#fff',
      padding: { left: 16, right: 16, top: 8, bottom: 8 },
      fontFamily: 'Arial'
    }).setOrigin(0.5).setAlpha(0.5);
    
    this.startButton.disableInteractive();
    this.startButton.on('pointerdown', () => {
      if (this.isHost && this.lobbyId && this.allReady()) {
        this.socket.emit('startGame', { lobbyId: this.lobbyId });
      }
    });
    this.lobbyUIGroup.add(this.startButton);
  }

  updatePlayerList() {
    if (!this.playerListContainer) return;
    
    // Clear existing content EXCEPT the copy button
    this.playerListContainer.each((child: any) => {
      if (child !== this.copyLobbyBtn) {
        child.destroy();
      }
    });
    this.playerListContainer.removeAll(false); // Don't destroy children, just remove references
    
    if (!this.lobbyId) {
      const noLobbyText = this.add.text(0, 0, 'No lobby joined.', {
        fontSize: '18px', color: '#fff', fontFamily: 'Arial', align: 'center'
      }).setOrigin(0.5);
      this.playerListContainer.add(noLobbyText);
      return;
    }
    
    if (this.players.length === 0) {
      const waitingText = this.add.text(0, 0, 'Waiting for players...', {
        fontSize: '18px', color: '#fff', fontFamily: 'Arial', align: 'center'
      }).setOrigin(0.5);
      this.playerListContainer.add(waitingText);
      return;
    }
    
    // Lobby ID with copy button
    const lobbyIdText = this.add.text(0, -60, `Lobby ID: ${this.lobbyId}`, {
      fontSize: '16px', color: '#fff', fontFamily: 'Arial', fontStyle: 'bold'
    }).setOrigin(0.5);
    this.playerListContainer.add(lobbyIdText);
    
    // Create copy button if it doesn't exist, or re-add it if it exists
    if (!this.copyLobbyBtn) {
      this.copyLobbyBtn = this.add.text(120, -60, 'Copy', {
        fontSize: '14px', color: '#fff', backgroundColor: '#228822', 
        padding: { left: 8, right: 8, top: 4, bottom: 4 }, fontFamily: 'Arial'
      }).setOrigin(0.5).setInteractive({ useHandCursor: true });
      
      this.copyLobbyBtn.on('pointerdown', () => {
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
          navigator.clipboard.writeText(this.lobbyId).then(() => {
            if (this.copyLobbyBtn) this.copyLobbyBtn.setText('Copied!');
            setTimeout(() => {
              if (this.copyLobbyBtn) this.copyLobbyBtn.setText('Copy');
            }, 1000);
          }).catch(() => {
            fallbackCopy(this.lobbyId);
          });
        } else {
          fallbackCopy(this.lobbyId);
        }
      });
    }
    // Always re-add the copy button to the container
    this.playerListContainer.add(this.copyLobbyBtn);
    
    // Clear old kick buttons
    this.kickButtons.forEach(btn => btn.destroy());
    this.kickButtons = [];
    
    // Player list
    this.players.forEach((p, idx) => {
      const teamInfo = ColorManager.getTeamInfo(ColorManager.getTeamIdByColor(p.color));
      const colorName = teamInfo?.name || 'Unknown';
      const playerText = this.add.text(0, -20 + idx * 20, 
        `${colorName} Team ${p.team} ${p.id === this.playerId ? '(You)' : ''}${p.host ? ' [Host]' : ''}${p.ready ? ' [Ready]' : ''}`, {
        fontSize: '12px', color: '#fff', fontFamily: 'Arial'
      }).setOrigin(0.5);
      this.playerListContainer.add(playerText);
      
      // Kick button for host
      if (this.isHost && p.id !== this.playerId) {
        const kickBtn = this.add.text(120, -20 + idx * 20, 'Kick', {
          fontSize: '10px', color: '#fff', backgroundColor: '#aa2222', 
          padding: { left: 6, right: 6, top: 2, bottom: 2 }, fontFamily: 'Arial'
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });
        
        kickBtn.on('pointerdown', () => {
          this.socket.emit('kickPlayer', { lobbyId: this.lobbyId, playerId: p.id });
        });
        
        this.playerListContainer.add(kickBtn);
        this.kickButtons.push(kickBtn);
      }
    });
  }

  updateHostControls() {
    if (this.isHost && this.lobbyId) {
      this.startButton.setAlpha(1);
      this.startButton.setInteractive({ useHandCursor: true });
    } else {
      this.startButton.setAlpha(0.5);
      this.startButton.disableInteractive();
    }
  }

  updateColorButtons() {
    const colors = ColorManager.getColorsArray().slice(0, 4); // Use first 4 colors for demo
    this.colorButtons.forEach((btn, i) => {
      btn.setAlpha(this.selectedColor === colors[i] ? 1 : 0.7);
    });
  }

  updateTeamButtons() {
    this.teamButtons.forEach((btn, i) => {
      btn.setAlpha(this.selectedTeam === i + 1 ? 1 : 0.7);
    });
  }

  updateMapButton() {
    if (this.availableMaps.length > 0 && this.currentMapIndex >= 0) {
      const currentMap = this.availableMaps[this.currentMapIndex];
      this.mapButton.setText(`Map: ${currentMap.name}`);
      if (this.isHost) {
        this.mapButton.setBackgroundColor('#666666');
        this.mapButton.setAlpha(1);
      } else {
        this.mapButton.setBackgroundColor('#888888');
        this.mapButton.setAlpha(0.7);
      }
    } else {
      this.mapButton.setText('Map: Loading...');
    }
  }

  allReady() {
    return this.players.length > 1 && this.players.every(p => p.ready);
  }
}
