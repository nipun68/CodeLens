function toast(msg, type = '') {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.className = 'toast show ' + type;
  setTimeout(() => el.classList.remove('show'), 2400);
}
function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  AppState.theme = theme;
  Storage.saveTheme(theme);
  document.getElementById('themeToggle').textContent = theme === 'dark' ? '☀️' : '🌙';
}
function switchView(name) {
  AppState.currentView = name;
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  const target = document.getElementById('view-' + name);
  if (target) target.classList.add('active');
  document.querySelectorAll('.nav-link').forEach(l => l.classList.toggle('active', l.dataset.view === name));
  if (name === 'dashboard') renderDashboard();
  if (name === 'history') renderHistory();
  if (name === 'learning') renderLearning();
  if (name === 'algorithms') renderAlgoCards();
  if (name === 'structures' && typeof DataStructuresVisualizer !== 'undefined') DataStructuresVisualizer.init();
}
const FEATURES = [
  { ic: '⚡', t: 'Line-by-Line Execution', d: 'AST interpreter executes code statement by statement.', goto: 'workspace' },
  { ic: '🎯', t: 'Runtime Visualization', d: 'See variables, output, and call stack at every step.', goto: 'workspace' },
  { ic: '🐛', t: 'Error Debugging', d: 'Execution stops at error line. All prior steps preserved.', goto: 'workspace' },
  { ic: '🔍', t: 'Algorithm Visualizer', d: '16 algorithms: Binary/Jump Search, Quick/Merge/Heap Sort, Kadane, 3-Way Partition.', goto: 'algorithms' },
  { ic: '📦', t: 'Data Structure Visualizer', d: 'Interactive Arrays, Stacks, Queues, and Linked Lists.', goto: 'structures' },
  { ic: '⏱️', t: 'Complexity & Big-O', d: 'Estimate O(1)→O(2ⁿ) with 6-tier heatmap gutter accents.', goto: 'workspace' },
  { ic: '🛡️', t: 'Code Quality & Health Audit', d: 'Maintainability Index, Halstead Metrics & Cyclomatic (M).', goto: 'workspace' },
  { ic: '🏆', t: 'Learning Dashboard', d: 'Track mastery, earn achievements, get recommendations.', goto: 'learning' },
  { ic: '💾', t: 'LocalStorage History', d: 'Save, search, reload, and delete past executions.', goto: 'history' },
  { ic: '🧩', t: 'Deterministic AST Sandbox', d: 'Zero-eval ECMAScript 2020 parser with scoped frames.', goto: 'help' },
  { ic: '📸', t: 'Time-Travel & Breakpoints', d: 'Step rewind, jump to frame, and non-blocking F9 breakpoints.', goto: 'workspace' },
  { ic: '📤', t: 'Export & Report Studio', d: 'Download complete structured JSON execution & telemetry audit.', goto: 'workspace' }
];
function renderDashboard() {
  const fGrid = document.getElementById('featureGrid');
  if (fGrid) {
    fGrid.innerHTML = FEATURES.map(f => `
      <div class="feature-card" data-goto="${f.goto || 'workspace'}" title="Open ${escapeHtml(f.t)}">
        <div class="ic">${f.ic}</div>
        <h4>${escapeHtml(f.t)}</h4>
        <p>${escapeHtml(f.d)}</p>
      </div>`).join('');

    fGrid.querySelectorAll('.feature-card').forEach(c => {
      c.onclick = () => {
        const goto = c.dataset.goto;
        if (goto) {
          switchView(goto);
          toast('Navigated to ' + c.querySelector('h4').textContent);
        }
      };
    });
  }

  const exGrid = document.getElementById('exampleGrid');
  if (exGrid) {
    const allTemplates = typeof CodeLensTemplates !== 'undefined' ? CodeLensTemplates.getAllTemplates() : Editor.META.map(m => ({ ...m, code: Editor.EXAMPLES[m.key] }));
    exGrid.innerHTML = allTemplates.map(m => `
      <div class="example-card" data-example="${m.key || m.id}" title="Load ${escapeHtml(m.title)}">
        <h5>${escapeHtml(m.title)} <span class="chip">${escapeHtml(m.tag || 'JS')}</span></h5>
        <pre>${typeof Visualizer !== 'undefined' ? Visualizer.highlightSyntax((m.code || Editor.EXAMPLES[m.key] || '').slice(0, 140)) : escapeHtml((m.code || Editor.EXAMPLES[m.key] || '').slice(0, 140))}…</pre>
      </div>`).join('');

    exGrid.querySelectorAll('.example-card').forEach(c => {
      c.onclick = () => {
        const key = c.dataset.example;
        const tpl = typeof CodeLensTemplates !== 'undefined' ? CodeLensTemplates.getTemplateByKeyOrId(key) : null;
        if (tpl && tpl.code) {
          Editor.setCode(tpl.code);
        } else if (Editor.EXAMPLES[key]) {
          Editor.load(key);
        }
        switchView('workspace');
        const code = Editor.getCode();
        const heatmap = Analyzer.getLineHeatmap(code);
        Visualizer.renderCodeTrace(code.split('\n'), null, null, heatmap);
        toast('Template loaded: ' + (tpl ? tpl.title : key));
      };
    });
  }
}
function renderHistory() {
  const search = (document.getElementById('historySearch')?.value || '').toLowerCase();
  let list = CodeLensHistory.getAll();
  if (search) list = list.filter(h => (h.code || '').toLowerCase().includes(search));

  const el = document.getElementById('historyList');
  if (!list.length) { el.innerHTML = '<p class="muted">No saved executions.</p>'; return; }
  el.innerHTML = list.map(h => `
    <div class="history-item">
      <div class="history-info">
        <h5>JavaScript <span class="status ${h.exitCode === 0 ? 'ok' : 'err'}">${h.exitCode === 0 ? 'OK' : 'ERR'}</span></h5>
        <div class="hmeta">${new Date(h.timestamp).toLocaleString()} · ${h.steps || 0} steps · ${h.exitCode === 0 ? 'Success' : 'Failed'}</div>
        <pre>${escapeHtml((h.code || '').slice(0, 200))}</pre>
      </div>
      <div style="display:flex;gap:6px;flex-direction:column">
        <button class="btn mini" onclick="loadHistoryItem(${h.id})">Load</button>
        <button class="btn danger mini" onclick="deleteHistoryItem(${h.id})">Delete</button>
      </div>
    </div>`).join('');
}
window.loadHistoryItem = (id) => {
  const item = CodeLensHistory.getAll().find(h => h.id === id);
  if (!item) return;
  Editor.setCode(item.code);
  switchView('workspace');
  toast('Loaded from history');
};
window.deleteHistoryItem = (id) => {
  CodeLensHistory.remove(id);
  renderHistory();
  toast('Deleted');
};
function renderLearning() {
  const data = CodeLensLearning.get();
  const recs = CodeLensLearning.recommend();
  const stats = CodeLensLearning.stats();

  const successRate = stats.totalRuns > 0 ? Math.round((stats.successCount / stats.totalRuns) * 100) : 100;

  document.getElementById('statsView').innerHTML = `
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(110px,1fr));gap:10px">
      <div class="stat-card">
        <div class="stat-val">${stats.totalRuns}</div>
        <div class="stat-label">AST Executions</div>
      </div>
      <div class="stat-card">
        <div class="stat-val" style="color:var(--success)">${successRate}%</div>
        <div class="stat-label">Reliability Index</div>
      </div>
      <div class="stat-card">
        <div class="stat-val" style="color:var(--danger)">${stats.errors}</div>
        <div class="stat-label">Bugs Handled</div>
      </div>
      <div class="stat-card">
        <div class="stat-val" style="color:var(--accent)">${stats.avgScore}%</div>
        <div class="stat-label">DSA Competency</div>
      </div>
    </div>
    <div style="margin-top:12px;display:flex;justify-content:space-between;font-size:0.75rem;color:var(--muted)">
      <span>Active Session: <strong>Deterministic AST</strong></span>
      <span>Last Run: <strong>${stats.lastActivity ? new Date(stats.lastActivity).toLocaleTimeString() : 'No runs yet'}</strong></span>
    </div>`;

  const getTier = (score) => score >= 80 ? '<span class="tag" style="color:#10b981;background:rgba(16,185,129,0.12)">Master</span>' :
    score >= 50 ? '<span class="tag" style="color:#f59e0b;background:rgba(245,158,11,0.12)">Intermediate</span>' :
    '<span class="tag" style="color:#38bdf8;background:rgba(56,189,248,0.12)">Novice</span>';

  document.getElementById('masteryView').innerHTML = Object.entries(data.topics).map(([t, score]) => `
    <div class="mastery-item">
      <div class="mastery-label">
        <span><strong>${t}</strong> ${getTier(score)}</span>
        <span style="font-weight:700;font-family:monospace">${score}%</span>
      </div>
      <div class="mastery-bar"><div style="width:${score}%"></div></div>
    </div>`).join('');

  document.getElementById('recommendationsView').innerHTML =
    '<p class="muted" style="margin-bottom:10px;font-size:0.8rem">Targeted practice vectors based on runtime telemetry:</p>' +
    recs.map((r, i) => `
      <div class="rec-item">
        <div class="num">${i + 1}</div>
        <div class="rec-info">
          <div class="rec-topic" style="display:flex;justify-content:space-between;align-items:center">
            <span>${r.topic} <span class="meta">(${r.score}% Mastery)</span></span>
            <button class="btn mini primary" onclick="loadPracticeTemplate('${r.templateKey}')">▶ Practice</button>
          </div>
          <div class="rec-rationale">${r.rationale}</div>
        </div>
      </div>`).join('');

  const earned = new Set(stats.achievements.map(a => a.id));
  document.getElementById('achievementsView').innerHTML = CodeLensLearning.ALL_ACHIEVEMENTS.map(a => `
    <div class="achievement ${earned.has(a.id) ? 'unlocked' : 'locked'}" title="${a.name}">
      <div class="ach-icon">${a.icon}</div>
      <div class="ach-name">${a.name}</div>
    </div>`).join('');

  const log = data.activityLog || [];
  document.getElementById('activityView').innerHTML = log.length ? log.map(a => `
    <div class="activity-item">
      <span class="dot-ic ${a.success ? 'ok' : 'err'}"></span>
      <div class="act-info">
        <div style="display:flex;justify-content:space-between">
          <strong>${a.topic || 'Algorithm Execution'}</strong>
          <span class="act-time">${new Date(a.timestamp).toLocaleTimeString()}</span>
        </div>
        <div style="font-size:0.75rem;color:var(--muted);font-family:monospace;margin-top:2px">${escapeHtml(a.preview || '(Code execution)')}</div>
      </div>
    </div>`).join('') : '<p class="muted">No execution telemetry recorded yet. Run code in the workspace.</p>';
}

window.loadPracticeTemplate = (key) => {
  Editor.load(key);
  switchView('workspace');
  const code = Editor.getCode();
  const heatmap = Analyzer.getLineHeatmap(code);
  Visualizer.renderCodeTrace(code.split('\n'), null, null, heatmap);
  toast('Loaded practice module: ' + key, 'ok');
};
function renderAlgoCards() {
  const container = document.getElementById('algoCards');
  if (!container) return;
  container.innerHTML = Object.entries(Algorithms.META).map(([key, m]) => `
    <div class="algo-card" data-algo="${key}" title="Visualize ${m.name}">
      <h4>${m.name}</h4>
      <p>${m.desc}</p>
      <span class="tag">${m.time} · ${m.space}</span>
    </div>`).join('');
  container.querySelectorAll('.algo-card').forEach(c => {
    c.onclick = () => {
      const algoKey = c.dataset.algo;
      switchView('workspace');
      const tab = document.querySelector('.tab[data-tab="algorithm"]');
      if (tab) tab.click();
      const select = document.getElementById('algoSelect');
      if (select) {
        select.value = algoKey;
        select.dispatchEvent(new Event('change'));
      }
      toast('Loaded: ' + (Algorithms.META[algoKey]?.name || algoKey), 'ok');
    };
  });
}
function initTabs() {
  document.querySelectorAll('.tab').forEach(t => {
    t.onclick = () => {
      document.querySelectorAll('.tab').forEach(x => x.classList.remove('active'));
      document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
      t.classList.add('active');
      document.querySelector(`.tab-pane[data-pane="${t.dataset.tab}"]`).classList.add('active');
    };
  });
}
function resetAnalysisViews() {
  const comp = document.getElementById('complexityView');
  if (comp) {
    comp.innerHTML = `
      <div style="text-align:center;padding:36px 16px;">
        <div style="font-size:2.2rem;margin-bottom:10px;opacity:0.85">⏱️</div>
        <h4 style="margin:0 0 6px;font-size:1rem;color:var(--text)">Static Complexity Analysis Pending</h4>
        <p class="muted" style="max-width:340px;margin:0 auto 16px;font-size:0.82rem;line-height:1.5">
          Click <strong>"🔍 Analyze"</strong> in the editor toolbar above to compute asymptotic time/space upper bounds, Big-O heuristics, and AST structural metrics.
        </p>
        <button class="btn primary mini" onclick="document.getElementById('analyzeBtn').click()">🔍 Run Static Analysis</button>
      </div>`;
  }
  const qual = document.getElementById('qualityView');
  if (qual) {
    qual.innerHTML = `
      <div style="text-align:center;padding:36px 16px;">
        <div style="font-size:2.2rem;margin-bottom:10px;opacity:0.85">🛡️</div>
        <h4 style="margin:0 0 6px;font-size:1rem;color:var(--text)">Code Quality & Health Audit Pending</h4>
        <p class="muted" style="max-width:340px;margin:0 auto 16px;font-size:0.82rem;line-height:1.5">
          Click <strong>"🔍 Analyze"</strong> in the editor toolbar above to compute Maintainability Index, Cyclomatic Complexity (M), and Clean Code heuristics.
        </p>
        <button class="btn ghost mini" onclick="document.getElementById('analyzeBtn').click()">🔍 Run Code Quality Audit</button>
      </div>`;
  }
}

function resetWorkspace() {
  pauseTrace();
  Editor.setCode('');
  AppState.breakpoints.clear();
  Editor.updateLineNumbers();

  AppState.execution = null;
  AppState.steps = [];
  AppState.currentStep = 0;

  setExecStatus('Idle', '');

  const runBtn = document.getElementById('runBtn');
  if (runBtn) runBtn.disabled = false;

  const stepBadge = document.getElementById('stepBadge');
  if (stepBadge) {
    stepBadge.textContent = 'No execution';
    stepBadge.className = 'step-badge';
  }

  const stepMeta = document.getElementById('stepMeta');
  if (stepMeta) stepMeta.textContent = '';

  const execMeta = document.getElementById('execMeta');
  if (execMeta) execMeta.textContent = '';

  const traceSlider = document.getElementById('traceSlider');
  if (traceSlider) {
    traceSlider.min = 0;
    traceSlider.max = 0;
    traceSlider.value = 0;
  }

  const codeTraceView = document.getElementById('codeTraceView');
  if (codeTraceView) {
    codeTraceView.innerHTML = '<p class="muted">Click "Run & Trace" to see line-by-line execution.</p>';
  }

  const stepNote = document.getElementById('stepNote');
  if (stepNote) stepNote.innerHTML = '';

  const outputArea = document.getElementById('outputArea');
  if (outputArea) outputArea.textContent = '(no output)';

  const errEl = document.getElementById('errorArea');
  if (errEl) {
    errEl.textContent = '';
    errEl.classList.add('hidden');
  }

  const varsView = document.getElementById('variablesView');
  if (varsView) varsView.innerHTML = '<p class="muted">No variables to display.</p>';

  const callStackView = document.getElementById('callStackView');
  if (callStackView) callStackView.innerHTML = '<p class="muted">Call stack is empty.</p>';

  const timeline = document.getElementById('varTimeline');
  if (timeline) timeline.innerHTML = '';

  resetAnalysisViews();

  document.querySelectorAll('.tab').forEach(x => x.classList.remove('active'));
  document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
  const traceTab = document.querySelector('.tab[data-tab="trace"]');
  const tracePane = document.querySelector('.tab-pane[data-pane="trace"]');
  if (traceTab && tracePane) {
    traceTab.classList.add('active');
    tracePane.classList.add('active');
  }

  toast('Workspace & Execution reset', 'ok');
}
async function handleRun() {
  const code = Editor.getCode();
  if (!code.trim()) { toast('Write some code first', 'err'); return; }

  const runBtn = document.getElementById('runBtn');
  runBtn.disabled = true;
  setExecStatus('Running…', 'run');
  document.getElementById('stepBadge').textContent = 'Executing…';
const preHeatmap = Analyzer.getLineHeatmap(code);
Visualizer.renderCodeTrace(code.split('\n'), null, null, preHeatmap);

  try {
    const result = await Execution.run(code);

    AppState.execution = result;
    AppState.steps = result.steps || [];
    AppState.currentStep = 0;

    document.getElementById('outputArea').textContent = result.output || '(no output)';
    const errEl = document.getElementById('errorArea');
    
    const hasLogicalError = !result.error && (result.output.includes('NaN') || result.output.includes('undefined'));
    
    if (result.error) {
      errEl.textContent = `Line ${result.error.line}: ${result.error.message}`;
      errEl.classList.remove('hidden');
      setExecStatus('Error', 'err');
    } else if (hasLogicalError) {
      errEl.textContent = `Logical Error detected in output: ${result.output.includes('NaN') ? 'NaN' : 'undefined'}`;
      errEl.classList.remove('hidden');
      setExecStatus('Logical Error', 'err');
    } else {
      errEl.classList.add('hidden');
      setExecStatus('Success', 'ok');
    }
    
    document.getElementById('execMeta').textContent = `${result.steps?.length || 0} steps · ${result.codeLines?.length || 0} lines`;

    const maxStep = AppState.steps.length - 1;
    document.getElementById('traceSlider').max = maxStep;
    document.getElementById('traceSlider').value = 0;
    
    showOutputTab();

    if (AppState.steps.length > 0) {
      renderStep(0);
    } else {
      const heatmap = Analyzer.getLineHeatmap(result.codeLines.join('\n'));
      Visualizer.renderCodeTrace(result.codeLines, null, result.error?.line, heatmap);
      document.getElementById('stepBadge').textContent = 'Syntax Error';
      document.getElementById('stepBadge').className = 'step-badge active';
      document.getElementById('stepMeta').textContent = result.error ? `Line ${result.error.line}` : '';
      const noteEl = document.getElementById('stepNote');
      if (result.error) {
        noteEl.innerHTML = `<span class="tag" style="color: var(--danger); background: rgba(248,113,113,.18)">ERROR</span> ${result.error.message}`;
      } else {
        noteEl.innerHTML = '';
      }
    }

    Visualizer.renderVarTimeline(AppState.steps);

    const topic = CodeLensLearning.detectTopic(code);
    const isSuccess = result.exitCode === 0 && !hasLogicalError;
    CodeLensLearning.recordRun(topic, isSuccess, code);

    CodeLensHistory.add({
      code, language: 'javascript',
      exitCode: isSuccess ? 0 : 1,
      stdout: result.output, stderr: result.error?.message || (hasLogicalError ? 'Logical Error' : ''),
      steps: result.steps?.length || 0,
      time: '—', timestamp: Date.now()
    });

    if (result.error) {
      toast(`Error at line ${result.error.line} — check trace`, 'err');
    } else if (hasLogicalError) {
      toast('Logical error detected in output', 'err');
    } else {
      toast(`Execution complete — ${result.steps.length} steps captured`, 'ok');
    }
  } catch (err) {
    console.error("Execution crash:", err);
    toast("An internal error occurred: " + err.message, 'err');
  } finally {
    runBtn.disabled = false;
  }
}

function setExecStatus(text, cls = '') {
  const s = document.getElementById('execStatus');
  s.textContent = text;
  s.className = 'status ' + cls;
}
function renderStep(index) {
  if (!AppState.steps.length) return;
  AppState.currentStep = index;
  const step = AppState.steps[index];
  const errorLine = AppState.execution?.error?.line;

  const heatmap = Analyzer.getLineHeatmap(Editor.getCode());

  Visualizer.renderCodeTrace(AppState.execution.codeLines, step.line, errorLine, heatmap);
  Visualizer.renderVariables(step.variables);
  Visualizer.renderCallStack(step.callStack);
  Visualizer.renderMemoryMap(step.variables, step.callStack, step);
  Visualizer.renderStepNote(step);

  const fullOutput = AppState.execution?.output || (step.output?.length ? step.output.join('\n') : '(no output)');
  document.getElementById('outputArea').textContent = fullOutput;

  document.getElementById('stepBadge').textContent = `Step ${index + 1} / ${AppState.steps.length}`;
  document.getElementById('stepBadge').className = 'step-badge active';
  document.getElementById('stepMeta').textContent = `Line ${step.line} · ${step.eventType}`;
  document.getElementById('traceSlider').value = index;
}

function showOutputTab() {
  document.querySelectorAll('.tab').forEach(x => x.classList.remove('active'));
  document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
  const outTab = document.querySelector('.tab[data-tab="output"]');
  const outPane = document.querySelector('.tab-pane[data-pane="output"]');
  if (outTab && outPane) {
    outTab.classList.add('active');
    outPane.classList.add('active');
  }
}

function traceNext() {
  if (AppState.currentStep < AppState.steps.length - 1) {
    for (let i = AppState.currentStep + 1; i < AppState.steps.length; i++) {
      if (AppState.breakpoints.has(AppState.steps[i].line)) {
        renderStep(i);
        toast('Breakpoint hit at line ' + AppState.steps[i].line, 'ok');
        pauseTrace();
        return;
      }
    }
    const nextIdx = AppState.currentStep + 1;
    renderStep(nextIdx);
    if (nextIdx === AppState.steps.length - 1 && !AppState.isPlaying) {
      setTimeout(() => {
        showOutputTab();
        toast('Program completed — Viewing output', 'ok');
      }, 400);
    }
  } else if (AppState.steps.length > 0 && !AppState.isPlaying) {
    showOutputTab();
    toast('Program completed — Viewing output', 'ok');
  }
}
function tracePrev() { if (AppState.currentStep > 0) renderStep(AppState.currentStep - 1); }
function traceFirst() { if (AppState.steps.length) renderStep(0); }
function traceLast() {
  if (AppState.steps.length) {
    renderStep(AppState.steps.length - 1);
    setTimeout(() => {
      showOutputTab();
      toast('Jumped to program end — Viewing output', 'ok');
    }, 300);
  }
}
function traceReset() { if (AppState.steps.length) renderStep(0); pauseTrace(); }

function playTrace() {
  if (AppState.isPlaying) { pauseTrace(); return; }
  if (!AppState.steps.length) { toast('Run code first', 'err'); return; }
  if (AppState.currentStep >= AppState.steps.length - 1) {
    renderStep(0);
    document.querySelectorAll('.tab').forEach(x => x.classList.remove('active'));
    document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
    document.querySelector('.tab[data-tab="trace"]').classList.add('active');
    document.querySelector('.tab-pane[data-pane="trace"]').classList.add('active');
  }

  AppState.isPlaying = true;
  document.getElementById('tracePlay').textContent = '⏸ Pause';
  AppState.playTimer = setInterval(() => {
    if (AppState.currentStep >= AppState.steps.length - 1) {
      pauseTrace();
      showOutputTab();
      toast('Execution completed — Viewing output', 'ok');
      return;
    }
    const nextStep = AppState.currentStep + 1;
    if (AppState.breakpoints.has(AppState.steps[nextStep].line)) {
      renderStep(nextStep);
      toast('Breakpoint hit at line ' + AppState.steps[nextStep].line, 'ok');
      pauseTrace();
      return;
    }
    renderStep(nextStep);
  }, 600);
}
function pauseTrace() {
  AppState.isPlaying = false;
  clearInterval(AppState.playTimer);
  document.getElementById('tracePlay').textContent = '▶ Play';
}

function buildAlgoSteps() {
  const type = document.getElementById('algoSelect').value;
  const raw = document.getElementById('algoInput').value || '10,20,30,40,50';
  const arr = raw.split(',').map(x => parseInt(x.trim())).filter(x => !isNaN(x));
  const target = parseInt(document.getElementById('algoTarget').value) || 40;
  AppState.algorithm.type = type;
  AppState.algorithm.steps = Algorithms.generate(type, arr, target);
  AppState.algorithm.current = 0;
  document.getElementById('algoSlider').max = AppState.algorithm.steps.length - 1;
  document.getElementById('algoSlider').value = 0;
  renderAlgoStep();
  toast(`Built ${AppState.algorithm.steps.length} steps`);
}
function renderAlgoStep() {
  const step = AppState.algorithm.steps[AppState.algorithm.current];
  Visualizer.renderAlgorithm(step, AppState.algorithm.type);
  Visualizer.renderAlgoStats(step, AppState.algorithm.type);
  document.getElementById('algoStepLabel').textContent = `${AppState.algorithm.current + 1} / ${AppState.algorithm.steps.length}`;
  document.getElementById('algoSlider').value = AppState.algorithm.current;
}
function algoNext() { if (AppState.algorithm.steps.length) { AppState.algorithm.current = Math.min(AppState.algorithm.steps.length - 1, AppState.algorithm.current + 1); renderAlgoStep(); } }
function algoPrev() { if (AppState.algorithm.steps.length) { AppState.algorithm.current = Math.max(0, AppState.algorithm.current - 1); renderAlgoStep(); } }
function algoReset() { AppState.algorithm.current = 0; renderAlgoStep(); }
function algoPlay() {
  if (AppState.algorithm.playing) { AppState.algorithm.playing = false; clearInterval(AppState.algorithm.timer); document.getElementById('algoPlay').textContent = '▶ Play'; return; }
  if (!AppState.algorithm.steps.length) buildAlgoSteps();
  AppState.algorithm.playing = true;
  document.getElementById('algoPlay').textContent = '⏸ Pause';
  AppState.algorithm.timer = setInterval(() => {
    if (AppState.algorithm.current >= AppState.algorithm.steps.length - 1) { clearInterval(AppState.algorithm.timer); AppState.algorithm.playing = false; document.getElementById('algoPlay').textContent = '▶ Play'; return; }
    algoNext();
  }, 700);
}

function renderAnalysis(switchTab = true) {
  const code = Editor.getCode();
  if (!code.trim()) {
    toast('Write some code first', 'err');
    return;
  }
  const cx = Analyzer.analyzeComplexity(code);
  const q = Analyzer.analyzeQuality(code);

  document.getElementById('complexityView').innerHTML = `
    <div style="display:flex;gap:10px;margin-bottom:14px;flex-wrap:wrap">
      <div class="badge time" style="font-size:0.95rem;padding:8px 14px">⏱ Time Complexity: <strong>${cx.time}</strong></div>
      <div class="badge space" style="font-size:0.95rem;padding:8px 14px">💾 Space Complexity: <strong>${cx.space}</strong></div>
    </div>
    
    <div class="reason" style="margin-bottom:14px;line-height:1.5;background:var(--panel-2);padding:10px 12px;border-radius:8px;border:1px solid var(--border)">
      <strong style="color:var(--accent)">Algorithmic Asymptotics:</strong> ${cx.reason}
    </div>

    <h4 class="sub-section-title" style="margin:16px 0 8px;font-size:0.85rem">🎨 Static Heatmap Classification Legend</h4>
    <div class="heatmap-legend" style="margin-bottom:14px">
      <span class="legend-chip green" title="Constant Time / Branching"><span class="dot"></span>O(1) Branch Condition</span>
      <span class="legend-chip blue" title="Logarithmic Search / Halving"><span class="dot"></span>O(log n) Halving / Binary Search</span>
      <span class="legend-chip yellow" title="Linear Iteration"><span class="dot"></span>O(n) Single Loop</span>
      <span class="legend-chip purple" title="Linearithmic Sorting"><span class="dot"></span>O(n log n) Sort Pass</span>
      <span class="legend-chip red" title="Nested Loop Hot-spot"><span class="dot"></span>O(n²) Nested Loop</span>
      <span class="legend-chip magenta" title="Exponential Recursion"><span class="dot"></span>O(2ⁿ) Recursive Call</span>
    </div>

    <h4 class="sub-section-title" style="margin:16px 0 8px;font-size:0.85rem">🔍 AST Structural Complexity Breakdown</h4>
    <div class="detail-box">
      <div class="detail-row"><span>Linear Loops:</span><strong>${cx.loops}</strong></div>
      <div class="detail-row"><span>Nested Loop Depth:</span><strong>${cx.nested} (Max Depth: ${cx.maxNest})</strong></div>
      <div class="detail-row"><span>Branching Recursion:</span><strong>${cx.recursion} call(s)</strong></div>
      <div class="detail-row"><span>Sorting Passes (.sort):</span><strong>${cx.sortUsed ? 'Detected [O(n log n)]' : 'None'}</strong></div>
      <div class="detail-row"><span>Hash / Dictionary Lookups:</span><strong>${cx.hashUsed ? 'Detected [O(1) avg]' : 'None'}</strong></div>
    </div>`;

  const gradeColor = q.overall >= 85 ? 'var(--success)' : q.overall >= 70 ? 'var(--accent)' : 'var(--warning)';

  document.getElementById('qualityView').innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;background:var(--panel-2);border:1px solid var(--border);border-radius:10px;padding:14px;margin-bottom:16px">
      <div>
        <div style="font-size:0.75rem;color:var(--muted);text-transform:uppercase;font-weight:700;letter-spacing:0.5px">Maintainability Score</div>
        <div style="font-size:1.85rem;font-weight:800;color:${gradeColor};font-family:'Fira Code',monospace">${q.overall}<span style="font-size:1rem;color:var(--muted)">/100</span></div>
      </div>
      <div style="text-align:right">
        <div style="font-size:0.75rem;color:var(--muted);text-transform:uppercase;font-weight:700;letter-spacing:0.5px">Architectural Grade</div>
        <div style="font-size:1.6rem;font-weight:800;color:${gradeColor}">${q.grade}</div>
      </div>
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:14px">
      <div style="background:var(--panel-2);padding:8px 10px;border-radius:6px;border:1px solid var(--border)">
        <div style="font-size:0.7rem;color:var(--muted)">Cyclomatic Complexity (M)</div>
        <div style="font-size:1rem;font-weight:700;color:var(--text)">M = ${q.cyclomaticComplexity} <span style="font-size:0.72rem;color:var(--accent)">(${q.cycloRisk})</span></div>
      </div>
      <div style="background:var(--panel-2);padding:8px 10px;border-radius:6px;border:1px solid var(--border)">
        <div style="font-size:0.7rem;color:var(--muted)">Cognitive Load</div>
        <div style="font-size:1rem;font-weight:700;color:var(--text)">${q.cognitiveComplexity} pts <span style="font-size:0.72rem;color:var(--muted)">(Max Depth: ${q.checks.maxDepth})</span></div>
      </div>
    </div>

    <h4 class="sub-section-title" style="margin:12px 0 8px;font-size:0.82rem">📊 Static Code Heuristics</h4>
    ${qualityBar('Readability & Naming Hygiene', q.readability)}
    ${qualityBar('Control Flow & Complexity', q.complexity)}
    ${qualityBar('Maintainability Index (SEI)', q.maintainability)}
    ${qualityBar('Error Resilience & Safety', q.errHandling)}
    ${qualityBar('Execution Efficiency', q.performance)}

    <h4 class="sub-section-title" style="margin:16px 0 8px;font-size:0.82rem">🛡️ Static Code Smells & Findings</h4>
    <div style="background:var(--panel-2);border:1px solid var(--border);border-radius:8px;padding:10px 12px;margin-bottom:12px">
      ${q.smells.map(s => `<div style="font-size:0.78rem;margin:4px 0;display:flex;align-items:flex-start;gap:6px"><span style="color:${s.includes('Zero') ? 'var(--success)' : 'var(--warning)'}">${s.includes('Zero') ? '✓' : '⚠️'}</span><span>${escapeHtml(s)}</span></div>`).join('')}
    </div>

    <h4 class="sub-section-title" style="margin:16px 0 8px;font-size:0.82rem">💡 Code Review & Refactoring Insights</h4>
    <div style="background:var(--panel-2);border:1px solid var(--border);border-radius:8px;padding:10px 12px">
      ${q.recommendations.map(r => `<div style="font-size:0.78rem;margin:4px 0;display:flex;align-items:flex-start;gap:6px"><span style="color:var(--accent)">💡</span><span>${escapeHtml(r)}</span></div>`).join('')}
    </div>
  `;

  if (switchTab) {
    const currTab = document.querySelector('.tab.active')?.dataset.tab;
    if (currTab !== 'complexity' && currTab !== 'quality') {
      document.querySelectorAll('.tab').forEach(x => x.classList.remove('active'));
      document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
      const targetTab = document.querySelector('.tab[data-tab="complexity"]');
      const targetPane = document.querySelector('.tab-pane[data-pane="complexity"]');
      if (targetTab && targetPane) {
        targetTab.classList.add('active');
        targetPane.classList.add('active');
      }
    }
  }

  toast('Static AST analysis complete', 'ok');
}

function qualityBar(label, score) {
  return `<div class="bar">
    <div class="bar-label"><span>${label}</span><span>${score}/100</span></div>
    <div class="quality-bar"><div style="width:${score}%"></div></div>
  </div>`;
}

function exportReport() {
  if (!AppState.execution) { toast('Run code first', 'err'); return; }
  const report = {
    timestamp: new Date().toISOString(),
    code: Editor.getCode(),
    exitCode: AppState.execution.exitCode,
    output: AppState.execution.output,
    error: AppState.execution.error,
    totalSteps: AppState.steps.length,
    complexity: Analyzer.analyzeComplexity(Editor.getCode()),
    quality: Analyzer.analyzeQuality(Editor.getCode()),
    steps: AppState.steps.map(s => ({ line: s.line, note: s.note, type: s.eventType }))
  };
  const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `codelens-report-${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
  toast('Report exported', 'ok');
}

function escapeHtml(s) {
  return s.replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
}

function initTabs() {
  document.querySelectorAll('.tab').forEach(t => {
    t.onclick = () => {
      const tabName = t.dataset.tab;
      document.querySelectorAll('.tab').forEach(btn => btn.classList.toggle('active', btn === t));
      document.querySelectorAll('.tab-pane').forEach(p => p.classList.toggle('active', p.dataset.pane === tabName));
    };
  });
}

function initTemplatesUI() {
  const addModal = document.getElementById('addTemplateModal');
  const closeAddBtn = document.getElementById('closeAddModalBtn');
  const cancelAddBtn = document.getElementById('cancelAddTplBtn');
  const confirmAddBtn = document.getElementById('confirmAddTplBtn');
  const newTplBtn = document.getElementById('dashNewTemplateBtn');
  const saveAsTplBtn = document.getElementById('saveAsTemplateBtn');

  function openAddModal(prefillCode = '') {
    if (!addModal) return;
    const code = prefillCode || Editor.getCode() || '';
    const codeInput = document.getElementById('tplCodeEditor');
    const titleInput = document.getElementById('tplTitleInput');
    const tagInput = document.getElementById('tplTagInput');
    const descInput = document.getElementById('tplDescInput');
    if (codeInput) codeInput.value = code;
    if (titleInput) titleInput.value = code ? CodeLensTemplates.deriveTitle(code) : '';
    if (tagInput) tagInput.value = '★ Custom';
    if (descInput) descInput.value = '';
    addModal.classList.add('active');
  }

  function closeAddModal() {
    if (addModal) addModal.classList.remove('active');
  }

  if (newTplBtn) newTplBtn.onclick = () => openAddModal('');
  if (saveAsTplBtn) {
    saveAsTplBtn.style.display = 'inline-block';
    saveAsTplBtn.onclick = () => openAddModal(Editor.getCode());
  }
  if (closeAddBtn) closeAddBtn.onclick = closeAddModal;
  if (cancelAddBtn) cancelAddBtn.onclick = closeAddModal;

  if (addModal) {
    addModal.onclick = (e) => {
      if (e.target === addModal) closeAddModal();
    };
  }

  if (confirmAddBtn) {
    confirmAddBtn.onclick = () => {
      const code = document.getElementById('tplCodeEditor')?.value || '';
      const title = document.getElementById('tplTitleInput')?.value || '';
      const tag = document.getElementById('tplTagInput')?.value || '';
      const desc = document.getElementById('tplDescInput')?.value || '';

      if (!code.trim()) {
        toast('Please enter code for the template', 'err');
        return;
      }

      try {
        CodeLensTemplates.addCustomTemplate(code, title, tag, desc);
        closeAddModal();
        renderDashboard();
        toast('Template saved to Quick Start Templates! ⭐', 'ok');
      } catch (err) {
        toast(err.message || 'Failed to save template', 'err');
      }
    };
  }
}

document.addEventListener('DOMContentLoaded', () => {
  applyTheme(Storage.getTheme());
  Editor.init();

  document.querySelectorAll('.nav-link').forEach(l => l.onclick = () => switchView(l.dataset.view));
  document.querySelectorAll('[data-goto]').forEach(b => b.onclick = () => switchView(b.dataset.goto));
  
  const themeToggle = document.getElementById('themeToggle');
  if (themeToggle) {
    themeToggle.onclick = () => applyTheme(AppState.theme === 'dark' ? 'light' : 'dark');
  }

  const runBtn = document.getElementById('runBtn');
  if (runBtn) runBtn.onclick = handleRun;

  const resetBtn = document.getElementById('resetBtn');
  if (resetBtn) resetBtn.onclick = resetWorkspace;

  const saveBtn = document.getElementById('saveBtn');
  if (saveBtn) {
    saveBtn.onclick = () => {
      const code = Editor.getCode();
      if (!code.trim()) { toast('Nothing to save', 'err'); return; }
      CodeLensHistory.add({ code, language: 'javascript', exitCode: 0, stdout: '(saved)', stderr: '', steps: 0, time: 'manual', timestamp: Date.now() });
      toast('Saved to history', 'ok');
    };
  }

  const analyzeBtn = document.getElementById('analyzeBtn');
  if (analyzeBtn) analyzeBtn.onclick = renderAnalysis;

  const loadExBtn = document.getElementById('loadExampleBtn');
  if (loadExBtn) {
    loadExBtn.onclick = () => {
      const keys = Object.keys(Editor.EXAMPLES);
      const pick = keys[Math.floor(Math.random() * keys.length)];
      Editor.load(pick);
      const code = Editor.getCode();
      const heatmap = Analyzer.getLineHeatmap(code);
      Visualizer.renderCodeTrace(code.split('\n'), null, null, heatmap);
      toast('Loaded: ' + pick);
    };
  }

  const exportBtn = document.getElementById('exportReportBtn');
  if (exportBtn) exportBtn.onclick = exportReport;

  const tracePlayBtn = document.getElementById('tracePlay');
  if (tracePlayBtn) tracePlayBtn.onclick = playTrace;

  const traceNextBtn = document.getElementById('traceNext');
  if (traceNextBtn) traceNextBtn.onclick = traceNext;

  const tracePrevBtn = document.getElementById('tracePrev');
  if (tracePrevBtn) tracePrevBtn.onclick = tracePrev;

  const traceFirstBtn = document.getElementById('traceFirst');
  if (traceFirstBtn) traceFirstBtn.onclick = traceFirst;

  const traceLastBtn = document.getElementById('traceLast');
  if (traceLastBtn) traceLastBtn.onclick = traceLast;

  const traceResetBtn = document.getElementById('traceReset');
  if (traceResetBtn) traceResetBtn.onclick = traceReset;

  const traceSlider = document.getElementById('traceSlider');
  if (traceSlider) traceSlider.oninput = (e) => renderStep(parseInt(e.target.value));

  document.addEventListener('keydown', (e) => {
    if (AppState.currentView === 'workspace') {
      if (e.key === 'F5' && !e.shiftKey) {
        e.preventDefault();
        if (AppState.steps?.length) playTrace();
        else handleRun();
        return;
      }
      if (e.key === 'F5' && e.shiftKey) {
        e.preventDefault();
        resetWorkspace();
        return;
      }
      if (e.key === 'F10') {
        e.preventDefault();
        traceNext();
        return;
      }
      if (e.key === 'F11') {
        e.preventDefault();
        tracePrev();
        return;
      }
      if (e.key === 'Escape') {
        if (AppState.isPlaying) pauseTrace();
      }
    }

    if (AppState.currentView !== 'workspace') return;
    if (e.target.tagName === 'TEXTAREA' || e.target.tagName === 'INPUT') return;
    
    if (e.code === 'Space') { e.preventDefault(); traceNext(); }
    else if (e.key === 'ArrowLeft' && !e.shiftKey) { e.preventDefault(); tracePrev(); }
    else if (e.key === 'ArrowRight' && !e.shiftKey) { e.preventDefault(); traceNext(); }
    else if (e.key === 'Home' || (e.key === 'ArrowLeft' && e.shiftKey)) { e.preventDefault(); traceFirst(); }
    else if (e.key === 'End' || (e.key === 'ArrowRight' && e.shiftKey)) { e.preventDefault(); traceLast(); }
  });

  const algoSelect = document.getElementById('algoSelect');
  if (algoSelect) {
    algoSelect.onchange = () => {
      const type = algoSelect.value;
      const inputEl = document.getElementById('algoInput');
      const targetEl = document.getElementById('algoTarget');
      if (inputEl && targetEl) {
        if (type === 'binarySearch' || type === 'jumpSearch' || type === 'exponentialSearch') {
          inputEl.value = '10, 20, 30, 40, 50, 60, 70, 80';
          targetEl.value = '50';
        } else if (type === 'linearSearch') {
          inputEl.value = '42, 18, 93, 27, 65, 34';
          targetEl.value = '27';
        } else if (type === 'twoSum') {
          inputEl.value = '10, 20, 30, 40, 50';
          targetEl.value = '50';
        } else if (type === 'kadane') {
          inputEl.value = '-2, 1, -3, 4, -1, 2, 1, -5, 4';
          targetEl.value = '';
        } else if (type === 'dutchFlag') {
          inputEl.value = '2, 0, 2, 1, 1, 0, 2, 1, 0';
          targetEl.value = '';
        } else if (type === 'slidingWindow') {
          inputEl.value = '2, 1, 5, 1, 3, 2, 8, 4, 6';
          targetEl.value = '3';
        } else if (type === 'fibonacci') {
          inputEl.value = '10';
          targetEl.value = '10';
        } else if (type === 'countPrimes') {
          inputEl.value = '30';
          targetEl.value = '30';
        } else {
          inputEl.value = '64, 34, 25, 12, 22, 11, 90';
          targetEl.value = '';
        }
      }
      buildAlgoSteps();
    };
  }

  const algoBuild = document.getElementById('algoBuild');
  if (algoBuild) algoBuild.onclick = buildAlgoSteps;

  const algoNextBtn = document.getElementById('algoNext');
  if (algoNextBtn) algoNextBtn.onclick = algoNext;

  const algoPrevBtn = document.getElementById('algoPrev');
  if (algoPrevBtn) algoPrevBtn.onclick = algoPrev;

  const algoPlayBtn = document.getElementById('algoPlay');
  if (algoPlayBtn) algoPlayBtn.onclick = algoPlay;

  const algoResetBtn = document.getElementById('algoReset');
  if (algoResetBtn) algoResetBtn.onclick = algoReset;

  const algoSlider = document.getElementById('algoSlider');
  if (algoSlider) algoSlider.oninput = (e) => { AppState.algorithm.current = parseInt(e.target.value); renderAlgoStep(); };

  const clearHistBtn = document.getElementById('clearHistoryBtn');
  if (clearHistBtn) {
    clearHistBtn.onclick = () => {
      if (confirm('Clear all history?')) { CodeLensHistory.clear(); renderHistory(); toast('History cleared'); }
    };
  }

  const searchInput = document.getElementById('historySearch');
  if (searchInput) searchInput.oninput = renderHistory;

  initTabs();
  initTemplatesUI();
  switchView('dashboard');

  Api.fetchPublicFact().then(fact => console.log('[CodeLens] Random fact:', fact));
});