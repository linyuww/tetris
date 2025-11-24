const { ATTACK_TABLE, COMBO_TABLE, B2B_BONUS, BADGE_MULTIPLIERS, TARGETING_BONUS } = require('./config/gameConfig');

class GarbageManager {
    constructor() {
        // No specific state needed here if we pass everything in, 
        // but we might want to keep track of RNG for garbage holes if we want it deterministic.
    }

    /**
     * Calculate attack lines based on clear type and game state
     * @param {string} clearType - e.g., 'Single', 'Tetris', 'T-Spin Double'
     * @param {number} combo - Current combo count
     * @param {boolean} b2b - Is Back-to-Back active?
     * @param {number} badgeCount - Number of badges
     * @param {number} targetedBy - Number of players targeting this player
     * @returns {number} Total attack lines
     */
    calculateAttack(clearType, combo, b2b, badgeCount, targetedBy) {
        let lines = ATTACK_TABLE[clearType] || 0;

        // B2B Bonus
        if (b2b && lines > 0) { // B2B usually only applies if the move itself generates lines (Tetris or T-Spin)
             // Standard rule: B2B adds 1 line.
             // Note: Some rules say B2B requires the *previous* clear to be special too. 
             // The Board class should maintain the b2b flag correctly.
             lines += B2B_BONUS;
        }

        // Combo Bonus
        if (combo > 0) {
            const comboIndex = Math.min(combo, COMBO_TABLE.length - 1);
            lines += COMBO_TABLE[comboIndex];
        }

        // Targeting Bonus (Counter attack)
        // If many people target you, you get a bonus to your attack
        if (targetedBy > 0) {
             // Targeting bonus usually adds to the lines sent
             const targetIndex = Math.min(targetedBy, TARGETING_BONUS.length - 1);
             lines += TARGETING_BONUS[targetIndex];
        }
        
        // Badge Multiplier
        // Badges multiply the final result
        if (lines > 0 && badgeCount > 0) {
            const multiplier = BADGE_MULTIPLIERS[Math.min(badgeCount, BADGE_MULTIPLIERS.length - 1)];
            lines = Math.floor(lines * multiplier);
        }

        return lines;
    }

    /**
     * Generate garbage lines
     * @param {number} amount - Number of lines to generate
     * @returns {Array} Array of garbage lines (each line is an array of cells)
     */
    generateGarbage(amount) {
        const lines = [];
        // Standard Tetris 99 garbage: 
        // Usually one hole per line.
        // The hole position might change with some probability or stay same (messy vs clean garbage).
        // For simplicity, let's randomize the hole for each "batch" or just random every line.
        // Tetris 99 tends to have "clean" garbage (hole aligned) for a single attack.
        
        const holeIndex = Math.floor(Math.random() * 10);
        
        for (let i = 0; i < amount; i++) {
            // 1 represents a block, 0 represents empty
            // In our board, we might use numbers for colors. 8 for garbage (grey).
            const line = new Array(10).fill(8); 
            line[holeIndex] = 0;
            lines.push(line);
        }
        return lines;
    }
}

module.exports = GarbageManager;
