import { randomUUID } from 'node:crypto';
import { executeWithJudge0 } from '../services/executionService.js';
import { fail } from '../middleware/authMiddleware.js';

const RUNTIME_VERSIONS = Object.freeze({
  python: 'Python 3.12 (Judge0 Sandbox)',
  java: 'OpenJDK 21 (Judge0 Sandbox)',
  cpp: 'GCC 14 (C++17, Judge0 Sandbox)',
  javascript: 'Node.js 20 (Judge0 Sandbox)'
});

export const executeCode = async (req, res) => {
  const source = req.body.source;
  if (typeof source !== 'string' || !source.trim() || source.length > 30000) {
    fail('Source code must contain 1–30,000 characters.');
  }
  const stdin = req.body.stdin ?? '';
  if (typeof stdin !== 'string' || stdin.length > 10000) {
    fail('Standard input must be no larger than 10,000 characters.');
  }
  if (Buffer.byteLength(source, 'utf8') > 30000) {
    fail('Source code must be no larger than 30 KB.');
  }
  if (Buffer.byteLength(stdin, 'utf8') > 10000) {
    fail('Standard input must be no larger than 10 KB.');
  }
  const language = req.body.language;
  if (!['python', 'java', 'javascript', 'cpp'].includes(language)) {
    fail('Choose Python, JavaScript, Java, or C++.');
  }

  const executionId = req.body.executionId || `exec-${randomUUID()}`;
  const controller = new AbortController();
  res.on('close', () => {
    if (!res.writableEnded) controller.abort();
  });

  let result;
  try {
    result = await executeWithJudge0({
      source,
      stdin,
      language,
      mode: req.body.mode || 'run',
      signal: controller.signal,
      timeoutMs: Number(process.env.EXECUTION_TIMEOUT_MS) || 45000
    });
  } catch (error) {
    if (controller.signal.aborted) return;
    throw error;
  }

  const execution = {
    executionId,
    sourceVersion: req.body.sourceVersion || `src-${Date.now()}`,
    language,
    runtimeVersion: RUNTIME_VERSIONS[language] || language,
    mode: req.body.mode || 'run',
    status: result.status,
    statusId: result.statusId,
    executionStage: result.executionStage || (result.isCompileFailure ? 'compile_failed' : (result.exitCode === 0 ? 'completed' : 'runtime_failed')),
    compilationStatus: result.compilationStatus || (result.compileOutput ? 'failed' : (['java', 'cpp'].includes(language) ? 'success' : 'not_applicable')),
    compilationDiagnostics: result.compileOutput || (result.isPythonSyntax ? result.stderr : null),
    executionStarted: result.executionStarted ?? (!result.isCompileFailure && result.statusId !== null && result.statusId !== 5),
    traceStatus: result.traceStatus || (result.hasTrace ? 'complete' : 'unavailable'),
    runtimeDiagnostics: (result.statusId >= 7 && result.statusId <= 12 && !result.isPythonSyntax) ? (result.stderr || result.status) : null,
    stdout: result.stdout,
    stderr: result.stderr,
    exitCode: result.exitCode,
    time: result.time,
    duration: result.duration || (result.time ? `${result.time}s` : null),
    memory: result.memory,
    timedOut: Boolean(result.timedOut || result.status === 'timeout' || result.statusId === 5),
    errorCategory: result.errorCategory || (result.statusId === 6 ? 'compilation_error' : (result.statusId >= 7 && result.statusId <= 12 ? 'runtime_exception' : (result.timedOut ? 'timeout' : null))),
    diagnostic: result.diagnostic || null
  };

  res.set('Cache-Control', 'no-store').json({
    execution,
    trace: result.trace || null,
    debugger: {
      supported: Boolean(result.hasTrace),
      type: result.hasTrace ? 'Instrumented Container Tracing' : 'Standard Runtime Execution',
      reason: result.hasTrace
        ? 'Data-structure mutation operations and snapshots captured via CodeLens instrumentation wrappers.'
        : 'Standard execution completed. Include CodeLens wrappers (e.g. from codelens import CodeLensQueue or #include "codelens.hpp") for container tracing.'
    }
  });
};
