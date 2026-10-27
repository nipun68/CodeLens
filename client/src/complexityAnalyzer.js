/**
 * CodeLens Static Complexity Analyzer
 *
 * Implements language-aware static complexity analysis for JavaScript, Python 3, Java, and C++17.
 * Detects asymptotic time and space bounds, nested vs sequential loops, recursion,
 * logarithmic search patterns, and sorting routines without modifying source code.
 */

import { parse } from 'acorn';

/**
 * Analyzes source code complexity for a given programming language.
 *
 * @param {string} code - Source code string
 * @param {string} language - 'javascript' | 'python' | 'java' | 'cpp'
 * @returns {{
 *   overallTime: string,
 *   overallSpace: string,
 *   confidence: 'High confidence' | 'Estimated' | 'Unable to determine reliably',
 *   summary: string,
 *   findings: Array<{
 *     id: string,
 *     line: number,
 *     endLine: number,
 *     complexity: string,
 *     spaceComplexity: string,
 *     type: string,
 *     title: string,
 *     reasoning: string,
 *     assumptions: string,
 *     limitations: string,
 *     confidence: 'High confidence' | 'Estimated' | 'Unable to determine reliably',
 *     badgeColor: 'rose' | 'amber' | 'cyan' | 'mint' | 'purple'
 *   }>
 * }}
 */
export function analyzeComplexity(code, language = 'javascript') {
  if (!code || typeof code !== 'string' || !code.trim()) {
    return {
      overallTime: 'O(1)',
      overallSpace: 'O(1)',
      confidence: 'High confidence',
      summary: 'Empty program has constant O(1) time and space complexity.',
      findings: []
    };
  }

  switch (language) {
    case 'javascript':
      return analyzeJavaScriptComplexity(code);
    case 'python':
      return analyzePythonComplexity(code);
    case 'java':
      return analyzeJavaComplexity(code);
    case 'cpp':
      return analyzeCppComplexity(code);
    default:
      return analyzeGenericComplexity(code, language);
  }
}

/**
 * JavaScript AST + Structure Complexity Analysis
 */
function analyzeJavaScriptComplexity(code) {
  const lines = code.split('\n');
  const findings = [];
  let ast = null;

  try {
    ast = parse(code, {
      ecmaVersion: 'latest',
      locations: true,
      sourceType: 'module',
      allowReturnOutsideFunction: true,
      allowAwaitOutsideFunction: true
    });
  } catch {
    try {
      ast = parse(code, {
        ecmaVersion: 'latest',
        locations: true,
        sourceType: 'script',
        allowReturnOutsideFunction: true,
        allowAwaitOutsideFunction: true
      });
    } catch {
      // AST parse failed (severe syntax error); fall back to pattern analysis
    }
  }

  if (ast) {
    analyzeJsAst(ast, lines, findings);
  } else {
    analyzeGenericLoopStructure(lines, 'javascript', findings);
  }

  return buildComplexitySummary(findings, lines.length, 'JavaScript');
}

function analyzeJsAst(ast, lines, findings) {
  let findingCounter = 1;

  function walk(node, parentLoops = []) {
    if (!node || typeof node !== 'object') return;

    const isLoop =
      node.type === 'ForStatement' ||
      node.type === 'ForOfStatement' ||
      node.type === 'ForInStatement' ||
      node.type === 'WhileStatement' ||
      node.type === 'DoWhileStatement';

    if (isLoop) {
      const startLine = node.loc ? node.loc.start.line : 1;
      const endLine = node.loc ? node.loc.end.line : startLine;
      const depth = parentLoops.length;

      // Check if loop condition or body has logarithmic division (e.g. low <= high, mid = ...)
      const loopSnippet = lines.slice(startLine - 1, endLine).join('\n');
      const isLogarithmic =
        /while\s*\(\s*(?:low|left|l)\s*<=\s*(?:high|right|r)\s*\)/i.test(loopSnippet) ||
        /(?:mid|m)\s*=\s*(?:Math\.floor|parseInt|\(.*\)\s*>>\s*1)/i.test(loopSnippet) ||
        /(?:\/=\s*2|>>=\s*1)/.test(loopSnippet);

      let complexity = 'O(n)';
      let spaceComplexity = 'O(1)';
      let type = 'Single Loop Traversal';
      let badgeColor = 'amber';
      let confidence = 'High confidence';
      let reasoning = 'Linear iteration over input elements from start to termination bound.';
      let assumptions = 'Assumes loop termination condition scales with input size n.';
      let limitations = 'Early return or break statements may reduce average-case iterations.';

      const isConstantBound = Boolean(
        node.test &&
        node.test.type === 'BinaryExpression' &&
        node.test.right &&
        node.test.right.type === 'Literal' &&
        typeof node.test.right.value === 'number'
      );

      if (isConstantBound && depth === 0) {
        complexity = 'O(1)';
        type = 'Constant-Bound Iteration';
        badgeColor = 'lime';
        reasoning = `Loop iterates over a fixed constant bound (≤ ${node.test.right.value} iterations) independent of input size n.`;
        assumptions = 'Bound does not scale with collection or problem size.';
        limitations = 'If bound is dynamically scaled elsewhere, complexity scales proportionally.';
      } else if (isLogarithmic) {
        complexity = 'O(log n)';
        type = 'Logarithmic Division / Binary Step';
        badgeColor = 'cyan';
        reasoning = 'The search space is halved at each iteration, yielding logarithmic O(log n) total steps.';
        assumptions = 'Assumes array or range is ordered and bounded by indices low and high.';
        limitations = 'Unbalanced division or constant increments degrade performance to linear O(n).';
      } else if (depth >= 2) {
        complexity = 'O(n³)';
        type = 'Cubic Triply-Nested Loop';
        badgeColor = 'rose';
        reasoning = `Three deeply nested loops iterating over dependent input bounds, requiring n × n × n = n³ operations.`;
        assumptions = 'Assumes all three nested loops iterate across bounds proportional to input size n.';
        limitations = 'Fixed or small upper bounds (e.g. j < 3) collapse that dimension to O(1).';
      } else if (depth === 1) {
        complexity = 'O(n²)';
        type = 'Quadratic Nested Loop';
        badgeColor = 'rose';
        reasoning = 'Outer loop processes elements while the inner loop performs work proportional to n for each outer step.';
        assumptions = 'Assumes both loop bounds scale with collection size n.';
        limitations = 'Early break or non-dependent inner loop bounds may achieve sub-quadratic performance.';
      }

      findings.push({
        id: `js-loop-${findingCounter++}`,
        line: startLine,
        endLine,
        complexity,
        spaceComplexity,
        type,
        title: `${type} (${complexity})`,
        reasoning,
        assumptions,
        limitations,
        confidence,
        badgeColor
      });

      // Recurse into loop body with this loop in parent stack
      const nextParentLoops = [...parentLoops, { type: node.type, startLine, endLine }];
      for (const key of Object.keys(node)) {
        if (key !== 'loc') walk(node[key], nextParentLoops);
      }
      return;
    }

    // Detect recursive functions
    if (node.type === 'FunctionDeclaration' && node.id && node.id.name) {
      const funcName = node.id.name;
      let selfCallCount = 0;
      let hasFibonacciPattern = false;

      function countCalls(n) {
        if (!n || typeof n !== 'object') return;
        if (n.type === 'CallExpression' && n.callee && n.callee.name === funcName) {
          selfCallCount++;
        }
        for (const k of Object.keys(n)) {
          if (k !== 'loc') countCalls(n[k]);
        }
      }
      countCalls(node.body);

      const funcSnippet = lines.slice((node.loc?.start.line || 1) - 1, node.loc?.end.line || 1).join('\n');
      if (selfCallCount >= 2 || (funcSnippet.includes('- 1') && funcSnippet.includes('- 2'))) {
        hasFibonacciPattern = true;
      }

      if (selfCallCount > 0) {
        const startLine = node.loc ? node.loc.start.line : 1;
        const endLine = node.loc ? node.loc.end.line : startLine;
        const isExp = hasFibonacciPattern || selfCallCount >= 2;

        findings.push({
          id: `js-rec-${findingCounter++}`,
          line: startLine,
          endLine,
          complexity: isExp ? 'O(2ⁿ)' : 'O(n)',
          spaceComplexity: 'O(n)',
          type: isExp ? 'Exponential Branching Recursion' : 'Linear Recursion',
          title: isExp ? 'Recursive Branching O(2ⁿ)' : 'Linear Recursion O(n)',
          reasoning: isExp
            ? `Function "${funcName}" spawns multiple recursive calls per frame, generating a binary recurrence tree with 2ⁿ total activations.`
            : `Function "${funcName}" makes a single recursive call with decremented state, executing n sequential stack frames.`,
          assumptions: 'Assumes recurrence base case terminates at constant depth n.',
          limitations: 'Memoization or dynamic programming reduces branching complexity to linear O(n).',
          confidence: 'High confidence',
          badgeColor: isExp ? 'purple' : 'amber'
        });
      }
    }

    // Detect .sort() calls
    if (
      node.type === 'CallExpression' &&
      node.callee &&
      node.callee.type === 'MemberExpression' &&
      node.callee.property &&
      node.callee.property.name === 'sort'
    ) {
      const startLine = node.loc ? node.loc.start.line : 1;
      findings.push({
        id: `js-sort-${findingCounter++}`,
        line: startLine,
        endLine: startLine,
        complexity: 'O(n log n)',
        spaceComplexity: 'O(n)',
        type: 'Comparison Sorting Routine',
        title: 'Array.prototype.sort() (O(n log n))',
        reasoning: 'V8 Timsort / MergeSort requires O(n log n) comparisons to order an array of length n.',
        assumptions: 'Assumes standard ECMAScript comparator semantics over arbitrary elements.',
        limitations: 'Already sorted or small arrays (< 10 elements) may execute in linear O(n) or insertion sort time.',
        confidence: 'High confidence',
        badgeColor: 'cyan'
      });
    }

    for (const key of Object.keys(node)) {
      if (key !== 'loc') walk(node[key], parentLoops);
    }
  }

  walk(ast, []);
}

/**
 * Python Indentation-Based Loop & Recursion Analysis
 */
function analyzePythonComplexity(code) {
  const lines = code.split('\n');
  const findings = [];
  let findingCounter = 1;
  const loopStack = [];

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const lineNum = i + 1;
    const trimmed = rawLine.trim();

    if (!trimmed || trimmed.startsWith('#')) continue;

    // Calculate leading indentation
    const indent = rawLine.search(/\S/);

    // Pop loops that have ended due to reduced indentation
    while (loopStack.length > 0 && indent <= loopStack[loopStack.length - 1].indent) {
      const finished = loopStack.pop();
      finished.endLine = Math.max(finished.startLine, lineNum - 1);
    }

    // Check for loops
    const isFor = /^for\s+[a-zA-Z0-9_,\s]+\s+in\s+/.test(trimmed);
    const isWhile = /^while\s+/.test(trimmed);

    if (isFor || isWhile) {
      const depth = loopStack.length;
      const isLog =
        /while\s+.*(?:low|left)\s*<=\s*(?:high|right)/i.test(trimmed) ||
        /(?:\/\/\s*2|>>\s*1)/.test(trimmed);

      let complexity = 'O(n)';
      let spaceComplexity = 'O(1)';
      let type = 'Single Loop Traversal';
      let badgeColor = 'amber';
      let confidence = 'High confidence';
      let reasoning = 'Single Python loop iterating through a range or iterable sequence.';
      let assumptions = 'Assumes the iterable or range length scales with problem input size n.';
      let limitations = 'Fixed-length ranges (e.g. range(10)) execute in constant O(1) time.';

      const isConstRange = /range\s*\(\s*\d+\s*\)/.test(trimmed);

      if (isConstRange && depth === 0) {
        complexity = 'O(1)';
        type = 'Constant-Bound Iteration';
        badgeColor = 'lime';
        reasoning = 'Python loop iterates over a fixed constant integer range independent of problem input size.';
        assumptions = 'Range bound does not scale with problem size.';
        limitations = 'If range parameter is an input variable n, iteration scales linearly.';
      } else if (isLog) {
        complexity = 'O(log n)';
        type = 'Logarithmic Division Loop';
        badgeColor = 'cyan';
        reasoning = 'Search space is halved per iteration, completing in logarithmic O(log n) steps.';
        assumptions = 'Assumes indices converge by integer floor division.';
        limitations = 'Degrades to linear if bounds do not advance logarithmically.';
      } else if (depth >= 1) {
        complexity = 'O(n²)';
        type = 'Quadratic Nested Loop';
        badgeColor = 'rose';
        reasoning = 'Inner Python loop nested inside an outer loop, performing n iterations per outer step.';
        assumptions = 'Both outer and inner iterables scale with input size n.';
        limitations = 'If inner loop iterates over a constant-size tuple, overall complexity is linear O(n).';
      }

      const findingObj = {
        id: `py-loop-${findingCounter++}`,
        line: lineNum,
        endLine: lineNum,
        complexity,
        spaceComplexity,
        type,
        title: `${type} (${complexity})`,
        reasoning,
        assumptions,
        limitations,
        confidence,
        badgeColor
      };

      findings.push(findingObj);
      loopStack.push({ indent, startLine: lineNum, finding: findingObj });
      continue;
    }

    // Check for recursion
    if (/^def\s+([a-zA-Z0-9_]+)\s*\(/.test(trimmed)) {
      const match = trimmed.match(/^def\s+([a-zA-Z0-9_]+)\s*\(/);
      const funcName = match ? match[1] : '';
      const funcBody = lines.slice(i).filter(l => l.search(/\S/) > indent || !l.trim()).join('\n');
      const calls = (funcBody.match(new RegExp(`\\b${funcName}\\s*\\(`, 'g')) || []).length;

      if (calls > 1) {
        findings.push({
          id: `py-rec-${findingCounter++}`,
          line: lineNum,
          endLine: Math.min(lines.length, lineNum + 15),
          complexity: 'O(2ⁿ)',
          spaceComplexity: 'O(n)',
          type: 'Exponential Branching Recursion',
          title: `Recursive Branching ${funcName}() (O(2ⁿ))`,
          reasoning: `Function "${funcName}" spawns multiple recursive calls per activation, building a 2ⁿ execution tree.`,
          assumptions: 'Assumes recurrence depth scales linearly with input n.',
          limitations: 'functools.lru_cache or memoization collapses this to O(n).',
          confidence: 'High confidence',
          badgeColor: 'purple'
        });
      }
    }

    // Check for Python sorting
    if (/\.(?:sort)\s*\(|sorted\s*\(/.test(trimmed)) {
      findings.push({
        id: `py-sort-${findingCounter++}`,
        line: lineNum,
        endLine: lineNum,
        complexity: 'O(n log n)',
        spaceComplexity: 'O(n)',
        type: 'Python Timsort',
        title: 'Timsort Routine (O(n log n))',
        reasoning: 'Python builtin sort uses Timsort, offering O(n log n) worst-case comparison time.',
        assumptions: 'Assumes sequence elements are compared using standard rich comparison.',
        limitations: 'Partially sorted data can run in linear O(n) best-case time.',
        confidence: 'High confidence',
        badgeColor: 'cyan'
      });
    }
  }

  return buildComplexitySummary(findings, lines.length, 'Python');
}

/**
 * Java Static Complexity Analysis
 */
function analyzeJavaComplexity(code) {
  const lines = code.split('\n');
  const findings = [];
  analyzeBraceBasedLoops(lines, 'Java', findings);
  return buildComplexitySummary(findings, lines.length, 'Java');
}

/**
 * C++17 Static Complexity Analysis
 */
function analyzeCppComplexity(code) {
  const lines = code.split('\n');
  const findings = [];
  analyzeBraceBasedLoops(lines, 'C++', findings);
  return buildComplexitySummary(findings, lines.length, 'C++17');
}

/**
 * Shared brace-based loop & recursion analyzer for Java and C++
 */
function analyzeBraceBasedLoops(lines, langName, findings) {
  let findingCounter = 1;
  const loopStack = [];
  let braceDepth = 0;

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const lineNum = i + 1;
    const trimmed = rawLine.trim();

    if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('/*')) continue;

    // Check for closing braces that pop loops
    const openBraces = (rawLine.match(/\{/g) || []).length;
    const closeBraces = (rawLine.match(/\}/g) || []).length;

    while (loopStack.length > 0 && braceDepth < loopStack[loopStack.length - 1].openDepth) {
      const top = loopStack.pop();
      top.finding.endLine = Math.max(top.finding.line, lineNum - 1);
    }

    // Check for loop keywords
    const isLoop = /^(?:for\s*\(|while\s*\(|do\s*\{?)/.test(trimmed);

    if (isLoop) {
      const depth = loopStack.length;
      const isConstBound = /(?:<|<=)\s*\d+\s*(?:;|\))/.test(trimmed);
      const isLog =
        /while\s*\(.*(?:low|left)\s*<=\s*(?:high|right)/i.test(trimmed) ||
        /(?:\/=\s*2|>>=\s*1)/.test(trimmed) ||
        /mid\s*=\s*(?:low|\(low)/.test(trimmed);

      let complexity = 'O(n)';
      let spaceComplexity = 'O(1)';
      let type = 'Single Loop Traversal';
      let badgeColor = 'amber';
      let confidence = 'High confidence';
      let reasoning = `Standard ${langName} loop iterating over a sequence or collection.`;
      let assumptions = 'Assumes loop boundary scales with input collection length n.';
      let limitations = 'Fixed constant bounds (e.g. i < 10) execute in O(1) time.';

      if (isConstBound && depth === 0) {
        complexity = 'O(1)';
        type = 'Constant-Bound Iteration';
        badgeColor = 'lime';
        reasoning = `Loop iterates over a fixed numeric constant limit independent of collection length n.`;
        assumptions = 'Bound does not scale with problem size.';
        limitations = 'If bound is dynamically scaled, complexity scales accordingly.';
      } else if (isLog) {
        complexity = 'O(log n)';
        type = 'Binary Search / Logarithmic Step';
        badgeColor = 'cyan';
        reasoning = 'Boundary pointers divide the remaining search range in half each step.';
        assumptions = 'Assumes container is sorted and random access is constant O(1).';
        limitations = 'Non-random-access containers require linear stepping.';
      } else if (depth >= 1) {
        complexity = 'O(n²)';
        type = 'Quadratic Nested Loop';
        badgeColor = 'rose';
        reasoning = `Inner loop is executed n times for each step of the outer loop, yielding n² operations.`;
        assumptions = 'Both nested loops iterate over input-dependent ranges.';
        limitations = 'Independent inner loops execute in O(n) total sequential time.';
      }

      const findingObj = {
        id: `${langName.toLowerCase()}-loop-${findingCounter++}`,
        line: lineNum,
        endLine: lineNum,
        complexity,
        spaceComplexity,
        type,
        title: `${type} (${complexity})`,
        reasoning,
        assumptions,
        limitations,
        confidence,
        badgeColor
      };

      findings.push(findingObj);
      loopStack.push({ openDepth: braceDepth + (openBraces > 0 ? 1 : 0), finding: findingObj });
    }

    // Check for recursive functions in Java / C++
    const funcMatch = trimmed.match(/(?:static\s+|public\s+|private\s+|protected\s+)?(?:int|void|double|long|boolean|auto|size_t)\s+([a-zA-Z0-9_]+)\s*\([^)]*\)\s*\{/);
    if (funcMatch && funcMatch[1] !== 'main') {
      const funcName = funcMatch[1];
      const funcBody = lines.slice(i, Math.min(lines.length, i + 35)).join('\n');
      const calls = (funcBody.match(new RegExp(`\\b${funcName}\\s*\\(`, 'g')) || []).length;
      if (calls > 1) {
        findings.push({
          id: `${langName.toLowerCase()}-rec-${findingCounter++}`,
          line: lineNum,
          endLine: Math.min(lines.length, lineNum + 15),
          complexity: 'O(2ⁿ)',
          spaceComplexity: 'O(n)',
          type: 'Exponential Branching Recursion',
          title: `${langName} Recursive Branching ${funcName}() (O(2ⁿ))`,
          reasoning: `Function "${funcName}" spawns multiple recursive calls per activation, generating a 2ⁿ execution tree.`,
          assumptions: 'Assumes recurrence base case terminates at linear depth n.',
          limitations: 'Memoization or dynamic programming reduces branching complexity to linear O(n).',
          confidence: 'High confidence',
          badgeColor: 'purple'
        });
      }
    }

    // Check for STL / Java Sort
    if (/std::sort\s*\(|Collections\.sort\s*\(|Arrays\.sort\s*\(/.test(trimmed)) {
      findings.push({
        id: `${langName.toLowerCase()}-sort-${findingCounter++}`,
        line: lineNum,
        endLine: lineNum,
        complexity: 'O(n log n)',
        spaceComplexity: 'O(log n)',
        type: 'Comparison Sort Routine',
        title: `${langName} Sort Routine (O(n log n))`,
        reasoning: `Standard library sort algorithm (Introsort / Dual-Pivot Quicksort) requires O(n log n) comparisons.`,
        assumptions: 'Assumes random access iterators and elements supporting strict weak ordering.',
        limitations: 'Auxiliary memory depends on whether implementation uses in-place Introsort or auxiliary buffer.',
        confidence: 'High confidence',
        badgeColor: 'cyan'
      });
    }

    braceDepth += openBraces - closeBraces;
  }
}

/**
 * Fallback Generic Analyzer
 */
function analyzeGenericComplexity(code, language) {
  const lines = code.split('\n');
  const findings = [];
  analyzeGenericLoopStructure(lines, language, findings);
  return buildComplexitySummary(findings, lines.length, language);
}

function analyzeGenericLoopStructure(lines, language, findings) {
  let findingCounter = 1;
  let inLoop = false;

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (!trimmed) continue;

    if (/^(?:for\b|while\b)/.test(trimmed)) {
      const isLog =
        /while\s*\(.*(?:low|left)\s*<=\s*(?:high|right)/i.test(trimmed) ||
        /(?:\/=\s*2|>>=\s*1|\/\/\s*2)/.test(trimmed);
      const isNested = !isLog && inLoop;

      let complexity = isLog ? 'O(log n)' : (isNested ? 'O(n²)' : 'O(n)');
      let badgeColor = isLog ? 'cyan' : (isNested ? 'rose' : 'amber');
      let type = isLog ? 'Logarithmic Step' : (isNested ? 'Nested Iteration' : 'Sequential Iteration');

      findings.push({
        id: `gen-loop-${findingCounter++}`,
        line: i + 1,
        endLine: i + 1,
        complexity,
        spaceComplexity: 'O(1)',
        type,
        title: `${type} (${complexity})`,
        reasoning: isLog ? 'Logarithmic reduction detected.' : (isNested ? 'Nested loop pattern detected.' : 'Single iteration loop detected.'),
        assumptions: 'Assumes loop scales with input collection size.',
        limitations: 'Estimated via lexical pattern analysis.',
        confidence: 'Estimated',
        badgeColor
      });
      if (!isLog) inLoop = true;
    }
  }
}

/**
 * Builds the overall asymptotic complexity summary from detected findings
 */
function buildComplexitySummary(findings, totalLines, languageName) {
  if (findings.length === 0) {
    return {
      overallTime: 'O(1)',
      overallSpace: 'O(1)',
      confidence: 'High confidence',
      summary: `Constant O(1) execution time. No unbounded loops or recursive branching detected in ${languageName} source.`,
      findings: []
    };
  }

  // Hierarchy of asymptotic growth: O(2ⁿ) > O(n³) > O(n²) > O(n log n) > O(n) > O(log n) > O(1)
  const ranking = {
    'O(2ⁿ)': 6,
    'O(n³)': 5,
    'O(n²)': 4,
    'O(n log n)': 3,
    'O(n)': 2,
    'O(log n)': 1,
    'O(1)': 0
  };

  let maxTime = 'O(1)';
  let maxSpace = 'O(1)';
  let dominantFinding = findings[0];

  for (const f of findings) {
    if ((ranking[f.complexity] || 0) > (ranking[maxTime] || 0)) {
      maxTime = f.complexity;
      dominantFinding = f;
    }
    if (f.spaceComplexity === 'O(n)' && maxSpace === 'O(1)') {
      maxSpace = 'O(n)';
    }
  }

  const confidence = findings.every(f => f.confidence === 'High confidence')
    ? 'High confidence'
    : 'Estimated';

  findings.sort((a, b) => (ranking[b.complexity] || 0) - (ranking[a.complexity] || 0) || a.line - b.line);

  return {
    supported: true,
    overallTime: maxTime,
    overallSpace: maxSpace,
    timeComplexity: maxTime,
    spaceComplexity: maxSpace,
    confidence,
    summary: `${maxTime} asymptotic time complexity determined by ${dominantFinding.type.toLowerCase()} at line ${dominantFinding.line}.`,
    findings
  };
}
