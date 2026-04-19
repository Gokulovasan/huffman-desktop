const fs = require('fs');

class BitWriter {
    constructor(fd) {
        this.fd = fd;
        this.buffer = 0;
        this.bitCount = 0;
        this.memBuffer = Buffer.alloc(8192);
        this.memPos = 0;
    }

    writeBit(bit) {
        if (bit) {
            this.buffer |= (1 << (7 - this.bitCount));
        }
        this.bitCount++;
        if (this.bitCount === 8) {
            this.flushByte();
        }
    }

    writeBits(value, numBits) {
        for (let i = numBits - 1; i >= 0; i--) {
            this.writeBit((value >> i) & 1);
        }
    }

    flushByte() {
        this.memBuffer[this.memPos++] = this.buffer;
        if (this.memPos === 8192) {
            fs.writeSync(this.fd, this.memBuffer, 0, 8192, null);
            this.memPos = 0;
        }
        this.buffer = 0;
        this.bitCount = 0;
    }

    flush() {
        if (this.bitCount > 0) this.flushByte();
        if (this.memPos > 0) {
            fs.writeSync(this.fd, this.memBuffer, 0, this.memPos, null);
            this.memPos = 0;
        }
    }
}

class BitReader {
    constructor(fd, startPos) {
        this.fd = fd;
        this.readPos = startPos;
        this.buffer = 0;
        this.bitCount = 0;
        this.memBuffer = Buffer.alloc(8192);
        this.memPos = 8192; // force read
        this.memEnd = 8192;
    }

    readBit() {
        if (this.bitCount === 0) {
            if (this.memPos >= this.memEnd) {
                let bytesRead = fs.readSync(this.fd, this.memBuffer, 0, 8192, this.readPos);
                if (bytesRead === 0) return null;
                this.readPos += bytesRead;
                this.memPos = 0;
                this.memEnd = bytesRead;
            }
            this.buffer = this.memBuffer[this.memPos++];
            this.bitCount = 8;
        }
        let bit = (this.buffer >> (this.bitCount - 1)) & 1;
        this.bitCount--;
        return bit;
    }
}

module.exports = { BitWriter, BitReader };
