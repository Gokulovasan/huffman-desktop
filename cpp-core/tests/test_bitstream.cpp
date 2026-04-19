#include "BitStream.hpp"
#include <sstream>
#include <cassert>
#include <iostream>

void test_bit_io() {
    std::stringstream ss;
    {
        BitWriter bw(ss);
        bw.writeBit(true);   // 1
        bw.writeBit(false);  // 0
        bw.writeBit(true);   // 1
        
        bw.writeBits(0xA5, 8); // 10100101
        
        bw.writeBit(false); // 0
        // Total 12 bits. Last 4 will be padded with zeros automatically on flush.
    }
    
    // Now read it back.
    ss.seekg(0);
    BitReader br(ss);
    
    bool b;
    assert(br.readBit(b) && b == true);
    assert(br.readBit(b) && b == false);
    assert(br.readBit(b) && b == true);
    
    uint64_t val;
    assert(br.readBits(val, 8) && val == 0xA5);
    
    assert(br.readBit(b) && b == false);
    
    std::cout << "test_bit_io passed.\n";
}

int main() {
    test_bit_io();
    return 0;
}
