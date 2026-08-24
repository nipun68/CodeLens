const Visualizer = (() => {

  function highlightSyntax(code) {
    if (code === undefined || code === null) return '';
    if (code === '') return '';

    const tokenRegex = /(\/\/[^\n]*|\/\*[\s\S]*?\*\/)|(`(?:\\.|[^`\\])*`|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*')|(\b(?:let|const|var|function|return|if|else|while|for|break|continue|new|typeof|instanceof|class|extends|this|super|import|export|from|default|async|await|try|catch|finally|throw|switch|case|do|in|of|void|yield|delete)\b)|(\b(?:true|false|null|undefined|NaN|Infinity)\b)|(\b(?:console|Math|JSON|Object|Array|String|Number|Boolean|Date|RegExp|Map|Set|Promise|Symbol|Error|window|document|parseInt|parseFloat|isNaN|isFinite)\b)|(\b(?:0x[0-9a-fA-F]+|0b[01]+|0o[0-7]+|\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)\b)|(\.[a-zA-Z_$][a-zA-Z0-9_$]*)|(\b[a-zA-Z_$][a-zA-Z0-9_$]*(?=\s*\())|(===|!==|==|!=|<=|>=|=>|\+\+|--|\+=|-=|\*=|\/=|%=|&&|\|\||\?\?|\*\*|[+\-*/%<>=!&|^~?:])|([{}[\](),;])|([a-zA-Z_$][a-zA-Z0-9_$]*)/g;

    let lastIndex = 0;
    let html = '';
    let match;

    while ((match = tokenRegex.exec(code)) !== null) {
      if (match.index > lastIndex) {
        html += escapeHtml(code.slice(lastIndex, match.index));
      }

      const [full, comment, str, keyword, bool, builtin, num, prop, fnCall, op, punct, id] = match;

      if (comment) {
        html += `<span class="syn-comment">${escapeHtml(comment)}</span>`;
      } else if (str) {
        html += `<span class="syn-string">${escapeHtml(str)}</span>`;
      } else if (keyword) {
        html += `<span class="syn-keyword">${escapeHtml(keyword)}</span>`;
      } else if (bool) {
        html += `<span class="syn-boolean">${escapeHtml(bool)}</span>`;
      } else if (builtin) {
        html += `<span class="syn-builtin">${escapeHtml(builtin)}</span>`;
      } else if (num) {
        html += `<span class="syn-number">${escapeHtml(num)}</span>`;
      } else if (prop) {
        html += `<span class="syn-operator">.</span><span class="syn-property">${escapeHtml(prop.slice(1))}</span>`;
      } else if (fnCall) {
        html += `<span class="syn-function">${escapeHtml(fnCall)}</span>`;
      } else if (op) {
        html += `<span class="syn-operator">${escapeHtml(op)}</span>`;
      } else if (punct) {
        html += `<span class="syn-punctuation">${escapeHtml(punct)}</span>`;
      } else if (id) {
        html += `<span class="syn-plain">${escapeHtml(id)}</span>`;
      } else {
        html += escapeHtml(full);
      }

      lastIndex = tokenRegex.lastIndex;
    }

    if (lastIndex < code.length) {
      html += escapeHtml(code.slice(lastIndex));
    }

    if (code.endsWith('\n')) {
      html += ' ';
    }

    return html;
  }

  function renderCodeTrace(codeLines, currentLine, errorLine, heatmap = {}) {
    const el = document.getElementById('codeTraceView');
    if (!codeLines.length) {
      el.innerHTML = '<p class="muted">No code to display.</p>';
      return;
    }
    el.innerHTML = codeLines.map((line, i) => {
      const lineNum = i + 1;
      let cls = 'code-line';
      
      if (heatmap[lineNum] === 'yellow') cls += ' heat-yellow';
      else if (heatmap[lineNum] === 'red') cls += ' heat-red';
      else if (heatmap[lineNum] === 'green') cls += ' heat-green';
      else if (heatmap[lineNum] === 'blue') cls += ' heat-blue';
      else if (heatmap[lineNum] === 'purple') cls += ' heat-purple';
      else if (heatmap[lineNum] === 'magenta') cls += ' heat-magenta';

      if (errorLine === lineNum) cls += ' error';
      else if (currentLine === lineNum) cls += ' active';
      
      const highlighted = highlightSyntax(line || ' ');
      return `<div class="${cls}"><span class="ln">${lineNum}</span><span class="lc">${highlighted}</span></div>`;
    }).join('');

    const active = el.querySelector('.code-line.active, .code-line.error');
    if (active) active.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }

  function renderVariables(vars) {
    const el = document.getElementById('variablesView');
    const entries = Object.entries(vars).filter(([k, v]) => !v?.__isFunc && typeof v !== 'function');
    if (!entries.length) {
      el.innerHTML = '<p class="muted">No variables at this step.</p>';
      return;
    }
    el.innerHTML = entries.map(([k, v]) => {
      let valHtml = formatVal(v);
      
      if (Array.isArray(v)) {
        valHtml = `<div style="display:flex;gap:4px;margin-top:4px">${
          v.map((item, idx) => `<div style="background:var(--panel);border:1px solid var(--border);padding:4px 8px;border-radius:4px;font-family:monospace;">[${idx}] ${formatVal(item)}</div>`).join('')
        }</div>`;
      }
      
      return `
        <div class="var-card" data-var="${k}">
          <div class="var-name">${k}</div>
          <div class="var-value">${valHtml}</div>
          <div class="var-type">${getType(v)}</div>
        </div>`;
    }).join('');
  }

  function renderVarTimeline(steps) {
    const el = document.getElementById('varTimeline');
    const changes = [];
    const prevVars = {};

    steps.forEach((step, i) => {
      for (const [k, v] of Object.entries(step.variables)) {
        const prevStr = JSON.stringify(prevVars[k]);
        const currStr = JSON.stringify(v);
        if (prevStr !== currStr) {
          changes.push({ step: i + 1, line: step.line, name: k, value: v, prev: prevVars[k] });
          prevVars[k] = v;
        }
      }
    });

    if (!changes.length) {
      el.innerHTML = '<p class="muted">No variable changes detected.</p>';
      return;
    }
    el.innerHTML = changes.slice(0, 50).map(c => `
      <div class="timeline-entry">
        <span class="step-num">${c.step}</span>
        <span class="var-name">${c.name}</span>
        ${c.prev !== undefined ? `<span class="arrow">→</span><span class="var-val">${formatVal(c.value)}</span>` : `<span class="arrow">=</span><span class="var-val">${formatVal(c.value)}</span>`}
      </div>`).join('');
  }

  function renderCallStack(callStack) {
    const el = document.getElementById('callStackView');
    if (!callStack || !callStack.length) {
      el.innerHTML = '<p class="muted">No active call stack.</p>';
      return;
    }
    
    el.innerHTML = callStack.slice().reverse().map((f, i) => {
      const isTop = i === 0; 
      const style = isTop ? 'border-left: 3px solid var(--accent); background: var(--panel-2);' : 'opacity: 0.8;';
      return `
        <div class="stack-frame" style="${style}">
          <span class="frame-icon">${isTop ? '▶' : '⤷'}</span>
          <span class="frame-name">${f.name}()</span>
          ${f.args?.length ? `<span class="frame-args">(${f.args.join(', ')})</span>` : ''}
          <span class="frame-line">line ${f.line}</span>
        </div>`;
    }).join('');
  }

  function renderStepNote(step) {
    const el = document.getElementById('stepNote');
    if (!step) { el.innerHTML = ''; return; }
    el.innerHTML = `<span class="tag">${step.eventType}</span>${step.note}`;
  }

  function renderAlgorithm(step, type) {
    const el = document.getElementById('algoViz');
    if (!step) { el.innerHTML = '<p class="muted">No steps. Click "Build Steps".</p>'; return; }
    const arr = step.array || [];
    el.innerHTML = arr.map((v, i) => {
      let cls = 'algo-cell';
      
      if (step.done) {
        cls += ' sorted';
      } else if (step.found === i || (Array.isArray(step.foundIndices) && step.foundIndices.includes(i))) {
        cls += ' found';
      } else if (step.swapped && (step.j === i || step.j === i + 1 || (Array.isArray(step.swappedIndices) && step.swappedIndices.includes(i)))) {
        cls += ' swap';
      } else if (step.pivot === i) {
        cls += ' pointer';
      } else if (step.mid === i || step.minIdx === i || step.j === i || (Array.isArray(step.comparing) && step.comparing.includes(i))) {
        cls += ' compare';
      } else if (Array.isArray(step.window) && step.window.includes(i)) {
        cls += ' compare';
      } else if (step.low === i || step.high === i || step.i === i || step.left === i || step.right === i) {
        cls += ' pointer';
      } else if (step.low !== undefined && step.high !== undefined && (i < step.low || i > step.high) && (type === 'binarySearch' || type === 'jumpSearch' || type === 'exponentialSearch')) {
        cls += ' sorted';
      }

      return `<div class="${cls}">${v}<span class="idx">${i}</span></div>`;
    }).join('') + `<div style="width:100%;text-align:center;margin-top:24px;color:var(--muted);font-size:.88rem;line-height:1.5">${step.note || ''}</div>`;
  }

  function renderMemoryMap(vars, callStack, step) {
    const el = document.getElementById('memoryView');
    if (!el) return;
    if (!vars || !Object.keys(vars).length) {
      el.innerHTML = `
        <div style="text-align:center;padding:36px 16px;">
          <div style="font-size:2.2rem;margin-bottom:10px;opacity:0.85">🧠</div>
          <h4 style="margin:0 0 6px;font-size:1rem;color:var(--text)">Live Stack & Heap Memory Visualizer</h4>
          <p class="muted" style="max-width:380px;margin:0 auto 16px;font-size:0.82rem;line-height:1.5">
            Run code to capture live Call Stack memory frames, stack primitive allocations, and dynamic Heap reference objects.
          </p>
        </div>`;
      return;
    }

    const entries = Object.entries(vars).filter(([k, v]) => !v?.__isFunc && typeof v !== 'function');
    
    let stackBytes = 0;
    let heapBytes = 0;
    let heapAllocations = 0;

    const stackItems = [];
    const heapItems = [];

    entries.forEach(([name, val], i) => {
      const stackAddr = '0x7FFD' + (0x20 + i * 8).toString(16).toUpperCase();
      const isRef = Array.isArray(val) || (typeof val === 'object' && val !== null);

      if (!isRef) {
        let size = 8;
        if (typeof val === 'string') size = Math.max(8, val.length * 2);
        else if (typeof val === 'boolean') size = 4;
        else if (val === null || val === undefined) size = 4;
        
        stackBytes += size;
        stackItems.push({
          name,
          addr: stackAddr,
          type: typeof val,
          isRef: false,
          size: `${size} B`,
          displayVal: `<span class="val-pill">${formatVal(val)}</span>`,
          desc: 'Primitive value stored in stack slot'
        });
      } else {
        stackBytes += 8;
        heapAllocations++;
        const heapAddr = '0xHEAP_' + (0x4A0 + i * 0x38).toString(16).toUpperCase();

        stackItems.push({
          name,
          addr: stackAddr,
          type: Array.isArray(val) ? `Array[${val.length}] *` : 'Object *',
          isRef: true,
          size: '8 B (ptr)',
          displayVal: `<span class="ptr-badge">──► ${heapAddr}</span>`,
          desc: `Reference pointer to heap memory block`
        });

        let hSize = 16;
        let elements = [];
        if (Array.isArray(val)) {
          hSize += val.length * 8;
          elements = val.map((item, idx) => ({ key: `[${idx}]`, val: formatVal(item) }));
        } else {
          const keys = Object.keys(val);
          hSize += keys.length * 16;
          elements = keys.map(k => ({ key: `.${k}`, val: formatVal(val[k]) }));
        }
        heapBytes += hSize;

        heapItems.push({
          name,
          addr: heapAddr,
          type: Array.isArray(val) ? `Array (${val.length} items)` : 'Object Record',
          size: `${hSize} Bytes`,
          elements,
          refs: 1
        });
      }
    });

    const activeFrame = callStack && callStack.length ? callStack[callStack.length - 1] : { name: 'global', line: step?.line || 1 };

    el.innerHTML = `
      <div class="mem-telemetry-bar">
        <div class="mem-stat-chip">
          <span class="lbl">⚡ Call Stack Size</span>
          <span class="val">${stackBytes} Bytes <small>(${stackItems.length} slots)</small></span>
        </div>
        <div class="mem-stat-chip">
          <span class="lbl">📦 Dynamic Heap Size</span>
          <span class="val">${heapBytes} Bytes <small>(${heapAllocations} allocs)</small></span>
        </div>
        <div class="mem-stat-chip">
          <span class="lbl">💾 Estimated Virtual RAM</span>
          <span class="val">${stackBytes + heapBytes} Bytes</span>
        </div>
        <div class="mem-stat-chip">
          <span class="lbl">🛡️ GC Status</span>
          <span class="val status-ok">Active · 0 Leaks</span>
        </div>
      </div>

      <div class="mem-visualizer-grid">
        <div class="mem-col stack-col">
          <div class="mem-col-header">
            <div class="col-title">
              <span class="icon">🥞</span>
              <strong>Execution Call Stack</strong>
            </div>
            <span class="frame-tag">Frame: ${activeFrame.name || 'global'}() · Line ${activeFrame.line || 1}</span>
          </div>
          <p class="mem-col-desc">Fixed-size, contiguous memory storing primitive values and 64-bit reference pointers.</p>
          
          <div class="stack-slots-container">
            ${stackItems.length ? stackItems.map(item => `
              <div class="stack-slot-card ${item.isRef ? 'ref-slot' : 'prim-slot'}">
                <div class="slot-addr">${item.addr}</div>
                <div class="slot-info">
                  <div class="slot-name-row">
                    <strong class="slot-var-name">${item.name}</strong>
                    <span class="slot-type-badge ${item.isRef ? 'ref' : 'prim'}">${item.type}</span>
                    <span class="slot-size">${item.size}</span>
                  </div>
                  <div class="slot-value-row">
                    ${item.displayVal}
                  </div>
                </div>
              </div>
            `).join('') : '<p class="muted">No stack slots allocated yet.</p>'}
          </div>
        </div>

        <div class="mem-col heap-col">
          <div class="mem-col-header">
            <div class="col-title">
              <span class="icon">📦</span>
              <strong>Dynamic Object Heap</strong>
            </div>
            <span class="heap-tag">${heapItems.length} Structure${heapItems.length === 1 ? '' : 's'}</span>
          </div>
          <p class="mem-col-desc">Dynamic allocation space for expandable arrays, objects, and reference structures.</p>

          <div class="heap-blocks-container">
            ${heapItems.length ? heapItems.map(h => `
              <div class="heap-block-card">
                <div class="heap-block-header">
                  <div class="heap-addr-pill">
                    <span class="dot"></span>
                    <strong>${h.addr}</strong>
                  </div>
                  <span class="heap-type-pill">${h.type}</span>
                  <span class="heap-size-pill">${h.size}</span>
                </div>
                <div class="heap-cells-grid">
                  ${h.elements.map(e => `
                    <div class="heap-cell">
                      <span class="cell-key">${e.key}</span>
                      <span class="cell-val">${e.val}</span>
                    </div>
                  `).join('')}
                </div>
                <div class="heap-block-footer">
                  <span>Target: <code>${h.name}</code></span>
                  <span>Ref Count: <strong>${h.refs}</strong></span>
                  <span class="gc-live">● Reachable</span>
                </div>
              </div>
            `).join('') : '<div class="empty-heap-note"><p class="muted">No objects or arrays in Heap.</p></div>'}
          </div>
        </div>
      </div>

      <div class="mem-educational-card">
        <div class="edu-head">
          <span class="edu-icon">💡</span>
          <strong>How JavaScript Memory Architecture Works During Execution</strong>
        </div>
        <div class="edu-grid">
          <div class="edu-item">
            <h5>1. Primitives on Stack</h5>
            <p>Numbers, booleans, and small strings live directly in contiguous stack frame slots with instant O(1) deallocation when the scope exits.</p>
          </div>
          <div class="edu-item">
            <h5>2. Dynamic Objects on Heap</h5>
            <p>Arrays and objects have variable sizes. They are stored in the Dynamic Heap and referenced via an 8-byte pointer address on the Stack.</p>
          </div>
          <div class="edu-item">
            <h5>3. Pointer Copying (By Reference)</h5>
            <p>Assigning <code>let b = a</code> copies the <em>pointer memory address</em>, not the array. Both variables point to the same Heap block.</p>
          </div>
          <div class="edu-item">
            <h5>4. Mark-and-Sweep Garbage Collector</h5>
            <p>Unreferenced heap allocations whose stack root pointers are removed get automatically reclaimed by the runtime memory manager.</p>
          </div>
        </div>
      </div>
    `;
  }

  function formatVal(v) {
    if (v === undefined) return 'undefined';
    if (v === null) return 'null';
    if (v?.__isFunc) return 'ƒ()';
    if (typeof v === 'function') return 'ƒ()';
    if (Array.isArray(v)) return '[' + v.map(formatVal).join(', ') + ']';
    if (typeof v === 'object') {
      try { return JSON.stringify(v); } catch { return String(v); }
    }
    if (typeof v === 'string') return `"${v}"`;
    return String(v);
  }

  function getType(v) {
    if (v === null) return 'null';
    if (Array.isArray(v)) return `array[${v.length}]`;
    return typeof v;
  }

  function escapeHtml(s) {
    return s.replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
  }

  window.highlightSyntax = highlightSyntax;

  return { highlightSyntax, renderCodeTrace, renderVariables, renderVarTimeline, renderCallStack, renderStepNote, renderMemoryMap, renderAlgorithm, renderAlgoStats };
})();