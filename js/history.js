const CodeLensHistory = (() => {
  const MAX = 50;

  function getAll() { return Storage.getHistory(); }

  function add(entry) {
    const list = getAll();
    list.unshift({ id: Date.now(), ...entry });
    const trimmed = list.slice(0, MAX);
    Storage.saveHistory(trimmed);
    return trimmed;
  }

  function remove(id) {
    const list = getAll().filter(h => h.id !== id);
    Storage.saveHistory(list);
    return list;
  }

  function clear() { Storage.saveHistory([]); }

  function getRecent(n=5) { return getAll().slice(0,n); }

  return { getAll, add, remove, clear, getRecent };
})();