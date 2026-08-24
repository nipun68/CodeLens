const Storage = (() => {
  const KEYS = {
    HISTORY: 'codelens.history',
    SETTINGS: 'codelens.settings',
    LEARNING: 'codelens.learning',
    THEME: 'codelens.theme',
    EXAMPLES: 'codelens.examples',
    EXEC_COUNTS: 'codelens.exec_counts',
    SESSION: 'codelens.session'
  };

  const read = (key, fallback) => {
    try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; }
    catch { return fallback; }
  };
  const write = (key, value) => {
    try { localStorage.setItem(key, JSON.stringify(value)); return true; }
    catch (e) { console.warn('Storage write failed', e); return false; }
  };
  const remove = (key) => localStorage.removeItem(key);

  const readSession = (key, fallback) => {
    try { const v = sessionStorage.getItem(key); return v ? JSON.parse(v) : fallback; }
    catch { return fallback; }
  };
  const writeSession = (key, value) => sessionStorage.setItem(key, JSON.stringify(value));

  return {
    KEYS,
    getHistory: () => read(KEYS.HISTORY, []),
    saveHistory: (arr) => write(KEYS.HISTORY, arr),
    getSettings: () => read(KEYS.SETTINGS, { aiProvider:'rule', aiKey:'' }),
    saveSettings: (obj) => write(KEYS.SETTINGS, obj),
    getLearning: () => read(KEYS.LEARNING, CodeLensLearning.defaultLearning()),
    saveLearning: (obj) => write(KEYS.LEARNING, obj),
    getTheme: () => read(KEYS.THEME, 'dark'),
    saveTheme: (t) => write(KEYS.THEME, t),
    getExamples: () => read(KEYS.EXAMPLES, []),
    saveExamples: (arr) => write(KEYS.EXAMPLES, arr),
    getExecCounts: () => read(KEYS.EXEC_COUNTS, {}),
    saveExecCounts: (obj) => write(KEYS.EXEC_COUNTS, obj),
    getSession: () => readSession(KEYS.SESSION, { lastCode:'', lastLang:'javascript' }),
    saveSession: (s) => writeSession(KEYS.SESSION, s),
    clearAll: () => Object.values(KEYS).forEach(remove)
  };
})();
