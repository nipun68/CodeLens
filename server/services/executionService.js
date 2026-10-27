/**
 * CodeLens Execution Service
 * Handles code instrumentation, preparation, Judge0 execution,
 * AST-free runtime tracing, and execution diagnostics.
 */
import {
  executeWithJudge0,
  prepareSourceForExecution,
  parseExecutionDiagnostic,
  instrumentJavaSource
} from '../execution.js';

export const executionService = {
  executeWithJudge0,
  prepareSourceForExecution,
  parseExecutionDiagnostic,
  instrumentJavaSource
};

export {
  executeWithJudge0,
  prepareSourceForExecution,
  parseExecutionDiagnostic,
  instrumentJavaSource
};

export default executionService;
