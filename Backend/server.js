// backend/server.js

const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const cors = require('cors');

const app = express();
app.use(cors());

// For health check (optional)
app.get('/', (req, res) => res.send('Signaling Server Running'));

const server = http.createServer(app);

const wss = new WebSocket.Server({ server });

/*
Room Structure:
{
  roomID: [ ws1, ws2 ]
}
*/
const rooms = {};

// Helper: Send data safely
function safeSend(ws, data) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(data));
  }
}

wss.on('connection', (ws) => {
  ws.roomID = null;

  ws.on('message', (msg) => {
    let data;
    try {
      data = JSON.parse(msg);
    } catch {
      return;
    }

    // Handle room joining
    if (data.type === 'join') {
      const { roomID } = data;
      ws.roomID = roomID;

      // Initialize room if doesn't exist
      if (!rooms[roomID]) rooms[roomID] = [];
      // If more than 2, refuse connection
      if (rooms[roomID].length >= 2) {
        safeSend(ws, { type: 'room-full' });
        return;
      }

      rooms[roomID].push(ws);

      // Notify this user about join success
      safeSend(ws, { type: 'joined', users: rooms[roomID].length });

      // Notify others in room about new user
      rooms[roomID].forEach(other => {
        if (other !== ws) {
          safeSend(other, { type: 'user-joined' });
        }
      });
      return;
    }

    // Signaling: offer/answer/candidate
    if (['offer', 'answer', 'candidate'].includes(data.type)) {
      const peers = rooms[ws.roomID] || [];
      peers.forEach(peer => {
        if (peer !== ws) {
          safeSend(peer, data);
        }
      });
      return;
    }
  });

  ws.on('close', () => {
    const { roomID } = ws;
    if (roomID && rooms[roomID]) {
      rooms[roomID] = rooms[roomID].filter(client => client !== ws);
      // Notify other users that someone left
      rooms[roomID].forEach(peer => {
        safeSend(peer, { type: 'user-left' });
      });

      // Clean up empty rooms
      if (rooms[roomID].length === 0) {
        delete rooms[roomID];
      }
    }
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Signaling server running at http://localhost:${PORT}`));
