import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzeCode } from '../server/analyze.js';
import { initialState, sampleCode, streak } from '../server/seed.js';

test('JavaScript sample finds the collection mismatch and proposes a guarded fix', () => {
  const result = analyzeCode(sampleCode, 'javascript');
  assert.equal(result.canApply, true);
  assert.match(result.fixedCode, /numbers\.length === 0/);
  assert.match(result.fixedCode, /total \/ numbers\.length/);
  assert.equal(result.findings[0].line, 6);
  assert.equal(analyzeCode(result.fixedCode, 'javascript').findings.length, 0);
});
test('JavaScript syntax errors report their location', () => {
  const result = analyzeCode('const value = ;', 'javascript');
  assert.equal(result.findings[0].severity, 'error');
  assert.equal(result.findings[0].line, 1);
});
test('Potentially unsafe code is analyzed, never executed', () => {
  const result = analyzeCode('eval("process.exit(1)");\ndocument.body.innerHTML = input;', 'javascript');
  assert.equal(result.findings.length, 2);
});
test('HTML checks image alternatives and button types', () => {
  assert.equal(analyzeCode('<img src="image.png">\n<button>Hello</button>', 'html').findings.length, 2);
  assert.equal(analyzeCode('<img src="image.png" alt="">\n<button type="button">Hello</button>', 'html').findings.length, 0);
});
test('CSS checks brace balance and keyboard focus', () => {
  const result = analyzeCode('button { outline: none;', 'css');
  assert.equal(result.findings.length, 2);
});
test('Initial accounts have genuine zero progress and independent state', () => {
  const first = initialState(); const second = initialState(); first.topics[0].progress = 100;
  assert.equal(first.xp, 0); assert.equal(second.topics[0].progress, 0); assert.equal(second.checkins.length, 0);
});
test('Streaks include yesterday until today is checked in', () => {
  const now = new Date('2026-10-22T18:00:00Z');
  assert.equal(streak([], now), 0);
  assert.equal(streak([{ date: '2026-10-21' }, { date: '2026-10-20' }], now), 2);
  assert.equal(streak([{ date: '2026-10-22' }, { date: '2026-10-21' }, { date: '2026-10-19' }], now), 2);
  assert.equal(streak([{ date: '2026-10-20' }], now), 0);
});
