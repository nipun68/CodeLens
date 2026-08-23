const Api = (() => {
  async function fetchPublicFact() {
    try {
      const res = await fetch('https://uselessfacts.jsph.pl/api/v2/facts/random');
      if (!res.ok) throw new Error('Fact API failed');
      const data = await res.json();
      return data.text;
    } catch { 
      return 'Network unavailable — using offline mode.'; 
    }
  }
  
  return { fetchPublicFact };
})();