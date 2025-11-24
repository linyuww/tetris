const { TETROMINOES, getKickData } = require('./utils/tetrominoes');
const Randomizer = require('./utils/random');
const { BOARD_WIDTH, BOARD_HEIGHT, VISIBLE_HEIGHT, MAX_LOCK_RESETS, LOCK_DELAY } = require('./config/gameConfig');

class TetrisBoard {
    constructor(garbageManager, playerId) {
        this.garbageManager = garbageManager;
        this.playerId = playerId;
        
        this.grid = Array.from({ length: BOARD_HEIGHT }, () => Array(BOARD_WIDTH).fill(0));
        this.randomizer = new Randomizer();
        this.nextPieces = [];
        this.holdPiece = null;
        this.canHold = true;
        
        this.currentPiece = null;
        this.ghostPiece = null;
        
        this.garbageBuffer = []; // Incoming garbage lines count (or objects)
        
        this.lockDelayCounter = 0;
        this.lockResets = 0;
        this.isLocking = false;
        this.lockTimer = null;
        
        this.comboCounter = -1;
        this.b2bFlag = false;
        
        this.koFlag = false;
        this.lastClearType = null; // For B2B check
        
        this.isGameOver = false;
        
        // Fill initial next queue
        this.fillNextQueue();
        this.spawnPiece();
    }

    fillNextQueue() {
        while (this.nextPieces.length < 6) {
            this.nextPieces.push(this.randomizer.next());
        }
    }

    spawnPiece() {
        this.currentPiece = {
            type: this.nextPieces.shift(),
            x: 3, // Center-ish
            y: 0, // Top
            rotation: 0 // 0: 0, 1: R, 2: 2, 3: L
        };
        this.fillNextQueue();
        this.canHold = true;
        this.lockResets = 0;
        this.isLocking = false;
        
        // Check for immediate collision (Game Over)
        if (this.checkCollision(this.currentPiece.x, this.currentPiece.y, this.currentPiece.rotation)) {
            this.isGameOver = true;
        }
    }

    reset() {
        this.grid = Array.from({ length: BOARD_HEIGHT }, () => Array(BOARD_WIDTH).fill(0));
        this.randomizer = new Randomizer();
        this.nextPieces = [];
        this.holdPiece = null;
        this.canHold = true;
        this.currentPiece = null;
        this.garbageBuffer = [];
        this.lockDelayCounter = 0;
        this.lockResets = 0;
        this.isLocking = false;
        this.comboCounter = -1;
        this.b2bFlag = false;
        this.koFlag = false;
        this.lastClearType = null;
        this.isGameOver = false;
        this.killerId = null;
        
        this.fillNextQueue();
        this.spawnPiece();
    }

    hold() {
        if (!this.canHold || this.isGameOver) return;

        const currentType = this.currentPiece.type;
        if (this.holdPiece) {
            // Swap
            const temp = this.holdPiece;
            this.holdPiece = currentType;
            this.currentPiece = {
                type: temp,
                x: 3,
                y: 0,
                rotation: 0
            };
        } else {
            // Hold and spawn next
            this.holdPiece = currentType;
            this.spawnPiece();
        }
        this.canHold = false;
    }

    move(dx, dy) {
        if (this.isGameOver) return false;
        
        const newX = this.currentPiece.x + dx;
        const newY = this.currentPiece.y + dy;

        if (!this.checkCollision(newX, newY, this.currentPiece.rotation)) {
            this.currentPiece.x = newX;
            this.currentPiece.y = newY;
            
            if (this.isLocking) {
                this.resetLockDelay();
            }
            return true;
        }
        return false;
    }

    rotate(direction) { // 1 for CW, -1 for CCW
        if (this.isGameOver) return;

        const currentRot = this.currentPiece.rotation;
        const newRot = (currentRot + direction + 4) % 4;
        const type = this.currentPiece.type;

        // Basic rotation
        // Need to get the rotated shape coordinates to check collision?
        // Actually we just check if the shape at (x, y) with newRot collides.
        // If it does, we try wall kicks.

        const kicks = getKickData(type, currentRot, newRot);
        
        for (const [kx, ky] of kicks) {
            const testX = this.currentPiece.x + kx;
            const testY = this.currentPiece.y + ky; // Note: ky is already inverted in utils for grid

            if (!this.checkCollision(testX, testY, newRot)) {
                this.currentPiece.x = testX;
                this.currentPiece.y = testY;
                this.currentPiece.rotation = newRot;
                
                // T-Spin corner check logic would go here or be flagged here
                if (type === 'T') {
                    this.currentPiece.lastMoveRotate = true; // Helper for T-spin detection
                }
                
                if (this.isLocking) {
                    this.resetLockDelay();
                }
                return;
            }
        }
    }

    checkCollision(x, y, rotation) {
        const shape = TETROMINOES[this.currentPiece.type].shape;
        // Rotate shape matrix
        const rotatedShape = this.getRotatedShape(shape, rotation);

        for (let r = 0; r < rotatedShape.length; r++) {
            for (let c = 0; c < rotatedShape[r].length; c++) {
                if (rotatedShape[r][c]) {
                    const boardX = x + c;
                    const boardY = y + r;

                    if (boardX < 0 || boardX >= BOARD_WIDTH || boardY >= BOARD_HEIGHT) {
                        return true;
                    }
                    if (boardY >= 0 && this.grid[boardY][boardX] !== 0) {
                        return true;
                    }
                }
            }
        }
        return false;
    }

    getRotatedShape(shape, rotation) {
        // 0: original
        // 1: 90 deg CW
        // 2: 180 deg
        // 3: 270 deg CW (90 CCW)
        let newShape = JSON.parse(JSON.stringify(shape));
        for (let i = 0; i < rotation; i++) {
            newShape = newShape[0].map((val, index) => newShape.map(row => row[index]).reverse());
        }
        return newShape;
    }

    hardDrop() {
        if (this.isGameOver) return null;
        let dropped = 0;
        while (this.move(0, 1)) {
            dropped++;
        }
        // Capture position before locking/spawning new piece
        const dropInfo = {
            x: this.currentPiece.x,
            y: this.currentPiece.y,
            type: this.currentPiece.type,
            rotation: this.currentPiece.rotation
        };
        this.lock();
        return dropInfo;
    }

    resetLockDelay() {
        if (this.lockResets < MAX_LOCK_RESETS) {
            // In a real real-time game, we would clear the timeout and set a new one.
            // Since this is a simulation step, we just reset the counter logic.
            this.lockResets++;
            // Reset timer logic would be handled by the game loop
        }
    }

    lock() {
        // Place piece on grid
        const shape = this.getRotatedShape(TETROMINOES[this.currentPiece.type].shape, this.currentPiece.rotation);
        for (let r = 0; r < shape.length; r++) {
            for (let c = 0; c < shape[r].length; c++) {
                if (shape[r][c]) {
                    const by = this.currentPiece.y + r;
                    const bx = this.currentPiece.x + c;
                    if (by >= 0 && by < BOARD_HEIGHT) {
                        this.grid[by][bx] = TETROMINOES[this.currentPiece.type].color; // Or ID
                    }
                }
            }
        }

        this.clearLines();
        this.spawnPiece();
    }

    clearLines() {
        let linesCleared = 0;
        let clearedRows = [];

        for (let y = BOARD_HEIGHT - 1; y >= 0; y--) {
            if (this.grid[y].every(cell => cell !== 0)) {
                clearedRows.push(y);
                linesCleared++;
            }
        }

        if (linesCleared > 0) {
            // Remove lines
            const newGrid = this.grid.filter((row, index) => !clearedRows.includes(index));
            // Add new empty lines at top
            while (newGrid.length < BOARD_HEIGHT) {
                newGrid.unshift(Array(BOARD_WIDTH).fill(0));
            }
            this.grid = newGrid;

            this.comboCounter++;
            
            // Determine Clear Type (Simplified)
            // TODO: Proper T-Spin detection
            let type = '';
            if (linesCleared === 4) type = 'Tetris';
            else if (linesCleared === 3) type = 'Triple';
            else if (linesCleared === 2) type = 'Double';
            else type = 'Single';

            // B2B Check
            const isSpecial = (type === 'Tetris'); // || T-Spin
            if (isSpecial) {
                if (this.b2bFlag) {
                    // B2B Active
                }
                this.b2bFlag = true;
            } else {
                this.b2bFlag = false;
            }

            // Calculate Attack
            // We need external info (badge, targeting) to fully calc attack, 
            // but Board can return the "Base" event.
            // Actually, the Board should probably emit an event or return a result object.
            
            this.lastClearResult = {
                linesCleared,
                type,
                combo: this.comboCounter,
                b2b: this.b2bFlag
            };

        } else {
            this.comboCounter = -1;
            this.lastClearResult = null;
            
            // If no lines cleared, process garbage
            this.processGarbage();
        }
    }

    addGarbage(amount, senderId) {
        this.garbageBuffer.push({ amount, senderId });
    }

    // New method for immediate garbage application
    applyGarbageImmediately(amount, senderId) {
        if (amount <= 0) return;
        
        // Generate garbage lines
        const garbageLines = this.garbageManager.generateGarbage(amount);
        
        // Check if game over (if top lines are not empty)
        for (let i = 0; i < amount; i++) {
            if (this.grid[i].some(c => c !== 0)) {
                this.isGameOver = true;
                this.killerId = senderId;
            }
        }

        this.grid.splice(0, amount); // Remove top lines
        this.grid.push(...garbageLines); // Add garbage at bottom
        
        // Adjust current piece position if needed?
        // In standard Tetris, if garbage pushes up, the piece stays at same (x,y) coordinate relative to grid top-left.
        // But visually it looks like it moves up with the stack? No, usually the stack moves up towards the piece.
        // If the piece was at Y=18 (bottom), and we push 1 line, the piece is now inside the new line?
        // Yes, collision might happen.
        
        // Check for collision after garbage rise
        if (this.checkCollision(this.currentPiece.x, this.currentPiece.y, this.currentPiece.rotation)) {
            // If collision, try to push piece up?
            // Simple T99 logic: if piece overlaps garbage, it gets pushed up.
            // Let's try to move piece up until it fits or hits top.
            let offset = 0;
            while (this.checkCollision(this.currentPiece.x, this.currentPiece.y - offset, this.currentPiece.rotation) && offset < 20) {
                offset++;
            }
            if (!this.checkCollision(this.currentPiece.x, this.currentPiece.y - offset, this.currentPiece.rotation)) {
                this.currentPiece.y -= offset;
            } else {
                // If still collides (e.g. pushed off top), Game Over
                this.isGameOver = true;
                this.killerId = senderId;
            }
        }
    }

    processGarbage() {
        if (this.garbageBuffer.length === 0) return;

        // Process all garbage in buffer
        // We need to be careful about who gets the kill if multiple people sent garbage.
        // Usually the one who sent the garbage that actually causes the top out gets the kill.
        // Or we just attribute to the last one processed?
        
        while (this.garbageBuffer.length > 0 && !this.isGameOver) {
            const { amount, senderId } = this.garbageBuffer.shift();
            this.applyGarbageImmediately(amount, senderId);
        }
    }

    getState() {
        return {
            grid: this.grid,
            currentPiece: this.currentPiece,
            nextPieces: this.nextPieces,
            holdPiece: this.holdPiece,
            isGameOver: this.isGameOver,
            garbageBuffer: this.garbageBuffer.reduce((a, b) => a + b.amount, 0)
        };
    }
}

module.exports = TetrisBoard;
