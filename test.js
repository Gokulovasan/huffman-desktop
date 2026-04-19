const fs = require('fs');
const path = require('path');
const { Archiver } = require('./src/backend/Archiver.js');

try {
    fs.writeFileSync('test.txt', 'Hello, World!');
    console.log("Compressing...");
    Archiver.compress('test.txt', 'test.huf');
    console.log("Compress OK");

    console.log("Extracting...");
    Archiver.extract('test.huf', 'out_dir');
    console.log("Extract OK");
    console.log(fs.readFileSync('out_dir/test.txt', 'utf8'));
} catch (err) {
    console.error("FATAL ERROR:", err);
}
