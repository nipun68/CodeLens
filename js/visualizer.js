const Visualizer = (() => {

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
      
      const escaped = escapeHtml(line || ' ');
      return `<div class="${cls}"><span class="ln">${lineNum}</span><span class="lc">${escaped}</span></div>`;
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
      if (type.endsWith('Sort')) {
        if (step.done) cls += ' sorted';
        if (step.i === i) cls += ' pointer';
        if (step.j === i || step.j === i + 1) cls += step.swapped ? ' swap' : ' compare';
        if (type === 'selectionSort' && step.minIdx === i) cls += ' compare';
      } else {
        if (step.found === i) cls += ' found';
        else if (step.mid === i) cls += ' compare';
        else if (i < step.low || i > step.high) cls += ' sorted';
      }
      return `<div class="${cls}">${v}<span class="idx">${i}</span></div>`;
    }).join('') + `<div style="width:100%;text-align:center;margin-top:24px;color:var(--muted);font-size:.85rem">${step.note || ''}</div>`;
  }

  function renderAlgoStats(step, type) {
    const meta = Algorithms.META[type];
    const el = document.getElementById('algoStats');
    el.innerHTML = `
      <p><strong>Algorithm:</strong> ${meta.name}</p>
      <p><strong>Time Complexity:</strong> ${meta.time}</p>
      <p><strong>Space Complexity:</strong> ${meta.space}</p>
      <p><strong>Comparisons so far:</strong> ${step?.comparisons || 0}</p>
      <p><strong>Step note:</strong> ${step?.note || '—'}</p>
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

  return { renderCodeTrace, renderVariables, renderVarTimeline, renderCallStack, renderStepNote, renderAlgorithm, renderAlgoStats };
})();