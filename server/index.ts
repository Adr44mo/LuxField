import express from 'express';
import { createServer } from 'http';
import { Server, Socket } from 'socket.io';
import { GameEngine } from './shared/entities/GameEngine';
import { GameState, MoveCommand, PlayerID } from './shared/types';
import { MapManager } from './maps/MapManager';
import { ColorManager } from './shared/ColorManager';

const app = express();
if (process.env.SERVE_FRONT === 'true') {
  console.log('Serving frontend from /public');
  app.use(express.static('public'));
}
const httpServer = createServer(app);
const io = new Server(httpServer, { cors: { origin: '*' } });

type Player = { id: string; team: number; color: number; ready: boolean };

// --- Lobby System ---
type LobbyPlayer = { id: string; color: number; team: number; host: boolean; ready: boolean };
type Lobby = {
  id: string;
  hostId: string;
  players: LobbyPlayer[];
  mapId: string;
  gameEngine?: GameEngine;
  gameLoop?: NodeJS.Timeout;
};
const lobbies: Record<string, Lobby> = {};
function makeLobbyId() {
  return Math.random().toString(36).substr(2, 6).toUpperCase();
}

// Helper functions to update game entity colors
function updatePlayerColors(gameEngine: GameEngine, team: number, newColor: number) {
  // Update planets owned by this team
  for (const planet of gameEngine.planets.values()) {
    if (planet.owner === team) {
      planet.updateColor(newColor);
    }
  }
  
  // Update units in game engine
  for (const unit of gameEngine.units.values()) {
    if (unit.owner === team) {
      unit.updateColor(newColor);
    }
  }
}

function updatePlayerTeamAndColors(gameEngine: GameEngine, oldTeam: number, newTeam: number, newColor: number) {
  // Update planets from old team to new team
  for (const planet of gameEngine.planets.values()) {
    if (planet.owner === oldTeam) {
      planet.owner = newTeam;
      planet.updateColor(newColor);
    }
  }
  
  // Update units in game engine
  for (const unit of gameEngine.units.values()) {
    if (unit.owner === oldTeam) {
      unit.owner = newTeam;
      unit.updateColor(newColor);
    }
  }
}

function emitLobbyUpdate(lobby: Lobby) {
  lobby.players.forEach(p => {
    io.to(p.id).emit('lobbyUpdate', {
      lobbyId: lobby.id,
      players: lobby.players,
      hostId: lobby.hostId,
      mapId: lobby.mapId,
      availableMaps: MapManager.getAllMaps(),
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
    const player: LobbyPlayer = { id: socket.id, color: ColorManager.getTeamColor(1), team: 1, host: true, ready: false };
    lobbies[lobbyId] = {
      id: lobbyId,
      hostId: socket.id,
      players: [player],
      mapId: 'classic',
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
    // Assign next available team/color from 8 available teams
    let assignedTeam = 1;
    for (let t = 1; t <= ColorManager.getMaxTeams(); t++) { // Now checks up to 8 teams
      if (!lobby.players.some(p => p.team === t)) {
        assignedTeam = t;
        break;
      }
    }
    const color = ColorManager.getTeamColor(assignedTeam);
    const team = assignedTeam;
    const player: LobbyPlayer = { id: socket.id, color, team, host: false, ready: false };
    lobby.players.push(player);
    socket.join(lobbyId);
    emitLobbyUpdate(lobby);
  });

  socket.on('chooseColor', ({ color }) => {
    Object.values(lobbies).forEach(lobby => {
      const p = lobby.players.find(p => p.id === socket.id);
      if (p) {
        p.color = color;
        // Update existing game entities if game is running
        if (lobby.gameEngine) {
          updatePlayerColors(lobby.gameEngine, p.team, color);
        }
      }
      emitLobbyUpdate(lobby);
    });
  });

  socket.on('chooseTeam', ({ team }) => {
    Object.values(lobbies).forEach(lobby => {
      const p = lobby.players.find(p => p.id === socket.id);
      if (p) {
        const oldTeam = p.team;
        p.team = team;
        // Use the team index to get the corresponding color (team 1 = index 0, etc.)
        p.color = ColorManager.getTeamColor(team); // Get color from ColorManager
        
        // Update existing game entities if game is running
        if (lobby.gameEngine) {
          updatePlayerTeamAndColors(lobby.gameEngine, oldTeam, team, p.color);
        }
      }
      emitLobbyUpdate(lobby);
    });
  });

  socket.on('chooseMap', ({ mapId }) => {
    Object.values(lobbies).forEach(lobby => {
      if (lobby.hostId === socket.id) {
        // Validate map exists
        if (MapManager.getMap(mapId)) {
          lobby.mapId = mapId;
          emitLobbyUpdate(lobby);
        }
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
    
    // Create game state using lobby info and selected map
    const gameEngine = new GameEngine();
    lobby.gameEngine = gameEngine;
    console.log(`[DEBUG] startGame: Created gameEngine for lobby ${lobbyId}`);
    
    // Prepare player info for map generation
    const playerInfos = lobby.players.map(p => ({
      id: p.id,
      team: p.team,
      color: p.color
    }));
    
    // Generate map using the map system
    const success = MapManager.generateMap(lobby.mapId, gameEngine, playerInfos);
    if (!success) {
      console.error(`[DEBUG] startGame: Failed to generate map ${lobby.mapId} for lobby ${lobbyId}`);
      return;
    }
    
    console.log(`[DEBUG] startGame: Generated map ${lobby.mapId} for lobby ${lobbyId}`);
    emitLobbyUpdate(lobby);
    
    // Get map dimensions for the frontend
    const mapDimensions = MapManager.getMapDimensions(lobby.mapId);
    const gameState = gameEngine.getGameState();
    const startData = { 
      gameState: gameState,
      mapDimensions: mapDimensions
    };
    
    console.log(`[DEBUG] startGame: Sending start event to lobby ${lobbyId}`, {
      gameStateHasPlanets: !!gameState?.planets,
      planetCount: gameState?.planets?.length || 0,
      mapDimensions: mapDimensions,
      playersInLobby: lobby.players.length,
      socketRooms: Array.from(io.sockets.adapter.rooms.get(lobbyId) || [])
    });
    
    io.to(lobbyId).emit('start', startData);
    
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
  const color = ColorManager.getTeamColor(team);
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
