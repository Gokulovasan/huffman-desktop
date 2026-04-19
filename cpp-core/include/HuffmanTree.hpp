#pragma once

#include <vector>
#include <queue>
#include <cstdint>
#include <algorithm>

struct HuffmanNode {
    uint8_t symbol;
    uint64_t freq;
    int left;
    int right;

    HuffmanNode(uint8_t s, uint64_t f) : symbol(s), freq(f), left(-1), right(-1) {}
};

struct CompareNode {
    const std::vector<HuffmanNode>& nodes;
    CompareNode(const std::vector<HuffmanNode>& n) : nodes(n) {}

    bool operator()(int a, int b) const {
        if (nodes[a].freq != nodes[b].freq) {
            return nodes[a].freq > nodes[b].freq;
        }
        return nodes[a].symbol > nodes[b].symbol;
    }
};

class FrequencyAnalyzer {
public:
    FrequencyAnalyzer() : m_freqs(256, 0) {}

    void addBuffer(const char* data, size_t size) {
        for (size_t i = 0; i < size; ++i) {
            m_freqs[static_cast<uint8_t>(data[i])]++;
        }
    }

    const std::vector<uint64_t>& getFrequencies() const {
        return m_freqs;
    }

private:
    std::vector<uint64_t> m_freqs;
};

class CanonicalHuffman {
public:
    std::vector<uint8_t> lengths; // Size 256
    std::vector<uint32_t> codes;  // Size 256

    CanonicalHuffman() : lengths(256, 0), codes(256, 0) {}

    void buildFromFrequencies(const std::vector<uint64_t>& freqs) {
        std::vector<HuffmanNode> nodes;
        for (int i = 0; i < 256; ++i) {
            if (freqs[i] > 0) {
                nodes.emplace_back(static_cast<uint8_t>(i), freqs[i]);
            }
        }

        if (nodes.empty()) return;
        if (nodes.size() == 1) {
            lengths[nodes[0].symbol] = 1;
            codes[nodes[0].symbol] = 0;
            return;
        }

        std::priority_queue<int, std::vector<int>, CompareNode> pq((CompareNode(nodes)));
        for (int i = 0; i < static_cast<int>(nodes.size()); ++i) {
            pq.push(i);
        }

        while (pq.size() > 1) {
            int left = pq.top(); pq.pop();
            int right = pq.top(); pq.pop();

            int parentIdx = static_cast<int>(nodes.size());
            HuffmanNode parent(0, nodes[left].freq + nodes[right].freq);
            parent.left = left;
            parent.right = right;
            nodes.push_back(parent);
            pq.push(parentIdx);
        }

        int root = pq.top();
        std::vector<int> rawLengths(256, 0);
        computeLengths(nodes, root, 0, rawLengths);

        for (int i = 0; i < 256; ++i) {
            lengths[i] = static_cast<uint8_t>(rawLengths[i]);
        }

        buildCodesFromLengths();
    }

    void buildCodesFromLengths() {
        std::vector<std::pair<int, int>> lengthSymbol;
        for (int i = 0; i < 256; ++i) {
            if (lengths[i] > 0) {
                lengthSymbol.push_back({lengths[i], i});
            }
        }

        if (lengthSymbol.empty()) return;

        std::sort(lengthSymbol.begin(), lengthSymbol.end(), [](const auto& a, const auto& b) {
            if (a.first != b.first) return a.first < b.first;
            return a.second < b.second; // Canonical logic
        });

        uint32_t currentCode = 0;
        int currentLength = lengthSymbol[0].first;

        for (const auto& p : lengthSymbol) {
            int len = p.first;
            int sym = p.second;
            
            while (currentLength < len) {
                currentCode <<= 1;
                currentLength++;
            }
            
            codes[sym] = currentCode++;
        }
    }

private:
    void computeLengths(const std::vector<HuffmanNode>& nodes, int nodeIdx, int depth, std::vector<int>& rawLengths) {
        if (nodeIdx == -1) return;
        
        if (nodes[nodeIdx].left == -1 && nodes[nodeIdx].right == -1) {
            rawLengths[nodes[nodeIdx].symbol] = depth;
        } else {
            computeLengths(nodes, nodes[nodeIdx].left, depth + 1, rawLengths);
            computeLengths(nodes, nodes[nodeIdx].right, depth + 1, rawLengths);
        }
    }
};
