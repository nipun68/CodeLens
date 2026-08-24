const CodeLensTemplates = (() => {
  function getCustomTemplates() {
    return Storage.getExamples() || [];
  }

  function saveCustomTemplates(arr) {
    Storage.saveExamples(arr);
  }

  function getExecCounts() {
    return Storage.getExecCounts() || {};
  }

  function saveExecCounts(obj) {
    Storage.saveExecCounts(obj);
  }

  function deriveTitle(code) {
    if (!code) return 'Quick Template';
    const lines = code.trim().split('\n');
    for (let line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('//') || trimmed.startsWith('/*')) {
        const title = trimmed.replace(/^(\/\/|\/\*+|\*+|\*\/)/g, '').trim();
        if (title.length > 2 && title.length < 50) return title;
      }
      const fnMatch = trimmed.match(/function\s+([a-zA-Z0-9_$]+)/);
      if (fnMatch) return fnMatch[1] + '()';
      const classMatch = trimmed.match(/class\s+([a-zA-Z0-9_$]+)/);
      if (classMatch) return classMatch[1] + ' Class';
      const varMatch = trimmed.match(/(const|let|var)\s+([a-zA-Z0-9_$]+)/);
      if (varMatch) return varMatch[2] + ' snippet';
    }
    const firstLine = lines[0].trim();
    return firstLine.substring(0, 30) + (firstLine.length > 30 ? '...' : '');
  }

  function getBuiltInTemplates() {
    if (typeof Editor === 'undefined' || !Editor.META) return [];
    return Editor.META.map(m => ({
      key: m.key,
      id: m.key,
      title: m.title,
      tag: m.tag,
      desc: m.desc,
      code: Editor.EXAMPLES[m.key] || '',
      isBuiltIn: true
    }));
  }

  function getAllTemplates() {
    const builtIn = getBuiltInTemplates();
    const custom = getCustomTemplates().map(c => ({
      ...c,
      isBuiltIn: false
    }));
    return [...custom, ...builtIn];
  }

  function getTemplateByKeyOrId(keyOrId) {
    const all = getAllTemplates();
    return all.find(t => t.key === keyOrId || t.id === keyOrId);
  }

  function recordExecution(code, isSuccess) {
    if (!code || !code.trim() || !isSuccess) {
      return { autoAdded: false, count: 0 };
    }

    const normalizedCode = code.trim();
    const counts = getExecCounts();
    const currentCount = (counts[normalizedCode] || 0) + 1;
    counts[normalizedCode] = currentCount;
    saveExecCounts(counts);

    // Check if count is at least 8 (>= 8)
    if (currentCount >= 8) {
      const allTemplates = getAllTemplates();
      // Check if code is already saved in templates
      const alreadyExists = allTemplates.some(t => t.code && t.code.trim() === normalizedCode);

      if (!alreadyExists) {
        const title = deriveTitle(code) || 'Frequent Execution Snippet';
        const newTemplate = {
          id: 'tpl_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
          key: 'auto_' + Date.now(),
          title: title,
          tag: '★ Auto (8x)',
          desc: `Auto-added to Quick Start Templates after ${currentCount} successful executions`,
          code: code,
          autoAdded: true,
          execCount: currentCount,
          timestamp: Date.now()
        };

        const customList = getCustomTemplates();
        customList.unshift(newTemplate);
        saveCustomTemplates(customList);

        return { autoAdded: true, template: newTemplate, count: currentCount };
      }
    }

    return { autoAdded: false, count: currentCount };
  }

  function addCustomTemplate(code, title, tag, desc) {
    if (!code || !code.trim()) {
      throw new Error('Code content cannot be empty');
    }
    const cleanCode = code.trim();
    const finalTitle = title?.trim() || deriveTitle(cleanCode) || 'Saved Template';
    const finalTag = tag?.trim() || '★ Custom';
    const finalDesc = desc?.trim() || 'Directly added to Quick Start Templates';

    const newTemplate = {
      id: 'tpl_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      key: 'custom_' + Date.now(),
      title: finalTitle,
      tag: finalTag,
      desc: finalDesc,
      code: cleanCode,
      autoAdded: false,
      timestamp: Date.now()
    };

    const customList = getCustomTemplates();
    customList.unshift(newTemplate);
    saveCustomTemplates(customList);
    return newTemplate;
  }

  function removeCustomTemplate(idOrKey) {
    let customList = getCustomTemplates();
    customList = customList.filter(t => t.id !== idOrKey && t.key !== idOrKey);
    saveCustomTemplates(customList);
  }

  return {
    getCustomTemplates,
    getBuiltInTemplates,
    getAllTemplates,
    getTemplateByKeyOrId,
    getExecCounts,
    recordExecution,
    addCustomTemplate,
    removeCustomTemplate,
    deriveTitle
  };
})();
