/**
 * CodeLens State Reconstruction Engine & Trace Normalizer
 *
 * Implements deterministic event normalization, wire protocol parsing,
 * and state reconstruction across forward/backward scrubber navigation.
 */

export const TRACE_EVENT_PREFIX = '__CODELENS_EVENT__';
export const TRACE_START_MARKER = '__CODELENS_TRACE_START__';
export const TRACE_END_MARKER = '__CODELENS_TRACE_END__';

/**
 * Extracts line-prefixed or delimited trace events from program standard output.
 * Strips trace telemetry so user-facing stdout remains pristine and preserves
 * any user print statements interleaved with container operations.
 *
 * @param {string} stdout - Raw standard output string from runtime
 * @returns {{ cleanStdout: string, traceEvents: any[], hasTrace: boolean }}
 */
export function extractTraceFromOutput(stdout) {
  if (typeof stdout !== 'string') {
    return { cleanStdout: '', traceEvents: [], hasTrace: false };
  }

  const lines = stdout.split('\n');
  const cleanLines = [];
  const traceEvents = [];
  let inDelimitedBlock = false;

  for (const rawLine of lines) {
    const trimmed = rawLine.trim();

    if (trimmed.startsWith(TRACE_START_MARKER)) {
      inDelimitedBlock = true;
      continue;
    }
    if (trimmed.startsWith(TRACE_END_MARKER)) {
      inDelimitedBlock = false;
      continue;
    }

    if (trimmed.startsWith(TRACE_EVENT_PREFIX)) {
      const jsonStr = trimmed.slice(TRACE_EVENT_PREFIX.length).trim();
      try {
        const parsed = JSON.parse(jsonStr);
        traceEvents.push(parsed);
      } catch {
        // Ignore unparseable trace line
      }
    } else if (inDelimitedBlock) {
      try {
        const parsed = JSON.parse(trimmed);
        traceEvents.push(parsed);
      } catch {
        // If inside legacy delimited block but not JSON, preserve or ignore
      }
    } else {
      cleanLines.push(rawLine);
    }
  }

  const cleanStdout = cleanLines.join('\n').replace(/^\n+|\n+$/g, '');

  return {
    cleanStdout,
    traceEvents,
    hasTrace: traceEvents.length > 0
  };
}

/**
 * Normalizes wire trace events or legacy generator steps into the canonical CodeLens schema.
 *
 * @param {any[]} events - Array of raw trace events
 * @param {object} meta - Context metadata ({ executionId, language, totalLines })
 * @returns {object} Canonical trace container
 */
export function normalizeTraceEvents(events = [], meta = {}) {
  const executionId = meta.executionId || `exec-${Date.now()}`;
  const language = meta.language || 'javascript';
  const totalLines = meta.totalLines || 1;

  if (!Array.isArray(events) || events.length === 0) {
    return {
      executionId,
      language,
      algorithm: meta.algorithm || `${language.toUpperCase()} Execution`,
      success: true,
      steps: [
        {
          executionId,
          language,
          step: 1,
          eventType: 'end',
          sourceLine: 1,
          statement: '// Execution completed (no instrumented data structure events)',
          functionName: 'main',
          callStack: ['main()'],
          variables: {},
          description: 'Program execution completed.',
          status: 'ok'
        }
      ],
      totalSteps: 1,
      lines: totalLines,
      output: meta.output || '',
      stats: {
        timeComplexity: 'N/A',
        spaceComplexity: 'N/A'
      }
    };
  }

  const normalizedSteps = events.map((ev, idx) => {
    const stepNum = idx + 1;
    const dsType = ev.dsType || ev.dataStructureType || (ev.variables?.arr ? 'vector' : undefined);
    const dsId = ev.dsId || ev.dataStructureId || (dsType ? (ev.name || 'ds_1') : undefined);
    const op = ev.op || ev.operation;
    const val = ev.val !== undefined ? ev.val : ev.value;
    const snapshot = ev.snapshot !== undefined ? ev.snapshot : (ev.stateSnapshot !== undefined ? ev.stateSnapshot : (ev.variables?.arr ? [...ev.variables.arr] : undefined));

    const variables = { ...(ev.variables || {}) };
    if (dsId && snapshot !== undefined && !variables[dsId]) {
      variables[dsId] = snapshot;
    }

    return {
      executionId,
      language,
      step: stepNum,
      eventType: ev.type || ev.eventType || (op ? 'operation' : 'assign'),
      sourceLine: Number(ev.line || ev.sourceLine || 1),
      sourceColumn: ev.col || ev.sourceColumn || 1,
      statement: ev.statement || (op ? `${dsId}.${op}(${val !== undefined ? JSON.stringify(val) : ''});` : `Line ${ev.line || 1}`),
      functionName: ev.functionName || ev.fn || 'main',
      callStack: Array.isArray(ev.callStack) ? ev.callStack : ['main()'],
      dataStructureId: dsId,
      dataStructureType: dsType,
      operation: op,
      value: val,
      stateSnapshot: snapshot !== undefined ? JSON.parse(JSON.stringify(snapshot)) : undefined,
      variables,
      description: ev.desc || ev.description || (op ? `Executed ${op} on ${dsId}` : `Step ${stepNum}`),
      elapsedMs: ev.elapsedMs || ev.time || 0,
      status: ev.status || 'ok'
    };
  });

  return {
    executionId,
    language,
    algorithm: meta.algorithm || (normalizedSteps[0]?.dataStructureType ? `${normalizedSteps[0].dataStructureType.toUpperCase()} Trace` : `${language.toUpperCase()} Program`),
    success: true,
    steps: normalizedSteps,
    totalSteps: normalizedSteps.length,
    lines: totalLines,
    output: meta.output || '',
    stats: meta.stats || {
      timeComplexity: 'O(n)',
      spaceComplexity: 'O(n)'
    }
  };
}

/**
 * Deterministically reconstructs the state of all data structures and variables at targetStepIndex.
 *
 * @param {object} trace - Canonical trace object containing `steps`
 * @param {number} targetStepIndex - 0-indexed step number
 * @returns {object} Reconstructed state
 */
export function reconstructStateAtStep(trace, targetStepIndex = 0) {
  if (!trace || !Array.isArray(trace.steps) || trace.steps.length === 0) {
    return {
      currentStep: null,
      activeLine: null,
      dataStructures: {},
      variables: {},
      callStack: [],
      stepIndex: 0,
      totalSteps: 0,
      history: []
    };
  }

  const boundedIndex = Math.max(0, Math.min(targetStepIndex, trace.steps.length - 1));
  const currentStep = trace.steps[boundedIndex];
  const activeLine = currentStep.sourceLine || 1;
  const callStack = currentStep.callStack || ['main()'];

  // Accumulate data structures and variables sequentially up to target step
  const dataStructures = {};
  const variables = {};

  for (let i = 0; i <= boundedIndex; i++) {
    const s = trace.steps[i];
    
    // Merge scalar variables
    if (s.variables) {
      Object.assign(variables, s.variables);
    }

    // Update data structure registry
    let dsId = s.dataStructureId || s.dsId;
    const dsType = s.dataStructureType || s.dsType;
    if (dsId && dsType) {
      // Canonicalize tree ID so root and tree don't create two split tree instances
      if (dsType === 'tree' && (dsId === 'root' || dsId === 'tree_1')) {
        dsId = 'tree';
      }

      let rawSnapshot = s.stateSnapshot !== undefined ? s.stateSnapshot : s.snapshot;
      if (typeof rawSnapshot === 'string') {
        try {
          rawSnapshot = JSON.parse(rawSnapshot);
        } catch {}
      }

      // If another tree entry already tracks this exact root, merge/delete obsolete alias
      if (dsType === 'tree') {
        const thisRootId = rawSnapshot?.rootId || rawSnapshot?.root;
        if (thisRootId) {
          const obsoleteKey = Object.keys(dataStructures).find(k => {
            if (k === dsId) return false;
            const other = dataStructures[k];
            if (other.type !== 'tree') return false;
            const otherRootId = other.snapshot?.rootId || other.snapshot?.root;
            return otherRootId && String(otherRootId) === String(thisRootId);
          });
          if (obsoleteKey) {
            delete dataStructures[obsoleteKey];
          }
        }
      }

      const existing = dataStructures[dsId] || {
        id: dsId,
        type: dsType,
        snapshot: rawSnapshot !== undefined ? rawSnapshot : (dsType === 'map' ? {} : []),
        operationsCount: 0,
        lastOp: null,
        lastValue: undefined,
        history: []
      };

      existing.type = dsType;
      if (rawSnapshot !== undefined) {
        existing.snapshot = JSON.parse(JSON.stringify(rawSnapshot));
      }

      const op = s.operation || s.op;
      const val = s.value !== undefined ? s.value : s.val;

      // Specialized post-processing for complex data structure models
      if (dsType === 'tree') {
        existing.treeModel = normalizeTreeModel(existing.snapshot, val, op);
      } else if (dsType === 'graph') {
        existing.graphModel = normalizeGraphModel(existing.snapshot, val, op);
      } else if (dsType === 'linked_list') {
        existing.linkedListModel = normalizeLinkedListModel(existing.snapshot, val, op);
      } else if (dsType === 'heap') {
        existing.heapModel = normalizeHeapModel(existing.snapshot, val, op);
      }

      if (op) {
        existing.operationsCount++;
        existing.lastOp = op;
        existing.lastValue = val;
        existing.history.push({
          step: s.step || (i + 1),
          op: op,
          val: val,
          desc: s.description
        });
      }
      dataStructures[dsId] = existing;
    }
  }

  return {
    currentStep,
    activeLine,
    dataStructures,
    variables,
    callStack,
    stepIndex: boundedIndex,
    totalSteps: trace.steps.length
  };
}

/**
 * Normalizes tree snapshots (flat node dictionaries, node arrays, or nested objects) into a stable hierarchical model.
 */
export function normalizeTreeModel(snapshot, activeValue, lastOp) {
  if (!snapshot || typeof snapshot !== 'object') {
    return { rootId: null, nodes: {}, currentNodeId: null, visitedNodeIds: [], traversalOrder: [], maxDepth: 0, nodeCount: 0 };
  }

  const nodes = {};
  let rootId = snapshot.root || snapshot.rootId || null;
  const rawNodes = snapshot.nodes;

  if (Array.isArray(rawNodes)) {
    // Array of nodes: [{ id, val, left, right }]
    rawNodes.forEach(n => {
      if (n && n.id !== undefined) {
        const idStr = String(n.id);
        nodes[idStr] = {
          id: idStr,
          val: n.val !== undefined ? n.val : n.data,
          leftId: n.left ? String(n.left) : (n.leftId ? String(n.leftId) : null),
          rightId: n.right ? String(n.right) : (n.rightId ? String(n.rightId) : null),
          isRoot: idStr === String(rootId)
        };
      }
    });
    if (!rootId && rawNodes.length > 0) {
      rootId = String(rawNodes[0].id);
    }
  } else if (rawNodes && typeof rawNodes === 'object') {
    // Dictionary of nodes: { [id]: { id, val, leftId, rightId } }
    Object.entries(rawNodes).forEach(([id, n]) => {
      const idStr = String(n.id || id);
      nodes[idStr] = {
        id: idStr,
        val: n.val !== undefined ? n.val : n.data,
        leftId: n.left ? String(n.left) : (n.leftId ? String(n.leftId) : null),
        rightId: n.right ? String(n.right) : (n.rightId ? String(n.rightId) : null),
        isRoot: idStr === String(rootId)
      };
    });
  } else if (snapshot.val !== undefined || snapshot.data !== undefined) {
    // Nested node
    let counter = 1;
    function walk(node, isRoot = false) {
      if (!node || typeof node !== 'object') return null;
      const id = String(node.id || `node_${counter++}`);
      if (isRoot) rootId = id;
      const leftId = node.left ? walk(node.left, false) : null;
      const rightId = node.right ? walk(node.right, false) : null;
      nodes[id] = {
        id,
        val: node.val !== undefined ? node.val : (node.data !== undefined ? node.data : node.value),
        leftId,
        rightId,
        isRoot
      };
      return id;
    }
    walk(snapshot, true);
  }

  let maxDepth = 0;
  const calculateDepth = (nodeId, depth = 1) => {
    if (!nodeId || !nodes[nodeId]) return;
    if (depth > maxDepth) maxDepth = depth;
    calculateDepth(nodes[nodeId].leftId, depth + 1);
    calculateDepth(nodes[nodeId].rightId, depth + 1);
  };
  if (rootId) calculateDepth(rootId, 1);

  const currentNodeId = snapshot.currentNode ? String(snapshot.currentNode) : (snapshot.currentNodeId ? String(snapshot.currentNodeId) : (typeof activeValue === 'string' ? activeValue : null));
  const visitedNodeIds = (snapshot.visited || snapshot.visitedNodeIds || []).map(v => String(v));
  const traversalOrder = (snapshot.traversalOrder || []).map(v => String(v));

  return {
    rootId: rootId ? String(rootId) : null,
    nodes,
    currentNodeId,
    visitedNodeIds,
    traversalOrder,
    maxDepth: Math.max(1, maxDepth),
    nodeCount: Object.keys(nodes).length
  };
}

/**
 * Normalizes graph snapshots (adjacency lists, edge lists, or node sets) into a canonical graph model.
 */
export function normalizeGraphModel(snapshot, activeValue, lastOp) {
  if (!snapshot || typeof snapshot !== 'object') {
    return { nodes: {}, edges: [], isDirected: false, isWeighted: false, matrix: {}, adjacencyList: {}, traversalState: {} };
  }

  const nodes = {};
  const edges = [];
  const isDirected = Boolean(snapshot.isDirected !== undefined ? snapshot.isDirected : true);
  let isWeighted = Boolean(snapshot.isWeighted);

  if (Array.isArray(snapshot.nodes)) {
    snapshot.nodes.forEach(n => {
      const nid = String(typeof n === 'object' ? n.id : n);
      const val = typeof n === 'object' ? (n.val !== undefined ? n.val : n.id) : n;
      nodes[nid] = { id: nid, val };
    });
  } else if (snapshot.nodes && typeof snapshot.nodes === 'object') {
    Object.entries(snapshot.nodes).forEach(([nid, n]) => {
      const idStr = String(nid);
      nodes[idStr] = { id: idStr, val: typeof n === 'object' ? (n.val !== undefined ? n.val : nid) : n };
    });
  }

  if (Array.isArray(snapshot.edges)) {
    snapshot.edges.forEach((e, idx) => {
      const w = e.weight !== undefined ? Number(e.weight) : 1;
      if (w !== 1) isWeighted = true;
      const fromStr = String(e.from);
      const toStr = String(e.to);
      edges.push({
        id: e.id || `e_${idx + 1}`,
        from: fromStr,
        to: toStr,
        weight: w,
        directed: e.directed !== undefined ? e.directed : isDirected
      });
      if (!nodes[fromStr]) nodes[fromStr] = { id: fromStr, val: fromStr };
      if (!nodes[toStr]) nodes[toStr] = { id: toStr, val: toStr };
    });
  } else if (snapshot.adjacencyList) {
    let edgeIdx = 1;
    Object.entries(snapshot.adjacencyList).forEach(([u, targets]) => {
      const uStr = String(u);
      if (!nodes[uStr]) nodes[uStr] = { id: uStr, val: uStr };
      if (Array.isArray(targets)) {
        targets.forEach(tgt => {
          const vStr = String(typeof tgt === 'object' ? (tgt.node || tgt.to) : tgt);
          const w = typeof tgt === 'object' && tgt.weight !== undefined ? Number(tgt.weight) : 1;
          if (w !== 1) isWeighted = true;
          if (!nodes[vStr]) nodes[vStr] = { id: vStr, val: vStr };
          edges.push({ id: `e_${edgeIdx++}`, from: uStr, to: vStr, weight: w, directed: isDirected });
        });
      }
    });
  }

  // Construct adjacency matrix & adjacency list for dual-view table display
  const nodeList = Object.values(nodes);
  const matrix = {};
  const adjList = {};
  nodeList.forEach(u => {
    matrix[u.id] = {};
    adjList[u.id] = [];
    nodeList.forEach(v => {
      matrix[u.id][v.id] = u.id === v.id ? 0 : null;
    });
  });

  edges.forEach(e => {
    if (matrix[e.from]) matrix[e.from][e.to] = e.weight;
    if (!e.directed && matrix[e.to]) matrix[e.to][e.from] = e.weight;
    if (adjList[e.from]) adjList[e.from].push({ target: e.to, weight: e.weight });
    if (!e.directed && adjList[e.to]) adjList[e.to].push({ target: e.from, weight: e.weight });
  });

  const currentNodeId = snapshot.currentNode ? String(snapshot.currentNode) : (snapshot.currentNodeId ? String(snapshot.currentNodeId) : (snapshot.traversalState?.currentNodeId ? String(snapshot.traversalState.currentNodeId) : (typeof activeValue === 'string' ? activeValue : null)));
  const visitedNodeIds = (snapshot.visited || snapshot.visitedNodeIds || snapshot.traversalState?.visitedNodeIds || []).map(v => String(v));
  const traversalOrder = (snapshot.traversalOrder || snapshot.traversalState?.traversalOrder || []).map(v => String(v));

  return {
    nodes,
    edges,
    isDirected,
    isWeighted,
    matrix,
    adjacencyList: adjList,
    traversalState: {
      currentNodeId,
      visitedNodeIds,
      traversalOrder
    }
  };
}

/**
 * Normalizes linked list snapshots into a sequential node chain with next/prev pointers.
 */
export function normalizeLinkedListModel(snapshot, activeValue, lastOp) {
  if (!snapshot) {
    return { headId: null, tailId: null, nodes: {}, order: [], isDoubly: false, isCircular: false };
  }

  const nodes = {};
  const order = [];
  let isDoubly = snapshot.listType === 'doubly';
  let isCircular = Boolean(snapshot.isCircular);
  let headId = snapshot.head || snapshot.headId || null;

  if (Array.isArray(snapshot.nodes)) {
    snapshot.nodes.forEach(n => {
      if (n && n.id !== undefined) {
        const idStr = String(n.id);
        order.push(idStr);
        nodes[idStr] = {
          id: idStr,
          val: n.val,
          nextId: n.next ? String(n.next) : (n.nextId ? String(n.nextId) : null),
          prevId: n.prev ? String(n.prev) : (n.prevId ? String(n.prevId) : null)
        };
        if (n.prev) isDoubly = true;
      }
    });
  } else if (Array.isArray(snapshot)) {
    let prevId = null;
    snapshot.forEach((val, idx) => {
      const id = `node_${idx + 1}`;
      order.push(id);
      nodes[id] = { id, val, nextId: null, prevId };
      if (prevId && nodes[prevId]) nodes[prevId].nextId = id;
      prevId = id;
    });
  }

  if (!headId && order.length > 0) headId = order[0];
  const tailId = order.length > 0 ? order[order.length - 1] : null;

  // Check circular
  if (tailId && nodes[tailId]?.nextId === headId) {
    isCircular = true;
  }

  return {
    headId: headId ? String(headId) : null,
    tailId: tailId ? String(tailId) : null,
    nodes,
    order,
    isDoubly,
    isCircular
  };
}

/**
 * Normalizes heap / priority queue representations into binary heap trees and indexed arrays.
 */
export function normalizeHeapModel(snapshot, activeValue, lastOp) {
  const elements = Array.isArray(snapshot) ? snapshot : (snapshot?.nodes || snapshot?.elements || []);
  const heapType = snapshot?.heapType || 'min';

  let isHeapPropertySatisfied = true;
  for (let i = 0; i < elements.length; i++) {
    const leftChild = 2 * i + 1;
    const rightChild = 2 * i + 2;
    if (heapType === 'min') {
      if (leftChild < elements.length && elements[i] > elements[leftChild]) isHeapPropertySatisfied = false;
      if (rightChild < elements.length && elements[i] > elements[rightChild]) isHeapPropertySatisfied = false;
    } else {
      if (leftChild < elements.length && elements[i] < elements[leftChild]) isHeapPropertySatisfied = false;
      if (rightChild < elements.length && elements[i] < elements[rightChild]) isHeapPropertySatisfied = false;
    }
  }

  return {
    heapType,
    elements,
    size: elements.length,
    isHeapPropertySatisfied,
    rootValue: elements.length > 0 ? elements[0] : null,
    lastOp: lastOp || null,
    activeValue: activeValue !== undefined ? activeValue : null
  };
}

/**
 * Creates an empty trace placeholder when resetting or switching uninstrumented languages.
 */
export function createEmptyTrace(language = 'javascript', message = 'No active trace.') {
  return {
    executionId: `empty-${Date.now()}`,
    language,
    algorithm: `${language.toUpperCase()} Workspace`,
    success: true,
    hasExecuted: false,
    isUnexecuted: true,
    steps: [],
    totalSteps: 0,
    lines: 1,
    output: '',
    stats: { timeComplexity: 'N/A', spaceComplexity: 'N/A' },
    message
  };
}
