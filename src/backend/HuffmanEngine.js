class FrequencyAnalyzer {
    constructor() {
        this.freqs = new Array(256).fill(0);
    }
    
    addBuffer(buffer, length) {
        for(let i=0; i<length; i++){
            this.freqs[buffer[i]]++;
        }
    }
    
    getFrequencies() {
        return this.freqs;
    }
}

class CanonicalHuffman {
    constructor() {
        this.lengths = new Array(256).fill(0);
        this.codes = new Array(256).fill(0);
    }

    buildFromFrequencies(freqs) {
        let nodes = [];
        for (let i = 0; i < 256; i++) {
            if (freqs[i] > 0) {
                nodes.push({ symbol: i, freq: freqs[i], left: -1, right: -1 });
            }
        }

        if (nodes.length === 0) return;
        if (nodes.length === 1) {
            this.lengths[nodes[0].symbol] = 1;
            this.codes[nodes[0].symbol] = 0;
            return;
        }

        let pq = [];
        for (let i = 0; i < nodes.length; i++) pq.push(i);

        let sortPq = () => {
             pq.sort((a, b) => {
                 if (nodes[a].freq !== nodes[b].freq) return nodes[a].freq - nodes[b].freq;
                 return nodes[a].symbol - nodes[b].symbol;
             });
        };

        while (pq.length > 1) {
             sortPq();
             let left = pq.shift();
             let right = pq.shift();
             let parentIdx = nodes.length;
             nodes.push({ symbol: 0, freq: nodes[left].freq + nodes[right].freq, left, right });
             pq.push(parentIdx);
        }

        let root = pq[0];
        let rawLengths = new Array(256).fill(0);
        
        let computeLengths = (nodeIdx, depth) => {
            if (nodeIdx === -1) return;
            if (nodes[nodeIdx].left === -1 && nodes[nodeIdx].right === -1) {
                rawLengths[nodes[nodeIdx].symbol] = depth;
            } else {
                computeLengths(nodes[nodeIdx].left, depth + 1);
                computeLengths(nodes[nodeIdx].right, depth + 1);
            }
        };
        computeLengths(root, 0);

        this.lengths = rawLengths.slice();
        this.buildCodesFromLengths();
    }

    buildCodesFromLengths() {
        let lengthSymbol = [];
        for (let i = 0; i < 256; i++) {
            if (this.lengths[i] > 0) {
                lengthSymbol.push({ len: this.lengths[i], sym: i });
            }
        }
        
        lengthSymbol.sort((a, b) => {
             if (a.len !== b.len) return a.len - b.len;
             return a.sym - b.sym;
        });

        let currentCode = 0;
        let currentLength = lengthSymbol[0].len;

        for (let obj of lengthSymbol) {
             while (currentLength < obj.len) {
                 currentCode <<= 1;
                 currentLength++;
             }
             this.codes[obj.sym] = currentCode++;
        }
    }
}

module.exports = { FrequencyAnalyzer, CanonicalHuffman };
