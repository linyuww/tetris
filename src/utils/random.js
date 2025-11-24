class Randomizer {
    constructor() {
        this.bag = [];
    }

    shuffle(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }

    generateBag() {
        const pieces = ['I', 'J', 'L', 'O', 'S', 'T', 'Z'];
        return this.shuffle(pieces);
    }

    next() {
        if (this.bag.length === 0) {
            this.bag = this.generateBag();
        }
        return this.bag.pop();
    }
    
    // Peek next N pieces without removing
    peek(n) {
        let result = [];
        let tempBag = [...this.bag];
        // If we need more than what's in the bag, we need to simulate generating more
        // But for simplicity in this stateless peek, we might just return what we have 
        // or generate a temporary extension.
        // A better approach for a game state is to maintain a 'nextPieces' queue in the Board class
        // and only use this Randomizer to fill that queue.
        // So this method might not be strictly necessary if Board manages the queue.
        return result;
    }
}

module.exports = Randomizer;
