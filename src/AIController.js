const PlayerController = require('./PlayerController');

class AIController extends PlayerController {
    constructor(id, board, nickname = 'Bot', difficulty = 'medium') {
        super(id, board, nickname);
        this.isAI = true;
        const normalized = this.normalizeDifficulty(difficulty);
        this.difficulty = normalized;
        this.moveTimer = 0;
        this.moveInterval = this.getSpeed(normalized);
    }

    normalizeDifficulty(level) {
        if (level === 'low' || level === 'medium' || level === 'high') {
            return level;
        }
        return 'medium';
    }

    getSpeed(difficulty) {
        switch(difficulty) {
            case 'low': return 1400;
            case 'high': return 450;
            case 'medium':
            default:
                return 850;
        }
    }

    update(deltaTime) {
        if (this.board.isGameOver) return null;

        this.moveTimer += deltaTime;
        if (this.moveTimer >= this.moveInterval) {
            this.moveTimer = 0;
            return this.makeMove();
        }
        return null;
    }

    makeMove() {
        const piece = this.board.currentPiece;
        if (!piece) return null;

        let bestScore = -Infinity;
        let bestMove = null;

        const originalX = piece.x;
        const originalY = piece.y;
        const originalRot = piece.rotation;

        // Try all 4 rotations
        for (let r = 0; r < 4; r++) {
            // Try all columns
            for (let x = -3; x < 11; x++) {
                // Check if valid at current Y (simplified reachability)
                if (!this.board.checkCollision(x, originalY, r)) {
                    // Drop to bottom
                    let y = originalY;
                    while (!this.board.checkCollision(x, y + 1, r)) {
                        y++;
                    }
                    
                    // Score: prefer landing lower for faster locks
                    const score = y;
                    
                    if (score > bestScore) {
                        bestScore = score;
                        bestMove = { x, rotation: r };
                    }
                }
            }
        }

        // Restore
        piece.x = originalX;
        piece.y = originalY;
        piece.rotation = originalRot;

        if (bestMove) {
            // Apply move directly
            piece.rotation = bestMove.rotation;
            piece.x = bestMove.x;
            return 'hardDrop';
        }
        return null;
    }
}

module.exports = AIController;
