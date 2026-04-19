#pragma once

#include "ArchiveFormat.hpp"
#include "BitStream.hpp"
#include "HuffmanTree.hpp"

#include <string>
#include <vector>
#include <filesystem>
#include <fstream>
#include <iostream>

namespace fs = std::filesystem;

class Unpacker {
public:
    void extract(const std::string& inputFile, const std::string& outputPath) {
        std::ifstream in(inputFile, std::ios::binary);
        if (!in) throw std::runtime_error("Cannot open archive.");

        uint32_t magic;
        if (!in.read(reinterpret_cast<char*>(&magic), 4) || magic != HUF_MAGIC) {
            throw std::runtime_error("Invalid archive format.");
        }

        CanonicalHuffman huffman;
        if (!in.read(reinterpret_cast<char*>(huffman.lengths.data()), 256)) {
            throw std::runtime_error("Failed to read header.");
        }
        huffman.buildCodesFromLengths();

        uint32_t numFiles;
        if (!in.read(reinterpret_cast<char*>(&numFiles), 4)) {
            throw std::runtime_error("Failed to read file count.");
        }

        struct FileEntry {
            std::string path;
            uint64_t size;
        };
        std::vector<FileEntry> entries;
        uint64_t totalBytes = 0;

        for (uint32_t i = 0; i < numFiles; ++i) {
            uint16_t pathLen;
            in.read(reinterpret_cast<char*>(&pathLen), 2);
            std::string path(pathLen, '\0');
            in.read(&path[0], pathLen);
            uint64_t size;
            in.read(reinterpret_cast<char*>(&size), 8);
            entries.push_back({path, size});
            totalBytes += size;
        }

        struct DecodeNode {
            int left = -1;
            int right = -1;
            int symbol = -1;
        };
        std::vector<DecodeNode> tree(1);
        for (int sym = 0; sym < 256; ++sym) {
            uint8_t len = huffman.lengths[sym];
            if (len == 0) continue;
            uint32_t code = huffman.codes[sym];
            int curr = 0;
            for (int i = len - 1; i >= 0; --i) {
                int bit = (code >> i) & 1;
                if (bit == 0) {
                    if (tree[curr].left == -1) {
                        tree[curr].left = static_cast<int>(tree.size());
                        tree.push_back(DecodeNode{});
                    }
                    curr = tree[curr].left;
                } else {
                    if (tree[curr].right == -1) {
                        tree[curr].right = static_cast<int>(tree.size());
                        tree.push_back(DecodeNode{});
                    }
                    curr = tree[curr].right;
                }
            }
            tree[curr].symbol = sym;
        }

        BitReader br(in);
        fs::path baseOut(outputPath);
        uint64_t bytesExtracted = 0;
        int lastPercent = -1;

        for (const auto& entry : entries) {
            fs::path filePath = baseOut / entry.path;
            fs::create_directories(filePath.parent_path());

            std::ofstream out(filePath, std::ios::binary);
            uint64_t bytesWritten = 0;
            while (bytesWritten < entry.size) {
                int curr = 0;
                while (tree[curr].symbol == -1) {
                    bool bit;
                    if (!br.readBit(bit)) {
                        throw std::runtime_error("Unexpected end of compressed stream.");
                    }
                    curr = bit ? tree[curr].right : tree[curr].left;
                }
                char decodedSym = static_cast<char>(tree[curr].symbol);
                out.put(decodedSym);
                bytesWritten++;
                bytesExtracted++;

                if (bytesExtracted % 8192 == 0 && totalBytes > 0) {
                    int percent = static_cast<int>((bytesExtracted * 100) / totalBytes);
                    if (percent != lastPercent) {
                        std::cout << "\rExtracting... [" << percent << "%]" << std::flush;
                        lastPercent = percent;
                    }
                }
            }
        }
        if (totalBytes > 0) std::cout << "\n";
    }

    void listFiles(const std::string& inputFile) {
        std::ifstream in(inputFile, std::ios::binary);
        if (!in) throw std::runtime_error("Cannot open archive.");

        uint32_t magic;
        if (!in.read(reinterpret_cast<char*>(&magic), 4) || magic != HUF_MAGIC) {
            throw std::runtime_error("Invalid archive format.");
        }

        in.seekg(256, std::ios::cur);

        uint32_t numFiles;
        if (!in.read(reinterpret_cast<char*>(&numFiles), 4)) {
            throw std::runtime_error("Failed to read file count.");
        }

        std::cout << "Archive contains " << numFiles << " file(s):\n";
        for (uint32_t i = 0; i < numFiles; ++i) {
            uint16_t pathLen;
            in.read(reinterpret_cast<char*>(&pathLen), 2);
            std::string path(pathLen, '\0');
            in.read(&path[0], pathLen);
            uint64_t size;
            in.read(reinterpret_cast<char*>(&size), 8);
            std::cout << "  - " << path << " (" << size << " bytes)\n";
        }
    }
};
