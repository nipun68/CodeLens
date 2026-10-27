import React, { useState, useEffect } from 'react';
import { Plus, X, Sparkles, Play, Search, Code2, ArrowUpRight, Terminal, Bookmark, BookmarkCheck } from 'lucide-react';
import { Button, Modal } from '../components.jsx';
import { BUILTIN_TEMPLATES } from '../templates.js';

export default function Templates({ onOpenStudio, navigate, account, mutate, notify }) {
  const [customTemplates, setCustomTemplates] = useState(() => {
    try {
      const stored = localStorage.getItem('codelens-custom-templates');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    const syncTemplates = () => {
      try {
        const stored = localStorage.getItem('codelens-custom-templates');
        if (stored) setCustomTemplates(JSON.parse(stored));
      } catch {}
    };
    syncTemplates();
    window.addEventListener('storage', syncTemplates);
    return () => window.removeEventListener('storage', syncTemplates);
  }, []);

  const [activeFilter, setActiveFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isCustomModalOpen, setIsCustomModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newComplexity, setNewComplexity] = useState('O(n)');
  const [newCode, setNewCode] = useState(`// Write your algorithm here
let arr = [10, 25, 30, 45, 50];
let sum = 0;

for (let i = 0; i < arr.length; i++) {
  sum += arr[i];
}
console.log("Total:", sum);`);

  const handleTemplateClick = (tmpl) => {
    if (onOpenStudio) {
      onOpenStudio(tmpl.algorithm || tmpl.id, tmpl.code);
    } else if (navigate) {
      navigate('studio');
    } else {
      window.location.hash = 'studio';
    }
  };

  const handleSaveTemplateToSnippets = async (tmpl) => {
    const already = account?.snippets?.some(
      s => s.code?.trim() === tmpl.code.trim() || s.title?.toLowerCase().trim() === tmpl.title.toLowerCase().trim()
    );
    if (already) {
      if (notify) notify(`"${tmpl.title}" is already in your Saved Snippets!`, 'info');
      return;
    }
    if (mutate) {
      try {
        await mutate('/snippets', {
          title: tmpl.title,
          code: tmpl.code,
          language: 'javascript',
          tags: ['template', (tmpl.algorithm || 'algorithm').toLowerCase().replace(/\s+/g, '-')]
        }, 'POST');
        if (notify) notify(`Saved "${tmpl.title}" to your Snippets library!`, 'success');
      } catch (err) {
        if (notify) notify(err.message || 'Could not save snippet', 'error');
      }
    }
  };

  const handleCreateCustomTemplate = async (e) => {
    e.preventDefault();
    if (!newTitle.trim() || !newCode.trim()) return;

    const title = newTitle.trim();
    const newTmpl = {
      id: 'custom-' + Date.now(),
      title: title,
      complexity: newComplexity.trim() || 'Custom',
      code: newCode,
      previewCode: newCode.split('\n').slice(0, 6).join('\n')
    };

    const updated = [newTmpl, ...customTemplates];
    setCustomTemplates(updated);
    try {
      localStorage.setItem('codelens-custom-templates', JSON.stringify(updated));
      window.dispatchEvent(new Event('storage'));
    } catch (err) {
      console.warn('Failed saving template', err);
    }

    // Also save into snippets library
    let savedToSnippets = false;
    if (mutate) {
      try {
        await mutate('/snippets', {
          title: title,
          code: newCode,
          language: 'javascript',
          tags: ['template', 'custom']
        }, 'POST');
        savedToSnippets = true;
      } catch (err) {
        console.warn('Could not save to snippets:', err);
      }
    }

    if (notify) {
      if (savedToSnippets) {
        notify(`Saved "${title}" to both Templates and Snippets!`, 'success');
      } else {
        notify(`Saved "${title}" to Templates!`, 'success');
      }
    }

    setIsCustomModalOpen(false);
    setNewTitle('');
    handleTemplateClick(newTmpl);
  };

  const allTemplates = [...customTemplates, ...BUILTIN_TEMPLATES];

  const filteredTemplates = allTemplates.filter(tmpl => {
    const matchesSearch = tmpl.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          tmpl.complexity.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          tmpl.code.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;

    if (activeFilter === 'all') return true;
    if (activeFilter === 'sorting') return tmpl.title.toLowerCase().includes('sort');
    if (activeFilter === 'search') return tmpl.title.toLowerCase().includes('search');
    if (activeFilter === 'custom') return tmpl.id.startsWith('custom-');
    return true;
  });

  return (
    <div className="templates-page">
      {/* Page Heading - Styled identically to Snippets PageHeading */}
      <div className="page-heading">
        <div>
          <div className="eyebrow"><span className="status-dot" />READY-TO-RUN ALGORITHMS</div>
          <h1>
            Quick Start <span>Templates.</span>
          </h1>
          <p>
            Curated algorithms with step-by-step visual execution, call stacks, and memory tracking in CodeLens Studio.
          </p>
        </div>

        <Button icon={Plus} onClick={() => setIsCustomModalOpen(true)}>
          Custom template
        </Button>
      </div>

      {/* Controls Bar - Styled with Snippets Controls and Segmented Tab Bar */}
      <div className="snippet-controls template-controls">
        <div className="search-input">
          <Search size={18} />
          <input 
            placeholder="Search templates or complexity…" 
            aria-label="Search templates" 
            value={searchQuery} 
            onChange={e => setSearchQuery(e.target.value)} 
          />
        </div>

        <div className="segmented template-filters">
          <button 
            type="button"
            className={activeFilter === 'all' ? 'selected' : ''} 
            onClick={() => setActiveFilter('all')}
          >
            All templates ({allTemplates.length})
          </button>
          <button 
            type="button"
            className={activeFilter === 'sorting' ? 'selected' : ''} 
            onClick={() => setActiveFilter('sorting')}
          >
            Sorting
          </button>
          <button 
            type="button"
            className={activeFilter === 'search' ? 'selected' : ''} 
            onClick={() => setActiveFilter('search')}
          >
            Searching
          </button>
          {customTemplates.length > 0 && (
            <button 
              type="button"
              className={activeFilter === 'custom' ? 'selected' : ''} 
              onClick={() => setActiveFilter('custom')}
            >
              Custom ({customTemplates.length})
            </button>
          )}
        </div>
      </div>

      <div className="library-caption">
        <span>{filteredTemplates.length} {filteredTemplates.length === 1 ? 'template' : 'templates'} in view</span>
        <span>Ready for visual studio inspection</span>
      </div>

      {/* Templates Grid - Cards matching Snippets card theme and typography */}
      <div className="templates-grid">
        {filteredTemplates.map(tmpl => (
          <article 
            key={tmpl.id} 
            className="card template-card" 
            onClick={() => handleTemplateClick(tmpl)}
            role="button"
            tabIndex={0}
            onKeyDown={e => { if (e.key === 'Enter') handleTemplateClick(tmpl); }}
          >
            <div className="template-card-top">
              <span className={`complexity-badge ${tmpl.badgeClass || ''}`}>
                {tmpl.complexity}
              </span>
              <span className="template-type-label">
                {tmpl.title.toLowerCase().includes('sort') ? 'Sorting' : tmpl.title.toLowerCase().includes('search') ? 'Searching' : 'Algorithm'}
              </span>
            </div>

            <div className="template-title">
              <h2>{tmpl.title}</h2>
              <ArrowUpRight size={18} />
            </div>

            <div className="template-code-box">
              <pre><code>{tmpl.previewCode}</code></pre>
              <div className="code-preview-fade" />
            </div>

            <div className="template-card-footer">
              <span className="text-link">
                Launch in Studio
                <ArrowUpRight size={15} />
              </span>
              <button 
                type="button" 
                className={`template-snippet-btn ${account?.snippets?.some(s => s.code?.trim() === tmpl.code.trim()) ? 'is-saved' : ''}`}
                onClick={(e) => {
                  e.stopPropagation();
                  handleSaveTemplateToSnippets(tmpl);
                }}
                title={account?.snippets?.some(s => s.code?.trim() === tmpl.code.trim()) ? "Already in Saved Snippets" : "Save this template to Snippets"}
              >
                {account?.snippets?.some(s => s.code?.trim() === tmpl.code.trim()) ? (
                  <>
                    <BookmarkCheck size={14} />
                    <span>In Snippets</span>
                  </>
                ) : (
                  <>
                    <Bookmark size={14} />
                    <span>Save to Snippets</span>
                  </>
                )}
              </button>
            </div>
          </article>
        ))}

        {/* Create Custom Template Card matching new-snippet-card */}
        <button 
          type="button"
          className="new-snippet-card new-template-card" 
          onClick={() => setIsCustomModalOpen(true)}
        >
          <span className="icon-tile mint"><Plus size={25} /></span>
          <h3>Your custom algorithm.</h3>
          <p>Test with step-by-step visual execution.</p>
          <span>Add a template<ArrowUpRight size={16} /></span>
        </button>
      </div>

      {/* Custom Template Modal - Using CodeLens/Snippets Modal */}
      {isCustomModalOpen && (
        <Modal 
          title="Create Custom Template" 
          subtitle="Add your algorithm to run step-by-step with memory and stack visualization."
          onClose={() => setIsCustomModalOpen(false)}
        >
          <form onSubmit={handleCreateCustomTemplate}>
            <div className="form-grid">
              <div className="field full-width">
                <span>Template Name</span>
                <input 
                  type="text" 
                  placeholder="e.g. Merge Sort, Two Sum, Quick Sort" 
                  value={newTitle} 
                  onChange={e => setNewTitle(e.target.value)} 
                  required 
                />
              </div>

              <div className="field full-width">
                <span>Complexity Badge</span>
                <input 
                  type="text" 
                  placeholder="e.g. O(n log n), O(n), Debug" 
                  value={newComplexity} 
                  onChange={e => setNewComplexity(e.target.value)} 
                />
              </div>

              <div className="field full-width">
                <span>JavaScript Code</span>
                <textarea 
                  rows={8}
                  placeholder="// Paste or write JavaScript code here..."
                  value={newCode}
                  onChange={e => setNewCode(e.target.value)}
                  style={{ fontFamily: 'var(--mono)', fontSize: '12px' }}
                  required
                />
              </div>
            </div>

            <div className="modal-actions">
              <Button 
                type="button" 
                variant="secondary" 
                onClick={() => setIsCustomModalOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" icon={Play}>
                Save & Launch in Studio
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
