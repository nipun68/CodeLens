const Editor = (() => {
  const EXAMPLES = {
    binarySearch: `let arr = [10, 20, 30, 40, 50];
let target = 40;
let low = 0;
let high = arr.length - 1;

while (low <= high) {
  let mid = Math.floor((low + high) / 2);
  if (arr[mid] === target) {
    console.log("Found at index", mid);
    break;
  }
  if (arr[mid] < target) {
    low = mid + 1;
  } else {
    high = mid - 1;
  }
}`,

    bubbleSort: `let arr = [5, 2, 9, 1, 5, 6];
let n = arr.length;

for (let i = 0; i < n - 1; i++) {
  for (let j = 0; j < n - 1 - i; j++) {
    if (arr[j] > arr[j + 1]) {
      let temp = arr[j];
      arr[j] = arr[j + 1];
      arr[j + 1] = temp;
    }
  }
}
console.log("Sorted:", arr);`,

    factorial: `function factorial(n) {
  if (n <= 1) {
    return 1;
  }
  return n * factorial(n - 1);
}

let result = factorial(5);
console.log("5! =", result);`,

    arraySum: `let nums = [1, 2, 3, 4, 5];
let sum = 0;

for (let i = 0; i < nums.length; i++) {
  sum = sum + nums[i];
}

console.log("Sum:", sum);
console.log("Average:", sum / nums.length);`,

    errorDemo: `let arr = [1, 2, 3];

for (let i = 0; i < arr.length; i++) {
  console.log(arr[i + 1]);
}`,

    linearSearch: `let arr = [10, 20, 30, 40, 50];
let target = 30;
let found = -1;

for (let i = 0; i < arr.length; i++) {
  if (arr[i] === target) {
    found = i;
    break;
  }
}

if (found !== -1) {
  console.log("Found at index", found);
} else {
  console.log("Not found");
}`,

    objectDemo: `let person = {
  name: "Alice",
  age: 25,
  city: "NYC"
};

console.log("Name:", person.name);
console.log("Age:", person.age);

person.age = 26;
console.log("Updated age:", person.age);`,

    fibonacci: `let n = 10;
let fib = [0, 1];

for (let i = 2; i < n; i++) {
  fib[i] = fib[i - 1] + fib[i - 2];
}

console.log("Fibonacci sequence:", fib);
console.log("10th number:", fib[9]);`
  };

  const META = [
    { key: 'binarySearch', title: 'Binary Search', tag: 'O(log n)', desc: 'Divide & conquer search on sorted array' },
    { key: 'bubbleSort', title: 'Bubble Sort', tag: 'O(n\u00b2)', desc: 'Sort by swapping adjacent elements' },
    { key: 'factorial', title: 'Factorial (Recursion)', tag: 'O(n)', desc: 'Classic recursive function' },
    { key: 'arraySum', title: 'Array Sum', tag: 'O(n)', desc: 'Loop through array to compute sum' },
    { key: 'errorDemo', title: 'Bug Demo (Error)', tag: 'Debug', desc: 'See how errors are caught and explained' },
    { key: 'linearSearch', title: 'Linear Search', tag: 'O(n)', desc: 'Sequential scan of array' },
    { key: 'objectDemo', title: 'Object Demo', tag: 'O(1)', desc: 'Work with objects and properties' },
    { key: 'fibonacci', title: 'Fibonacci Sequence', tag: 'O(n)', desc: 'Generate Fibonacci numbers with loop' }
  ];

  const undoStack = [];
  const redoStack = [];
  const MAX_HISTORY = 100;

  // ─── Syntax Tokenizer ────────────────────────────────────────────────────────
  const KEYWORDS = new Set([
    'break','case','catch','class','const','continue','debugger','default',
    'delete','do','else','export','extends','finally','for','function','if',
    'import','in','instanceof','let','new','of','return','static','super',
    'switch','throw','try','typeof','var','void','while','with','yield','async','await'
  ]);
  const BOOLEANS = new Set([
    'true','false','null','undefined','NaN','Infinity','this','arguments'
  ]);
  const BUILTINS = new Set([
    'console','Math','Array','Object','String','Number','Boolean','Symbol',
    'Date','RegExp','Error','Map','Set','WeakMap','WeakSet','Promise','Proxy',
    'Reflect','JSON','parseInt','parseFloat','isNaN','isFinite','encodeURI',
    'decodeURI','encodeURIComponent','decodeURIComponent','setTimeout',
    'clearTimeout','setInterval','clearInterval','fetch','document','window',
    'navigator','location','history','alert','confirm','prompt','globalThis'
  ]);

  function escHtml(s) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function span(cls, text) {
    return '<span class="syn-' + cls + '">' + escHtml(text) + '</span>';
  }

  /**
   * Tokenize a single line of JS source into HTML with syntax spans.
   * Handles strings, template literals, numbers, identifiers, properties,
   * operators, and punctuation.
   */
  function tokenizeLine(line) {
    let out = '';
    let i = 0;
    const len = line.length;

    while (i < len) {
      const ch = line[i];
      const rest = line.slice(i);

      // ── Single-line comment
      if (ch === '/' && line[i + 1] === '/') {
        out += span('comment', line.slice(i));
        break;
      }

      // ── String literals: " or '
      if (ch === '"' || ch === "'") {
        let j = i + 1;
        while (j < len) {
          if (line[j] === '\\') { j += 2; continue; }
          if (line[j] === ch)   { j++; break; }
          j++;
        }
        out += span('string', line.slice(i, j));
        i = j;
        continue;
      }

      // ── Template literal (backtick)
      if (ch === '`') {
        let j = i + 1;
        while (j < len) {
          if (line[j] === '\\') { j += 2; continue; }
          if (line[j] === '`')  { j++; break; }
          j++;
        }
        out += span('string', line.slice(i, j));
        i = j;
        continue;
      }

      // ── Numbers
      if (/[0-9]/.test(ch) || (ch === '.' && /[0-9]/.test(line[i + 1] || ''))) {
        const m = rest.match(/^(0x[\da-fA-F]+|0b[01]+|0o[0-7]+|\d+\.?\d*([eE][+-]?\d+)?)/);
        if (m) {
          out += span('number', m[0]);
          i += m[0].length;
          continue;
        }
      }

      // ── Identifiers / keywords
      if (/[a-zA-Z_$]/.test(ch)) {
        const m = rest.match(/^[a-zA-Z_$][\w$]*/);
        if (m) {
          const word = m[0];
          const afterWord = line.slice(i + word.length).trimStart();
          const isCall = afterWord[0] === '(';
          if (KEYWORDS.has(word)) {
            out += span('keyword', word);
          } else if (BOOLEANS.has(word)) {
            out += span('boolean', word);
          } else if (BUILTINS.has(word)) {
            out += span('builtin', word);
          } else if (isCall) {
            out += span('function', word);
          } else {
            out += span('plain', word);
          }
          i += word.length;
          continue;
        }
      }

      // ── Property access  .identifier
      if (ch === '.' && /[a-zA-Z_$]/.test(line[i + 1] || '')) {
        const m = line.slice(i + 1).match(/^[a-zA-Z_$][\w$]*/);
        if (m) {
          const afterProp = line.slice(i + 1 + m[0].length).trimStart();
          const isCall = afterProp[0] === '(';
          out += span('punctuation', '.');
          out += span(isCall ? 'function' : 'property', m[0]);
          i += 1 + m[0].length;
          continue;
        }
      }

      // ── Operators
      const opMatch = rest.match(/^(===|!==|==|!=|<=|>=|=>|&&|\|\||>>>=|>>>|>>|<<|\?\?|\?\.|[+\-*/%&|^~!<>=?:])/);
      if (opMatch) {
        out += span('operator', opMatch[0]);
        i += opMatch[0].length;
        continue;
      }

      // ── Punctuation
      if ('{}[]();,'.includes(ch)) {
        out += span('punctuation', ch);
        i++;
        continue;
      }

      // ── Whitespace and anything else
      out += escHtml(ch);
      i++;
    }

    return out;
  }

  /**
   * Multi-line tokenizer — handles block comments (/* ... * /).
   * Template literals that span lines are left to per-line handling.
   */
  function tokenize(code) {
    const lines = code.split('\n');
    const result = [];
    let inBlockComment = false;

    for (let li = 0; li < lines.length; li++) {
      const line = lines[li];

      if (inBlockComment) {
        const end = line.indexOf('*/');
        if (end !== -1) {
          result.push(span('comment', line.slice(0, end + 2)) + tokenizeLine(line.slice(end + 2)));
          inBlockComment = false;
        } else {
          result.push(span('comment', line));
        }
        continue;
      }

      // Look for /* that isn't inside a string or after //
      const singleLineCommentIdx = line.indexOf('//');
      const blockCommentIdx = line.indexOf('/*');

      if (blockCommentIdx !== -1 &&
          (singleLineCommentIdx === -1 || blockCommentIdx < singleLineCommentIdx)) {
        const bcEnd = line.indexOf('*/', blockCommentIdx + 2);
        if (bcEnd !== -1) {
          // Block comment opens and closes on the same line
          result.push(
            tokenizeLine(line.slice(0, blockCommentIdx)) +
            span('comment', line.slice(blockCommentIdx, bcEnd + 2)) +
            tokenizeLine(line.slice(bcEnd + 2))
          );
        } else {
          result.push(tokenizeLine(line.slice(0, blockCommentIdx)) + span('comment', line.slice(blockCommentIdx)));
          inBlockComment = true;
        }
        continue;
      }

      result.push(tokenizeLine(line));
    }

    return result.join('\n');
  }

  // ─── Overlay update ──────────────────────────────────────────────────────────
  function updateSyntaxOverlay() {
    const ed = document.getElementById('codeEditor');
    const overlay = document.getElementById('syntaxOverlay');
    if (!ed || !overlay) return;
    overlay.innerHTML = tokenize(ed.value);
    overlay.scrollTop  = ed.scrollTop;
    overlay.scrollLeft = ed.scrollLeft;
  }

  // ─── History helpers ─────────────────────────────────────────────────────────
  function pushHistory(value, cursorStart, cursorEnd) {
    if (undoStack.length && undoStack[undoStack.length - 1].value === value) return;
    undoStack.push({ value, cursorStart: cursorStart ?? 0, cursorEnd: cursorEnd ?? 0 });
    if (undoStack.length > MAX_HISTORY) undoStack.shift();
    redoStack.length = 0;
  }

  function undo() {
    const ed = document.getElementById('codeEditor');
    if (undoStack.length <= 1) {
      toast('Nothing to undo', 'err');
      return;
    }
    const current = undoStack.pop();
    redoStack.push(current);
    const prev = undoStack[undoStack.length - 1];
    if (prev) {
      ed.value = prev.value;
      ed.selectionStart = prev.cursorStart;
      ed.selectionEnd = prev.cursorEnd;
      AppState.code = prev.value;
      updateLineNumbers();
      updateSyntaxOverlay();
      if (!AppState.steps?.length) {
        const heatmap = Analyzer.getLineHeatmap(ed.value);
        Visualizer.renderCodeTrace(ed.value.split('\n'), null, null, heatmap);
      }
      toast('Undo', 'ok');
    }
  }

  function redo() {
    const ed = document.getElementById('codeEditor');
    if (!redoStack.length) {
      toast('Nothing to redo', 'err');
      return;
    }
    const next = redoStack.pop();
    undoStack.push(next);
    ed.value = next.value;
    ed.selectionStart = next.cursorStart;
    ed.selectionEnd = next.cursorEnd;
    AppState.code = next.value;
    updateLineNumbers();
    updateSyntaxOverlay();
    if (!AppState.steps?.length) {
      const heatmap = Analyzer.getLineHeatmap(ed.value);
      Visualizer.renderCodeTrace(ed.value.split('\n'), null, null, heatmap);
    }
    toast('Redo', 'ok');
  }

  function load(key) {
    const editor = document.getElementById('codeEditor');
    let codeToLoad = EXAMPLES[key];
    if (!codeToLoad && typeof CodeLensTemplates !== 'undefined') {
      const customTpl = CodeLensTemplates.getTemplateByKeyOrId(key);
      if (customTpl) codeToLoad = customTpl.code;
    }
    if (codeToLoad === undefined) codeToLoad = '';
    editor.value = codeToLoad;
    AppState.code = editor.value;
    pushHistory(editor.value, 0, 0);
    updateLineNumbers();
    updateSyntaxOverlay();
    if (!AppState.steps?.length) {
      const heatmap = Analyzer.getLineHeatmap(editor.value);
      Visualizer.renderCodeTrace(editor.value.split('\n'), null, null, heatmap);
    }
  }

  function getCode() { return document.getElementById('codeEditor').value; }

  function setCode(s) {
    const editor = document.getElementById('codeEditor');
    editor.value = s;
    AppState.code = s;
    pushHistory(editor.value, 0, 0);
    updateLineNumbers();
    updateSyntaxOverlay();
    if (!AppState.steps?.length) {
      const heatmap = Analyzer.getLineHeatmap(editor.value);
      Visualizer.renderCodeTrace(editor.value.split('\n'), null, null, heatmap);
    }
  }

  function updateLineNumbers() {
    const editor = document.getElementById('codeEditor');
    const lnEl = document.getElementById('lineNumbers');
    if (!editor || !lnEl) return;
    const val = editor.value;
    const lines = val.split('\n').length;

    let heatmap = {};
    try {
      heatmap = Analyzer.getLineHeatmap(val) || {};
    } catch {
      heatmap = {};
    }

    let html = '';
    for (let i = 1; i <= lines; i++) {
      const bp = AppState.breakpoints.has(i) ? ' bp' : '';
      let heatCls = '';
      let title = 'Click to toggle breakpoint';
      if (heatmap[i] === 'yellow') {
        heatCls = ' heat-yellow';
        title = 'Linear Loop [O(n)]';
      } else if (heatmap[i] === 'red') {
        heatCls = ' heat-red';
        title = 'Nested Loop [O(n\u00b2)+]';
      } else if (heatmap[i] === 'green') {
        heatCls = ' heat-green';
        title = 'Branch Condition [O(1)]';
      } else if (heatmap[i] === 'blue') {
        heatCls = ' heat-blue';
        title = 'Divide & Conquer / Halving [O(log n)]';
      } else if (heatmap[i] === 'purple') {
        heatCls = ' heat-purple';
        title = 'Sorting / Linearithmic [O(n log n)]';
      } else if (heatmap[i] === 'magenta') {
        heatCls = ' heat-magenta';
        title = 'Recursive Branching [O(2\u207f)]';
      }

      html += '<span class="ln' + bp + heatCls + '" data-line="' + i + '" title="' + title + '">' + i + '</span>';
    }
    lnEl.innerHTML = html;

    lnEl.querySelectorAll('.ln').forEach(ln => {
      ln.onclick = () => {
        const line = parseInt(ln.dataset.line);
        if (AppState.breakpoints.has(line)) AppState.breakpoints.delete(line);
        else AppState.breakpoints.add(line);
        updateLineNumbers();
      };
    });
  }

  function init() {
    const ed = document.getElementById('codeEditor');
    ed.value = EXAMPLES.binarySearch;
    AppState.code = ed.value;
    pushHistory(ed.value, 0, 0);

    let historyDebounce;
    let heatmapDebounce;

    ed.addEventListener('input', () => {
      AppState.code = ed.value;
      updateLineNumbers();
      updateSyntaxOverlay();

      clearTimeout(historyDebounce);
      historyDebounce = setTimeout(() => {
        pushHistory(ed.value, ed.selectionStart, ed.selectionEnd);
      }, 400);

      if (!AppState.steps?.length) {
        clearTimeout(heatmapDebounce);
        heatmapDebounce = setTimeout(() => {
          const heatmap = Analyzer.getLineHeatmap(ed.value);
          Visualizer.renderCodeTrace(ed.value.split('\n'), null, null, heatmap);
        }, 150);
      }
    });

    // Keep overlay scroll in sync with textarea scroll
    ed.addEventListener('scroll', () => {
      const overlay = document.getElementById('syntaxOverlay');
      if (overlay) {
        overlay.scrollTop  = ed.scrollTop;
        overlay.scrollLeft = ed.scrollLeft;
      }
      document.getElementById('lineNumbers').scrollTop = ed.scrollTop;
    });

    ed.addEventListener('keydown', (e) => {
      // Undo
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
        return;
      }

      // Redo
      if (((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') ||
          ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'z')) {
        e.preventDefault();
        redo();
        return;
      }

      // Tab / Shift-Tab indentation
      if (e.key === 'Tab') {
        e.preventDefault();
        const start = ed.selectionStart, end = ed.selectionEnd;
        const val = ed.value;
        const lineStart = val.lastIndexOf('\n', start - 1) + 1;
        let lineEnd = val.indexOf('\n', end);
        if (lineEnd === -1) lineEnd = val.length;

        if (start !== end || e.shiftKey) {
          const selectedText = val.substring(lineStart, lineEnd);
          const lines = selectedText.split('\n');
          const newLines = lines.map(l => {
            if (e.shiftKey) {
              return l.startsWith('  ') ? l.substring(2) : (l.startsWith(' ') ? l.substring(1) : l);
            } else {
              return '  ' + l;
            }
          });
          const replacement = newLines.join('\n');
          ed.value = val.substring(0, lineStart) + replacement + val.substring(lineEnd);
          ed.selectionStart = lineStart;
          ed.selectionEnd = lineStart + replacement.length;
        } else {
          ed.value = val.substring(0, start) + '  ' + val.substring(end);
          ed.selectionStart = ed.selectionEnd = start + 2;
        }
        AppState.code = ed.value;
        updateLineNumbers();
        updateSyntaxOverlay();
        return;
      }

      // Ctrl+/ comment toggle
      if ((e.ctrlKey || e.metaKey) && e.key === '/') {
        e.preventDefault();
        const start = ed.selectionStart, end = ed.selectionEnd;
        const val = ed.value;
        const lineStart = val.lastIndexOf('\n', start - 1) + 1;
        let lineEnd = val.indexOf('\n', end);
        if (lineEnd === -1) lineEnd = val.length;

        const selectedText = val.substring(lineStart, lineEnd);
        const lines = selectedText.split('\n');
        const allCommented = lines.every(l => l.trimStart().startsWith('//'));

        const newLines = lines.map(l => {
          if (allCommented) {
            return l.replace(/(\s*)\/\/\s?/, '$1');
          } else {
            return l.replace(/^(\s*)/, '$1// ');
          }
        });

        const replacement = newLines.join('\n');
        ed.value = val.substring(0, lineStart) + replacement + val.substring(lineEnd);
        ed.selectionStart = lineStart;
        ed.selectionEnd = lineStart + replacement.length;
        AppState.code = ed.value;
        updateLineNumbers();
        updateSyntaxOverlay();
        return;
      }

      // Ctrl+Enter → Run
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        document.getElementById('runBtn').click();
        return;
      }

      // Ctrl+S → Save
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        document.getElementById('saveBtn').click();
        return;
      }

      // F9 / Ctrl+B → Breakpoint
      if (e.key === 'F9' || ((e.ctrlKey || e.metaKey) && e.key === 'b')) {
        e.preventDefault();
        const textBefore = ed.value.substring(0, ed.selectionStart);
        const curLine = textBefore.split('\n').length;
        if (AppState.breakpoints.has(curLine)) {
          AppState.breakpoints.delete(curLine);
          toast('Removed breakpoint at line ' + curLine);
        } else {
          AppState.breakpoints.add(curLine);
          toast('Set breakpoint at line ' + curLine, 'ok');
        }
        updateLineNumbers();
        return;
      }

      // Alt+Arrow → Move line up/down
      if (e.altKey && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
        e.preventDefault();
        const start = ed.selectionStart;
        const val = ed.value;
        const lines = val.split('\n');
        const lineIdx = val.substring(0, start).split('\n').length - 1;

        if (e.key === 'ArrowUp' && lineIdx > 0) {
          const temp = lines[lineIdx];
          lines[lineIdx] = lines[lineIdx - 1];
          lines[lineIdx - 1] = temp;
          ed.value = lines.join('\n');
          ed.selectionStart = ed.selectionEnd = lines.slice(0, lineIdx - 1).join('\n').length + 1;
        } else if (e.key === 'ArrowDown' && lineIdx < lines.length - 1) {
          const temp = lines[lineIdx];
          lines[lineIdx] = lines[lineIdx + 1];
          lines[lineIdx + 1] = temp;
          ed.value = lines.join('\n');
          ed.selectionStart = ed.selectionEnd = lines.slice(0, lineIdx + 1).join('\n').length + 1;
        }
        AppState.code = ed.value;
        updateLineNumbers();
        updateSyntaxOverlay();
        return;
      }
    });

    updateLineNumbers();
    updateSyntaxOverlay();

    const initialHeatmap = Analyzer.getLineHeatmap(ed.value);
    Visualizer.renderCodeTrace(ed.value.split('\n'), null, null, initialHeatmap);
  }

  return { EXAMPLES, META, load, getCode, setCode, init, updateLineNumbers, updateSyntaxOverlay };
})();