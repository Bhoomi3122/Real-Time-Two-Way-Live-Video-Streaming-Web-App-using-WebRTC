const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const cors = require('cors');
require('dotenv').config();

const app = express();

app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
}));

app.get('/', (req, res) => res.send('Signaling Server Running'));

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });
const rooms = {};

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

    if (data.type === 'join') {
      const { roomID } = data;
      ws.roomID = roomID;

      if (!rooms[roomID]) rooms[roomID] = [];
      if (rooms[roomID].length >= 2) {
        safeSend(ws, { type: 'room-full' });
        return;
      }

      rooms[roomID].push(ws);
      safeSend(ws, { type: 'joined', users: rooms[roomID].length });
      rooms[roomID].forEach(other => {
        if (other !== ws) {
          safeSend(other, { type: 'user-joined' });
        }
      });
      return;
    }

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
      rooms[roomID].forEach(peer => {
        safeSend(peer, { type: 'user-left' });
      });
      if (rooms[roomID].length === 0) {
        delete rooms[roomID];
      }
    }
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () =>
  console.log(`Signaling server running at http://localhost:${PORT}`)
);
