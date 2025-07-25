
import express from 'express';
import { createServer } from 'http';
import { Server, Socket } from 'socket.io';
import { GameEngine } from '../shared/entities/GameEngine';
import { CorePlanet } from '../shared/entities/CorePlanet';
import { CoreUnit } from '../shared/entities/CoreUnit';
import { GameState, MoveCommand, PlayerID } from '../shared/types';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, { cors: { origin: '*' } });

type Player = { id: string; team: number; color: number; ready: boolean };
const COLORS = [0x3399ff, 0xff6666, 0x66ff66, 0xffcc00];
let players: Player[] = [];
let started = false;
let readyCount = 0;
let gameEngine: GameEngine | null = null;
let gameLoop: NodeJS.Timeout | null = null;

function createInitialGameState(): void {
  gameEngine = new GameEngine();
  
  // Create initial planets
  const planet1 = new CorePlanet({
    id: 'planet1',
    x: 200,
    y: 300,
    radius: 40,
    color: COLORS[0],
    owner: 1,
    maxUnits: 8,
    productionSpeed: 1
  });
  
  const planet2 = new CorePlanet({
    id: 'planet2',
    x: 600,
    y: 300,
    radius: 40,
    color: COLORS[1],
    owner: 2,
    maxUnits: 8,
    productionSpeed: 1
  });
  
  // Add some neutral planets
  const neutralPlanet = new CorePlanet({
    id: 'neutral1',
    x: 400,
    y: 200,
    radius: 30,
    color: 0x888888,
    owner: 0,
    maxUnits: 6,
    productionSpeed: 0.5
  });
  
  gameEngine.addPlanet(planet1);
  gameEngine.addPlanet(planet2);
  gameEngine.addPlanet(neutralPlanet);
  
  // Add initial units for owned planets
  for (let i = 0; i < 3; i++) {
    const unit1 = new CoreUnit({
      id: `unit1_${i}`,
      planetId: 'planet1',
      angle: (i * Math.PI * 2) / 3,
      distance: 60,
      color: COLORS[0],
      owner: 1,
      stats: { health: 100, damage: 10, production: 1 },
      isOrbiting: true
    });
    
    const unit2 = new CoreUnit({
      id: `unit2_${i}`,
      planetId: 'planet2',
      angle: (i * Math.PI * 2) / 3,
      distance: 60,
      color: COLORS[1],
      owner: 2,
      stats: { health: 100, damage: 10, production: 1 },
      isOrbiting: true
    });
    
    gameEngine.addUnit(unit1);
    gameEngine.addUnit(unit2);
  }
}


function broadcastLobby() {
  io.emit('lobby', {
    players: players.map(p => ({ id: p.id, color: p.color, team: p.team, ready: !!p.ready })),
    started,
    readyCount
  });
}

function broadcastGameState() {
  if (gameEngine) {
    const gameState = gameEngine.getGameState();
    io.emit('gameState', gameState);
  }
}

function startGameLoop() {
  if (gameLoop) clearInterval(gameLoop);
  gameLoop = setInterval(() => {
    if (gameEngine) {
      gameEngine.update();
      broadcastGameState();
    }
  }, 50); // 20 FPS for smoother updates
}



app.get('/', (_req, res) => {
  res.send('LuxField backend running');
});

app.get('/ping', (_req, res) => {
  res.send('pong');
});

io.on('connection', (socket: Socket) => {
  console.log('A user connected:', socket.id);

  // Assign team/color
  const team = players.length + 1;
  const color = COLORS[(team - 1) % COLORS.length];
  players.push({ id: socket.id, team, color, ready: false });
  broadcastLobby();

  // Listen for ready
  socket.on('ready', () => {
    const p = players.find(p => p.id === socket.id);
    if (p && !p.ready) {
      p.ready = true;
      readyCount = players.filter(p => p.ready).length;
      broadcastLobby();
      // If all players are ready, start the game
      if (!started && readyCount === players.length && players.length >= 2) {
        started = true;
        // Generate initial game state (same for all)
        createInitialGameState();
        const gameState = gameEngine?.getGameState();
        io.emit('start', { gameState });
        startGameLoop();
      }
    }
  });

  socket.on('moveUnit', (data: { unitId: string; x: number; y: number }) => {
    if (!gameEngine) return;
    const player = players.find(p => p.id === socket.id);
    if (!player) return;
    
    // Move single unit
    const command: MoveCommand = {
      unitIds: [data.unitId],
      target: { x: data.x, y: data.y }
    };
    gameEngine.moveUnits(command, player.team);
  });

  socket.on('moveUnits', (data: { unitIds: string[]; x: number; y: number }) => {
    if (!gameEngine) return;
    const player = players.find(p => p.id === socket.id);
    if (!player) return;
    
    // Move multiple units
    const command: MoveCommand = {
      unitIds: data.unitIds,
      target: { x: data.x, y: data.y }
    };
    gameEngine.moveUnits(command, player.team);
  });

  socket.on('ping', () => {
    socket.emit('pong');
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    players = players.filter(p => p.id !== socket.id);
    if (players.length < 2) started = false;
    // Remove ready state and reset game if someone leaves
    readyCount = players.filter(p => p.ready).length;
    if (players.length < 2) {
      players.forEach(p => p.ready = false);
      readyCount = 0;
      started = false;
      gameEngine = null;
      if (gameLoop) clearInterval(gameLoop);
    }
    broadcastLobby();
  });
});

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
