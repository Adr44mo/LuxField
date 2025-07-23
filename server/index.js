import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, { cors: { origin: '*' } });


app.get('/', (req, res) => {
  res.send('LuxField backend running');
});

// Endpoint GET /ping
app.get('/ping', (req, res) => {
  res.send('pong');
});


io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  // Répond à l'événement "ping"
  socket.on('ping', () => {
    socket.emit('pong');
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
