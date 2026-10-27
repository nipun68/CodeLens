import { parse } from 'acorn';

export function analyzeCode(code, language) {
  const findings = [];
  let fixedCode = code;
  const add = (title, detail, line, severity = 'warning') => findings.push({ title, detail, line, severity });
  if (language === 'javascript') {
    try { parse(code, { ecmaVersion: 'latest', sourceType: 'module', locations: true }); }
    catch (error) { add('A syntax error is stopping your code.', error.message, error.loc?.line || 1, 'error'); }
    const collection = code.match(/for\s*\(\s*(?:const|let|var)\s+(\w+)\s+of\s+(\w+)\s*\)/);
    if (collection) {
      const [, item, list] = collection;
      const wrong = new RegExp(`\\b${item}\\.length\\b`, 'g');
      const occurrence = wrong.exec(code);
      if (occurrence) {
        const line = code.slice(0, occurrence.index).split('\n').length;
        add('Collection item vs. collection', `Line ${line} uses ${item}.length, but ${item} is the loop item. If you need the collection size, use ${list}.length. Outside the loop, the block-scoped item is not defined.`, line, 'error');
        fixedCode = code.replace(wrong, `${list}.length`);
        if (new RegExp(`return\\s+[^;\\n]+/\\s*${list}\\.length`).test(fixedCode)) {
          fixedCode = fixedCode.replace(/(function\s+\w+\s*\([^)]*\)\s*\{)/, `$1\n  if (${list}.length === 0) return 0;`);
          add('Give the empty collection a safe path.', 'Dividing by an empty array length returns NaN or Infinity. The suggested fix returns 0 for an empty collection; choose the behavior that fits your application.', 1, 'info');
        }
      }
    }
    code.split('\n').forEach((line, index) => {
      if (/\beval\s*\(/.test(line)) add('Avoid dynamic code execution.', 'eval can execute untrusted input. Prefer parsing data with JSON.parse or an explicit function.', index + 1, 'warning');
      if (/[^=!]==[^=]/.test(line)) add('Make equality explicit.', 'Strict equality (===) avoids unexpected type coercion. Confirm the types before changing this comparison.', index + 1, 'info');
      if (/\.innerHTML\s*=/.test(line)) add('Be careful with HTML injection.', 'Use textContent for user-provided text. If HTML is required, sanitize it with a maintained sanitizer.', index + 1, 'warning');
    });
  } else if (language === 'html') {
    code.split('\n').forEach((line, index) => {
      if (/<img\b[^>]*>/i.test(line) && !/\balt\s*=/i.test(line)) add('Give your image an accessible alternative.', 'Add an alt attribute: descriptive text for meaningful images, or alt="" for decorative ones.', index + 1);
      if (/<button\b/i.test(line) && !/\btype\s*=/i.test(line)) add('Set the button type.', 'Inside a form, a button defaults to submit. Use type="button" unless it should submit.', index + 1, 'info');
    });
  } else if (language === 'css') {
    const balance = [...code].reduce((n, c) => n + (c === '{' ? 1 : c === '}' ? -1 : 0), 0);
    if (balance !== 0) add('Your braces do not match.', 'Check that every opening CSS block has a closing brace.', 1, 'error');
    code.split('\n').forEach((line, index) => {
      if (/outline\s*:\s*(none|0)/.test(line)) add('Keep keyboard focus visible.', 'Replace the outline with a visible :focus-visible style instead of removing it.', index + 1);
      if (/!important/.test(line)) add('Keep specificity manageable.', 'Consider a more targeted selector or cascade layers before reaching for !important.', index + 1, 'info');
    });
  }
  const errors = findings.filter(f => f.severity === 'error').length;
  return {
    title: errors ? 'A small change. A clearer path.' : findings.length ? 'A few things worth a closer look.' : 'Looking good at first glance.',
    score: Math.max(20, 100 - errors * 18 - findings.filter(f => f.severity === 'warning').length * 8 - findings.filter(f => f.severity === 'info').length * 3),
    findings, fixedCode, canApply: fixedCode !== code,
    summary: findings.length ? `Found ${findings.length} ${findings.length === 1 ? 'clue' : 'clues'} to help you move forward.` : 'No issues found by these checks. This is not a guarantee of correctness; test your code and its edge cases.',
    engine: 'DevPulse static checks',
  };
}
