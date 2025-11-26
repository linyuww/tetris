const socket = io();

const canvas = document.getElementById('local-canvas');
const ctx = canvas.getContext('2d');
const BLOCK_SIZE = 24; // 240 / 10

const COLORS = {
    'cyan': '#00ffff',
    'blue': '#0000ff',
    'orange': '#ff7f00',
    'yellow': '#ffff00',
    'green': '#00ff00',
    'purple': '#800080',
    'red': '#ff0000',
    'grey': '#808080', // Garbage
    0: '#000000'
};

let myId = null;
let gameState = {};
let currentRoomId = null;

// Login Handling
document.getElementById('join-btn').addEventListener('click', () => {
    const roomId = document.getElementById('room-input').value || 'default';
    const nickname = document.getElementById('nickname-input').value || 'Player';
    
    socket.emit('joinGame', { roomId, nickname });
    document.getElementById('login-overlay').style.display = 'none';
    currentRoomId = roomId;
});

socket.on('connect', () => {
    document.getElementById('connection-status').innerText = 'Connected';
});

socket.on('init', (data) => {
    myId = data.id;
    document.getElementById('my-id').innerText = data.nickname || myId;
    if (data.roomId) {
        document.title = `Tetris - Room: ${data.roomId}`;
    }
});

socket.on('gameState', (state) => {
    gameState = state;
    render();
    updateStats();
});

socket.on('attack', (data) => {
    // data: { attackerId, targetId, lines }
    visualizeAttack(data.attackerId, data.targetId, data.lines);
});

socket.on('playerAction', (data) => {
    if (data.action === 'hardDrop') {
        triggerHardDropEffect(data.playerId, data.x, data.y, data.type, data.rotation);
    }
});

function visualizeAttack(attackerId, targetId, lines) {
    const effectsLayer = document.getElementById('effects-layer');
    
    // Find source element
    let sourceEl = null;
    if (attackerId === myId) {
        sourceEl = document.getElementById('local-canvas');
    } else {
        const oppDiv = document.getElementById(`opp-${attackerId}`);
        if (oppDiv) sourceEl = oppDiv.querySelector('canvas');
    }

    // Find target element
    let targetEl = null;
    if (targetId === myId) {
        targetEl = document.getElementById('local-canvas');
    } else {
        const oppDiv = document.getElementById(`opp-${targetId}`);
        if (oppDiv) targetEl = oppDiv.querySelector('canvas');
    }

    if (sourceEl && targetEl) {
        const startRect = sourceEl.getBoundingClientRect();
        const endRect = targetEl.getBoundingClientRect();

        const startX = startRect.left + startRect.width / 2;
        const startY = startRect.top + startRect.height / 2;
        const endX = endRect.left + endRect.width / 2;
        const endY = endRect.top + endRect.height / 2;

        // Create beam particle
        const beam = document.createElement('div');
        beam.className = 'attack-beam';
        // Scale size based on lines?
        const size = 10 + lines * 2;
        beam.style.width = `${size}px`;
        beam.style.height = `${size}px`;
        
        beam.style.left = `${startX}px`;
        beam.style.top = `${startY}px`;
        
        effectsLayer.appendChild(beam);

        // Animate
        // Force reflow
        beam.getBoundingClientRect();

        beam.style.transform = `translate(${endX - startX}px, ${endY - startY}px)`;

        // Remove after animation
        setTimeout(() => {
            beam.remove();
            // Flash target border?
            targetEl.style.borderColor = 'red';
            setTimeout(() => targetEl.style.borderColor = '#555', 200);
        }, 500);
    }
}

function triggerHardDropEffect(playerId, gridX, gridY, type, rotation) {
    const effectsLayer = document.getElementById('effects-layer');
    let targetCanvas = null;

    if (playerId === myId) {
        targetCanvas = document.getElementById('local-canvas');
    } else {
        const oppDiv = document.getElementById(`opp-${playerId}`);
        if (oppDiv) {
            targetCanvas = oppDiv.querySelector('canvas');
        }
    }

    if (!targetCanvas) return;

    const rect = targetCanvas.getBoundingClientRect();
    // Calculate visual block size based on canvas width and grid width (10 columns)
    const visualBlockSize = rect.width / 10;
    
    const startX = rect.left + gridX * visualBlockSize;
    const startY = rect.top + gridY * visualBlockSize;

    const shape = getRotatedShape(type, rotation);
    const colorName = getColorForType(type);
    const colorHex = COLORS[colorName] || colorName;

    // Create a container for the flash shape
    const flashContainer = document.createElement('div');
    flashContainer.style.position = 'absolute';
    flashContainer.style.left = `${startX}px`;
    flashContainer.style.top = `${startY}px`;
    flashContainer.style.width = `${shape[0].length * visualBlockSize}px`;
    flashContainer.style.height = `${shape.length * visualBlockSize}px`;
    flashContainer.style.pointerEvents = 'none';
    flashContainer.style.zIndex = '100'; // Ensure it's on top

    // Draw the shape using divs
    for (let r = 0; r < shape.length; r++) {
        for (let c = 0; c < shape[r].length; c++) {
            if (shape[r][c]) {
                const block = document.createElement('div');
                block.style.position = 'absolute';
                block.style.left = `${c * visualBlockSize}px`;
                block.style.top = `${r * visualBlockSize}px`;
                block.style.width = `${visualBlockSize}px`;
                block.style.height = `${visualBlockSize}px`;
                block.style.backgroundColor = 'white';
                block.style.boxShadow = `0 0 15px 5px ${colorHex}`; // Glow with block color
                block.style.opacity = '0.8';
                flashContainer.appendChild(block);

                // Spawn particles for this block
                spawnParticles(effectsLayer, 
                    startX + c * visualBlockSize + visualBlockSize / 2, 
                    startY + r * visualBlockSize + visualBlockSize, 
                    colorHex
                );
            }
        }
    }
    
    effectsLayer.appendChild(flashContainer);
    
    // Animate Flash
    const animation = flashContainer.animate([
        { opacity: 0.8, transform: 'scale(1)' },
        { opacity: 0, transform: 'scale(1.1)' }
    ], {
        duration: 200,
        easing: 'ease-out'
    });
    
    animation.onfinish = () => flashContainer.remove();
}

function spawnParticles(container, x, y, color) {
    const particleCount = 8;
    for (let i = 0; i < particleCount; i++) {
        const particle = document.createElement('div');
        particle.className = 'particle';
        particle.style.backgroundColor = color;
        particle.style.left = `${x}px`;
        particle.style.top = `${y}px`;
        
        // Random velocity
        const angle = (Math.random() * Math.PI) + Math.PI; // Downward arc? No, splash upwards/outwards. 
        // Actually, hard drop hits the bottom, so sparks should fly UP and OUT.
        // Angle between PI (left) and 2PI (right) -> Up is 1.5PI.
        const splashAngle = Math.PI + Math.random() * Math.PI; // 180 to 360 degrees (Upwards arc)
        
        const velocity = 20 + Math.random() * 30;
        const tx = Math.cos(splashAngle) * velocity;
        const ty = Math.sin(splashAngle) * velocity;

        container.appendChild(particle);

        const anim = particle.animate([
            { transform: 'translate(0, 0) scale(1)', opacity: 1 },
            { transform: `translate(${tx}px, ${ty}px) scale(0)`, opacity: 0 }
        ], {
            duration: 300 + Math.random() * 200,
            easing: 'cubic-bezier(0, .9, .57, 1)',
        });

        anim.onfinish = () => particle.remove();
    }
}

function render() {
    // Render Local Player
    if (myId && gameState[myId]) {
        drawBoard(ctx, gameState[myId].board);
        drawHold(gameState[myId].board.holdPiece);
    }

    // Render Opponents
    const opponentsDiv = document.getElementById('opponents');
    
    // Filter opponents: exclude self, prioritize alive, limit to 5
    const opponents = Object.keys(gameState)
        .filter(id => id !== myId)
        .map(id => ({ id, ...gameState[id] }))
        .sort((a, b) => {
            // Sort by alive status first (alive first), then maybe by badges or random
            if (a.board.gameOver !== b.board.gameOver) {
                return a.board.gameOver ? 1 : -1;
            }
            return 0; // Stable order otherwise
        })
        .slice(0, 5);

    // Sync DOM with opponents list
    // We'll just clear and rebuild for simplicity in this version, 
    // but for performance in a real app, we'd diff.
    opponentsDiv.innerHTML = '';

    opponents.forEach(opp => {
        const oppDiv = document.createElement('div');
        oppDiv.id = `opp-${opp.id}`;
        oppDiv.className = 'opponent-container';
        
        const nickname = opp.nickname || opp.id;
        const status = opp.board.gameOver ? '(DEAD)' : '';
        
        oppDiv.innerHTML = `
            <div class="opponent-info">
                <span class="opponent-name">${nickname}</span>
                <span class="opponent-status">${status}</span>
                <div class="opponent-stats">
                    Badges: ${opp.badges}<br>
                    KOs: ${opp.koCount}
                </div>
            </div>
            <canvas class="opponent-canvas" width="120" height="240"></canvas>
        `;
        
        opponentsDiv.appendChild(oppDiv);
        
        const oppCanvas = oppDiv.querySelector('canvas');
        const oppCtx = oppCanvas.getContext('2d');
        
        // Scale down for opponent view (50%)
        oppCtx.scale(0.5, 0.5);
        drawBoard(oppCtx, opp.board);
        oppCtx.setTransform(1, 0, 0, 1, 0, 0); // Reset transform
    });
}

function drawHold(type) {
    const holdCanvas = document.getElementById('hold-canvas');
    const holdCtx = holdCanvas.getContext('2d');
    
    // Clear
    holdCtx.fillStyle = '#000';
    holdCtx.fillRect(0, 0, holdCanvas.width, holdCanvas.height);
    
    if (!type) return;
    
    const shape = TETROMINOES[type];
    const color = getColorForType(type);
    
    // Center the piece
    // Assuming 4x4 max grid for pieces
    // Block size for hold can be same or smaller. Let's use same 24px.
    // Canvas is 100x80.
    // Shape width/height varies.
    
    const offsetX = (holdCanvas.width - shape[0].length * BLOCK_SIZE) / 2;
    const offsetY = (holdCanvas.height - shape.length * BLOCK_SIZE) / 2;
    
    holdCtx.save();
    holdCtx.translate(offsetX, offsetY);

    for (let r = 0; r < shape.length; r++) {
        for (let c = 0; c < shape[r].length; c++) {
            if (shape[r][c]) {
                drawBlock(holdCtx, c, r, color);
            }
        }
    }
    holdCtx.restore();
}

function drawBoard(context, boardState) {
    // Clear
    context.fillStyle = '#000';
    context.fillRect(0, 0, 240, 480);

    // Draw Grid
    const grid = boardState.grid;
    for (let y = 0; y < grid.length; y++) {
        for (let x = 0; x < grid[y].length; x++) {
            const cell = grid[y][x];
            if (cell !== 0) {
                drawBlock(context, x, y, cell);
            }
        }
    }

    // Draw Ghost Piece
    if (boardState.currentPiece) {
        const { type, x, y, rotation } = boardState.currentPiece;
        const shape = getRotatedShape(type, rotation);
        const color = getColorForType(type);

        // Calculate Ghost Position
        let ghostY = y;
        while (true) {
            let collision = false;
            for (let r = 0; r < shape.length; r++) {
                for (let c = 0; c < shape[r].length; c++) {
                    if (shape[r][c]) {
                        const gx = x + c;
                        const gy = ghostY + r + 1;
                        if (gy >= 20 || (gy >= 0 && grid[gy][gx] !== 0)) {
                            collision = true;
                        }
                    }
                }
            }
            if (collision) break;
            ghostY++;
        }

        // Draw Ghost
        context.globalAlpha = 0.3;
        for (let r = 0; r < shape.length; r++) {
            for (let c = 0; c < shape[r].length; c++) {
                if (shape[r][c]) {
                    drawBlock(context, x + c, ghostY + r, color);
                }
            }
        }
        context.globalAlpha = 1.0;

        // Draw Current Piece
        for (let r = 0; r < shape.length; r++) {
            for (let c = 0; c < shape[r].length; c++) {
                if (shape[r][c]) {
                    drawBlock(context, x + c, y + r, color);
                }
            }
        }
    }
}

function drawBlock(context, x, y, color) {
    const size = BLOCK_SIZE;
    const posX = x * size;
    const posY = y * size;

    // Base color
    context.fillStyle = COLORS[color] || color;
    context.fillRect(posX, posY, size, size);

    // Bevel effect
    context.lineWidth = 2;

    // Top and Left (Light)
    context.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    context.beginPath();
    context.moveTo(posX, posY + size);
    context.lineTo(posX, posY);
    context.lineTo(posX + size, posY);
    context.stroke();

    // Bottom and Right (Dark)
    context.strokeStyle = 'rgba(0, 0, 0, 0.5)';
    context.beginPath();
    context.moveTo(posX + size, posY);
    context.lineTo(posX + size, posY + size);
    context.lineTo(posX, posY + size);
    context.stroke();

    // Inner square for "texture"
    context.fillStyle = 'rgba(0, 0, 0, 0.1)';
    context.fillRect(posX + 4, posY + 4, size - 8, size - 8);
}

function updateStats() {
    if (myId && gameState[myId]) {
        const state = gameState[myId];
        
        let targetName = 'None';
        if (state.targetId && gameState[state.targetId]) {
            targetName = gameState[state.targetId].nickname || state.targetId;
        }
        document.getElementById('my-target').innerText = targetName;
        
        document.getElementById('my-targeted-by').innerText = state.targetedBy ? state.targetedBy.length : 0;
        document.getElementById('my-badges').innerText = state.badges;
        document.getElementById('my-kos').innerText = state.koCount;

        // Update Strategy Display
        const strategyEl = document.getElementById('strategy-display');
        if (state.targetingMode) {
            strategyEl.innerText = `策略: ${state.targetingMode}`;
            strategyEl.className = `mode-${state.targetingMode}`;
        }
    }
}

// Helper for client-side rendering of current piece
// We need the shape definitions here too, or server sends the cells of current piece.
// Server sends { type: 'T', ... }
// We need to know what 'T' looks like.
const TETROMINOES = {
    I: [[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]],
    J: [[1,0,0],[1,1,1],[0,0,0]],
    L: [[0,0,1],[1,1,1],[0,0,0]],
    O: [[1,1],[1,1]],
    S: [[0,1,1],[1,1,0],[0,0,0]],
    T: [[0,1,0],[1,1,1],[0,0,0]],
    Z: [[1,1,0],[0,1,1],[0,0,0]]
};

function getRotatedShape(type, rotation) {
    let shape = TETROMINOES[type];
    // Deep copy to avoid modifying original if we were caching, but here we just use raw array
    // Actually we need to rotate it.
    // 0: 0, 1: 90, 2: 180, 3: 270
    let newShape = JSON.parse(JSON.stringify(shape));
    for (let i = 0; i < rotation; i++) {
        newShape = newShape[0].map((val, index) => newShape.map(row => row[index]).reverse());
    }
    return newShape;
}

function getColorForType(type) {
    const map = {
        I: 'cyan', J: 'blue', L: 'orange', O: 'yellow', S: 'green', T: 'purple', Z: 'red'
    };
    return map[type];
}

// Input Handling
document.addEventListener('keydown', (e) => {
    if (e.repeat) return; // Prevent hold-to-spam for some keys if desired, or handle DAS locally.
    // For simplicity, we send keydown events.
    
    switch(e.code) {
        case 'ArrowLeft':
            socket.emit('input', 'left');
            break;
        case 'ArrowRight':
            socket.emit('input', 'right');
            break;
        case 'ArrowDown':
            socket.emit('input', 'down');
            break;
        case 'ArrowUp':
            socket.emit('input', 'rotateCW');
            break;
        case 'KeyZ':
            socket.emit('input', 'rotateCCW');
            break;
        case 'Space':
            socket.emit('input', 'hardDrop');
            break;
        case 'KeyC':
        case 'ShiftLeft':
            socket.emit('input', 'hold');
            break;
        // Targeting
        case 'Digit1': socket.emit('input', 'targetRandom'); break;
        case 'Digit2': socket.emit('input', 'targetAttackers'); break;
        case 'Digit3': socket.emit('input', 'targetBadges'); break;
        case 'Digit4': socket.emit('input', 'targetKOs'); break;
    }
});

// Mobile Controls
const bindMobileBtn = (id, action) => {
    const btn = document.getElementById(id);
    if (!btn) return;
    
    const trigger = (e) => {
        e.preventDefault();
        socket.emit('input', action);
    };

    btn.addEventListener('touchstart', trigger, { passive: false });
    btn.addEventListener('mousedown', trigger);
};

bindMobileBtn('btn-left', 'left');
bindMobileBtn('btn-right', 'right');
bindMobileBtn('btn-down', 'down');
bindMobileBtn('btn-rotate-cw', 'rotateCW');
bindMobileBtn('btn-rotate-ccw', 'rotateCCW');
bindMobileBtn('btn-hard-drop', 'hardDrop');
bindMobileBtn('btn-hold', 'hold');

// Restart Button
document.getElementById('restart-btn').addEventListener('click', () => {
    socket.emit('restartGame');
});

document.getElementById('victory-restart-btn').addEventListener('click', () => {
    socket.emit('restartGame');
});

socket.on('gameWinner', (winnerId) => {
    // Optional: Show notification about who won
    console.log(`Winner is ${winnerId}`);
});

socket.on('gameOver', (data) => {
    const overlay = document.getElementById('victory-overlay');
    const title = document.getElementById('victory-title');
    const message = document.getElementById('victory-message');
    
    if (data.rank === 1) {
        title.innerText = 'VICTORY!';
        message.innerText = '你是最终的幸存者 (第 1 名)';
        title.style.color = '#f1c40f'; // Gold
    } else {
        title.innerText = 'GAME OVER';
        message.innerText = `你获得了第 ${data.rank} 名`;
        title.style.color = '#e74c3c'; // Red
    }
    
    overlay.classList.remove('hidden');
    void overlay.offsetWidth;
    overlay.classList.add('visible');
});

socket.on('gameRestarted', () => {
    const overlay = document.getElementById('victory-overlay');
    overlay.classList.remove('visible');
    overlay.classList.add('hidden');
});

