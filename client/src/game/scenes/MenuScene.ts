import Phaser from 'phaser';
// The socket will be injected from main.ts
export class MenuScene extends Phaser.Scene {
  socket!: ReturnType<typeof import('socket.io-client').io>;
  playerId: string = '';
  players: { id: string; color: number; team: number }[] = [];
  started: boolean = false;
  ready: boolean = false;
  readyButton!: Phaser.GameObjects.Text;
  startButton!: Phaser.GameObjects.Text;
  playerListText!: Phaser.GameObjects.Text;

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
    this.add.text(width / 2, height / 2 - 80, 'LuxField', {
      fontSize: '48px',
      color: '#fff',
      fontFamily: 'Arial',
    }).setOrigin(0.5);

    this.playerListText = this.add.text(width / 2, height / 2 - 10, 'Waiting for players...', {
      fontSize: '22px',
      color: '#fff',
      fontFamily: 'Arial',
      align: 'center',
    }).setOrigin(0.5);


    this.readyButton = this.add.text(width / 2, height / 2 + 40, 'READY', {
      fontSize: '28px',
      color: '#fff',
      backgroundColor: '#228822',
      padding: { left: 24, right: 24, top: 8, bottom: 8 },
      fontFamily: 'Arial'
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    this.readyButton.on('pointerdown', () => {
      if (!this.ready) {
        this.socket.emit('ready');
        this.ready = true;
        this.readyButton.setAlpha(0.5);
        this.readyButton.disableInteractive();
        this.readyButton.setText('WAITING...');
      }
    });

    this.startButton = this.add.text(width / 2, height / 2 + 100, 'START', {
      fontSize: '32px',
      color: '#222',
      backgroundColor: '#fff',
      padding: { left: 30, right: 30, top: 10, bottom: 10 },
      fontFamily: 'Arial'
    }).setOrigin(0.5).setAlpha(0.5);
    this.startButton.disableInteractive();

    // Socket.io events
    this.socket.on('connect', () => {
      this.playerId = this.socket.id || '';
    });
    this.socket.on('lobby', (data: any) => {
      this.players = data.players;
      this.started = data.started;
      this.updatePlayerList();
      // If I'm ready, keep button disabled
      if (this.ready) {
        this.readyButton.setAlpha(0.5);
        this.readyButton.disableInteractive();
        this.readyButton.setText('WAITING...');
      } else {
        this.readyButton.setAlpha(1);
        this.readyButton.setInteractive({ useHandCursor: true });
        this.readyButton.setText('READY');
      }
      if (this.started) {
        this.startButton.setAlpha(1);
        this.startButton.setInteractive({ useHandCursor: true });
      } else {
        this.startButton.setAlpha(0.5);
        this.startButton.disableInteractive();
      }
    });
    this.socket.on('start', (data: any) => {
      this.started = true;
      this.startButton.setAlpha(1);
      this.startButton.setInteractive({ useHandCursor: true });
      // Start the game with the shared state
      this.scene.start('MainScene', {
        playerId: this.playerId,
        players: this.players,
        gameState: data?.gameState,
        socket: this.socket
      });
    });
  }

  updatePlayerList() {
    if (!this.playerListText) return;
    if (this.players.length === 0) {
      this.playerListText.setText('Waiting for players...');
      return;
    }
    const lines = this.players.map(p => `Player ${p.team} ${p.id === this.playerId ? '(You)' : ''}`);
    this.playerListText.setText('Players in lobby:\n' + lines.join('\n'));
  }
}
