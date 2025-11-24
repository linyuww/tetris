module.exports = {
    // 场地尺寸
    BOARD_WIDTH: 10,
    BOARD_HEIGHT: 20,
    VISIBLE_HEIGHT: 20, // 实际可能需要更高用于生成方块，通常是40行，这里简化为20+缓冲

    // 基础攻击表 (消除行数 -> 攻击行数)
    ATTACK_TABLE: {
        "Single": 0,
        "Double": 1,
        "Triple": 2,
        "Tetris": 4,
        "T-Spin Mini": 0,
        "T-Spin Mini Single": 0, // 规则可能有变种，这里参考一般标准
        "T-Spin Mini Double": 1,
        "T-Spin Single": 2,
        "T-Spin Double": 4,
        "T-Spin Triple": 6
    },

    // Combo加成表 (Combo数 -> 额外攻击)
    COMBO_TABLE: [0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 4, 5], // 索引为Combo数

    // B2B 奖励 (额外攻击行数)
    B2B_BONUS: 1,

    // 完美清除 (Perfect Clear)
    PC_BONUS: 10,

    // 徽章倍率 (徽章数 -> 攻击倍率百分比)
    // 0: 0%, 1: 25%, 2: 50%, 3: 75%, 4: 100%
    BADGE_MULTIPLIERS: [1.0, 1.25, 1.5, 1.75, 2.0],

    // 反击加成 (被瞄准人数 -> 额外攻击)
    // 0-1: 0, 2: 1, 3: 3, 4: 5, 5: 7, 6+: 9
    TARGETING_BONUS: [0, 0, 1, 3, 5, 7, 9],

    // 游戏参数
    GRAVITY_START: 1000, // ms per row
    LOCK_DELAY: 500, // ms
    MAX_LOCK_RESETS: 15, // 移动/旋转重置锁定延迟的最大次数
    DAS: 150, // Delayed Auto Shift
    ARR: 30,  // Auto Repeat Rate
};
