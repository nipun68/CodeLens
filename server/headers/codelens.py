# CodeLens Python Runtime Tracing Module
import sys
import json
import atexit
from collections import deque

class _TraceEmitter:
    _instance = None

    def __init__(self):
        self.step = 0

    @classmethod
    def instance(cls):
        if cls._instance is None:
            cls._instance = _TraceEmitter()
        return cls._instance

    def emit(self, line, event_type, ds_id, ds_type, op, val, snapshot, desc):
        self.step += 1
        event = {
            "step": self.step,
            "line": line or 1,
            "type": event_type,
            "dsId": ds_id,
            "dsType": ds_type,
            "op": op,
            "val": val,
            "snapshot": snapshot,
            "desc": desc
        }
        sys.stdout.write("\n__CODELENS_EVENT__" + json.dumps(event) + "\n")
        sys.stdout.flush()

_emitter = _TraceEmitter.instance()

class CodeLensQueue:
    def __init__(self, name="q", line=1):
        self._name = name
        self._deque = deque()
        _emitter.emit(line, "init", self._name, "queue", "init", None, [], f"Initialized empty queue {self._name}")

    def append(self, item, line=1):
        self._deque.append(item)
        _emitter.emit(line, "operation", self._name, "queue", "push", item, list(self._deque), f"{self._name}.append({item}) -> front is {self._deque[0]}")

    def push(self, item, line=1):
        self.append(item, line)

    def popleft(self, line=1):
        if not self._deque:
            return None
        val = self._deque.popleft()
        _emitter.emit(line, "operation", self._name, "queue", "pop", val, list(self._deque), f"{self._name}.popleft() removed {val}")
        return val

    def pop(self, line=1):
        return self.popleft(line)

    def front(self):
        return self._deque[0] if self._deque else None

    def __len__(self):
        return len(self._deque)

    def __bool__(self):
        return bool(self._deque)

    def __repr__(self):
        return repr(list(self._deque))

class CodeLensStack:
    def __init__(self, name="s", line=1):
        self._name = name
        self._list = []
        _emitter.emit(line, "init", self._name, "stack", "init", None, [], f"Initialized empty stack {self._name}")

    def push(self, item, line=1):
        self._list.append(item)
        _emitter.emit(line, "operation", self._name, "stack", "push", item, list(self._list), f"{self._name}.push({item}) -> top is {item}")

    def append(self, item, line=1):
        self.push(item, line)

    def pop(self, line=1):
        if not self._list:
            return None
        val = self._list.pop()
        _emitter.emit(line, "operation", self._name, "stack", "pop", val, list(self._list), f"{self._name}.pop() removed {val} from top")
        return val

    def top(self):
        return self._list[-1] if self._list else None

    def peek(self):
        return self.top()

    def __len__(self):
        return len(self._list)

    def __bool__(self):
        return bool(self._list)

    def __repr__(self):
        return repr(self._list)

class CodeLensList(list):
    def __init__(self, items=None, name="nums", line=1):
        super().__init__(items or [])
        self._name = name
        _emitter.emit(line, "init", self._name, "vector", "init", None, list(self), f"Initialized list {self._name} with {len(self)} elements")

    def append(self, item, line=1):
        super().append(item)
        _emitter.emit(line, "operation", self._name, "vector", "push", item, list(self), f"{self._name}.append({item})")

    def pop(self, index=-1, line=1):
        val = super().pop(index)
        _emitter.emit(line, "operation", self._name, "vector", "pop", val, list(self), f"{self._name}.pop() removed {val}")
        return val

    def __setitem__(self, key, value):
        super().__setitem__(key, value)
        _emitter.emit(1, "operation", self._name, "vector", "set", {"index": key, "value": value}, list(self), f"{self._name}[{key}] = {value}")

class CodeLensMap(dict):
    def __init__(self, initial=None, name="m", line=1):
        super().__init__(initial or {})
        self._name = name
        _emitter.emit(line, "init", self._name, "map", "init", None, dict(self), f"Initialized map {self._name}")

    def __setitem__(self, key, value):
        super().__setitem__(key, value)
        _emitter.emit(1, "operation", self._name, "map", "set", {"key": key, "value": value}, dict(self), f"{self._name}[{key}] = {value}")

    def pop(self, key, *args):
        val = super().pop(key, *args)
        _emitter.emit(1, "operation", self._name, "map", "erase", key, dict(self), f"{self._name}.pop({key})")
        return val

class CodeLensTreeNode:
    def __init__(self, val, left=None, right=None, name="tree"):
        self.val = val
        self.left = left
        self.right = right
        self._name = name
        self.emit("init", f"Created node {val}")

    def emit(self, op="update", desc="Tree updated", current=None, visited=None, traversal=None):
        nodes = {}
        def walk(n):
            if not n:
                return None
            nid = f"n_{id(n)}"
            lid = walk(n.left)
            rid = walk(n.right)
            nodes[nid] = {
                "id": nid,
                "val": n.val,
                "leftId": lid,
                "rightId": rid
            }
            return nid
        root_id = walk(self)
        v_ids = [f"n_{id(v)}" for v in (visited or [])]
        curr_id = f"n_{id(current)}" if current else None
        snapshot = {
            "rootId": root_id,
            "nodes": nodes,
            "currentNodeId": curr_id,
            "visitedNodeIds": v_ids,
            "traversalOrder": traversal or []
        }
        _emitter.emit(1, "operation", self._name, "tree", op, self.val, snapshot, desc)

    def insert(self, val):
        if val < self.val:
            if self.left is None:
                self.left = CodeLensTreeNode(val, name=self._name)
            else:
                self.left.insert(val)
        else:
            if self.right is None:
                self.right = CodeLensTreeNode(val, name=self._name)
            else:
                self.right.insert(val)
        self.emit("insert", f"Inserted {val} into tree")

class CodeLensGraph:
    def __init__(self, name="graph", directed=False, weighted=False):
        self._name = name
        self.directed = directed
        self.weighted = weighted
        self.adj = {}
        self.nodes_data = {}
        self.edges = []
        self._edge_counter = 1
        self.emit("init", "Initialized empty graph")

    def add_node(self, u, val=None):
        u_str = str(u)
        if u_str not in self.nodes_data:
            self.nodes_data[u_str] = {"id": u_str, "val": val if val is not None else u, "state": "unvisited"}
            self.adj[u_str] = []
            self.emit("add_node", f"Added node {u_str}")

    def add_edge(self, u, v, weight=1):
        u_str, v_str = str(u), str(v)
        self.add_node(u_str)
        self.add_node(v_str)
        edge_id = f"e_{self._edge_counter}"
        self._edge_counter += 1
        edge = {"id": edge_id, "from": u_str, "to": v_str, "weight": weight, "directed": self.directed, "state": "unvisited"}
        self.edges.append(edge)
        self.adj[u_str].append({"to": v_str, "weight": weight})
        if not self.directed:
            self.adj[v_str].append({"to": u_str, "weight": weight})
        self.emit("add_edge", f"Added edge ({u_str} -> {v_str}, weight={weight})")

    def emit(self, op="update", desc="Graph updated", current=None, visited=None, frontier=None, traversal=None):
        nodes_copy = {}
        for nid, nd in self.nodes_data.items():
            state = "current" if current == nid else ("visited" if visited and nid in visited else ("frontier" if frontier and nid in frontier else "unvisited"))
            nodes_copy[nid] = {**nd, "state": state}
        snapshot = {
            "nodes": nodes_copy,
            "edges": self.edges,
            "isDirected": self.directed,
            "isWeighted": self.weighted,
            "traversalState": {
                "currentNodeId": str(current) if current else None,
                "visitedNodeIds": [str(x) for x in (visited or [])],
                "frontierNodeIds": [str(x) for x in (frontier or [])],
                "traversalOrder": traversal or []
            }
        }
        _emitter.emit(1, "operation", self._name, "graph", op, current, snapshot, desc)

    def bfs(self, start):
        start = str(start)
        visited = []
        frontier = [start]
        queue = [start]
        visited_set = {start}
        self.emit("bfs_start", f"BFS starting from {start}", current=start, visited=visited, frontier=frontier)
        while queue:
            curr = queue.pop(0)
            visited.append(curr)
            frontier = list(queue)
            self.emit("visit", f"BFS visited {curr}", current=curr, visited=visited, frontier=frontier, traversal=visited)
            for neighbor in self.adj.get(curr, []):
                nxt = neighbor["to"]
                if nxt not in visited_set:
                    visited_set.add(nxt)
                    queue.append(nxt)
                    frontier.append(nxt)
                    self.emit("frontier", f"Discovered node {nxt}", current=curr, visited=visited, frontier=frontier, traversal=visited)
        return visited

class CodeLensLinkedList:
    def __init__(self, name="list", doubly=False, circular=False):
        self._name = name
        self.doubly = doubly
        self.circular = circular
        self.items = []
        self.emit("init", "Initialized empty linked list")

    def append(self, val):
        self.items.append(val)
        self.emit("append", f"Appended {val} to linked list")

    def emit(self, op="update", desc="Linked list updated", current=None):
        nodes = {}
        order = []
        prev_id = None
        for idx, val in enumerate(self.items):
            nid = f"node_{idx + 1}"
            order.append(nid)
            nodes[nid] = {"id": nid, "val": val, "nextId": None, "prevId": prev_id if self.doubly else None}
            if prev_id and prev_id in nodes:
                nodes[prev_id]["nextId"] = nid
            prev_id = nid
        if self.circular and order:
            nodes[order[-1]]["nextId"] = order[0]
            if self.doubly:
                nodes[order[0]]["prevId"] = order[-1]
        snapshot = {
            "headId": order[0] if order else None,
            "tailId": order[-1] if order else None,
            "nodes": nodes,
            "order": order,
            "isDoubly": self.doubly,
            "isCircular": self.circular
        }
        _emitter.emit(1, "operation", self._name, "linked_list", op, val, snapshot, desc)

class CodeLensHeap:
    def __init__(self, name="heap", heap_type="min"):
        import heapq
        self._name = name
        self.heap_type = heap_type
        self.elements = []
        self.emit("init", f"Initialized {heap_type}-heap")

    def push(self, val):
        import heapq
        if self.heap_type == "min":
            heapq.heappush(self.elements, val)
        else:
            heapq.heappush(self.elements, -val)
        self.emit("push", f"Pushed {val} into heap", active=val)

    def pop(self):
        import heapq
        if not self.elements:
            return None
        raw = heapq.heappop(self.elements)
        val = raw if self.heap_type == "min" else -raw
        self.emit("pop", f"Popped {val} from heap", active=val)
        return val

    def emit(self, op="update", desc="Heap updated", active=None):
        display_elems = [x if self.heap_type == "min" else -x for x in self.elements]
        snapshot = {
            "heapType": self.heap_type,
            "elements": display_elems,
            "size": len(display_elems)
        }
        _emitter.emit(1, "operation", self._name, "heap", op, active, snapshot, desc)

# Register 'codelens' in sys.modules so 'import codelens' and 'from codelens import ...' work natively
sys.modules['codelens'] = sys.modules[__name__]
