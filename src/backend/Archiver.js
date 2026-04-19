const fs = require('fs');
const path = require('path');
const { BitWriter, BitReader } = require('./BitStream.js');
const { FrequencyAnalyzer, CanonicalHuffman } = require('./HuffmanEngine.js');

const HUF_MAGIC = 0x48554631; // "HUF1"

function getAllFiles(dirPath, arrayOfFiles) {
  let files = fs.readdirSync(dirPath);
  arrayOfFiles = arrayOfFiles || [];
  files.forEach(function(file) {
    let fullPath = path.join(dirPath, file);
    if (fs.statSync(fullPath).isDirectory()) {
      arrayOfFiles = getAllFiles(fullPath, arrayOfFiles);
    } else {
      arrayOfFiles.push(fullPath);
    }
  });
  return arrayOfFiles;
}

class Archiver {
    static compress(inputPath, outputFile, progressCallback) {
        let files = [];
        let stat = fs.statSync(inputPath);
        if (stat.isDirectory()) {
            files = getAllFiles(inputPath);
        } else if (stat.isFile()) {
            files.push(inputPath);
        } else {
            throw new Error("Invalid input path.");
        }

        let analyzer = new FrequencyAnalyzer();
        let buffer = Buffer.alloc(8192);

        // Pass 1: Global Frequency Analysis
        let totalBytes = 0;
        for (let p of files) {
            let fd = fs.openSync(p, 'r');
            let bytesRead = 0;
            while ((bytesRead = fs.readSync(fd, buffer, 0, 8192, null)) > 0) {
                analyzer.addBuffer(buffer, bytesRead);
            }
            fs.closeSync(fd);
            totalBytes += fs.statSync(p).size;
        }

        let huffman = new CanonicalHuffman();
        huffman.buildFromFrequencies(analyzer.getFrequencies());

        // Pass 2: Write Archive
        let outFd = fs.openSync(outputFile, 'w');
        
        let headerBuf = Buffer.alloc(4 + 256 + 4);
        headerBuf.writeUInt32LE(HUF_MAGIC, 0);
        for(let i=0; i<256; i++) {
            headerBuf.writeUInt8(huffman.lengths[i], 4 + i);
        }
        headerBuf.writeUInt32LE(files.length, 4 + 256);
        fs.writeSync(outFd, headerBuf, 0, headerBuf.length, null);

        // Metadata
        for (let p of files) {
            let relPath = stat.isDirectory() ? path.relative(inputPath, p) : path.basename(p);
            relPath = relPath.replace(/\\/g, '/');
            let pathLen = Buffer.byteLength(relPath, 'utf8');
            
            let metaBuf = Buffer.alloc(2 + pathLen + 8);
            metaBuf.writeUInt16LE(pathLen, 0);
            metaBuf.write(relPath, 2, pathLen, 'utf8');
            let fileSize = fs.statSync(p).size;
            metaBuf.writeBigUInt64LE(BigInt(fileSize), 2 + pathLen);
            
            fs.writeSync(outFd, metaBuf, 0, metaBuf.length, null);
        }

        let bw = new BitWriter(outFd);
        let bytesProcessed = 0;
        let lastPercent = -1;

        for (let p of files) {
            let inFd = fs.openSync(p, 'r');
            let bytesRead = 0;
            while ((bytesRead = fs.readSync(inFd, buffer, 0, 8192, null)) > 0) {
                for (let i = 0; i < bytesRead; i++) {
                    let byte = buffer[i];
                    let code = huffman.codes[byte];
                    let len = huffman.lengths[byte];
                    if (len > 0) bw.writeBits(code, len);
                }
                bytesProcessed += bytesRead;
                if (totalBytes > 0) {
                    let percent = Math.floor((bytesProcessed * 100) / totalBytes);
                    if (percent !== lastPercent) {
                        if(progressCallback) progressCallback(percent);
                        lastPercent = percent;
                    }
                }
            }
            fs.closeSync(inFd);
        }
        bw.flush();
        fs.closeSync(outFd);
    }

    static extract(inputFile, outputPath, progressCallback) {
        let fd = fs.openSync(inputFile, 'r');
        let headerBuf = Buffer.alloc(4 + 256 + 4);
        fs.readSync(fd, headerBuf, 0, headerBuf.length, null);

        if (headerBuf.readUInt32LE(0) !== HUF_MAGIC) {
            fs.closeSync(fd);
            throw new Error("Invalid archive format.");
        }

        let huffman = new CanonicalHuffman();
        for(let i=0; i<256; i++) {
            huffman.lengths[i] = headerBuf.readUInt8(4 + i);
        }
        huffman.buildCodesFromLengths();

        let numFiles = headerBuf.readUInt32LE(4 + 256);
        let entries = [];
        let totalBytes = 0;
        
        let currentPos = headerBuf.length;

        for (let i = 0; i < numFiles; i++) {
            let lenBuf = Buffer.alloc(2);
            fs.readSync(fd, lenBuf, 0, 2, currentPos);
            currentPos += 2;
            let pathLen = lenBuf.readUInt16LE(0);
            
            let pathBuf = Buffer.alloc(pathLen);
            fs.readSync(fd, pathBuf, 0, pathLen, currentPos);
            currentPos += pathLen;
            let entryPath = pathBuf.toString('utf8');
            
            let sizeBuf = Buffer.alloc(8);
            fs.readSync(fd, sizeBuf, 0, 8, currentPos);
            currentPos += 8;
            // Number allows up to 9 petabytes precisely
            let size = Number(sizeBuf.readBigUInt64LE(0));
            
            entries.push({ path: entryPath, size: size });
            totalBytes += size;
        }

        let tree = [{ left: -1, right: -1, symbol: -1 }];
        for (let sym = 0; sym < 256; sym++) {
            let len = huffman.lengths[sym];
            if (len === 0) continue;
            let code = huffman.codes[sym];
            let curr = 0;
            for (let i = len - 1; i >= 0; i--) {
                let bit = (code >> i) & 1;
                if (bit === 0) {
                    if (tree[curr].left === -1) {
                        tree[curr].left = tree.length;
                        tree.push({ left: -1, right: -1, symbol: -1 });
                    }
                    curr = tree[curr].left;
                } else {
                    if (tree[curr].right === -1) {
                        tree[curr].right = tree.length;
                        tree.push({ left: -1, right: -1, symbol: -1 });
                    }
                    curr = tree[curr].right;
                }
            }
            tree[curr].symbol = sym;
        }

        let br = new BitReader(fd, currentPos);
        let bytesExtracted = 0;
        let lastPercent = -1;

        for (let entry of entries) {
            let filePath = path.join(outputPath, entry.path);
            fs.mkdirSync(path.dirname(filePath), { recursive: true });
            
            let outFd = fs.openSync(filePath, 'w');
            let bytesWritten = 0;
            let writeBuf = Buffer.alloc(8192);
            let writePos = 0;

            while (bytesWritten < entry.size) {
                let curr = 0;
                while (tree[curr].symbol === -1) {
                    let bit = br.readBit();
                    if (bit === null) throw new Error("Unexpected end of compressed stream.");
                    curr = bit ? tree[curr].right : tree[curr].left;
                }
                
                writeBuf[writePos++] = tree[curr].symbol;
                bytesWritten++;
                bytesExtracted++;

                if (writePos === 8192) {
                    fs.writeSync(outFd, writeBuf, 0, 8192, null);
                    writePos = 0;
                }

                if (bytesExtracted % 8192 === 0 && totalBytes > 0) {
                    let percent = Math.floor((bytesExtracted * 100) / totalBytes);
                    if (percent !== lastPercent) {
                        if(progressCallback) progressCallback(percent);
                        lastPercent = percent;
                    }
                }
            }
            if (writePos > 0) {
                fs.writeSync(outFd, writeBuf, 0, writePos, null);
            }
            fs.closeSync(outFd);
        }
        fs.closeSync(fd);
    }
}

module.exports = { Archiver };
