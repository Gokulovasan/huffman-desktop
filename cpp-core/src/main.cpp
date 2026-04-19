#include "Packer.hpp"
#include "Unpacker.hpp"
#include <iostream>
#include <string>

void printHelp() {
    std::cout << "Huffman Archive Tool\n"
              << "Usage:\n"
              << "  huf -c [input_path] -o [output_file.huf]\n"
              << "  huf -x [input_file.huf] -o [output_path]\n"
              << "  huf -l [input_file.huf]\n";
}

int main(int argc, char** argv) {
    if (argc < 3) {
        printHelp();
        return 1;
    }

    std::string mode = argv[1];
    if (mode == "-c" || mode == "--compress") {
        if (argc < 5 || std::string(argv[3]) != "-o") {
            printHelp();
            return 1;
        }
        std::string input = argv[2];
        std::string output = argv[4];
        std::cout << "Compressing " << input << " to " << output << "...\n";
        try {
            Packer p;
            p.compress(input, output);
            std::cout << "Compression complete.\n";
        } catch (const std::exception& e) {
            std::cerr << "Error: " << e.what() << "\n";
            return 1;
        }
    } else if (mode == "-x" || mode == "--extract") {
        if (argc < 5 || std::string(argv[3]) != "-o") {
            printHelp();
            return 1;
        }
        std::string input = argv[2];
        std::string output = argv[4];
        std::cout << "Extracting " << input << " to " << output << "...\n";
        try {
            Unpacker u;
            u.extract(input, output);
            std::cout << "Extraction complete.\n";
        } catch (const std::exception& e) {
            std::cerr << "Error: " << e.what() << "\n";
            return 1;
        }
    } else if (mode == "-l" || mode == "--list") {
        std::string input = argv[2];
        try {
            Unpacker u;
            u.listFiles(input);
        } catch (const std::exception& e) {
            std::cerr << "Error: " << e.what() << "\n";
            return 1;
        }
    } else {
        printHelp();
        return 1;
    }

    return 0;
}
