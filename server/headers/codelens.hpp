#ifndef CODELENS_TRACE_HPP
#define CODELENS_TRACE_HPP

#include <iostream>
#include <string>
#include <vector>
#include <queue>
#include <stack>
#include <map>
#include <sstream>
#include <type_traits>
#include <cstdlib>
#include <cstdint>

namespace codelens {

class TraceEmitter {
private:
    int currentStep = 0;

    TraceEmitter() = default;

public:
    static TraceEmitter& instance() {
        static TraceEmitter inst;
        return inst;
    }

    void emitEvent(int line,
                   const std::string& type,
                   const std::string& dsId,
                   const std::string& dsType,
                   const std::string& op,
                   const std::string& valJson,
                   const std::string& snapshotJson,
                   const std::string& desc) {
        currentStep++;
        std::cout << "\n__CODELENS_EVENT__{\"step\":" << currentStep
                  << ",\"line\":" << (line > 0 ? line : 1)
                  << ",\"type\":\"" << type << "\""
                  << ",\"dsId\":\"" << dsId << "\""
                  << ",\"dsType\":\"" << dsType << "\""
                  << ",\"op\":\"" << op << "\"";
        if (!valJson.empty()) {
            std::cout << ",\"val\":" << valJson;
        }
        std::cout << ",\"snapshot\":" << snapshotJson
                  << ",\"desc\":\"" << desc << "\"}\n";
        std::cout.flush();
    }
};

template<typename T>
std::string toJsonValue(const T& val) {
    if constexpr (std::is_same_v<T, std::string>) {
        return "\"" + val + "\"";
    } else if constexpr (std::is_same_v<T, const char*>) {
        return "\"" + std::string(val) + "\"";
    } else if constexpr (std::is_same_v<T, bool>) {
        return val ? "true" : "false";
    } else {
        std::ostringstream ss;
        ss << val;
        return ss.str();
    }
}

// ==========================================
// 1. INSTRUMENTED QUEUE (FIFO)
// ==========================================
template<typename T>
class queue {
private:
    std::deque<T> _data;
    std::string _id;

    std::string serializeSnapshot() const {
        std::ostringstream ss;
        ss << "[";
        for (size_t i = 0; i < _data.size(); ++i) {
            if (i > 0) ss << ",";
            ss << toJsonValue(_data[i]);
        }
        ss << "]";
        return ss.str();
    }

public:
    explicit queue(const std::string& id = "q", int line = 1) : _id(id) {
        TraceEmitter::instance().emitEvent(line, "init", _id, "queue", "init", "", "[]", "Initialized empty queue " + _id);
    }

    void push(const T& val, int line = 1) {
        _data.push_back(val);
        std::string valStr = toJsonValue(val);
        TraceEmitter::instance().emitEvent(line, "operation", _id, "queue", "push", valStr, serializeSnapshot(),
            _id + ".push(" + valStr + ") -> front is " + toJsonValue(_data.front()));
    }

    void pop(int line = 1) {
        if (_data.empty()) return;
        T popped = _data.front();
        _data.pop_front();
        std::string valStr = toJsonValue(popped);
        TraceEmitter::instance().emitEvent(line, "operation", _id, "queue", "pop", valStr, serializeSnapshot(),
            _id + ".pop() removed " + valStr + " from front");
    }

    const T& front() const {
        return _data.front();
    }

    const T& back() const {
        return _data.back();
    }

    bool empty() const {
        return _data.empty();
    }

    size_t size() const {
        return _data.size();
    }
};

// ==========================================
// 2. INSTRUMENTED STACK (LIFO)
// ==========================================
template<typename T>
class stack {
private:
    std::vector<T> _data;
    std::string _id;

    std::string serializeSnapshot() const {
        std::ostringstream ss;
        ss << "[";
        for (size_t i = 0; i < _data.size(); ++i) {
            if (i > 0) ss << ",";
            ss << toJsonValue(_data[i]);
        }
        ss << "]";
        return ss.str();
    }

public:
    explicit stack(const std::string& id = "s", int line = 1) : _id(id) {
        TraceEmitter::instance().emitEvent(line, "init", _id, "stack", "init", "", "[]", "Initialized empty stack " + _id);
    }

    void push(const T& val, int line = 1) {
        _data.push_back(val);
        std::string valStr = toJsonValue(val);
        TraceEmitter::instance().emitEvent(line, "operation", _id, "stack", "push", valStr, serializeSnapshot(),
            _id + ".push(" + valStr + ") -> top is now " + valStr);
    }

    void pop(int line = 1) {
        if (_data.empty()) return;
        T popped = _data.back();
        _data.pop_back();
        std::string valStr = toJsonValue(popped);
        TraceEmitter::instance().emitEvent(line, "operation", _id, "stack", "pop", valStr, serializeSnapshot(),
            _id + ".pop() popped " + valStr + " from top");
    }

    const T& top() const {
        return _data.back();
    }

    bool empty() const {
        return _data.empty();
    }

    size_t size() const {
        return _data.size();
    }
};

// ==========================================
// 3. INSTRUMENTED VECTOR (Dynamic Array)
// ==========================================
template<typename T>
class vector {
private:
    std::vector<T> _data;
    std::string _id;

    std::string serializeSnapshot() const {
        std::ostringstream ss;
        ss << "[";
        for (size_t i = 0; i < _data.size(); ++i) {
            if (i > 0) ss << ",";
            ss << toJsonValue(_data[i]);
        }
        ss << "]";
        return ss.str();
    }

public:
    explicit vector(const std::string& id = "vec", int line = 1) : _id(id) {
        TraceEmitter::instance().emitEvent(line, "init", _id, "vector", "init", "", "[]", "Initialized empty vector " + _id);
    }

    vector(std::initializer_list<T> list, const std::string& id = "vec", int line = 1) : _data(list), _id(id) {
        TraceEmitter::instance().emitEvent(line, "init", _id, "vector", "init", "", serializeSnapshot(),
            "Initialized vector " + _id + " with " + std::to_string(_data.size()) + " elements");
    }

    void push_back(const T& val, int line = 1) {
        _data.push_back(val);
        std::string valStr = toJsonValue(val);
        TraceEmitter::instance().emitEvent(line, "operation", _id, "vector", "push", valStr, serializeSnapshot(),
            _id + ".push_back(" + valStr + ") -> index " + std::to_string(_data.size() - 1));
    }

    void pop_back(int line = 1) {
        if (_data.empty()) return;
        T popped = _data.back();
        _data.pop_back();
        std::string valStr = toJsonValue(popped);
        TraceEmitter::instance().emitEvent(line, "operation", _id, "vector", "pop", valStr, serializeSnapshot(),
            _id + ".pop_back() removed " + valStr);
    }

    T& operator[](size_t idx) {
        return _data[idx];
    }

    const T& operator[](size_t idx) const {
        return _data[idx];
    }

    size_t size() const {
        return _data.size();
    }

    bool empty() const {
        return _data.empty();
    }

    auto begin() { return _data.begin(); }
    auto end() { return _data.end(); }
    auto begin() const { return _data.begin(); }
    auto end() const { return _data.end(); }
};

// ==========================================
// 4. INSTRUMENTED MAP (Associative Key-Value)
// ==========================================
template<typename K, typename V>
class map {
private:
    std::map<K, V> _data;
    std::string _id;

    std::string serializeSnapshot() const {
        std::ostringstream ss;
        ss << "{";
        size_t count = 0;
        for (const auto& pair : _data) {
            if (count++ > 0) ss << ",";
            ss << "\"" << pair.first << "\":" << toJsonValue(pair.second);
        }
        ss << "}";
        return ss.str();
    }

public:
    explicit map(const std::string& id = "m", int line = 1) : _id(id) {
        TraceEmitter::instance().emitEvent(line, "init", _id, "map", "init", "", "{}", "Initialized empty map " + _id);
    }

    void insert_or_assign(const K& key, const V& val, int line = 1) {
        _data[key] = val;
        std::string entry = "{\"" + std::string(toJsonValue(key)) + "\":" + toJsonValue(val) + "}";
        TraceEmitter::instance().emitEvent(line, "operation", _id, "map", "set", entry, serializeSnapshot(),
            _id + "[" + toJsonValue(key) + "] = " + toJsonValue(val));
    }

    V& operator[](const K& key) {
        return _data[key];
    }

    void erase(const K& key, int line = 1) {
        _data.erase(key);
        TraceEmitter::instance().emitEvent(line, "operation", _id, "map", "erase", toJsonValue(key), serializeSnapshot(),
            _id + ".erase(" + toJsonValue(key) + ")");
    }

    size_t size() const {
        return _data.size();
    }

    bool empty() const {
        return _data.empty();
    }
};

// ==========================================
// 5. INSTRUMENTED PRIORITY QUEUE (Heap)
// ==========================================
template<typename T, typename Container = std::vector<T>, typename Compare = std::less<T>>
class priority_queue {
private:
    std::vector<T> _data;
    std::string _id;
    bool _isMin;

    std::string serializeSnapshot() const {
        std::ostringstream ss;
        ss << "{\"heapType\":\"" << (_isMin ? "min" : "max") << "\",\"nodes\":[";
        for (size_t i = 0; i < _data.size(); ++i) {
            if (i > 0) ss << ",";
            ss << toJsonValue(_data[i]);
        }
        ss << "],\"size\":" << _data.size() << "}";
        return ss.str();
    }

public:
    explicit priority_queue(const std::string& id = "pq", bool isMin = true, int line = 1)
        : _id(id), _isMin(isMin) {
        TraceEmitter::instance().emitEvent(line, "init", _id, "heap", "init", "", serializeSnapshot(),
            "Initialized " + std::string(_isMin ? "min-heap " : "max-heap ") + _id);
    }

    void push(const T& val, int line = 1) {
        _data.push_back(val);
        // Bubble up
        int idx = (int)_data.size() - 1;
        while (idx > 0) {
            int parent = (idx - 1) / 2;
            bool condition = _isMin ? (_data[idx] < _data[parent]) : (_data[idx] > _data[parent]);
            if (condition) {
                std::swap(_data[idx], _data[parent]);
                idx = parent;
            } else {
                break;
            }
        }
        std::string valStr = toJsonValue(val);
        TraceEmitter::instance().emitEvent(line, "operation", _id, "heap", "push", valStr, serializeSnapshot(),
            _id + ".push(" + valStr + ") -> heap rebalanced");
    }

    void pop(int line = 1) {
        if (_data.empty()) return;
        T rootVal = _data.front();
        _data[0] = _data.back();
        _data.pop_back();

        // Bubble down
        int idx = 0;
        int n = (int)_data.size();
        while (true) {
            int left = 2 * idx + 1;
            int right = 2 * idx + 2;
            int target = idx;

            if (left < n) {
                bool cond = _isMin ? (_data[left] < _data[target]) : (_data[left] > _data[target]);
                if (cond) target = left;
            }
            if (right < n) {
                bool cond = _isMin ? (_data[right] < _data[target]) : (_data[right] > _data[target]);
                if (cond) target = right;
            }
            if (target != idx) {
                std::swap(_data[idx], _data[target]);
                idx = target;
            } else {
                break;
            }
        }

        std::string valStr = toJsonValue(rootVal);
        TraceEmitter::instance().emitEvent(line, "operation", _id, "heap", "pop", valStr, serializeSnapshot(),
            _id + ".pop() extracted root " + valStr);
    }

    const T& top() const {
        return _data.front();
    }

    bool empty() const {
        return _data.empty();
    }

    size_t size() const {
        return _data.size();
    }
};

// ==========================================
// 6. INSTRUMENTED LINKED LIST
// ==========================================
template<typename T>
class linked_list {
private:
    struct Node {
        std::string id;
        T val;
        Node* next = nullptr;
        Node* prev = nullptr;
        Node(const std::string& nid, const T& v) : id(nid), val(v) {}
    };

    Node* head = nullptr;
    Node* tail = nullptr;
    size_t _size = 0;
    std::string _id;
    bool _isDoubly;

    std::string serializeSnapshot() const {
        std::ostringstream ss;
        ss << "{\"listType\":\"" << (_isDoubly ? "doubly" : "singly") << "\",\"head\":";
        if (head) ss << "\"" << head->id << "\""; else ss << "null";
        ss << ",\"nodes\":[";
        Node* curr = head;
        size_t count = 0;
        while (curr && count < 100) {
            if (count++ > 0) ss << ",";
            ss << "{\"id\":\"" << curr->id << "\",\"val\":" << toJsonValue(curr->val)
               << ",\"next\":" << (curr->next ? ("\"" + curr->next->id + "\"") : "null")
               << ",\"prev\":" << (curr->prev ? ("\"" + curr->prev->id + "\"") : "null")
               << "}";
            curr = curr->next;
        }
        ss << "],\"size\":" << _size << "}";
        return ss.str();
    }

public:
    explicit linked_list(const std::string& id = "ll", bool isDoubly = false, int line = 1)
        : _id(id), _isDoubly(isDoubly) {
        TraceEmitter::instance().emitEvent(line, "init", _id, "linked_list", "init", "", serializeSnapshot(),
            "Initialized empty linked list " + _id);
    }

    void push_back(const T& val, int line = 1) {
        std::string nid = "node_" + std::to_string(++_size);
        Node* n = new Node(nid, val);
        if (!head) {
            head = tail = n;
        } else {
            tail->next = n;
            if (_isDoubly) n->prev = tail;
            tail = n;
        }
        std::string valStr = toJsonValue(val);
        TraceEmitter::instance().emitEvent(line, "operation", _id, "linked_list", "push_back", valStr, serializeSnapshot(),
            _id + ".push_back(" + valStr + ")");
    }

    void push_front(const T& val, int line = 1) {
        std::string nid = "node_" + std::to_string(++_size);
        Node* n = new Node(nid, val);
        if (!head) {
            head = tail = n;
        } else {
            n->next = head;
            if (_isDoubly) head->prev = n;
            head = n;
        }
        std::string valStr = toJsonValue(val);
        TraceEmitter::instance().emitEvent(line, "operation", _id, "linked_list", "push_front", valStr, serializeSnapshot(),
            _id + ".push_front(" + valStr + ")");
    }

    bool empty() const { return head == nullptr; }
    size_t size() const { return _size; }
};

// ==========================================
// 7. INSTRUMENTED BINARY TREE
// ==========================================
template<typename T>
struct tree_node {
    std::string id;
    T val;
    tree_node* left = nullptr;
    tree_node* right = nullptr;

    explicit tree_node(const T& v, const std::string& customId = "")
        : val(v), left(nullptr), right(nullptr) {
        if (!customId.empty()) {
            id = customId;
        } else {
            std::ostringstream ss;
            ss << "tn_" << reinterpret_cast<uintptr_t>(this);
            id = ss.str();
        }
    }
};

template<typename T>
class tree_tracker {
public:
    static std::string serializeTree(tree_node<T>* root, const std::string& currId = "", const std::vector<std::string>& visited = {}) {
        if (!root) return "{\"root\":null,\"nodes\":[],\"visited\":[],\"traversalOrder\":[]}";
        std::vector<tree_node<T>*> q;
        q.push_back(root);
        std::ostringstream nodesJson;
        nodesJson << "[";
        size_t count = 0;

        while (count < q.size() && q.size() < 200) {
            tree_node<T>* curr = q[count++];
            if (count > 1) nodesJson << ",";
            nodesJson << "{\"id\":\"" << curr->id << "\",\"val\":" << toJsonValue(curr->val)
                      << ",\"left\":" << (curr->left ? ("\"" + curr->left->id + "\"") : "null")
                      << ",\"right\":" << (curr->right ? ("\"" + curr->right->id + "\"") : "null")
                      << "}";
            if (curr->left) q.push_back(curr->left);
            if (curr->right) q.push_back(curr->right);
        }
        nodesJson << "]";

        std::ostringstream ss;
        ss << "{\"root\":\"" << root->id << "\",\"nodes\":" << nodesJson.str()
           << ",\"currentNode\":" << (currId.empty() ? "null" : ("\"" + currId + "\""))
           << ",\"visited\":[";
        for (size_t i = 0; i < visited.size(); ++i) {
            if (i > 0) ss << ",";
            ss << "\"" << visited[i] << "\"";
        }
        ss << "],\"traversalOrder\":[";
        for (size_t i = 0; i < visited.size(); ++i) {
            if (i > 0) ss << ",";
            ss << "\"" << visited[i] << "\"";
        }
        ss << "]}";
        return ss.str();
    }

    static void emit(tree_node<T>* root, const std::string& op, const std::string& desc,
                     const std::string& currId = "", const std::vector<std::string>& visited = {}, int line = 1) {
        TraceEmitter::instance().emitEvent(line, "operation", "tree", "tree", op,
            currId.empty() ? "" : ("\"" + currId + "\""),
            serializeTree(root, currId, visited), desc);
    }
};

// ==========================================
// 8. INSTRUMENTED GRAPH
// ==========================================
class graph {
public:
    struct Edge {
        std::string from;
        std::string to;
        double weight = 1.0;
        bool directed = true;
    };

    struct Node {
        std::string id;
        std::string val;
    };

private:
    std::string _id;
    bool _isDirected;
    std::vector<Node> _nodes;
    std::vector<Edge> _edges;
    std::string _currentNode;
    std::vector<std::string> _visited;
    std::vector<std::string> _traversalOrder;

public:
    explicit graph(const std::string& id = "g", bool isDirected = true, int line = 1)
        : _id(id), _isDirected(isDirected) {
        TraceEmitter::instance().emitEvent(line, "init", _id, "graph", "init", "", serializeSnapshot(),
            "Initialized empty graph " + _id);
    }

    void add_node(const std::string& nid, const std::string& val = "", int line = 1) {
        for (const auto& n : _nodes) {
            if (n.id == nid) return;
        }
        _nodes.push_back({nid, val.empty() ? nid : val});
        TraceEmitter::instance().emitEvent(line, "operation", _id, "graph", "addNode", "\"" + nid + "\"", serializeSnapshot(),
            _id + ".addNode(" + nid + ")");
    }

    void add_edge(const std::string& u, const std::string& v, double weight = 1.0, int line = 1) {
        add_node(u, u, line);
        add_node(v, v, line);
        _edges.push_back({u, v, weight, _isDirected});
        if (!_isDirected) {
            _edges.push_back({v, u, weight, false});
        }
        std::ostringstream valJson;
        valJson << "{\"from\":\"" << u << "\",\"to\":\"" << v << "\",\"weight\":" << weight << "}";
        TraceEmitter::instance().emitEvent(line, "operation", _id, "graph", "addEdge", valJson.str(), serializeSnapshot(),
            _id + ".addEdge(" + u + " -> " + v + ", weight=" + std::to_string(weight) + ")");
    }

    void visit(const std::string& nid, int line = 1) {
        _currentNode = nid;
        bool found = false;
        for (const auto& v : _visited) {
            if (v == nid) { found = true; break; }
        }
        if (!found) _visited.push_back(nid);
        _traversalOrder.push_back(nid);
        TraceEmitter::instance().emitEvent(line, "operation", _id, "graph", "visit", "\"" + nid + "\"", serializeSnapshot(),
            _id + " visiting node " + nid);
    }

    std::string serializeSnapshot() const {
        std::ostringstream ss;
        ss << "{\"isDirected\":" << (_isDirected ? "true" : "false")
           << ",\"currentNode\":" << (_currentNode.empty() ? "null" : ("\"" + _currentNode + "\""))
           << ",\"nodes\":[";
        for (size_t i = 0; i < _nodes.size(); ++i) {
            if (i > 0) ss << ",";
            ss << "{\"id\":\"" << _nodes[i].id << "\",\"val\":\"" << _nodes[i].val << "\"}";
        }
        ss << "],\"edges\":[";
        for (size_t i = 0; i < _edges.size(); ++i) {
            if (i > 0) ss << ",";
            ss << "{\"from\":\"" << _edges[i].from << "\",\"to\":\"" << _edges[i].to
               << "\",\"weight\":" << _edges[i].weight
               << ",\"directed\":" << (_edges[i].directed ? "true" : "false") << "}";
        }
        ss << "],\"visited\":[";
        for (size_t i = 0; i < _visited.size(); ++i) {
            if (i > 0) ss << ",";
            ss << "\"" << _visited[i] << "\"";
        }
        ss << "],\"traversalOrder\":[";
        for (size_t i = 0; i < _traversalOrder.size(); ++i) {
            if (i > 0) ss << ",";
            ss << "\"" << _traversalOrder[i] << "\"";
        }
        ss << "]}";
        return ss.str();
    }
};

} // namespace codelens

#endif // CODELENS_TRACE_HPP

