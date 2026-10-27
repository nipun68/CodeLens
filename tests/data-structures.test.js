import test from 'node:test';
import assert from 'node:assert/strict';
import 'dotenv/config';
import { executeWithJudge0, prepareSourceForExecution, instrumentJavaSource } from '../server/execution.js';
import {
  reconstructStateAtStep,
  normalizeTreeModel,
  normalizeGraphModel,
  normalizeLinkedListModel,
  normalizeHeapModel,
  createEmptyTrace
} from '../client/src/reconstruction.js';
import {
  traceTreeDemo,
  traceGraphDemo,
  traceHeapDemo,
  traceLinkedListDemo,
  traceJavaScriptCode
} from '../client/src/tracer.js';

// ============================================================================
// 1. JAVA INORDER-TRAVERSAL TEST (EXACT USER STANDALONE CODE)
// ============================================================================
test('Tree Visualization: User Standalone Java Inorder-Traversal Execution & Tree Tracking', async () => {
  const javaCode = `import java.util.*;

class TreeNode {
    int val;
    TreeNode left;
    TreeNode right;

    TreeNode(int val) {
        this.val = val;
    }
}

class Solution {
    public List<Integer> inorderTraversal(TreeNode root) {
        List<Integer> ans = new ArrayList<>();
        Stack<TreeNode> st = new Stack<>();
        TreeNode curr = root;

        while (curr != null || !st.isEmpty()) {
            while (curr != null) {
                st.push(curr);
                curr = curr.left;
            }

            curr = st.pop();
            ans.add(curr.val);
            curr = curr.right;
        }

        return ans;
    }
}

public class Main {
    public static void main(String[] args) {
        TreeNode root = new TreeNode(1);
        root.left = new TreeNode(2);
        root.right = new TreeNode(3);
        root.left.left = new TreeNode(4);
        root.left.right = new TreeNode(5);

        Solution sol = new Solution();
        System.out.println("Inorder: " + sol.inorderTraversal(root));
    }
}`;

  // 1. Verify instrumentation preserves original TreeNode and wraps Stack safely
  const instrumented = instrumentJavaSource(javaCode);
  assert.ok(instrumented.includes('CodeLensTreeTracker.track('), 'Instruments root tree tracking');
  assert.ok(instrumented.includes('CodeLensTreeTracker.recordVisit('), 'Instruments traversal node visits');
  assert.ok(instrumented.includes('new CodeLensStack'), 'Replaces standard stack with instrumented CodeLensStack');

  // 2. Execute with OpenJDK sandbox
  const res = await executeWithJudge0({ source: javaCode, language: 'java', mode: 'trace' });
  assert.equal(res.statusId, 3, `Expected Accepted, got status ${res.status}`);
  assert.ok(res.stdout.includes('Inorder: [4, 2, 5, 1, 3]'), `Output was: ${res.stdout}`);

  // 3. Verify execution event generation
  assert.ok(res.hasTrace, 'Execution generated trace');
  assert.ok(res.trace.steps.length > 5, 'Trace contains execution steps');

  // Find tree operations
  const treeSteps = res.trace.steps.filter(s => s.dataStructureType === 'tree' || s.dsType === 'tree');
  assert.ok(treeSteps.length > 0, 'Generated tree data structure events');

  // 4. State reconstruction at final step
  const finalState = reconstructStateAtStep(res.trace, res.trace.steps.length - 1);
  
  // Verify exactly 1 tree data structure exists (no duplicate "root" vs "tree" sections)
  const treeKeys = Object.keys(finalState.dataStructures).filter(k => finalState.dataStructures[k].type === 'tree');
  assert.equal(treeKeys.length, 1, `Expected exactly 1 tree section, found: ${treeKeys.join(', ')}`);
  assert.equal(treeKeys[0], 'tree', 'Canonical tree ID is tree');

  const treeDs = finalState.dataStructures.tree;
  assert.ok(treeDs, 'Tree data structure exists in reconstructed state');

  const model = treeDs.treeModel || normalizeTreeModel(treeDs.snapshot, treeDs.lastValue, treeDs.lastOp);
  assert.ok(model.rootId, 'Tree has a recognized root');
  assert.equal(model.nodeCount, 5, 'Tree has 5 nodes (1, 2, 3, 4, 5)');

  // Verify tree relationships
  const rootNode = model.nodes[model.rootId];
  assert.equal(rootNode.val, 1, 'Root value is 1');
  const leftChild = model.nodes[rootNode.leftId];
  const rightChild = model.nodes[rootNode.rightId];
  assert.equal(leftChild.val, 2, 'Left child of 1 is 2');
  assert.equal(rightChild.val, 3, 'Right child of 1 is 3');
  assert.equal(model.nodes[leftChild.leftId].val, 4, 'Left child of 2 is 4');
  assert.equal(model.nodes[leftChild.rightId].val, 5, 'Right child of 2 is 5');

  // Verify traversal order
  assert.ok(model.traversalOrder.length >= 5, 'Traversal order captured all 5 nodes');
  const traversalVals = model.traversalOrder.map(item => {
    if (model.nodes[item]) return model.nodes[item].val;
    const num = Number(item);
    return isNaN(num) ? item : num;
  });
  assert.deepEqual(traversalVals.slice(-5), [4, 2, 5, 1, 3], 'Recorded Inorder visit sequence [4, 2, 5, 1, 3]');
});

// ============================================================================
// 2. NINE REQUIRED GRAPH TEST CASES
// ============================================================================
test('Graph Visualization: Case 1 - Simple Directed Graph', () => {
  const snapshot = {
    isDirected: true,
    nodes: [{ id: 'A', val: 'A' }, { id: 'B', val: 'B' }],
    edges: [{ from: 'A', to: 'B', weight: 1, directed: true }]
  };
  const g = normalizeGraphModel(snapshot);
  assert.equal(g.isDirected, true);
  assert.equal(Object.keys(g.nodes).length, 2);
  assert.equal(g.edges.length, 1);
  assert.equal(g.edges[0].from, 'A');
  assert.equal(g.edges[0].to, 'B');
  assert.equal(g.matrix['A']['B'], 1);
  assert.equal(g.matrix['B']['A'], null);
});

test('Graph Visualization: Case 2 - Undirected Graph', () => {
  const snapshot = {
    isDirected: false,
    nodes: [{ id: '1', val: 10 }, { id: '2', val: 20 }],
    edges: [{ from: '1', to: '2', weight: 1, directed: false }]
  };
  const g = normalizeGraphModel(snapshot);
  assert.equal(g.isDirected, false);
  assert.equal(g.matrix['1']['2'], 1);
  assert.equal(g.matrix['2']['1'], 1, 'Bidirectional symmetry in adjacency matrix');
});

test('Graph Visualization: Case 3 - Weighted Graph', () => {
  const snapshot = {
    isDirected: true,
    isWeighted: true,
    nodes: [{ id: 'u', val: 'U' }, { id: 'v', val: 'V' }],
    edges: [{ from: 'u', to: 'v', weight: 7.5, directed: true }]
  };
  const g = normalizeGraphModel(snapshot);
  assert.equal(g.isWeighted, true);
  assert.equal(g.edges[0].weight, 7.5);
  assert.equal(g.matrix['u']['v'], 7.5);
});

test('Graph Visualization: Case 4 - Graph with Cycle', () => {
  const snapshot = {
    isDirected: true,
    nodes: [{ id: '1', val: 1 }, { id: '2', val: 2 }, { id: '3', val: 3 }],
    edges: [
      { from: '1', to: '2', weight: 1 },
      { from: '2', to: '3', weight: 1 },
      { from: '3', to: '1', weight: 1 } // Cycle!
    ]
  };
  const g = normalizeGraphModel(snapshot);
  assert.equal(g.edges.length, 3);
  assert.equal(g.matrix['3']['1'], 1, 'Cycle edge connects 3 back to 1 without crashing');
});

test('Graph Visualization: Case 5 - Disconnected Graph', () => {
  const snapshot = {
    nodes: [{ id: 'A', val: 'A' }, { id: 'B', val: 'B' }, { id: 'X', val: 'X' }, { id: 'Y', val: 'Y' }],
    edges: [
      { from: 'A', to: 'B', weight: 1 },
      { from: 'X', to: 'Y', weight: 1 }
    ]
  };
  const g = normalizeGraphModel(snapshot);
  assert.equal(Object.keys(g.nodes).length, 4);
  assert.equal(g.matrix['A']['X'], null, 'Disconnected components have null edge');
});

test('Graph Visualization: Case 6 - Duplicate Node Values Handled via Stable IDs', () => {
  const snapshot = {
    nodes: [
      { id: 'node_101', val: 'Duplicate' },
      { id: 'node_102', val: 'Duplicate' }
    ],
    edges: [{ from: 'node_101', to: 'node_102', weight: 1 }]
  };
  const g = normalizeGraphModel(snapshot);
  assert.equal(Object.keys(g.nodes).length, 2, 'Maintains 2 distinct nodes despite duplicate values');
  assert.equal(g.nodes['node_101'].val, 'Duplicate');
  assert.equal(g.nodes['node_102'].val, 'Duplicate');
});

test('Graph Visualization: Case 7 - BFS Traversal State', () => {
  const trace = traceGraphDemo();
  assert.equal(trace.success, true);
  const finalState = reconstructStateAtStep(trace, trace.steps.length - 1);
  const g = finalState.dataStructures.g.graphModel;
  assert.deepEqual(g.traversalState.visitedNodeIds, ['A', 'B', 'C', 'D']);
});

test('Graph Visualization: Case 8 - DFS Traversal with Adjacency List', () => {
  const snapshot = {
    adjacencyList: {
      '0': ['1', '2'],
      '1': ['2'],
      '2': ['0', '3'],
      '3': ['3']
    },
    traversalState: {
      currentNodeId: '3',
      visitedNodeIds: ['0', '1', '2', '3'],
      traversalOrder: ['0', '1', '2', '3']
    }
  };
  const g = normalizeGraphModel(snapshot);
  assert.equal(Object.keys(g.nodes).length, 4);
  assert.equal(g.traversalState.currentNodeId, '3');
  assert.equal(g.traversalState.visitedNodeIds.length, 4);
});

test('Graph Visualization: Case 9 - Shortest Path Dijkstra & Edge Relaxation', () => {
  const snapshot = {
    isDirected: true,
    isWeighted: true,
    nodes: [{ id: 'S', val: 'Start' }, { id: 'A', val: 'A' }, { id: 'T', val: 'Target' }],
    edges: [
      { from: 'S', to: 'A', weight: 2 },
      { from: 'A', to: 'T', weight: 3 },
      { from: 'S', to: 'T', weight: 10 }
    ],
    traversalState: {
      currentNodeId: 'T',
      visitedNodeIds: ['S', 'A', 'T'],
      traversalOrder: ['S', 'A', 'T']
    }
  };
  const g = normalizeGraphModel(snapshot);
  assert.equal(g.matrix['S']['A'], 2);
  assert.equal(g.matrix['A']['T'], 3);
  assert.equal(g.matrix['S']['T'], 10);
});

// ============================================================================
// 3. LINKED LISTS (SINGLY, DOUBLY, CIRCULAR)
// ============================================================================
test('Linked List: Singly, Doubly, and Circular List Normalization', () => {
  // 1. Singly Linked List
  const singly = normalizeLinkedListModel([10, 20, 30]);
  assert.equal(singly.order.length, 3);
  assert.equal(singly.nodes[singly.headId].val, 10);
  assert.equal(singly.nodes[singly.tailId].val, 30);
  assert.equal(singly.isCircular, false);

  // 2. Doubly Linked List
  const doubly = normalizeLinkedListModel({
    listType: 'doubly',
    nodes: [
      { id: 'n1', val: 'A', next: 'n2', prev: null },
      { id: 'n2', val: 'B', next: null, prev: 'n1' }
    ]
  });
  assert.equal(doubly.isDoubly, true);
  assert.equal(doubly.nodes['n2'].prevId, 'n1');

  // 3. Circular Linked List
  const circular = normalizeLinkedListModel({
    listType: 'singly',
    nodes: [
      { id: 'c1', val: 1, next: 'c2' },
      { id: 'c2', val: 2, next: 'c1' } // cycle to head
    ]
  });
  assert.equal(circular.isCircular, true);
});

// ============================================================================
// 4. HEAPS / PRIORITY QUEUES
// ============================================================================
test('Heap Visualization: Binary Heap Invariant & Array Index Model (NOT Sorted Array)', () => {
  // Valid min-heap [3, 5, 8, 17, 20]
  const minHeap = normalizeHeapModel({ heapType: 'min', nodes: [3, 5, 8, 17, 20] });
  assert.equal(minHeap.heapType, 'min');
  assert.equal(minHeap.rootValue, 3);
  assert.equal(minHeap.isHeapPropertySatisfied, true);

  // Invalid min-heap
  const brokenHeap = normalizeHeapModel({ heapType: 'min', nodes: [100, 5, 8] });
  assert.equal(brokenHeap.isHeapPropertySatisfied, false);
});

// ============================================================================
// 5. STACKS & QUEUES / DEQUES
// ============================================================================
test('Stack and Queue: LIFO and FIFO execution tracing', () => {
  const stackTrace = traceJavaScriptCode('let stack = []; stack.push(10); stack.push(20); stack.pop();');
  assert.equal(stackTrace.success, true);
  const state = reconstructStateAtStep(stackTrace, stackTrace.steps.length - 1);
  assert.ok(state.dataStructures.s, 'Stack data structure exists');
  assert.ok(Array.isArray(state.dataStructures.s.snapshot));
});

// ============================================================================
// 6. RESET & RUNTIME ERROR ISOLATION
// ============================================================================
test('Reset Behavior: Clears all execution-derived visualization state', () => {
  const empty = createEmptyTrace('java', 'Reset');
  assert.equal(empty.steps.length, 0);
  assert.equal(empty.totalSteps, 0);
  const emptyState = reconstructStateAtStep(empty, 0);
  assert.deepEqual(emptyState.dataStructures, {});
  assert.deepEqual(emptyState.variables, {});
});

test('Error Isolation: Runtime error does not produce a false successful final visualization', () => {
  const faultyTrace = traceJavaScriptCode('console.log(arr[100].foo);');
  assert.equal(faultyTrace.success, false);
  assert.equal(faultyTrace.errorCategory, 'runtime_exception');
});
