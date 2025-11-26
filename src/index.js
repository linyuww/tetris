const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const GameManager = require('./GameManager');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// Room ID -> GameManager
const rooms = new Map();

app.use(express.static(path.join(__dirname, '../public')));

io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);
    
    let currentRoomId = null;

    socket.on('joinGame', ({ roomId, nickname }) => {
        if (currentRoomId) return; // Already joined

        currentRoomId = roomId;
        socket.join(roomId);

        let game = rooms.get(roomId);
        if (!game) {
            console.log(`Creating new room: ${roomId}`);
            game = new GameManager(
                (attackData) => {
                    io.to(roomId).emit('attack', attackData);
                },
                (winnerId) => {
                    io.to(roomId).emit('gameWinner', winnerId);
                },
                (actionData) => {
                    io.to(roomId).emit('playerAction', actionData);
                },
                (playerId, rank) => {
                    io.to(playerId).emit('gameOver', { rank });
                }
            );
            game.startGame();
            rooms.set(roomId, game);
        }

        const player = game.addPlayer(socket.id, nickname || `Player ${socket.id.substr(0,4)}`);
        socket.emit('init', { id: socket.id, roomId, nickname: player.nickname });
        console.log(`User ${socket.id} joined room ${roomId} as ${player.nickname}`);
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
        if (currentRoomId) {
            const game = rooms.get(currentRoomId);
            if (game) {
                game.removePlayer(socket.id);
                if (game.players.size === 0) {
                    game.stopGame();
                    rooms.delete(currentRoomId);
                    console.log(`Room ${currentRoomId} closed.`);
                }
            }
        }
    });

    socket.on('input', (action) => {
        if (currentRoomId) {
            const game = rooms.get(currentRoomId);
            if (game) {
                game.handleInput(socket.id, action);
            }
        }
    });

    socket.on('restartGame', () => {
        if (currentRoomId) {
            const game = rooms.get(currentRoomId);
            if (game) {
                game.restartGame();
                io.to(currentRoomId).emit('gameRestarted');
            }
        }
    });
});

// Broadcast Game State for all rooms
setInterval(() => {
    rooms.forEach((game, roomId) => {
        if (game.isRunning) {
            const state = game.getGameState();
            io.to(roomId).emit('gameState', state);
        }
    });
}, 1000 / 30); // 30 FPS updates

const PORT = process.env.PORT || 3000;
server.listen(PORT, 'localhost', () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
