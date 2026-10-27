import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { extractTraceFromOutput, normalizeTraceEvents } from '../client/src/reconstruction.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const languageIds = Object.freeze({ python: 109, java: 91, javascript: 102, cpp: 105 });
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const safeOutput = value => {
  if (typeof value !== 'string') return '';
  return value.length > 60000 ? `${value.slice(0, 60000)}\n[Output truncated at 60,000 characters.]` : value;
};

// Lazy loaded header caches
let cppHeaderCache = null;
let pyHeaderCache = null;
let javaHeaderCache = null;

function getCppHeader() {
  if (!cppHeaderCache) {
    try {
      cppHeaderCache = fs.readFileSync(path.join(__dirname, 'headers', 'codelens.hpp'), 'utf8');
    } catch {
      cppHeaderCache = '';
    }
  }
  return cppHeaderCache;
}

function getPyHeader() {
  if (!pyHeaderCache) {
    try {
      pyHeaderCache = fs.readFileSync(path.join(__dirname, 'headers', 'codelens.py'), 'utf8');
    } catch {
      pyHeaderCache = '';
    }
  }
  return pyHeaderCache;
}

function getJavaHeader() {
  if (!javaHeaderCache) {
    try {
      javaHeaderCache = fs.readFileSync(path.join(__dirname, 'headers', 'CodeLensTrace.java'), 'utf8');
    } catch {
      javaHeaderCache = '';
    }
  }
  return javaHeaderCache;
}

/**
 * Instruments standard Java code statements with CodeLens tracing calls
 * without inserting or deleting lines, preserving 100% accurate source-line mapping.
 */
export function instrumentJavaSource(source) {
  const lines = source.split('\n');
  let currentMethod = null;
  const instrumented = [];

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    const lineNum = i + 1;
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*') || trimmed.startsWith('import ') || trimmed.startsWith('package ')) {
      instrumented.push(line);
      continue;
    }

    // Method entry detection (static <type> <name>(<params>) {)
    const methodMatch = line.match(/\bstatic\s+(\w+)\s+(\w+)\s*\(([^)]*)\)\s*\{/);
    if (methodMatch && methodMatch[2] !== 'main') {
      currentMethod = methodMatch[2];
      const params = methodMatch[3].trim();
      let enterCode = `CodeLensTraceEmitter.methodEnter("${currentMethod}", ${lineNum}, "${currentMethod}(" + `;
      if (params) {
        const firstParam = params.split(',')[0].trim().split(/\s+/).pop();
        enterCode += `"${firstParam}=" + ${firstParam} + ")", "${firstParam}", ${firstParam});`;
      } else {
        enterCode += `")");`;
      }
      line = line.replace(/\{/, `{ ${enterCode}`);
      instrumented.push(line);
      continue;
    }

    if (trimmed === '}' && currentMethod) {
      currentMethod = null;
      instrumented.push(line);
      continue;
    }

    // Return statement inside instrumented method
    if (currentMethod && /^\s*return\s+([^;]+);/.test(line)) {
      const retMatch = line.match(/^(\s*)return\s+([^;]+);/);
      if (retMatch) {
        const indent = retMatch[1];
        const expr = retMatch[2].trim();
        line = `${indent}return CodeLensTraceEmitter.methodExit("${currentMethod}", ${lineNum}, ${expr});`;
        instrumented.push(line);
        continue;
      }
    }

    // Collections replacement (e.g. ArrayList, ArrayDeque, LinkedList, HashMap, HashSet, Stack, PriorityQueue)
    const colMatch = line.match(/\b(?:([a-zA-Z0-9_]+)\s*=\s*)?new\s+(ArrayList|ArrayDeque|LinkedList|HashMap|HashSet|Stack|PriorityQueue)<([^>]*)>\(([^)]*)\)/);
    if (colMatch) {
      const varName = colMatch[1] || 'ds';
      const colType = colMatch[2];
      const typeArgs = colMatch[3];
      const constructorArgs = colMatch[4];
      line = line.replace(
        new RegExp(`new\\s+${colType}<${typeArgs.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}>\\(([^)]*)\\)`),
        `new CodeLens${colType}<>${constructorArgs ? `(${constructorArgs})` : `("${varName}")`}`
      );
    }

    // Track Tree Node Instantiation: TreeNode root = new TreeNode(1);
    const treeInitMatch = line.match(/^\s*(?:TreeNode|Node|BinaryTree)\s+(\w+)\s*=\s*new\s+(?:TreeNode|Node|BinaryTree)\(([^)]*)\);/);
    if (treeInitMatch) {
      const rootVar = treeInitMatch[1];
      line = `${line} CodeLensTreeTracker.track(${lineNum}, "tree", ${rootVar}, ${rootVar}, "init", "Created tree root " + ${rootVar}.val);`;
      instrumented.push(line);
      continue;
    }

    // Track Tree Child Pointer Link: root.left = new TreeNode(2); or root.left.right = ...
    const treeLinkMatch = line.match(/^\s*(\w+(?:\.\w+)*)\.(left|right)\s*=\s*([^;]+);/);
    if (treeLinkMatch) {
      const baseVar = treeLinkMatch[1].split('.')[0];
      const side = treeLinkMatch[2];
      line = `${line} CodeLensTreeTracker.track(${lineNum}, "tree", ${baseVar}, null, "link", "Attached ${side} child to tree");`;
      instrumented.push(line);
      continue;
    }

    // Track Tree Traversal Visit: ans.add(curr.val);
    const treeVisitMatch = line.match(/^\s*(\w+)\.add\(\s*(\w+)\.val\s*\);/);
    if (treeVisitMatch) {
      const nodeVar = treeVisitMatch[2];
      line = `${line} CodeLensTreeTracker.recordVisit(${lineNum}, "tree", null, ${nodeVar}, ${nodeVar}.val);`;
      instrumented.push(line);
      continue;
    }

    // Track Stack push of Tree Node: st.push(curr);
    const stackPushMatch = line.match(/^\s*(\w+)\.push\(\s*(\w+)\s*\);/);
    if (stackPushMatch) {
      const nodeVar = stackPushMatch[2];
      line = `${line} if (CodeLensTreeTracker.getRoot() != null) { CodeLensTreeTracker.trackStack(${lineNum}, "tree", null, ${nodeVar}, "push", "Pushed node to traversal stack"); }`;
      instrumented.push(line);
      continue;
    }

    // Track Tree traversal pointer move: curr = curr.left; or curr = curr.right;
    const treeStepMatch = line.match(/^\s*(\w+)\s*=\s*\1\.(left|right);/);
    if (treeStepMatch) {
      const nodeVar = treeStepMatch[1];
      const side = treeStepMatch[2];
      line = `${line} if (CodeLensTreeTracker.getRoot() != null) { CodeLensTreeTracker.track(${lineNum}, "tree", null, ${nodeVar}, "traverse", "Traverse ${side}"); }`;
      instrumented.push(line);
      continue;
    }

    // Track Stack pop to node: curr = st.pop();
    const stackPopNodeMatch = line.match(/^\s*(\w+)\s*=\s*(\w+)\.pop\(\);/);
    if (stackPopNodeMatch) {
      const nodeVar = stackPopNodeMatch[1];
      line = `${line} if (CodeLensTreeTracker.getRoot() != null) { CodeLensTreeTracker.track(${lineNum}, "tree", null, ${nodeVar}, "pop", "Popped node from traversal stack"); }`;
      instrumented.push(line);
      continue;
    }

    // Track array declarations: int[] arr = {5, 2, 9};
    const arrDeclMatch = line.match(/^\s*(int|double|long|String|Object)\[\]\s+(\w+)\s*=\s*(\{[^}]+\}|new\s+[^;]+);/);
    if (arrDeclMatch) {
      const arrName = arrDeclMatch[2];
      line = `${line} CodeLensArray.track(${lineNum}, "${arrName}", ${arrName}, "Initialized array ${arrName} = " + java.util.Arrays.toString(${arrName}));`;
      instrumented.push(line);
      continue;
    }

    // Track array element assignments: arr[0] = 1;
    const arrAssignMatch = line.match(/^\s*(\w+)\[([^\]]+)\]\s*=\s*([^;]+);/);
    if (arrAssignMatch) {
      const arrName = arrAssignMatch[1];
      const idxExpr = arrAssignMatch[2].trim();
      line = `${line} CodeLensArray.assign(${lineNum}, "${arrName}", ${arrName}, ${idxExpr}, ${arrName}[${idxExpr}]);`;
      instrumented.push(line);
      continue;
    }

    // Track Arrays.sort(arr);
    const sortMatch = line.match(/^\s*Arrays\.sort\((\w+)\);/);
    if (sortMatch) {
      const arrName = sortMatch[1];
      line = `${line} CodeLensArray.sort(${lineNum}, "${arrName}", ${arrName});`;
      instrumented.push(line);
      continue;
    }

    // Track primitive variables: int a = 10;
    const primMatch = line.match(/^\s*(int|double|long|boolean|float)\s+(\w+)\s*=\s*([^;]+);/);
    if (primMatch && !colMatch) {
      const varName = primMatch[2];
      line = `${line} CodeLensTraceEmitter.traceVar(${lineNum}, "${varName}", ${varName});`;
      instrumented.push(line);
      continue;
    }

    instrumented.push(line);
  }

  return instrumented.join('\n');
}

/**
 * Prepares source code for isolated execution.
 * If user code utilizes CodeLens data structure instrumentation wrappers,
 * or if mode is 'trace', injects tested headers and instrumentation while preserving line numbering.
 */
export function prepareSourceForExecution(source, language, mode = 'run') {
  if (typeof source !== 'string') return source;

  if (language === 'cpp') {
    const hasHeaderInclude = /#include\s*[<"](?:codelens(?:\.hpp|\/trace\.hpp)?)[>"]/i.test(source);
    const usesNamespace = /\bcodelens::(?:queue|stack|vector|map|tree_node|tree_tracker|graph|linked_list|priority_queue)\b/.test(source);

    if (hasHeaderInclude || usesNamespace || mode === 'trace') {
      const header = getCppHeader();
      if (hasHeaderInclude) {
        // Drop the include line and substitute with the full header + line directive
        return source.replace(/#include\s*[<"](?:codelens(?:\.hpp|\/trace\.hpp)?)[>"]/i, `${header}\n#line 1 "main.cpp"\n`);
      }
      return `${header}\n#line 1 "main.cpp"\n${source}`;
    }
  } else if (language === 'python') {
    const hasPyImport = /(?:import\s+codelens|from\s+codelens\s+import|CodeLensQueue|CodeLensStack|CodeLensList|CodeLensMap|CodeLensTreeNode|CodeLensGraph|CodeLensLinkedList|CodeLensHeap)/.test(source);
    if (hasPyImport || mode === 'trace') {
      const header = getPyHeader();
      // Replace import codelens statements or prepend
      const strippedSource = source.replace(/^\s*(?:import\s+codelens|from\s+codelens\s+import\s+.*)$/gm, '# [CodeLens Instrumentation Active]');
      return `${header}\n${strippedSource}`;
    }
  } else if (language === 'java') {
    if (source.includes('// --- CodeLens Runtime Instrumentation ---')) {
      return source;
    }

    const usesJavaWrappers = /(?:CodeLensQueue|CodeLensStack|CodeLensList|CodeLensMap|CodeLensArray|CodeLensArrayList|CodeLensArrayDeque|CodeLensTraceEmitter|CodeLensTreeTracker|CodeLensGraphTracker|TreeNode|CodeLensPriorityQueue)/.test(source);

    if (mode === 'trace' || usesJavaWrappers) {
      const header = getJavaHeader();
      let instrumented = source;

      if (mode === 'trace') {
        instrumented = instrumentJavaSource(source);
      }

      const hasUserImport = /^\s*import\s+/m.test(instrumented);
      const prefix = hasUserImport ? '' : 'import java.util.*;\n';
      return `${prefix}${instrumented}\n\n// --- CodeLens Runtime Instrumentation ---\n${header}`;
    }
  }

  return source;
}

/**
 * Parses compiler diagnostics and runtime exception tracebacks to extract structured error location
 * (category, line, column, filename, clean message, source line excerpt) and map line offsets.
 */
export function parseExecutionDiagnostic(language, compileOutput, stderr, statusId, source = '', lineOffset = 0) {
  const sourceLines = typeof source === 'string' ? source.split('\n') : [];

  if (compileOutput) {
    if (language === 'java') {
      const match = compileOutput.match(/(?:Main\.java|[A-Za-z0-9_]+\.java):(\d+):(?:\s*(\d+):)?\s*(?:error:\s*)?([^\r\n]+)/i);
      if (match) {
        const rawLine = parseInt(match[1], 10);
        const line = Math.max(1, rawLine - lineOffset);
        const col = match[2] ? parseInt(match[2], 10) : null;
        const excerpt = sourceLines[line - 1] || '';
        return {
          category: 'compilation',
          line,
          column: col,
          filename: 'Main.java',
          message: match[3].trim(),
          excerpt,
          raw: compileOutput
        };
      }
    }

    if (language === 'cpp') {
      const match = compileOutput.match(/(?:main\.cpp|<stdin>|[A-Za-z0-9_]+\.cpp):(\d+):(\d+):\s*(?:fatal\s+)?error:\s*([^\r\n]+)/i);
      if (match) {
        const line = parseInt(match[1], 10);
        const col = parseInt(match[2], 10);
        const excerpt = sourceLines[line - 1] || '';
        return {
          category: 'compilation',
          line,
          column: col,
          filename: 'main.cpp',
          message: match[3].trim(),
          excerpt,
          raw: compileOutput
        };
      }
    }

    // Generic compiler error fallback
    const genMatch = compileOutput.match(/:(\d+):(?:\s*(\d+):)?\s*(?:error:\s*)?([^\r\n]+)/i);
    if (genMatch) {
      const line = Math.max(1, parseInt(genMatch[1], 10) - lineOffset);
      return {
        category: 'compilation',
        line,
        column: genMatch[2] ? parseInt(genMatch[2], 10) : null,
        filename: language === 'java' ? 'Main.java' : 'main.cpp',
        message: genMatch[3].trim(),
        excerpt: sourceLines[line - 1] || '',
        raw: compileOutput
      };
    }

    return {
      category: 'compilation',
      line: null,
      column: null,
      filename: language === 'java' ? 'Main.java' : 'main.cpp',
      message: compileOutput.trim().split('\n')[0] || 'Compilation error',
      excerpt: '',
      raw: compileOutput
    };
  }

  if (stderr) {
    if (language === 'python') {
      const isSyntax = /SyntaxError|IndentationError|TabError/.test(stderr);
      const lineMatch = stderr.match(/File\s+"(?:main\.py|<string>|[^"]+)",\s*line\s+(\d+)/i);
      const errMatch = stderr.match(/([A-Za-z0-9_]+Error):\s*([^\r\n]+)/);
      let line = lineMatch ? parseInt(lineMatch[1], 10) : null;
      if (line !== null && lineOffset > 0 && line > lineOffset) {
        line = line - lineOffset;
      }
      let col = null;
      const stderrLines = stderr.split('\n');
      for (let i = 0; i < stderrLines.length; i++) {
        if (stderrLines[i].includes('^') && i > 0) {
          col = stderrLines[i].indexOf('^') + 1;
          break;
        }
      }
      const excerpt = line ? (sourceLines[line - 1] || '') : '';
      return {
        category: isSyntax ? 'syntax' : 'runtime',
        line,
        column: col,
        filename: 'main.py',
        errorName: errMatch ? errMatch[1] : (isSyntax ? 'SyntaxError' : 'RuntimeError'),
        message: errMatch ? `${errMatch[1]}: ${errMatch[2].trim()}` : (isSyntax ? 'Syntax error in Python source' : 'Runtime error'),
        excerpt,
        raw: stderr
      };
    }

    if (language === 'java') {
      const lineMatch = stderr.match(/at\s+Main\.\w+\(Main\.java:(\d+)\)/i);
      const excMatch = stderr.match(/Exception in thread "[^"]+"\s+([A-Za-z0-9_.$]+:\s*[^\r\n]+)/i);
      const rawLine = lineMatch ? parseInt(lineMatch[1], 10) : null;
      const line = rawLine ? Math.max(1, rawLine - lineOffset) : null;
      const excerpt = line ? (sourceLines[line - 1] || '') : '';
      return {
        category: 'runtime',
        line,
        column: null,
        filename: 'Main.java',
        message: excMatch ? excMatch[1].trim() : 'Runtime exception in Java execution',
        excerpt,
        raw: stderr
      };
    }

    if (language === 'cpp') {
      return {
        category: 'runtime',
        line: null,
        column: null,
        filename: 'main.cpp',
        message: stderr.trim().split('\n')[0] || 'C++ runtime exception',
        excerpt: '',
        raw: stderr
      };
    }
  }

  return null;
}

export async function executeWithJudge0({
  source,
  language,
  stdin = '',
  signal,
  env = process.env,
  fetchImpl = fetch,
  timeoutMs = 45000,
  pollIntervalMs = 400,
  mode = 'run'
}) {
  if (!Object.hasOwn(languageIds, language)) {
    throw Object.assign(new Error('Choose Python, JavaScript, Java, or C++.'), { status: 400 });
  }

  const base = env.JUDGE0_URL;
  if (!base) {
    throw Object.assign(new Error('Code execution is not configured. Set JUDGE0_URL to a trusted Judge0-compatible service.'), { status: 503, expose: true });
  }

  let url;
  try {
    url = new URL(base);
    if (!['https:', 'http:'].includes(url.protocol) || (url.protocol === 'http:' && !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname))) {
      throw new Error();
    }
    if (url.username || url.password || url.search || url.hash) throw new Error();
    url.pathname = `${url.pathname.replace(/\/+$/, '')}/`;
  } catch {
    throw Object.assign(new Error('JUDGE0_URL must be a valid HTTPS URL (HTTP is allowed only for localhost).'), { status: 503, expose: true });
  }

  if (url.hostname === 'api.onlinecompiler.io' && !env.JUDGE0_API_KEY) {
    throw Object.assign(new Error('The public execution provider requires a free API key. Add JUDGE0_API_KEY to .env, then restart CodeLens.'), { status: 503, expose: true });
  }

  const headers = { 'Content-Type': 'application/json', Accept: 'application/json' };
  const authHeader = env.JUDGE0_AUTH_HEADER || 'X-Auth-Token';
  if (!['X-Auth-Token', 'X-RapidAPI-Key'].includes(authHeader)) {
    throw Object.assign(new Error('JUDGE0_AUTH_HEADER must be X-Auth-Token or X-RapidAPI-Key.'), { status: 503, expose: true });
  }
  if (env.JUDGE0_API_KEY) headers[authHeader] = env.JUDGE0_API_KEY;
  if (env.JUDGE0_API_HOST) headers['X-RapidAPI-Host'] = env.JUDGE0_API_HOST;

  const request = async (path, options = {}, deadline, isPolling = false) => {
    const remaining = deadline ? Math.max(0, deadline - Date.now()) : timeoutMs;
    if (isPolling && remaining <= 200) {
      return null;
    }
    const perRequestMs = Math.max(1000, Math.min(10000, remaining));
    const timeoutSignal = AbortSignal.timeout(perRequestMs);
    const requestSignal = signal ? AbortSignal.any([signal, timeoutSignal]) : timeoutSignal;
    let response;
    try {
      response = await fetchImpl(new URL(path, url), { ...options, headers: { ...headers, ...options.headers }, signal: requestSignal });
    } catch (error) {
      if (signal?.aborted) throw error;
      if (isPolling && Date.now() < deadline) {
        return null;
      }
      if (error.name === 'TimeoutError' || timeoutSignal.aborted) {
        if (isPolling) return null;
        throw Object.assign(new Error('The execution provider timed out. Please try again.'), { status: 504, expose: true });
      }
      throw Object.assign(new Error('Could not connect to the configured execution provider. Check JUDGE0_URL and provider availability.'), { status: 502, expose: true });
    }
    if (!response.ok) {
      throw Object.assign(
        new Error(response.status === 429 ? 'The execution provider is rate-limited. Please try again later.' : `The execution provider returned HTTP ${response.status}. Check its availability and credentials.`),
        { status: response.status === 429 ? 503 : 502, expose: true }
      );
    }
    let payload;
    try {
      payload = await response.json();
    } catch {
      throw Object.assign(new Error('The execution provider returned an invalid response.'), { status: 502, expose: true });
    }
    return payload;
  };

  // Calculate header line offset for source line mapping
  let headerLineOffset = 0;
  if (language === 'python') {
    const hasPyImport = /(?:import\s+codelens|from\s+codelens\s+import|CodeLensQueue|CodeLensStack|CodeLensList|CodeLensMap|CodeLensTreeNode|CodeLensGraph|CodeLensLinkedList|CodeLensHeap|CodeLensPriorityQueue)/.test(source);
    if (hasPyImport || mode === 'trace') {
      headerLineOffset = getPyHeader().split('\n').length;
    }
  } else if (language === 'java') {
    const usesJavaWrappers = /(?:CodeLensQueue|CodeLensStack|CodeLensList|CodeLensMap|CodeLensArray|CodeLensArrayList|CodeLensArrayDeque|CodeLensTraceEmitter|CodeLensTreeTracker|CodeLensGraphTracker|TreeNode|CodeLensPriorityQueue)/.test(source);
    if ((mode === 'trace' || usesJavaWrappers) && !/^\s*import\s+/m.test(source)) {
      headerLineOffset = 1; // 'import java.util.*;\n' prepended
    }
  }

  // Prepare source code (expanding headers if instrumentation wrappers are referenced or in trace mode)
  const preparedSource = prepareSourceForExecution(source, language, mode);

  const deadline = Date.now() + timeoutMs;
  const submitted = await request('submissions?base64_encoded=false&wait=false', {
    method: 'POST',
    body: JSON.stringify({
      source_code: preparedSource,
      language_id: languageIds[language],
      stdin,
      cpu_time_limit: 5,
      cpu_extra_time: 1,
      wall_time_limit: 8,
      memory_limit: 128000,
      stack_limit: 64000,
      max_file_size: 1024
    })
  }, deadline);

  if (!submitted?.token) {
    throw Object.assign(new Error('The execution provider returned an invalid job.'), { status: 502, expose: true });
  }

  let result = null;
  while (Date.now() < deadline) {
    if (signal?.aborted) break;
    await sleep(Math.min(pollIntervalMs, Math.max(0, deadline - Date.now())));
    const pollResult = await request(`submissions/${encodeURIComponent(submitted.token)}?base64_encoded=false`, {}, deadline, true);
    if (pollResult) {
      result = pollResult;
      if (result.status?.id >= 3) break;
    }
  }

  if (!result || result.status?.id < 3) {
    return {
      status: 'timeout',
      statusId: 5,
      statusDescription: 'Provider job timed out',
      stdout: '',
      stderr: `Execution provider did not finish within ${Math.round(timeoutMs / 1000)} seconds. Please try again.`,
      compileOutput: null,
      exitCode: null,
      time: null,
      memory: null,
      trace: null,
      hasTrace: false,
      timedOut: true,
      errorCategory: 'timeout',
      diagnostic: {
        category: 'timeout',
        message: `Execution timed out after ${Math.round(timeoutMs / 1000)}s`,
        line: null,
        column: null,
        filename: language === 'java' ? 'Main.java' : (language === 'python' ? 'main.py' : 'main.cpp'),
        excerpt: ''
      }
    };
  }

  const rawStdout = safeOutput(result.stdout);
  const { cleanStdout, traceEvents, hasTrace } = extractTraceFromOutput(rawStdout);

  let trace = null;
  if (hasTrace) {
    trace = normalizeTraceEvents(traceEvents, {
      executionId: `exec-${Date.now()}`,
      language,
      totalLines: source.split('\n').length,
      output: cleanStdout
    });
  }

  const statusId = result.status?.id ?? null;
  const compileOutput = result.compile_output ? safeOutput(result.compile_output) : null;
  const stderr = safeOutput(result.stderr);

  // Detect Python syntax error (which in Judge0 exits with NZEC status 11)
  const isPythonSyntax = language === 'python' && /SyntaxError|IndentationError|TabError/.test(stderr);
  const isCompileFailure = statusId === 6 || Boolean(compileOutput) || isPythonSyntax;

  // Derive execution lifecycle compilation status
  let compilationStatus = 'not_applicable';
  if (['java', 'cpp'].includes(language)) {
    compilationStatus = isCompileFailure ? 'failed' : 'success';
  } else if (language === 'python') {
    compilationStatus = isPythonSyntax ? 'failed' : 'success';
  }

  // Execution started only if compilation and syntax checks succeeded
  const executionStarted = !isCompileFailure && statusId !== null && statusId !== 5;

  let errorCategory = null;
  if (isPythonSyntax) {
    errorCategory = 'syntax_error';
  } else if (statusId === 6 || compileOutput) {
    errorCategory = 'compilation_error';
  } else if (statusId >= 7 && statusId <= 12) {
    errorCategory = 'runtime_exception';
  } else if (statusId === 4 || statusId === 5) {
    errorCategory = 'limit_exceeded';
  }

  // Derive final exit code strictly
  let exitCode = 0;
  if (result.exit_code !== undefined && result.exit_code !== null) {
    exitCode = result.exit_code;
  } else if (statusId === 3 && !compileOutput) {
    exitCode = 0;
  } else if (isCompileFailure || (statusId >= 7 && statusId <= 12)) {
    exitCode = 1;
  } else if (statusId === 5) {
    exitCode = null;
  }

  // If compilation/syntax failed, trace status is not_started and trace events are nullified
  let traceStatus = 'unavailable';
  let finalTrace = trace;
  let finalHasTrace = hasTrace;
  let finalStdout = cleanStdout;

  if (isCompileFailure) {
    traceStatus = 'not_started';
    finalTrace = null;
    finalHasTrace = false;
    finalStdout = ''; // Never display fake stdout for uncompiled programs
  } else if (finalHasTrace && finalTrace) {
    traceStatus = (exitCode === 0 && !errorCategory) ? 'complete' : 'incomplete';
  }

  // Parse structured diagnostic location
  const diagnostic = parseExecutionDiagnostic(language, compileOutput, stderr, statusId, source, headerLineOffset);
  if (isPythonSyntax && diagnostic && diagnostic.category !== 'syntax') {
    diagnostic.category = 'syntax';
  }

  // Consistent execution-state model
  let executionStage = 'completed';
  if (statusId === 5 || result.status?.description === 'Time Limit Exceeded') {
    executionStage = 'timed_out';
  } else if (isCompileFailure) {
    executionStage = 'compile_failed';
  } else if (exitCode !== 0 || errorCategory === 'runtime_exception') {
    executionStage = 'runtime_failed';
  }

  return {
    status: isCompileFailure
      ? (isPythonSyntax ? 'Syntax Error' : 'Compilation Error')
      : (exitCode === 0 && !compileOutput ? 'Accepted' : 'Execution Failed'),
    statusId,
    executionStage,
    compilationStatus,
    executionStarted,
    traceStatus,
    isPythonSyntax,
    isCompileFailure,
    stdout: finalStdout,
    stderr,
    compileOutput,
    exitCode,
    time: result.time ?? null,
    duration: result.time ? `${result.time}s` : null,
    memory: result.memory ?? null,
    trace: finalTrace,
    hasTrace: finalHasTrace,
    timedOut: statusId === 5,
    errorCategory,
    diagnostic
  };
}
