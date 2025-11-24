const TETROMINOES = {
    I: {
        shape: [
            [0, 0, 0, 0],
            [1, 1, 1, 1],
            [0, 0, 0, 0],
            [0, 0, 0, 0]
        ],
        color: 'cyan'
    },
    J: {
        shape: [
            [1, 0, 0],
            [1, 1, 1],
            [0, 0, 0]
        ],
        color: 'blue'
    },
    L: {
        shape: [
            [0, 0, 1],
            [1, 1, 1],
            [0, 0, 0]
        ],
        color: 'orange'
    },
    O: {
        shape: [
            [1, 1],
            [1, 1]
        ],
        color: 'yellow'
    },
    S: {
        shape: [
            [0, 1, 1],
            [1, 1, 0],
            [0, 0, 0]
        ],
        color: 'green'
    },
    T: {
        shape: [
            [0, 1, 0],
            [1, 1, 1],
            [0, 0, 0]
        ],
        color: 'purple'
    },
    Z: {
        shape: [
            [1, 1, 0],
            [0, 1, 1],
            [0, 0, 0]
        ],
        color: 'red'
    }
};

// SRS Wall Kick Data
// [rotation state index][test index] -> [x, y] offset
// Rotation states: 0->1 (0), 1->2 (1), 2->3 (2), 3->0 (3)
// Also need reverse: 1->0, 2->1, 3->2, 0->3
// Simplified: We usually store offsets for each state 0, 1, 2, 3.
// Kick is (Offset_Start - Offset_End).

// Standard offsets for J, L, S, T, Z
const JLSTZ_OFFSETS = [
    [[0, 0], [0, 0], [0, 0], [0, 0], [0, 0]], // State 0
    [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]], // State 1 (R)
    [[0, 0], [0, 0], [0, 0], [0, 0], [0, 0]], // State 2 (2)
    [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]] // State 3 (L)
];

// Offsets for I
const I_OFFSETS = [
    [[0, 0], [-1, 0], [2, 0], [-1, 0], [2, 0]], // State 0
    [[-1, 0], [0, 0], [0, 0], [0, 1], [0, -2]], // State 1 (R)
    [[-1, 1], [1, 1], [-2, 1], [1, 0], [-2, 0]], // State 2 (2)
    [[0, 1], [0, 1], [0, 1], [0, -1], [0, 2]]  // State 3 (L)
];

// Offsets for O (O doesn't kick, but needs entry)
const O_OFFSETS = [
    [[0, 0]], [[0, 0]], [[0, 0]], [[0, 0]]
];

function getKickData(type, fromRotation, toRotation) {
    let offsets;
    if (type === 'O') offsets = O_OFFSETS;
    else if (type === 'I') offsets = I_OFFSETS;
    else offsets = JLSTZ_OFFSETS;

    const fromOffsets = offsets[fromRotation];
    const toOffsets = offsets[toRotation];

    const kicks = [];
    for (let i = 0; i < fromOffsets.length; i++) {
        // Kick = (x1 - x2, y1 - y2)
        // Note: Y-axis is usually down-positive in grids, but SRS data often assumes up-positive.
        // In standard SRS charts (x, y), y is up. In our grid (row, col), row increases downwards.
        // So y-kick needs to be inverted if we use standard SRS tables directly.
        // Let's assume the data above is standard SRS (y up).
        // Grid movement: [col + x, row - y]
        
        const x = fromOffsets[i][0] - toOffsets[i][0];
        const y = fromOffsets[i][1] - toOffsets[i][1];
        kicks.push([x, -y]); // Invert Y for array indexing (row)
    }
    return kicks;
}

module.exports = {
    TETROMINOES,
    getKickData
};
