# Huffman Archive Tool

A professional-grade, high-performance canonical Huffman archival tool written in C++20.
Compresses multiple files or whole directories into a single `.huf` archive by building a global frequency table.

## Build Instructions (CMake)

1. Make sure you have CMake 3.20+ and a C++20 compiler installed.
2. Form build directory:
```bash
mkdir build
cd build
cmake ..
cmake --build . --config Release
```

## Usage

* `huf -c [input_path] -o [output_file.huf]` : Compress a file or folder.
* `huf -x [input_file.huf] -o [output_path]` : Extract an archive.
* `huf -l [input_file.huf]`                  : List files in an archive.
