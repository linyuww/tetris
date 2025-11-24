const TetrisBoard = require('./TetrisBoard');
const PlayerController = require('./PlayerController');
const GarbageManager = require('./GarbageManager');
const { GRAVITY_START } = require('./config/gameConfig');

class GameManager {
    constructor(onAttack, onWinner, onAction, onPlayerEliminated) {
        this.players = new Map();
        this.garbageManager = new GarbageManager();
        this.isRunning = false;
        this.gravityInterval = null;
        this.tickRate = 1000 / 60; // 60 FPS for logic updates if needed
        this.gravity = GRAVITY_START;
        this.onAttack = onAttack; // Callback for attack events
        this.onWinner = onWinner; // Callback for winner
        this.onAction = onAction; // Callback for player actions (hardDrop etc)
        this.onPlayerEliminated = onPlayerEliminated; // Callback for player elimination
    }

    addPlayer(id, nickname) {
        const board = new TetrisBoard(this.garbageManager, id);
        const player = new PlayerController(id, board, nickname);
        this.players.set(id, player);
        return player;
    }

    removePlayer(id) {
        this.players.delete(id);
    }

    startGame() {
        if (this.players.size < 2) {
            console.log("Need at least 2 players to start.");
            // return; // Allow 1 player for testing
        }
        this.isRunning = true;
        
        // Start Gravity Loop
        this.gravityInterval = setInterval(() => {
            this.applyGravity();
        }, this.gravity);

        // Start Logic Loop (Targeting updates, etc.)
        this.logicInterval = setInterval(() => {
            this.updateLogic();
        }, 100); // Update targeting every 100ms
    }

    stopGame() {
        this.isRunning = false;
        clearInterval(this.gravityInterval);
        clearInterval(this.logicInterval);
    }

    restartGame() {
        this.stopGame();
        this.players.forEach(player => {
            player.reset();
        });
        this.startGame();
    }

    applyGravity() {
        this.players.forEach(player => {
            if (!player.board.isGameOver) {
                // Soft drop by gravity
                // If move fails (collision), we might start lock delay
                // But here we just try to move down.
                // Real gravity is more complex (G-values), but this is a simple interval.
                if (!player.board.move(0, 1)) {
                    // If can't move down, start locking phase
                    // In this simplified version, we might just let the next input or tick handle it
                    // or set a flag.
                    player.board.isLocking = true;
                    // If lock delay expired? 
                    // We need a lock timer in Board.
                    // For now, let's assume 'hardDrop' or manual 'down' locks it, 
                    // or we implement a lock timer check here.
                    
                    // Simple auto-lock for gravity:
                    // If gravity tick hits and we can't move, we lock immediately? 
                    // No, that's too harsh. We need lock delay.
                    // Let's skip auto-lock in gravity tick for now, rely on Board's internal state if we had a real loop.
                    // But for a simple simulation, let's just say if gravity fails, we don't do anything,
                    // waiting for player to move or lock.
                } else {
                    player.board.isLocking = false;
                    player.board.lockResets = 0;
                }
            }
        });
    }

    updateLogic() {
        // Check for KOs and Assign Ranks
        const alivePlayers = Array.from(this.players.values()).filter(p => !p.board.isGameOver);
        const aliveCount = alivePlayers.length;

        this.players.forEach(player => {
            if (player.board.isGameOver && !player.deathProcessed) {
                player.deathProcessed = true;
                
                // Calculate Rank
                const rank = aliveCount + 1;
                if (this.onPlayerEliminated) {
                    this.onPlayerEliminated(player.id, rank);
                }

                if (player.board.killerId) {
                    const killer = this.players.get(player.board.killerId);
                    if (killer && !killer.board.isGameOver) {
                        killer.koCount++;
                        killer.badges++; // Simple badge logic: 1 kill = 1 badge
                    }
                }
            }
        });

        // Check for Winner
        if (this.isRunning && this.players.size > 1) {
            if (aliveCount === 1) {
                // We have a winner!
                const winner = alivePlayers[0];
                this.stopGame();
                
                // Notify winner of Rank 1
                if (this.onPlayerEliminated) {
                    this.onPlayerEliminated(winner.id, 1);
                }

                if (this.onWinner) {
                    this.onWinner(winner.id);
                }
            } else if (aliveCount === 0 && this.players.size > 0) {
                this.stopGame();
            }
        }

        // Update targeting info
        const playerList = Array.from(this.players.values());
        
        // Clear 'targetedBy' lists
        playerList.forEach(p => p.targetedBy = []);

        // Update targets
        playerList.forEach(p => {
            p.updateTarget(playerList);
            if (p.targetId) {
                const target = this.players.get(p.targetId);
                if (target) {
                    target.targetedBy.push(p.id);
                }
            }
        });
    }

    handleInput(playerId, action) {
        const player = this.players.get(playerId);
        if (!player) return;

        const result = player.handleInput(action);
        
        // Handle Hard Drop Event
        if (action === 'hardDrop' && result && result.dropInfo) {
            if (this.onAction) {
                this.onAction({
                    playerId: playerId,
                    type: 'hardDrop',
                    data: result.dropInfo
                });
            }
        }

        // If action resulted in a clear/lock
        if (result) {
            this.handleAttack(player, result);
        }
    }

    handleAttack(attacker, clearResult) {
        // Calculate attack
        const attackLines = this.garbageManager.calculateAttack(
            clearResult.type,
            clearResult.combo,
            clearResult.b2b,
            attacker.badges,
            attacker.targetedBy.length
        );

        if (attackLines > 0) {
            // Send to target
            let targetId = attacker.targetId;

            // Fallback: If no target, pick a random alive opponent
            if (!targetId) {
                const opponents = Array.from(this.players.values()).filter(p => p.id !== attacker.id && !p.board.isGameOver);
                if (opponents.length > 0) {
                    targetId = opponents[Math.floor(Math.random() * opponents.length)].id;
                    attacker.targetId = targetId; // Persist it
                }
            }

            if (targetId) {
                const target = this.players.get(targetId);
                if (target && !target.board.isGameOver) {
                    // Check if target has garbage in buffer to offset?
                    // The rule says: "Eliminate buffer first, then send to opponent".
                    // But here we are the attacker sending garbage.
                    // The attacker's buffer offset logic should happen BEFORE generating attack?
                    // Wait, usually:
                    // 1. I clear lines -> Calculate Attack Power.
                    // 2. Offset my own Garbage Buffer.
                    // 3. If Attack Power remains, send to Target.
                    
                    let remainingAttack = attackLines;
                    
                    // Offset attacker's buffer
                    if (attacker.board.garbageBuffer.length > 0) {
                        // Simplified buffer: array of numbers.
                        // We need to reduce the numbers in the buffer.
                        // Let's assume buffer is [3, 4] (2 attacks pending).
                        // We reduce from the first one? Or all?
                        // Usually LIFO or FIFO? Tetris 99 is usually "cancel all pending".
                        
                        // Buffer contains objects: { amount, senderId }
                        let currentBufferSum = attacker.board.garbageBuffer.reduce((a, b) => a + b.amount, 0);
                        
                        if (currentBufferSum > 0) {
                            if (remainingAttack >= currentBufferSum) {
                                remainingAttack -= currentBufferSum;
                                attacker.board.garbageBuffer = [];
                            } else {
                                // Reduce buffer
                                while (remainingAttack > 0 && attacker.board.garbageBuffer.length > 0) {
                                    if (attacker.board.garbageBuffer[0].amount <= remainingAttack) {
                                        remainingAttack -= attacker.board.garbageBuffer.shift().amount;
                                    } else {
                                        attacker.board.garbageBuffer[0].amount -= remainingAttack;
                                        remainingAttack = 0;
                                    }
                                }
                            }
                        }
                    }

                    // Send remaining to target
                    if (remainingAttack > 0) {
                        // Notify via callback immediately for animation
                        if (this.onAttack) {
                            this.onAttack({
                                attackerId: attacker.id,
                                targetId: target.id,
                                lines: remainingAttack
                            });
                        }

                        // Apply garbage after a delay (to match animation)
                        setTimeout(() => {
                            if (!target.board.isGameOver) {
                                target.board.applyGarbageImmediately(remainingAttack, attacker.id);
                            }
                        }, 500); // 500ms delay for animation
                    }
                }
            }
        }
   }

    // Debug method to simulate attack
    simulateAttack(targetId, lines = 4) {
        const target = this.players.get(targetId);
        if (target && !target.board.isGameOver) {
            // Notify via callback immediately
            if (this.onAttack) {
                this.onAttack({
                    attackerId: 'CPU-TEST', // Fake attacker ID
                    targetId: targetId,
                    lines: lines
                });
            }

            // Apply garbage after delay
            setTimeout(() => {
                if (!target.board.isGameOver) {
                    target.board.applyGarbageImmediately(lines);
                }
            }, 500);
        }
    }

    getGameState() {
        const state = {};
        this.players.forEach((p, id) => {
            state[id] = {
                nickname: p.nickname,
                board: p.board.getState(),
                targetId: p.targetId,
                badges: p.badges,
                koCount: p.koCount,
                targetedBy: p.targetedBy,
                targetingMode: p.targetingMode
            };
        });
        return state;
    }
}

module.exports = GameManager;
