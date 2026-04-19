#pragma once

#include <iostream>
#include <cstdint>

class BitWriter {
public:
    explicit BitWriter(std::ostream& out) : m_out(out), m_buffer(0), m_bitCount(0) {}

    ~BitWriter() {
        flush();
    }

    void writeBit(bool bit) {
        if (bit) {
            m_buffer |= (1 << (7 - m_bitCount));
        }
        m_bitCount++;
        if (m_bitCount == 8) {
            flushByte();
        }
    }

    void writeBits(uint64_t value, int numBits) {
        for (int i = numBits - 1; i >= 0; --i) {
            writeBit(static_cast<bool>((value >> i) & 1));
        }
    }

    void flush() {
        if (m_bitCount > 0) {
            flushByte();
        }
    }

private:
    void flushByte() {
        m_out.put(static_cast<char>(m_buffer));
        m_buffer = 0;
        m_bitCount = 0;
    }

    std::ostream& m_out;
    uint8_t m_buffer;
    int m_bitCount;
};

class BitReader {
public:
    explicit BitReader(std::istream& in) : m_in(in), m_buffer(0), m_bitCount(0) {}

    bool readBit(bool& outBit) {
        if (m_bitCount == 0) {
            if (!readByte()) {
                return false;
            }
        }
        outBit = (m_buffer >> (m_bitCount - 1)) & 1;
        m_bitCount--;
        return true;
    }

    bool readBits(uint64_t& outValue, int numBits) {
        outValue = 0;
        for (int i = 0; i < numBits; ++i) {
            bool bit = false;
            if (!readBit(bit)) return false;
            outValue = (outValue << 1) | bit;
        }
        return true;
    }

private:
    bool readByte() {
        char c;
        if (m_in.get(c)) {
            m_buffer = static_cast<uint8_t>(c);
            m_bitCount = 8;
            return true;
        }
        return false;
    }

    std::istream& m_in;
    uint8_t m_buffer;
    int m_bitCount;
};
