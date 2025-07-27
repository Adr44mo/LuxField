import express from 'express';
import { createServer } from 'http';
import { Server, Socket } from 'socket.io';
import { GameEngine } from './shared/entities/GameEngine';
import { CorePlanet } from './shared/entities/CorePlanet';
import { CoreUnit } from './shared/entities/CoreUnit';
import { GameState, MoveCommand, PlayerID } from './shared/types';

const app = express();
if (process.env.SERVE_FRONT === 'true') {
  console.log('Serving frontend from /public');
  app.use(express.static('public'));
}
const httpServer = createServer(app);
const io = new Server(httpServer, { cors: { origin: '*' } });

type Player = { id: string; team: number; color: number; ready: boolean };
const COLORS = [0x3399ff, 0xff6666, 0x66ff66, 0xffcc00];
// --- Lobby System ---
type LobbyPlayer = { id: string; color: number; team: number; host: boolean; ready: boolean };
type Lobby = {
  id: string;
  hostId: string;
  players: LobbyPlayer[];
  mapName: string;
  gameEngine?: GameEngine;
  gameLoop?: NodeJS.Timeout;
};
const lobbies: Record<string, Lobby> = {};
function makeLobbyId() {
  return Math.random().toString(36).substr(2, 6).toUpperCase();
}
function emitLobbyUpdate(lobby: Lobby) {
  lobby.players.forEach(p => {
    io.to(p.id).emit('lobbyUpdate', {
      lobbyId: lobby.id,
      players: lobby.players,
      hostId: lobby.hostId,
      mapName: lobby.mapName,
    });
  });
}
let players: Player[] = [];

app.get('/', (_req, res) => {
  res.send('LuxField backend running');
});

app.get('/ping', (_req, res) => {
  res.send('pong');
});

io.on('connection', (socket: Socket) => {
  // --- Lobby events ---
  socket.on('createLobby', () => {
    // Remove from other lobbies first
    Object.values(lobbies).forEach(lobby => {
      lobby.players = lobby.players.filter(p => p.id !== socket.id);
    });
    // Create new lobby
    const lobbyId = makeLobbyId();
    const player: LobbyPlayer = { id: socket.id, color: COLORS[0], team: 1, host: true, ready: false };
    lobbies[lobbyId] = {
      id: lobbyId,
      hostId: socket.id,
      players: [player],
      mapName: 'Default Map',
    };
    socket.join(lobbyId);
    emitLobbyUpdate(lobbies[lobbyId]);
  });

  socket.on('joinLobby', ({ lobbyId }) => {
    const lobby = lobbies[lobbyId];
    if (!lobby) return;
    // Remove from other lobbies first
    Object.values(lobbies).forEach(l => {
      l.players = l.players.filter(p => p.id !== socket.id);
    });
    // Add to lobby
    // Assign next available team/color
    let assignedTeam = 1;
    for (let t = 1; t <= COLORS.length; t++) {
      if (!lobby.players.some(p => p.team === t)) {
        assignedTeam = t;
        break;
      }
    }
    const color = COLORS[assignedTeam - 1];
    const team = assignedTeam;
    const player: LobbyPlayer = { id: socket.id, color, team, host: false, ready: false };
    lobby.players.push(player);
    socket.join(lobbyId);
    emitLobbyUpdate(lobby);
  });

  socket.on('chooseColor', ({ color }) => {
    Object.values(lobbies).forEach(lobby => {
      const p = lobby.players.find(p => p.id === socket.id);
      if (p) p.color = color;
      emitLobbyUpdate(lobby);
    });
  });

  socket.on('chooseTeam', ({ team }) => {
    Object.values(lobbies).forEach(lobby => {
      const p = lobby.players.find(p => p.id === socket.id);
      if (p) {
        p.team = team;
        p.color = COLORS[team - 1]; // Always match color to team
      }
      emitLobbyUpdate(lobby);
    });
  });

  socket.on('chooseMap', ({ map }) => {
    Object.values(lobbies).forEach(lobby => {
      if (lobby.hostId === socket.id) {
        lobby.mapName = map;
        emitLobbyUpdate(lobby);
      }
    });
  });

  socket.on('ready', ({ lobbyId }) => {
    const lobby = lobbies[lobbyId];
    if (!lobby) return;
    const p = lobby.players.find(p => p.id === socket.id);
    if (p) p.ready = true;
    emitLobbyUpdate(lobby);
  });

  socket.on('kickPlayer', ({ lobbyId, playerId }) => {
    const lobby = lobbies[lobbyId];
    if (!lobby || lobby.hostId !== socket.id) return;
    lobby.players = lobby.players.filter(p => p.id !== playerId);
    io.to(playerId).emit('kicked');
    emitLobbyUpdate(lobby);
  });

  socket.on('startGame', ({ lobbyId }) => {
    const lobby = lobbies[lobbyId];
    if (!lobby || lobby.hostId !== socket.id) {
      console.log(`[DEBUG] startGame: Invalid lobby or host. lobbyId=${lobbyId}, hostId=${socket.id}`);
      return;
    }
    if (lobby.players.length < 2) {
      console.log(`[DEBUG] startGame: Not enough players in lobby ${lobbyId}`);
      return;
    }
    // Create game state using lobby info
    const gameEngine = new GameEngine();
    lobby.gameEngine = gameEngine;
    console.log(`[DEBUG] startGame: Created gameEngine for lobby ${lobbyId}`);
    // Example: create planets and units for each player
    lobby.players.forEach((p, idx) => {
      const planet = new CorePlanet({
        id: `planet${idx+1}`,
        x: 200 + idx * 200,
        y: 300,
        radius: 40,
        color: COLORS[p.team - 1],
        owner: p.team,
        maxUnits: 8,
        productionSpeed: 1,
        health: 100,
        maxHealth: 100
      });
      gameEngine.addPlanet(planet);
      for (let i = 0; i < 3; i++) {
        const unit = new CoreUnit({
          id: `unit${p.team}_${i}`,
          planetId: planet.id,
          angle: (i * Math.PI * 2) / 3,
          distance: 60,
          color: COLORS[p.team - 1],
          owner: p.team,
          stats: { health: 100, damage: 10, production: 1 },
          isOrbiting: true
        });
        gameEngine.addUnit(unit);
      }
    });
    // Add a neutral planet
    const neutralPlanet = new CorePlanet({
      id: 'neutral1',
      x: 400,
      y: 200,
      radius: 30,
      color: 0x888888,
      owner: 0,
      maxUnits: 6,
      productionSpeed: 0.5,
      health: 100,
      maxHealth: 100
    });
    gameEngine.addPlanet(neutralPlanet);
    console.log(`[DEBUG] startGame: Game started for lobby ${lobbyId}`);
    emitLobbyUpdate(lobby);
    io.to(lobbyId).emit('start', { gameState: gameEngine.getGameState() });
    // Start per-lobby game loop
    if (lobby.gameLoop) clearInterval(lobby.gameLoop);
    lobby.gameLoop = setInterval(() => {
      if (lobby.gameEngine) {
        const gameState = lobby.gameEngine.update();
        io.to(lobbyId).emit('gameState', gameState);
      }
    }, 50); // 20 FPS
  });

  socket.on('disconnect', () => {
    console.log(`[DEBUG] disconnect: Socket ${socket.id} disconnected.`);
    Object.values(lobbies).forEach(lobby => {
      lobby.players = lobby.players.filter(p => p.id !== socket.id);
      // If host leaves, remove lobby
      if (lobby.hostId === socket.id) {
        lobby.players.forEach(p => io.to(p.id).emit('kicked'));
        console.log(`[DEBUG] disconnect: Host left, removing lobby ${lobby.id}`);
        if (lobby.gameLoop) clearInterval(lobby.gameLoop);
        delete lobbies[lobby.id];
      } else {
        emitLobbyUpdate(lobby);
      }
    });
  });
  console.log('A user connected:', socket.id);

  // Assign team/color
  const team = players.length + 1;
  const color = COLORS[(team - 1) % COLORS.length];
  players.push({ id: socket.id, team, color, ready: false });
  // No-op: ready logic is now per-lobby

  socket.on('moveUnit', (data: { unitId: string; x: number; y: number }) => {
    let foundLobby: Lobby | undefined;
    let team: number | undefined;
    for (const lobby of Object.values(lobbies)) {
      const p = lobby.players.find(p => p.id === socket.id);
      if (p) { foundLobby = lobby; team = p.team; break; }
    }
    if (!foundLobby || !foundLobby.gameEngine || team === undefined) {
      console.log(`[DEBUG] moveUnit: No valid lobby/gameEngine/team for socket ${socket.id}`);
      return;
    }
    console.log(`[DEBUG] moveUnit: Moving unit ${data.unitId} for team ${team} in lobby ${foundLobby.id}`);
    // Move single unit
    const command: MoveCommand = {
      unitIds: [data.unitId],
      target: { x: data.x, y: data.y }
    };
    foundLobby.gameEngine.moveUnits(command, team);
  });

  socket.on('moveUnits', (data: { unitIds: string[]; x: number; y: number }) => {
    let foundLobby: Lobby | undefined;
    let team: number | undefined;
    for (const lobby of Object.values(lobbies)) {
      const p = lobby.players.find(p => p.id === socket.id);
      if (p) { foundLobby = lobby; team = p.team; break; }
    }
    if (!foundLobby || !foundLobby.gameEngine || team === undefined) {
      console.log(`[DEBUG] moveUnits: No valid lobby/gameEngine/team for socket ${socket.id}`);
      return;
    }
    console.log(`[DEBUG] moveUnits: Moving units ${data.unitIds.join(',')} for team ${team} in lobby ${foundLobby.id}`);
    // Move multiple units
    const command: MoveCommand = {
      unitIds: data.unitIds,
      target: { x: data.x, y: data.y }
    };
    foundLobby.gameEngine.moveUnits(command, team);
  });

  socket.on('ping', () => {
    socket.emit('pong');
  });
});

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
