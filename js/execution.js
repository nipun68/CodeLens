const Execution = (() => {

  async function run(source) {
    if (!source || !source.trim()) {
      return { error: { message: 'No code to execute', line: 0 }, exitCode: 1, steps: [], output: '', variables: {}, codeLines: [] };
    }
    const result = Interpreter.execute(source);
    return result;
  }

  return { run };
})();