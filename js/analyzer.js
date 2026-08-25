const Analyzer = (() => {

  function analyzeComplexity(source) {
    let loops = 0, nested = 0, maxNest = 0, recursion = 0;
    let sortUsed = false, hashUsed = false, binarySearch = false;

    let ast;
    try {
      ast = acorn.parse(source, { ecmaVersion: 2020 });
    } catch {
      return analyzeComplexityRegex(source);
    }

    function walk(node, depth) {
      if (!node || typeof node !== 'object') return;

      if (node.type === 'ForStatement' || node.type === 'WhileStatement' || node.type === 'DoWhileStatement' || node.type === 'ForOfStatement' || node.type === 'ForInStatement') {
        loops++;
        if (depth > 0) nested++;
        maxNest = Math.max(maxNest, depth + 1);
        if (node.body) walk(node.body, depth + 1);
        if (node.init) walk(node.init, depth);
        if (node.test) walk(node.test, depth);
        if (node.update) walk(node.update, depth);
        return;
      }

      if (node.type === 'CallExpression' && node.callee?.type === 'MemberExpression') {
        const methodName = node.callee.property?.name;
        if (methodName === 'sort') sortUsed = true;
        if (methodName === 'has' || methodName === 'get' || methodName === 'set') hashUsed = true;
      }

      if (node.type === 'FunctionDeclaration' && node.id?.name) {
        const fnName = node.id.name;
        const fnSource = source.substring(node.start, node.end);
        if (new RegExp(`\\b${fnName}\\s*\\(`).test(fnSource) && fnSource.includes('return')) {
          recursion++;
        }
      }

      if (source.includes('mid') && (source.includes('low') || source.includes('high'))) {
        binarySearch = true;
      }

      for (const key of Object.keys(node)) {
        const child = node[key];
        if (Array.isArray(child)) child.forEach(c => walk(c, depth));
        else if (child && typeof child === 'object' && child.type) walk(child, depth);
      }
    }

    walk(ast, 0);

    let time, reason;
    if (recursion > 0 && loops === 0) {
      time = 'O(2ⁿ)'; reason = `${recursion} recursive self-invocation(s) with branching sub-problems.`;
    } else if (maxNest >= 2) {
      time = 'O(n²)'; reason = `${nested} nested iteration loop(s) detected with maximum nesting depth of ${maxNest}.`;
    } else if (binarySearch && loops <= 1) {
      time = 'O(log n)'; reason = 'Divide-and-conquer index halving algorithm detected (binary search pattern).';
    } else if (sortUsed) {
      time = 'O(n log n)'; reason = 'Built-in Array.prototype.sort() (Timsort/Dual-Pivot Quicksort) upper bound.';
    } else if (loops > 0) {
      time = 'O(n)'; reason = `${loops} linear traversal loop(s) processing elements proportionally to input size.`;
    } else {
      time = 'O(1)'; reason = 'Deterministic constant-time statement sequence with zero input-dependent scaling.';
    }

    const space = recursion > 0 ? 'O(n)' : (source.includes('[') || source.includes('Array') ? 'O(n)' : 'O(1)');

    return { time, space, reason, loops, nested, maxNest, recursion, hashUsed, sortUsed };
  }

  function analyzeQuality(source) {
    const rawLines = source.split('\n');
    const lines = rawLines.filter(l => l.trim().length > 0);
    const loc = lines.length;

    let ast;
    let parseOk = true;
    try {
      ast = acorn.parse(source, { ecmaVersion: 2020, locations: true });
    } catch { parseOk = false; }

    let fnCount = 0, maxFnLength = 0, maxDepth = 0;
    let varCount = 0, ifCount = 0, loopCount = 0, decisionPoints = 0;
    let cognitiveComplexity = 0;
    const smells = [];
    const recommendations = [];

    if (parseOk) {
      function walk(node, depth, structuralNesting) {
        if (!node || typeof node !== 'object') return;

        if (node.type === 'FunctionDeclaration' || node.type === 'FunctionExpression' || node.type === 'ArrowFunctionExpression') {
          fnCount++;
          if (node.body?.type === 'BlockStatement') {
            const fnLines = source.substring(node.start, node.end).split('\n').filter(l => l.trim()).length;
            maxFnLength = Math.max(maxFnLength, fnLines);
            if (fnLines > 30) {
              smells.push(`Long Function (${fnLines} LOC) — violates Single Responsibility Principle`);
            }
          }
        }

        if (node.type === 'IfStatement' || node.type === 'ConditionalExpression') {
          ifCount++;
          decisionPoints++;
          cognitiveComplexity += (1 + structuralNesting);
        }

        if (node.type === 'ForStatement' || node.type === 'WhileStatement' || node.type === 'DoWhileStatement' || node.type === 'ForOfStatement' || node.type === 'ForInStatement') {
          loopCount++;
          decisionPoints++;
          cognitiveComplexity += (1 + structuralNesting);
          maxDepth = Math.max(maxDepth, structuralNesting + 1);
        }

        if (node.type === 'BinaryExpression' && (node.operator === '==' || node.operator === '!=')) {
          const lineNum = node.loc ? ` on line ${node.loc.start.line}` : '';
          smells.push(`Loose Equality ('${node.operator}')${lineNum} — Prefer strict equality ('${node.operator === '==' ? '===' : '!=='}') to prevent unexpected type coercion bugs.`);
        }

        if (node.type === 'LogicalExpression' && (node.operator === '&&' || node.operator === '||' || node.operator === '??')) {
          decisionPoints++;
          cognitiveComplexity += 1;
        }

        if (node.type === 'CatchClause') {
          decisionPoints++;
        }

        if (node.type === 'VariableDeclarator') {
          varCount++;
        }

        const isNestingConstruct = (node.type === 'ForStatement' || node.type === 'WhileStatement' || node.type === 'DoWhileStatement' || node.type === 'IfStatement' || node.type === 'ForOfStatement' || node.type === 'ForInStatement');

        for (const key of Object.keys(node)) {
          const child = node[key];
          if (Array.isArray(child)) {
            child.forEach(c => walk(c, depth + 1, isNestingConstruct ? structuralNesting + 1 : structuralNesting));
          } else if (child && typeof child === 'object' && child.type) {
            walk(child, depth + 1, isNestingConstruct ? structuralNesting + 1 : structuralNesting);
          }
        }
      }
      walk(ast, 0, 0);
    }

    const cyclomaticComplexity = decisionPoints + 1;

    const singleLetterVars = (source.match(/(?:let|const|var)\s+([a-z])(?!\w)/g) || []).map(m => m.replace(/(?:let|const|var)\s+/, ''));
    const nonIdiomaticVars = singleLetterVars.filter(v => !['i', 'j', 'k', 'n', 'e', 't'].includes(v));
    if (nonIdiomaticVars.length > 0) {
      smells.push(`Non-descriptive variable identifier(s): '${[...new Set(nonIdiomaticVars)].join("', '")}'`);
    }

    const errHandling = (source.match(/try\s*\{|catch\s*\(/g) || []).length;
    if (errHandling === 0 && loc > 15) {
      smells.push('Zero Exception Handling — Missing try/catch boundaries for runtime resilience');
    }

    const lineMap = {};
    lines.forEach(l => {
      const t = l.trim();
      if (t.length > 12) lineMap[t] = (lineMap[t] || 0) + 1;
    });
    const dupPatterns = Object.values(lineMap).filter(c => c >= 2).length;
    if (dupPatterns > 0) {
      smells.push(`${dupPatterns} duplicate statement pattern(s) — Consider DRY modularization`);
    }

    if (maxDepth >= 3) {
      smells.push(`Deeply nested logic (Depth: ${maxDepth}) — High cognitive overhead`);
    }

    const readabilityScore = clamp(100 - nonIdiomaticVars.length * 8 - (maxFnLength > 20 ? (maxFnLength - 20) * 2 : 0) - dupPatterns * 6);
    const complexityScore = clamp(100 - (cyclomaticComplexity > 5 ? (cyclomaticComplexity - 5) * 8 : 0) - maxDepth * 8);
    const maintainabilityIndex = clamp(Math.round(100 - (cyclomaticComplexity * 3) - (maxDepth * 5) - (loc > 30 ? (loc - 30) * 1.2 : 0) - (dupPatterns * 6)));
    const errorHandlingScore = clamp(errHandling > 0 ? 95 : (loc <= 10 ? 80 : 50));
    const performanceScore = clamp(100 - (maxDepth > 1 ? (maxDepth - 1) * 12 : 0) - (dupPatterns * 4));

    const overall = Math.round((readabilityScore + complexityScore + maintainabilityIndex + errorHandlingScore + performanceScore) / 5);
    const grade = overall >= 90 ? 'A+' : overall >= 80 ? 'A' : overall >= 70 ? 'B' : overall >= 60 ? 'C' : 'D';

    let cycloRisk = 'Low (Clean & Testable)';
    if (cyclomaticComplexity > 10) cycloRisk = 'High (High Defect Risk)';
    else if (cyclomaticComplexity > 5) cycloRisk = 'Moderate (Acceptable)';

    if (cyclomaticComplexity <= 5) recommendations.push('Cyclomatic complexity is optimal (M ≤ 5) — linear flow is easily verifiable with unit tests.');
    if (maxDepth <= 1) recommendations.push('Flat control flow structure minimizes cognitive load for code reviewers.');
    if (nonIdiomaticVars.length === 0) recommendations.push('Identifier naming adheres to clean semantic conventions.');
    if (maxDepth >= 2) recommendations.push('Decompose nested control structures into modular sub-functions.');
    if (errHandling === 0 && loc > 10) recommendations.push('Introduce defensive try-catch guards around potential runtime failures.');

    return {
      overall,
      grade,
      maintainabilityIndex,
      cyclomaticComplexity,
      cycloRisk,
      cognitiveComplexity,
      readability: readabilityScore,
      complexity: complexityScore,
      maintainability: maintainabilityIndex,
      errHandling: errorHandlingScore,
      performance: performanceScore,
      smells: smells.length > 0 ? smells : ['Zero code smells detected — Clean architectural standard.'],
      recommendations,
      checks: {
        loc,
        fnCount,
        maxFnLength,
        maxDepth,
        varCount,
        ifCount,
        loopCount,
        decisionPoints,
        badNames: nonIdiomaticVars.length,
        dupPatterns,
        errHandling
      }
    };
  }

  function analyzeComplexityRegex(source) {
    const loops = (source.match(/for\s*\(|while\s*\(/g) || []).length;
    const nested = (source.match(/for\s*\([\s\S]*for\s*\(|while\s*\([\s\S]*while\s*\(/g) || []).length;
    return {
      time: nested > 0 ? 'O(n²)' : loops > 0 ? 'O(n)' : 'O(1)',
      space: source.includes('[') ? 'O(n)' : 'O(1)',
      reason: 'Estimated via regex pattern matching fallback.',
      loops, nested, maxNest: nested > 0 ? 2 : 1, recursion: 0, hashUsed: false, sortUsed: false
    };
  }

  function clamp(n) { return Math.max(0, Math.min(100, Math.round(n))); }

  function getLineHeatmap(source) {
    let ast;
    try { ast = acorn.parse(source, { ecmaVersion: 2020, locations: true }); }
    catch { return {}; }

    const map = {};
    const functionNames = new Set();

    function collectFns(node) {
      if (!node || typeof node !== 'object') return;
      if (node.type === 'FunctionDeclaration' && node.id?.name) {
        functionNames.add(node.id.name);
      }
      for (const key of Object.keys(node)) {
        const child = node[key];
        if (Array.isArray(child)) child.forEach(collectFns);
        else if (child && typeof child === 'object' && child.type) collectFns(child);
      }
    }
    collectFns(ast);

    function walk(node, depth, currentFn) {
      if (!node || typeof node !== 'object') return;

      if (node.type === 'FunctionDeclaration' && node.id?.name) {
        currentFn = node.id.name;
      }

      if (node.type === 'ForStatement' || node.type === 'WhileStatement' || node.type === 'DoWhileStatement' || node.type === 'ForInStatement' || node.type === 'ForOfStatement') {
        if (node.loc?.start?.line) {
          map[node.loc.start.line] = depth > 0 ? 'red' : 'yellow';
        }
        if (node.body) walk(node.body, depth + 1, currentFn);
        if (node.init) walk(node.init, depth, currentFn);
        if (node.test) walk(node.test, depth, currentFn);
        if (node.update) walk(node.update, depth, currentFn);
        return;
      }

      if (node.type === 'IfStatement') {
        if (node.loc?.start?.line && !map[node.loc.start.line]) {
          map[node.loc.start.line] = 'green';
        }
        if (node.consequent) walk(node.consequent, depth, currentFn);
        if (node.alternate) walk(node.alternate, depth, currentFn);
        return;
      }

      if (node.type === 'CallExpression') {
        const line = node.loc?.start?.line;
        if (node.callee?.type === 'MemberExpression' && node.callee.property?.name === 'sort') {
          if (line) map[line] = 'purple';
        }
        else if (node.callee?.type === 'Identifier' && node.callee.name === currentFn) {
          if (line) map[line] = 'magenta';
        }
      }

      if (node.type === 'AssignmentExpression' || node.type === 'VariableDeclarator') {
        const line = node.loc?.start?.line;
        const codeSnippet = source.substring(node.start, node.end);
        if (/mid|low|high|\/\s*2|>>\s*1/.test(codeSnippet) && !map[line]) {
          if (line) map[line] = 'blue';
        }
      }

      for (const key of Object.keys(node)) {
        const child = node[key];
        if (Array.isArray(child)) child.forEach(c => walk(c, depth, currentFn));
        else if (child && typeof child === 'object' && child.type) walk(child, depth, currentFn);
      }
    }
    walk(ast, 0, null);
    return map;
  }

  return { analyzeComplexity, analyzeQuality, getLineHeatmap };
})();
