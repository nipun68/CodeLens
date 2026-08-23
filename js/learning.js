const CodeLensLearning = (() => {
  const TOPICS = ['Variables','Loops','Functions','Recursion','Searching','Sorting','Arrays','Objects'];

  function defaultLearning() {
    return {
      topics: TOPICS.reduce((acc, t) => ({ ...acc, [t]: 0 }), {}),
      totalRuns: 0,
      errorsEncountered: 0,
      successCount: 0,
      lastActivity: null,
      activityLog: [],
      achievements: []
    };
  }

  function get() {
    let data = Storage.getLearning();
    
    if (!data.activityLog) data.activityLog = [];
    if (!data.achievements) data.achievements = [];
    if (!data.successCount) data.successCount = 0;
    if (!data.topics) data.topics = defaultLearning().topics;
    
    return data;
  }
  
  function save(data) { Storage.saveLearning(data); }

  function recordRun(topic, success, code) {
    const data = get();
    data.totalRuns++;
    if (!success) data.errorsEncountered++;
    else data.successCount++;

    if (topic && data.topics[topic] != null) {
      data.topics[topic] = Math.min(100, data.topics[topic] + (success ? 15 : 5));
    }

    data.activityLog.unshift({
      topic, success, timestamp: Date.now(),
      preview: (code || '').slice(0, 80)
    });
    data.activityLog = data.activityLog.slice(0, 20);

    data.lastActivity = new Date().toISOString();

    checkAchievements(data);

    save(data);
    return data;
  }

  function checkAchievements(data) {
    const ach = [
      { id: 'first_run', name: 'First Steps', icon: '🎯', condition: () => data.totalRuns >= 1 },
      { id: 'ten_runs', name: 'Getting Started', icon: '🔥', condition: () => data.totalRuns >= 10 },
      { id: 'no_errors', name: 'Clean Code', icon: '✨', condition: () => data.successCount >= 5 && data.errorsEncountered === 0 },
      { id: 'debugger', name: 'Bug Hunter', icon: '🐛', condition: () => data.errorsEncountered >= 3 },
      { id: 'loop_master', name: 'Loop Master', icon: '🔁', condition: () => data.topics.Loops >= 70 },
      { id: 'recursion', name: 'Recursion Ninja', icon: '🥷', condition: () => data.topics.Recursion >= 50 },
      { id: 'sort_pro', name: 'Sort Pro', icon: '📊', condition: () => data.topics.Sorting >= 70 },
      { id: 'consistent', name: 'Consistent', icon: '💪', condition: () => data.totalRuns >= 20 }
    ];
    data.achievements = ach.filter(a => a.condition());
  }

  const TOPIC_TEMPLATES = {
    Searching: 'binarySearch',
    Sorting: 'bubbleSort',
    Recursion: 'factorial',
    Loops: 'arraySum',
    Variables: 'arraySum',
    Arrays: 'bubbleSort',
    Functions: 'factorial',
    Objects: 'binarySearch'
  };

  function recommend() {
    const data = get();
    const sorted = Object.entries(data.topics)
      .sort((a, b) => a[1] - b[1])
      .slice(0, 4)
      .map(([t, score]) => ({
        topic: t,
        score,
        templateKey: TOPIC_TEMPLATES[t] || 'binarySearch',
        rationale: score < 30 ? 'Needs focused practice — start with foundational AST execution.'
          : score < 60 ? 'Making steady progress — practice edge cases & complexity optimizations.'
          : score < 80 ? 'Solid mastery — challenge yourself with nested structures.'
          : 'High proficiency — explore advanced algorithm implementations.'
      }));
    return sorted;
  }

  function stats() {
    const data = get();
    const total = Object.values(data.topics).reduce((a, b) => a + b, 0);
    const avg = Math.round(total / TOPICS.length);
    return {
      totalRuns: data.totalRuns,
      successCount: data.successCount || 0,
      errors: data.errorsEncountered,
      avgScore: avg,
      lastActivity: data.lastActivity,
      achievements: data.achievements || []
    };
  }

  function detectTopic(code) {
    if (/binary|search|mid.*low.*high/.test(code)) return 'Searching';
    if (/sort|bubble|swap/.test(code)) return 'Sorting';
    if (/recursion|factorial|fib|return\s+\w+\(/.test(code)) return 'Recursion';
    if (/function|=>/.test(code)) return 'Functions';
    if (/for|while/.test(code)) return 'Loops';
    if (/let|const|var/.test(code)) return 'Variables';
    if (/array|\[\]/.test(code)) return 'Arrays';
    if (/\{.*:/.test(code)) return 'Objects';
    return null;
  }

  const ALL_ACHIEVEMENTS = [
    { id: 'first_run', name: 'First Steps', icon: '🎯' },
    { id: 'ten_runs', name: 'Getting Started', icon: '🔥' },
    { id: 'no_errors', name: 'Clean Code', icon: '✨' },
    { id: 'debugger', name: 'Bug Hunter', icon: '🐛' },
    { id: 'loop_master', name: 'Loop Master', icon: '🔁' },
    { id: 'recursion', name: 'Recursion Ninja', icon: '🥷' },
    { id: 'sort_pro', name: 'Sort Pro', icon: '📊' },
    { id: 'consistent', name: 'Consistent', icon: '💪' }
  ];

  return { defaultLearning, get, save, recordRun, recommend, stats, detectTopic, TOPICS, ALL_ACHIEVEMENTS };
})();