
import Phaser from 'phaser';
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
  selectedColor: number = 0x3399ff;
  createLobbyBtn!: Phaser.GameObjects.Text;
  joinLobbyBtn!: Phaser.GameObjects.Text;
  lobbyUIGroup!: Phaser.GameObjects.Group;
  readyButton!: Phaser.GameObjects.Text;
  startButton!: Phaser.GameObjects.Text;
  playerListText!: Phaser.GameObjects.Text;
  kickButtons: Phaser.GameObjects.Text[] = [];
  colorButtons: Phaser.GameObjects.Text[] = [];
  teamButtons: Phaser.GameObjects.Text[] = [];
  mapButton!: Phaser.GameObjects.Text;
  mapId: string = 'classic';
  availableMaps: any[] = [];
  currentMapIndex: number = 0;

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
    this.add.text(width / 2, 60, 'LuxField', {
      fontSize: '48px',
      color: '#fff',
      fontFamily: 'Arial',
    }).setOrigin(0.5);

    // Lobby creation/join UI
    this.createLobbyBtn = this.add.text(width / 2 - 120, 120, 'Create Lobby', {
      fontSize: '24px', color: '#fff', backgroundColor: '#228822', padding: { left: 16, right: 16, top: 8, bottom: 8 }, fontFamily: 'Arial'
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    this.joinLobbyBtn = this.add.text(width / 2 + 120, 120, 'Join Lobby', {
      fontSize: '24px', color: '#fff', backgroundColor: '#222288', padding: { left: 16, right: 16, top: 8, bottom: 8 }, fontFamily: 'Arial'
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    this.createLobbyBtn.on('pointerdown', () => {
      this.socket.emit('createLobby');
    });
    this.joinLobbyBtn.on('pointerdown', () => {
      const lobbyId = prompt('Enter lobby ID:');
      if (lobbyId) this.socket.emit('joinLobby', { lobbyId });
    });

    // Hide lobby management UI until in a lobby
    this.lobbyUIGroup = this.add.group();

    this.playerListText = this.add.text(width / 2, 180, 'No lobby joined.', {
      fontSize: '22px', color: '#fff', fontFamily: 'Arial', align: 'center',
    }).setOrigin(0.5);
    this.lobbyUIGroup.add(this.playerListText);

    // Team selection (4 teams/colors)
    const teamNames = ['Blue', 'Red', 'Green', 'Yellow'];
    const colors = [0x3399ff, 0xff6666, 0x66ff66, 0xffcc00];
    this.teamButtons = [1, 2, 3, 4].map((team, i) => {
      const btn = this.add.text(width / 2 - 240 + i * 160, 240, teamNames[i], {
        fontSize: '20px', color: '#fff', backgroundColor: Phaser.Display.Color.IntegerToColor(colors[i]).rgba, padding: { left: 16, right: 16, top: 8, bottom: 8 }, fontFamily: 'Arial'
      }).setOrigin(0.5).setInteractive({ useHandCursor: true });
      btn.on('pointerdown', () => {
        this.selectedTeam = team;
        this.socket.emit('chooseTeam', { team });
        this.updateTeamButtons();
      });
      this.lobbyUIGroup.add(btn);
      return btn;
    });
    this.updateTeamButtons();

    // Map selection
    this.mapButton = this.add.text(width / 2, 340, `Map: Loading...`, {
      fontSize: '20px', color: '#fff', backgroundColor: '#888', padding: { left: 16, right: 16, top: 8, bottom: 8 }, fontFamily: 'Arial'
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    this.mapButton.on('pointerdown', () => {
      if (this.isHost && this.availableMaps.length > 0) {
        // Cycle through available maps
        this.currentMapIndex = (this.currentMapIndex + 1) % this.availableMaps.length;
        const selectedMap = this.availableMaps[this.currentMapIndex];
        this.socket.emit('chooseMap', { mapId: selectedMap.id });
      }
    });
    this.lobbyUIGroup.add(this.mapButton);

    // Ready button
    this.readyButton = this.add.text(width / 2, 400, 'READY', {
      fontSize: '28px', color: '#fff', backgroundColor: '#228822', padding: { left: 24, right: 24, top: 8, bottom: 8 }, fontFamily: 'Arial'
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
    this.startButton = this.add.text(width / 2, 460, 'START GAME', {
      fontSize: '32px', color: '#222', backgroundColor: '#fff', padding: { left: 30, right: 30, top: 10, bottom: 10 }, fontFamily: 'Arial'
    }).setOrigin(0.5).setAlpha(0.5);
    this.startButton.disableInteractive();
    this.startButton.on('pointerdown', () => {
      if (this.isHost && this.lobbyId && this.allReady()) {
        this.socket.emit('startGame', { lobbyId: this.lobbyId });
      }
    });
    this.lobbyUIGroup.add(this.startButton);

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

  updatePlayerList() {
    if (!this.playerListText) return;
    if (!this.lobbyId) {
      this.playerListText.setText('No lobby joined.');
      return;
    }
    if (this.players.length === 0) {
      this.playerListText.setText('Waiting for players...');
      return;
    }
    let lines = [`Lobby ID: ${this.lobbyId}`];
    // Add copy button for lobby ID
    if (this.lobbyId) {
      if (!this.copyLobbyBtn) {
        this.copyLobbyBtn = this.add.text(this.playerListText.x + 120, this.playerListText.y - 18, 'Copy', {
          fontSize: '18px', color: '#fff', backgroundColor: '#228822', padding: { left: 10, right: 10, top: 4, bottom: 4 }, fontFamily: 'Arial'
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });
        this.copyLobbyBtn.on('pointerdown', () => {
          navigator.clipboard.writeText(this.lobbyId);
          if (this.copyLobbyBtn) {
            this.copyLobbyBtn.setText('Copied!');
          }
          setTimeout(() => {
            if (this.copyLobbyBtn) {
              this.copyLobbyBtn.setText('Copy');
            }
          }, 1000);
        });
      }
      this.copyLobbyBtn.setVisible(true);
    } else if (this.copyLobbyBtn) {
      this.copyLobbyBtn.setVisible(false);
    }
    this.kickButtons.forEach(btn => btn.destroy());
    this.kickButtons = [];
    this.players.forEach((p, idx) => {
      let line = `Player ${p.team} ${p.id === this.playerId ? '(You)' : ''} Color: #${p.color.toString(16)}${p.host ? ' [Host]' : ''}${p.ready ? ' [Ready]' : ''}`;
      lines.push(line);
      if (this.isHost && p.id !== this.playerId) {
        const btn = this.add.text(50, 220 + idx * 30, 'Kick', {
          fontSize: '18px', color: '#fff', backgroundColor: '#aa2222', padding: { left: 10, right: 10, top: 4, bottom: 4 }, fontFamily: 'Arial'
        }).setInteractive({ useHandCursor: true });
        btn.on('pointerdown', () => {
          this.socket.emit('kickPlayer', { lobbyId: this.lobbyId, playerId: p.id });
        });
        this.kickButtons.push(btn);
      }
    });
    this.playerListText.setText(lines.join('\n'));
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
    const colors = [0x3399ff, 0xff6666, 0x66ff66, 0xffcc00];
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
