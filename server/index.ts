
import express from 'express';
import { createServer } from 'http';
import { Server, Socket } from 'socket.io';
import { GameState, createInitialGameState } from './game/GameState';
import { startGameLoop } from './game/GameLoop';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, { cors: { origin: '*' } });

type Player = { id: string; team: number; color: number; ready: boolean };
const COLORS = [0x3399ff, 0xff6666, 0x66ff66, 0xffcc00];
let players: Player[] = [];
let started = false;
let readyCount = 0;
let gameState: GameState | null = null;
let gameLoop: NodeJS.Timeout | null = null;


function broadcastLobby() {
  io.emit('lobby', {
    players: players.map(p => ({ id: p.id, color: p.color, team: p.team, ready: !!p.ready })),
    started,
    readyCount
  });
}


function broadcastGameState(gs: GameState) {
  io.emit('gameState', gs);
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
        gameState = createInitialGameState();
        io.emit('start', { gameState });
        if (gameLoop) clearInterval(gameLoop);
        gameLoop = startGameLoop(gameState, broadcastGameState);
      }
    }
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
      gameState = null;
      if (gameLoop) clearInterval(gameLoop);
    }
    broadcastLobby();
  });
});

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
