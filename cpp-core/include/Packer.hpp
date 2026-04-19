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

class Packer {
public:
    void compress(const std::string& inputPath, const std::string& outputFile) {
        std::vector<fs::path> files;
        if (fs::is_directory(inputPath)) {
            for (const auto& entry : fs::recursive_directory_iterator(inputPath)) {
                if (entry.is_regular_file()) {
                    files.push_back(entry.path());
                }
            }
        } else if (fs::is_regular_file(inputPath)) {
            files.push_back(fs::path(inputPath));
        } else {
            throw std::runtime_error("Invalid input path.");
        }

        FrequencyAnalyzer analyzer;
        std::vector<char> buffer(8192);

        // Pass 1: Global Frequency Analysis
        uint64_t totalBytes = 0;
        for (const auto& p : files) {
            std::ifstream in(p, std::ios::binary);
            while (in.read(buffer.data(), buffer.size()) || in.gcount() > 0) {
                analyzer.addBuffer(buffer.data(), in.gcount());
            }
            totalBytes += fs::file_size(p);
        }

        CanonicalHuffman huffman;
        huffman.buildFromFrequencies(analyzer.getFrequencies());

        // Pass 2: Write Archive
        std::ofstream out(outputFile, std::ios::binary);
        if (!out) throw std::runtime_error("Cannot open output file.");

        // Write Magic
        uint32_t magic = HUF_MAGIC;
        out.write(reinterpret_cast<const char*>(&magic), 4);

        // Write Lengths
        out.write(reinterpret_cast<const char*>(huffman.lengths.data()), 256);

        // Write Number of Files
        uint32_t numFiles = static_cast<uint32_t>(files.size());
        out.write(reinterpret_cast<const char*>(&numFiles), 4);

        // Write Metadata
        for (const auto& p : files) {
            std::string relPath;
            if (fs::is_directory(inputPath)) {
                relPath = fs::relative(p, inputPath).string();
            } else {
                relPath = p.filename().string();
            }
            std::replace(relPath.begin(), relPath.end(), '\\', '/');

            uint16_t pathLen = static_cast<uint16_t>(relPath.size());
            out.write(reinterpret_cast<const char*>(&pathLen), 2);
            out.write(relPath.c_str(), pathLen);

            uint64_t fileSize = fs::file_size(p);
            out.write(reinterpret_cast<const char*>(&fileSize), 8);
        }

        // Write Compressed Data
        BitWriter bw(out);
        uint64_t bytesProcessed = 0;
        int lastPercent = -1;

        for (const auto& p : files) {
            std::ifstream in(p, std::ios::binary);
            while (in.read(buffer.data(), buffer.size()) || in.gcount() > 0) {
                for (std::streamsize i = 0; i < in.gcount(); ++i) {
                    uint8_t byte = static_cast<uint8_t>(buffer[i]);
                    uint32_t code = huffman.codes[byte];
                    uint8_t len = huffman.lengths[byte];
                    if (len > 0) bw.writeBits(code, len);
                }
                bytesProcessed += in.gcount();
                if (totalBytes > 0) {
                    int percent = static_cast<int>((bytesProcessed * 100) / totalBytes);
                    if (percent != lastPercent) {
                        std::cout << "\rCompressing... [" << percent << "%]" << std::flush;
                        lastPercent = percent;
                    }
                }
            }
        }
        bw.flush();
        if (totalBytes > 0) std::cout << "\n";
    }
};
