class PlayerController {
    constructor(id, board, nickname = 'Player') {
        this.id = id;
        this.nickname = nickname;
        this.board = board;
        this.targetingMode = 'Random'; // Random, Attackers, Badges, KOs
        this.targetId = null;
        this.targetedBy = []; // List of player IDs targeting me
        this.koCount = 0;
        this.badges = 0;
    }

    reset() {
        this.board.reset();
        this.targetingMode = 'Random';
        this.targetId = null;
        this.targetedBy = [];
        this.koCount = 0;
        this.badges = 0;
        this.deathProcessed = false;
    }

    handleInput(action) {
        if (this.board.isGameOver) return;

        switch (action) {
            case 'left':
                this.board.move(-1, 0);
                break;
            case 'right':
                this.board.move(1, 0);
                break;
            case 'down':
                this.board.move(0, 1);
                break;
            case 'rotateCW':
                this.board.rotate(1);
                break;
            case 'rotateCCW':
                this.board.rotate(-1);
                break;
            case 'hold':
                this.board.hold();
                break;
            case 'hardDrop':
                const dropInfo = this.board.hardDrop();
                // Check for clears immediately after hard drop
                const result = this.board.lastClearResult || {};
                if (dropInfo) {
                    result.dropInfo = dropInfo;
                }
                return result; 
            case 'softDrop':
                this.board.move(0, 1);
                break;
            // Targeting inputs
            case 'targetRandom':
                this.targetingMode = 'Random';
                break;
            case 'targetAttackers':
                this.targetingMode = 'Attackers';
                break;
            case 'targetBadges':
                this.targetingMode = 'Badges';
                break;
            case 'targetKOs':
                this.targetingMode = 'KOs';
                break;
        }
        return null;
    }

    updateTarget(players) {
        // Simple targeting logic
        const alivePlayers = players.filter(p => !p.board.isGameOver && p.id !== this.id);
        if (alivePlayers.length === 0) {
            this.targetId = null;
            return;
        }

        if (this.targetingMode === 'Random') {
            // Pick random if not already picked or if target is dead
            if (!this.targetId || !alivePlayers.find(p => p.id === this.targetId)) {
                const randomPlayer = alivePlayers[Math.floor(Math.random() * alivePlayers.length)];
                this.targetId = randomPlayer.id;
            }
        } else if (this.targetingMode === 'Attackers') {
            // Target someone targeting me
            if (this.targetedBy.length > 0) {
                // Pick random attacker or cycle? Let's pick random for now
                const attackerId = this.targetedBy[Math.floor(Math.random() * this.targetedBy.length)];
                // Verify they are alive
                if (alivePlayers.find(p => p.id === attackerId)) {
                    this.targetId = attackerId;
                } else {
                    // Fallback
                    this.targetId = alivePlayers[0].id;
                }
            } else {
                // Fallback to random
                const randomPlayer = alivePlayers[Math.floor(Math.random() * alivePlayers.length)];
                this.targetId = randomPlayer.id;
            }
        } else if (this.targetingMode === 'Badges') {
            // Target player with most badges
            const sorted = [...alivePlayers].sort((a, b) => b.badges - a.badges);
            this.targetId = sorted[0].id;
        } else if (this.targetingMode === 'KOs') {
            // Target player close to death (highest stack?)
            // We don't have stack height easily available in this simplified view, 
            // but we could estimate or use KO count. 
            // Usually "KOs" mode targets people who are about to die.
            // Let's use KO count for now as a placeholder or random.
            const sorted = [...alivePlayers].sort((a, b) => b.koCount - a.koCount);
            this.targetId = sorted[0].id;
        }
    }
}

module.exports = PlayerController;
