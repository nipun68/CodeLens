export const sampleCode = `function calculateAverage(numbers) {
  let total = 0;
  for (const number of numbers) {
    total += number;
  }
  return total / number.length;
}

const values = [12, 18, 24, 30];
console.log(calculateAverage(values));`;

export function initialState() {
  return {
    profile: { name: 'Alex Rivera', handle: '@alexbuilds', bio: 'Frontend engineer in the making', avatar: '', goals: ['Ship a React side project', 'Master async patterns'] },
    xp: 0,
    focusSeconds: 0,
    solved: 0,
    checkins: [],
    sessions: [],
    topics: [
      { id: 'javascript', name: 'JavaScript foundations', progress: 0, color: 'mint', lessons: ['Variables & types', 'Functions & scope', 'Arrays & objects', 'Async & promises'] },
      { id: 'react', name: 'React & component thinking', progress: 0, color: 'lilac', lessons: ['Your first component', 'Props & composition', 'State & events', 'Effects & data fetching'] },
      { id: 'algorithms', name: 'Data structures & algorithms', progress: 0, color: 'amber', lessons: ['Arrays & strings', 'Maps & sets', 'Sorting & searching', 'Big O notation'] },
      { id: 'backend', name: 'Backend & API design', progress: 0, color: 'rose', lessons: ['Express fundamentals', 'RESTful endpoints', 'MongoDB models', 'Authentication'] },
    ],
    completedLessons: [],
    snippets: [
      { id: 'welcome-snippet', title: 'A little debugging warm-up', language: 'javascript', code: sampleCode, tags: ['practice', 'arrays'], createdAt: new Date().toISOString() },
    ],
    subscription: { plan: 'free', status: 'inactive', interval: 'monthly', demo: false },
    usage: { date: '', analyses: 0 },
  };
}

export function streak(checkins, now = new Date()) {
  const dates = new Set(checkins.map(c => c.date));
  const cursor = new Date(now.toISOString().slice(0, 10) + 'T12:00:00Z');
  if (!dates.has(cursor.toISOString().slice(0, 10))) cursor.setUTCDate(cursor.getUTCDate() - 1);
  let count = 0;
  while (dates.has(cursor.toISOString().slice(0, 10))) {
    count++;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }
  return count;
}
