import Phaser from 'phaser';
import { ColorManager } from '../../utils/ColorManager';
import { PlayerListComponent } from '../components/PlayerListComponent';
import { TeamSelectionComponent } from '../components/TeamSelectionComponent';
import { MapSelectionComponent } from '../components/MapSelectionComponent';
import { ControlsComponent } from '../components/ControlsComponent';

interface Player {
  id: string;
  color: number;
  team: number;
  host: boolean;
  ready: boolean;
}

interface MapInfo {
  id: string;
  name: string;
  description: string;
  minPlayers: number;
  maxPlayers: number;
  width: number;
  height: number;
}

export class MenuSceneRefactored extends Phaser.Scene {
  socket!: ReturnType<typeof import('socket.io-client').io>;
  playerId: string = '';
  lobbyId: string = '';
  players: Player[] = [];
  started: boolean = false;
  ready: boolean = false;
  isHost: boolean = false;
  selectedTeam: number = 1;
  selectedColor: number = ColorManager.getTeamColor(1);
  
  // UI Components
  createLobbyBtn!: Phaser.GameObjects.Text;
  joinLobbyBtn!: Phaser.GameObjects.Text;
  lobbyUIGroup!: Phaser.GameObjects.Group;
  
  // Scroll support for mobile
  scrollContainer!: Phaser.GameObjects.Container;
  scrollY: number = 0;
  maxScrollY: number = 0;
  isDragging: boolean = false;
  lastPointerY: number = 0;
  
  // Component instances
  playerListComponent!: PlayerListComponent;
  teamSelectionComponent!: TeamSelectionComponent;
  mapSelectionComponent!: MapSelectionComponent;
  controlsComponent!: ControlsComponent;
  
  // Map data
  mapId: string = 'classic';
  availableMaps: MapInfo[] = [];

  constructor() {
    super('MenuSceneRefactored');
  }

  init(data: any) {
    console.log('MenuSceneRefactored init called with data:', data);
    if (data && data.socket) {
      this.socket = data.socket;
      console.log('Socket set from init data');
    } else if (this.sys.settings.data && (this.sys.settings.data as any).socket) {
      this.socket = (this.sys.settings.data as any).socket;
      console.log('Socket set from settings data');
    } else {
      console.error('No socket found in init or settings data');
    }
  }

  create() {
    console.log('MenuSceneRefactored create called');
    console.log('Socket available:', !!this.socket);
    console.log('Socket from sys.settings.data:', !!(this.sys.settings.data && (this.sys.settings.data as any).socket));
    
    // Try to get socket from settings data if not available
    if (!this.socket && this.sys.settings.data && (this.sys.settings.data as any).socket) {
      this.socket = (this.sys.settings.data as any).socket;
      console.log('Socket retrieved from settings data');
    }
    
    // Ensure socket is available before proceeding
    if (!this.socket) {
      console.error('Socket not available in MenuSceneRefactored, cannot continue');
      // Add a simple error display
      this.add.text(400, 300, 'Socket Error: Cannot connect to server', {
        fontSize: '24px', color: '#ff0000', fontFamily: 'Arial'
      }).setOrigin(0.5);
      return;
    }
    
    console.log('Socket is ready, creating UI...');
    const { width, height } = this.sys.game.canvas;
    const isMobile = width < 800;
    
    try {
      this.createMainMenu(width, height, isMobile);
      this.createLobbyUI(width, height, isMobile);
      this.setupSocketEvents();
      console.log('MenuSceneRefactored initialization complete');
    } catch (error) {
      console.error('Error during MenuSceneRefactored creation:', error);
      this.add.text(400, 300, 'Error creating menu: ' + error, {
        fontSize: '18px', color: '#ff0000', fontFamily: 'Arial'
      }).setOrigin(0.5);
    }
  }

  private createMainMenu(width: number, height: number, isMobile: boolean) {
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
  }

  private createLobbyUI(width: number, height: number, isMobile: boolean) {
    console.log('Creating lobby UI...');
    this.lobbyUIGroup = this.add.group();
    
    // Calculate better mobile positioning with tighter spacing
    const startY = isMobile ? 180 : 240;
    const spacing = isMobile ? 140 : 160;

    try {
      // Create component instances with tighter mobile spacing
      console.log('Creating PlayerListComponent...');
      this.playerListComponent = new PlayerListComponent(this, width / 2, startY, width - 40, 160);
      
      console.log('Creating TeamSelectionComponent...');
      this.teamSelectionComponent = new TeamSelectionComponent(this, width / 2, startY + spacing, width - 40, 120);
      
      console.log('Creating MapSelectionComponent...');
      this.mapSelectionComponent = new MapSelectionComponent(this, width / 2, startY + spacing * 2, width - 40, 100);
      
      console.log('Creating ControlsComponent...');
      this.controlsComponent = new ControlsComponent(this, width / 2, startY + spacing * 3, width - 40, 100, isMobile);

      // Add components to lobby UI group
      console.log('Adding components to group...');
      this.playerListComponent.addToGroup(this.lobbyUIGroup);
      this.teamSelectionComponent.addToGroup(this.lobbyUIGroup);
      this.mapSelectionComponent.addToGroup(this.lobbyUIGroup);
      this.controlsComponent.addToGroup(this.lobbyUIGroup);
      
      // Setup mobile scroll if needed
      if (isMobile) {
        this.setupMobileScroll(width, height, startY + spacing * 3 + 100);
      }

      // Setup component callbacks
      console.log('Setting up component callbacks...');
      this.setupComponentCallbacks();

      // Hide lobby UI initially
      this.lobbyUIGroup.setVisible(false);
      console.log('Lobby UI creation complete');
      
    } catch (error) {
      console.error('Error creating lobby UI:', error);
      throw error;
    }
  }

  private setupComponentCallbacks() {
    // Team selection callback
    const onTeamSelect = (team: number) => {
      this.selectedTeam = team;
      this.selectedColor = ColorManager.getTeamColor(team);
      this.socket.emit('chooseTeam', { team });
      this.socket.emit('chooseColor', { color: this.selectedColor });
    };

    // Map selection callback
    const onMapSelect = (mapId: string) => {
      this.socket.emit('chooseMap', { mapId });
    };

    // Player kick callback
    const onKickPlayer = (playerId: string) => {
      this.socket.emit('kickPlayer', { lobbyId: this.lobbyId, playerId });
    };

    // Controls callbacks
    const onReady = () => {
      if (!this.ready && this.lobbyId) {
        this.socket.emit('ready', { lobbyId: this.lobbyId });
        this.ready = true;
      }
    };

    const onStart = () => {
      if (this.isHost && this.lobbyId && this.allReady()) {
        this.socket.emit('startGame', { lobbyId: this.lobbyId });
      }
    };

    this.controlsComponent.setupCallbacks(onReady, onStart);

    // Update team selection when map changes
    this.updateTeamSelectionForCurrentMap();
  }

  private setupSocketEvents() {
    this.socket.on('connect', () => {
      this.playerId = this.socket.id || '';
    });

    this.socket.on('lobbyUpdate', (data: any) => {
      this.lobbyId = data.lobbyId;
      this.players = data.players;
      this.isHost = data.hostId === this.playerId;
      this.mapId = data.mapId || 'classic';
      this.availableMaps = data.availableMaps || [];
      
      this.updateUI();
    });

    this.socket.on('kicked', () => {
      alert('You were kicked from the lobby.');
      this.scene.restart();
    });

    this.socket.on('start', (data: any) => {
      console.log('[DEBUG] MenuScene: Starting game with data:', data);
      this.scene.start('MainScene', {
        playerId: this.playerId,
        players: this.players,
        gameState: data?.gameState,
        socket: this.socket,
        mapDimensions: data?.mapDimensions
      });
    });
  }

  private updateUI() {
    // Show/hide appropriate UI
    const inLobby = !!this.lobbyId;
    this.lobbyUIGroup.setVisible(inLobby);
    this.createLobbyBtn.setVisible(!inLobby);
    this.joinLobbyBtn.setVisible(!inLobby);

    if (inLobby) {
      // Update all components
      this.playerListComponent.updatePlayerList(
        this.lobbyId, 
        this.players, 
        this.playerId, 
        this.isHost,
        (playerId) => this.socket.emit('kickPlayer', { lobbyId: this.lobbyId, playerId })
      );

      this.mapSelectionComponent.updateMaps(
        this.availableMaps,
        this.mapId,
        this.isHost,
        (mapId) => this.socket.emit('chooseMap', { mapId })
      );

      this.updateTeamSelectionForCurrentMap();

      this.controlsComponent.updateControls(this.isHost, this.players, this.allReady());
    }
  }

  private updateTeamSelectionForCurrentMap() {
    const currentMap = this.mapSelectionComponent.getCurrentMap();
    const isMobile = this.sys.game.canvas.width < 800;
    
    this.teamSelectionComponent.updateForMap(
      currentMap,
      (team: number) => {
        this.selectedTeam = team;
        this.selectedColor = ColorManager.getTeamColor(team);
        this.socket.emit('chooseTeam', { team });
        this.socket.emit('chooseColor', { color: this.selectedColor });
      },
      isMobile
    );
  }

  private allReady(): boolean {
    return this.players.length > 1 && this.players.every(p => p.ready);
  }
  
  private setupMobileScroll(width: number, height: number, contentHeight: number) {
    // Calculate max scroll needed
    this.maxScrollY = Math.max(0, contentHeight - height + 100);
    
    // Add touch/mouse scroll handlers
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      this.isDragging = true;
      this.lastPointerY = pointer.y;
    });
    
    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (this.isDragging && this.maxScrollY > 0) {
        const deltaY = pointer.y - this.lastPointerY;
        this.scrollY = Phaser.Math.Clamp(this.scrollY + deltaY, -this.maxScrollY, 0);
        // Apply scroll to lobby UI group
        this.lobbyUIGroup.children.entries.forEach((child: any) => {
          if (child.y !== undefined) {
            child.y += deltaY;
          }
        });
        this.lastPointerY = pointer.y;
      }
    });
    
    this.input.on('pointerup', () => {
      this.isDragging = false;
    });
    
    // Add wheel scroll for desktop testing
    this.input.on('wheel', (pointer: Phaser.Input.Pointer, gameObjects: any[], deltaX: number, deltaY: number) => {
      if (this.maxScrollY > 0) {
        const scrollDelta = -deltaY * 0.5;
        this.scrollY = Phaser.Math.Clamp(this.scrollY + scrollDelta, -this.maxScrollY, 0);
        // Apply scroll to lobby UI group
        this.lobbyUIGroup.children.entries.forEach((child: any) => {
          if (child.y !== undefined) {
            child.y += scrollDelta;
          }
        });
      }
    });
  }
}
