const AppState = {
  currentView: 'dashboard',
  theme: 'dark',
  code: '',
  execution: null,
  steps: [],
  currentStep: 0,
  isPlaying: false,
  playTimer: null,
  breakpoints: new Set(),
  algorithm: { type: 'binarySearch', steps: [], current: 0, playing: false, timer: null },
  settings: { aiProvider: 'rule', aiKey: '' }
};