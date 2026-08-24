const DataStructuresVisualizer = (() => {
  // Data Structure States
  const state = {
    array: [10, 25, 40, 75],
    stack: [5, 12, 28],
    queue: [15, 30, 45],
    list: [10, 20, 30],
    maxCapacity: 10
  };

  let initialized = false;

  function init() {
    renderAll();
    if (initialized) return;
    initialized = true;
    bindEvents();
  }

  function renderAll() {
    renderArray();
    renderStack();
    renderQueue();
    renderList();
  }

  // --- ARRAY ---
  function renderArray(highlightIndex = null, highlightClass = 'highlight') {
    const el = document.getElementById('dsArrayViz');
    if (!el) return;

    if (!state.array.length) {
      el.innerHTML = '<p class="muted" style="font-size:0.8rem;text-align:center;width:100%">Array is empty. Use controls above to insert elements.</p>';
      return;
    }

    el.innerHTML = state.array.map((val, idx) => {
      const isHl = idx === highlightIndex ? ` ${highlightClass}` : '';
      return `
        <div class="ds-cell${isHl}" data-idx="${idx}" title="Click to remove index ${idx}">
          <span class="ds-val">${escapeHtml(String(val))}</span>
          <span class="ds-idx">[${idx}]</span>
        </div>
      `;
    }).join('');

    // Add click listeners to remove item on cell click
    el.querySelectorAll('.ds-cell').forEach(cell => {
      cell.onclick = () => {
        const idx = parseInt(cell.dataset.idx, 10);
        arrayDelete(idx);
      };
    });
  }

  function arrayInsert() {
    const valInput = document.getElementById('dsArrayInput');
    const idxInput = document.getElementById('dsArrayIndex');
    const noteEl = document.getElementById('dsArrayNote');

    let val = valInput.value.trim();
    if (!val) {
      setNote(noteEl, '❌ Please enter a value to insert.', 'error');
      valInput.focus();
      return;
    }

    if (state.array.length >= state.maxCapacity) {
      setNote(noteEl, '⚠️ Maximum capacity reached (' + state.maxCapacity + ' items). Delete items first.', 'warning');
      return;
    }

    let idx = idxInput.value.trim() !== '' ? parseInt(idxInput.value, 10) : state.array.length;

    if (isNaN(idx) || idx < 0 || idx > state.array.length) {
      setNote(noteEl, `❌ Invalid index: ${idxInput.value}. Must be between 0 and ${state.array.length}.`, 'error');
      return;
    }

    state.array.splice(idx, 0, isNaN(Number(val)) ? val : Number(val));
    valInput.value = '';
    idxInput.value = '';
    
    renderArray(idx, 'ds-pulse-add');
    const isAppend = idx === state.array.length - 1;
    setNote(noteEl, `✅ Inserted "${val}" at index ${idx}. Time Complexity: ${isAppend ? 'O(1) [Append]' : 'O(N) [Shift elements]'}`, 'success');
  }

  function arrayDelete(customIdx = null) {
    const idxInput = document.getElementById('dsArrayIndex');
    const noteEl = document.getElementById('dsArrayNote');

    if (!state.array.length) {
      setNote(noteEl, '⚠️ Array is empty.', 'warning');
      return;
    }

    let idx = customIdx !== null ? customIdx : (idxInput.value.trim() !== '' ? parseInt(idxInput.value, 10) : state.array.length - 1);

    if (isNaN(idx) || idx < 0 || idx >= state.array.length) {
      setNote(noteEl, `❌ Invalid index: ${idx}. Valid range: 0 to ${state.array.length - 1}.`, 'error');
      return;
    }

    const removed = state.array.splice(idx, 1)[0];
    if (idxInput) idxInput.value = '';

    renderArray();
    const isPop = idx === state.array.length;
    setNote(noteEl, `🗑️ Deleted "${removed}" at index ${idx}. Time Complexity: ${isPop ? 'O(1)' : 'O(N) [Shift elements]'}`, 'info');
  }

  function arrayClear() {
    state.array = [];
    renderArray();
    setNote(document.getElementById('dsArrayNote'), '🧹 Array cleared.', 'info');
  }

  // --- STACK (LIFO) ---
  function renderStack(peekHighlight = false) {
    const el = document.getElementById('dsStackViz');
    if (!el) return;

    if (!state.stack.length) {
      el.innerHTML = '<p class="muted" style="font-size:0.8rem;text-align:center;width:100%">Stack is empty (Underflow).</p>';
      return;
    }

    // Stack is rendered column-reverse (top item visually on top)
    const len = state.stack.length;
    el.innerHTML = state.stack.map((val, idx) => {
      const isTop = idx === len - 1;
      const hlClass = isTop && peekHighlight ? ' ds-pulse-peek' : (isTop ? ' ds-top-item' : '');
      return `
        <div class="ds-stack-item${hlClass}">
          <span class="ds-val">${escapeHtml(String(val))}</span>
          ${isTop ? '<span class="ds-badge top">TOP</span>' : `<span class="ds-idx">[${idx}]</span>`}
        </div>
      `;
    }).join('');
  }

  function stackPush() {
    const valInput = document.getElementById('dsStackInput');
    const noteEl = document.getElementById('dsStackNote');

    let val = valInput.value.trim();
    if (!val) {
      setNote(noteEl, '❌ Please enter a value to push.', 'error');
      valInput.focus();
      return;
    }

    if (state.stack.length >= state.maxCapacity) {
      setNote(noteEl, `⚠️ Stack Overflow! Max capacity is ${state.maxCapacity}.`, 'warning');
      return;
    }

    state.stack.push(isNaN(Number(val)) ? val : Number(val));
    valInput.value = '';

    renderStack();
    const topIdx = state.stack.length - 1;
    setNote(noteEl, `📥 Pushed "${val}" onto stack (Index ${topIdx}). Time Complexity: O(1)`, 'success');
  }

  function stackPop() {
    const noteEl = document.getElementById('dsStackNote');

    if (!state.stack.length) {
      setNote(noteEl, '⚠️ Stack Underflow! Cannot pop from empty stack.', 'error');
      return;
    }

    const popped = state.stack.pop();
    renderStack();
    setNote(noteEl, `📤 Popped "${popped}" from top of stack. Time Complexity: O(1)`, 'info');
  }

  function stackPeek() {
    const noteEl = document.getElementById('dsStackNote');

    if (!state.stack.length) {
      setNote(noteEl, '⚠️ Stack is empty. Nothing to peek.', 'warning');
      return;
    }

    const topVal = state.stack[state.stack.length - 1];
    renderStack(true);
    setNote(noteEl, `👁️ Peeked TOP element: "${topVal}". Time Complexity: O(1)`, 'info');

    setTimeout(() => renderStack(false), 1200);
  }

  function stackClear() {
    state.stack = [];
    renderStack();
    setNote(document.getElementById('dsStackNote'), '🧹 Stack cleared.', 'info');
  }

  // --- QUEUE (FIFO) ---
  function renderQueue(frontHighlight = false) {
    const el = document.getElementById('dsQueueViz');
    if (!el) return;

    if (!state.queue.length) {
      el.innerHTML = '<p class="muted" style="font-size:0.8rem;text-align:center;width:100%">Queue is empty (Underflow).</p>';
      return;
    }

    const len = state.queue.length;
    el.innerHTML = state.queue.map((val, idx) => {
      const isFront = idx === 0;
      const isRear = idx === len - 1;
      let hlClass = '';
      if (isFront && frontHighlight) hlClass = ' ds-pulse-peek';

      return `
        <div class="ds-queue-item${hlClass}">
          ${isFront ? '<span class="ds-badge front">FRONT</span>' : ''}
          ${isRear && !isFront ? '<span class="ds-badge rear">REAR</span>' : ''}
          <span class="ds-val">${escapeHtml(String(val))}</span>
          <span class="ds-idx">[${idx}]</span>
        </div>
      `;
    }).join('');
  }

  function queueEnqueue() {
    const valInput = document.getElementById('dsQueueInput');
    const noteEl = document.getElementById('dsQueueNote');

    let val = valInput.value.trim();
    if (!val) {
      setNote(noteEl, '❌ Please enter a value to enqueue.', 'error');
      valInput.focus();
      return;
    }

    if (state.queue.length >= state.maxCapacity) {
      setNote(noteEl, `⚠️ Queue Overflow! Max capacity is ${state.maxCapacity}.`, 'warning');
      return;
    }

    state.queue.push(isNaN(Number(val)) ? val : Number(val));
    valInput.value = '';

    renderQueue();
    setNote(noteEl, `➡️ Enqueued "${val}" at REAR. Time Complexity: O(1)`, 'success');
  }

  function queueDequeue() {
    const noteEl = document.getElementById('dsQueueNote');

    if (!state.queue.length) {
      setNote(noteEl, '⚠️ Queue Underflow! Cannot dequeue from empty queue.', 'error');
      return;
    }

    const dequeued = state.queue.shift();
    renderQueue();
    setNote(noteEl, `⬅️ Dequeued "${dequeued}" from FRONT. Time Complexity: O(1)`, 'info');
  }

  function queueFront() {
    const noteEl = document.getElementById('dsQueueNote');

    if (!state.queue.length) {
      setNote(noteEl, '⚠️ Queue is empty.', 'warning');
      return;
    }

    const frontVal = state.queue[0];
    renderQueue(true);
    setNote(noteEl, `👁️ FRONT element is "${frontVal}". Time Complexity: O(1)`, 'info');

    setTimeout(() => renderQueue(false), 1200);
  }

  function queueClear() {
    state.queue = [];
    renderQueue();
    setNote(document.getElementById('dsQueueNote'), '🧹 Queue cleared.', 'info');
  }

  // --- LINKED LIST ---
  function renderList() {
    const el = document.getElementById('dsListViz');
    if (!el) return;

    if (!state.list.length) {
      el.innerHTML = `
        <div class="ds-ll-head-badge">HEAD ➔</div>
        <div class="ds-ll-null">NULL</div>
      `;
      return;
    }

    const nodesHtml = state.list.map((val, idx) => {
      const isHead = idx === 0;
      const isTail = idx === state.list.length - 1;
      return `
        <div class="ds-ll-node-wrap">
          ${isHead ? '<span class="ds-badge head">HEAD</span>' : ''}
          <div class="ds-ll-node">
            <span class="ds-ll-val">${escapeHtml(String(val))}</span>
            <span class="ds-ll-ptr">next</span>
          </div>
          <span class="ds-ll-arrow">➔</span>
        </div>
      `;
    }).join('');

    el.innerHTML = nodesHtml + `<div class="ds-ll-null">NULL</div>`;
  }

  function listAppend() {
    const valInput = document.getElementById('dsListInput');
    const noteEl = document.getElementById('dsListNote');

    let val = valInput.value.trim();
    if (!val) {
      setNote(noteEl, '❌ Please enter a value to append.', 'error');
      valInput.focus();
      return;
    }

    if (state.list.length >= state.maxCapacity) {
      setNote(noteEl, `⚠️ Linked List max length reached (${state.maxCapacity}).`, 'warning');
      return;
    }

    state.list.push(isNaN(Number(val)) ? val : Number(val));
    valInput.value = '';

    renderList();
    setNote(noteEl, `🔗 Appended Node(${val}) at tail. Time Complexity: O(N) [or O(1) with tail pointer]`, 'success');
  }

  function listPrepend() {
    const valInput = document.getElementById('dsListInput');
    const noteEl = document.getElementById('dsListNote');

    let val = valInput.value.trim();
    if (!val) {
      setNote(noteEl, '❌ Please enter a value to prepend.', 'error');
      valInput.focus();
      return;
    }

    if (state.list.length >= state.maxCapacity) {
      setNote(noteEl, `⚠️ Linked List max length reached (${state.maxCapacity}).`, 'warning');
      return;
    }

    state.list.unshift(isNaN(Number(val)) ? val : Number(val));
    valInput.value = '';

    renderList();
    setNote(noteEl, `🔗 Prepended Node(${val}) at HEAD. Time Complexity: O(1)`, 'success');
  }

  function listDeleteHead() {
    const noteEl = document.getElementById('dsListNote');

    if (!state.list.length) {
      setNote(noteEl, '⚠️ Linked List is empty.', 'warning');
      return;
    }

    const removed = state.list.shift();
    renderList();
    setNote(noteEl, `🗑️ Deleted HEAD Node(${removed}). Time Complexity: O(1)`, 'info');
  }

  function listClear() {
    state.list = [];
    renderList();
    setNote(document.getElementById('dsListNote'), '🧹 Linked List cleared.', 'info');
  }

  // --- HELPERS & EVENT BINDINGS ---
  function setNote(el, message, type = 'info') {
    if (!el) return;
    let color = 'var(--text)';
    if (type === 'success') color = 'var(--success, #10b981)';
    if (type === 'warning') color = '#f59e0b';
    if (type === 'error') color = 'var(--danger, #ef4444)';
    if (type === 'info') color = '#38bdf8';

    el.innerHTML = `<span style="color:${color}; font-weight:500;">${message}</span>`;
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
  }

  function bindEvents() {
    // Array controls
    bindClick('dsArrayInsert', arrayInsert);
    bindClick('dsArrayDelete', () => arrayDelete());
    bindClick('dsArrayClear', arrayClear);
    bindEnter('dsArrayInput', arrayInsert);
    bindEnter('dsArrayIndex', arrayInsert);

    // Stack controls
    bindClick('dsStackPush', stackPush);
    bindClick('dsStackPop', stackPop);
    bindClick('dsStackPeek', stackPeek);
    bindClick('dsStackClear', stackClear);
    bindEnter('dsStackInput', stackPush);

    // Queue controls
    bindClick('dsQueueEnqueue', queueEnqueue);
    bindClick('dsQueueDequeue', queueDequeue);
    bindClick('dsQueueFront', queueFront);
    bindClick('dsQueueClear', queueClear);
    bindEnter('dsQueueInput', queueEnqueue);

    // List controls
    bindClick('dsListAppend', listAppend);
    bindClick('dsListPrepend', listPrepend);
    bindClick('dsListDeleteHead', listDeleteHead);
    bindClick('dsListClear', listClear);
    bindEnter('dsListInput', listAppend);
  }

  function bindClick(id, fn) {
    const el = document.getElementById(id);
    if (el) el.onclick = fn;
  }

  function bindEnter(id, fn) {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          fn();
        }
      });
    }
  }

  return {
    init,
    renderAll,
    arrayInsert,
    arrayDelete,
    arrayClear,
    stackPush,
    stackPop,
    stackPeek,
    stackClear,
    queueEnqueue,
    queueDequeue,
    queueFront,
    queueClear,
    listAppend,
    listPrepend,
    listDeleteHead,
    listClear
  };
})();
