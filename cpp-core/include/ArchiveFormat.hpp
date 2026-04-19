#pragma once

#include <cstdint>

// HUF1 Magic Number
constexpr uint32_t HUF_MAGIC = 0x48554631; // "HUF1"

/*
 * Archive File Structure:
 * 1. Magic Number (4 bytes) - HUF1
 * 2. Canonical Lengths Array: 256 bytes (one uint8_t per symbol)
 * 3. Number of files: uint32_t
 * 4. File Metadata Block (repeated 'Number of files' times):
 *    - filename_len: uint16_t
 *    - filename: char[filename_len]
 *    - original_file_size: uint64_t
 * 5. Compressed Data (Bitstream)
 *    The compressed data corresponds to the files sequentially.
 */
