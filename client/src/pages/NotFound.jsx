import React from 'react';
import { Code2, ArrowLeft, Home, Terminal, Sparkles, Binary, Moon, Sun } from 'lucide-react';
import { Brand, Button } from '../components.jsx';

export default function NotFound({ theme, setTheme, onNavigate, account }) {
  const isGuestOrAuthed = account && !account.isGuest;

  return (
    <div className="not-found-page">
      <header className="not-found-header">
        <button
          className="brand-button"
          onClick={() => onNavigate(account?.isGuest ? 'landing' : 'workspace')}
          aria-label="CodeLens Home"
        >
          <Brand />
        </button>

        <div className="not-found-header-actions">
          {setTheme && (
            <button
              className="icon-btn"
              onClick={() => setTheme(t => t === 'light' ? 'dark' : 'light')}
              aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`}
            >
              {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
            </button>
          )}
        </div>
      </header>

      <main className="not-found-content">
        <div className="not-found-visual-container">
          <div className="not-found-code-badge">
            <span className="code-bracket">{'{'}</span>
            <span className="code-err">404</span>
            <span className="code-bracket">{'}'}</span>
          </div>
          <div className="not-found-glow" />
        </div>

        <h1 className="not-found-title">404 — Page Not Found</h1>
        <p className="not-found-description">
          The requested route or algorithm resource does not exist, may have moved, or is temporarily unavailable. Check the address or jump back into your code environment.
        </p>

        <div className="not-found-actions">
          <Button
            variant="primary"
            icon={Code2}
            onClick={() => onNavigate('workspace')}
          >
            Back to Workspace
          </Button>

          <Button
            variant="secondary"
            icon={Home}
            onClick={() => onNavigate('landing')}
          >
            Back to Home
          </Button>

          <Button
            variant="ghost"
            icon={ArrowLeft}
            onClick={() => window.history.back()}
          >
            Previous Page
          </Button>
        </div>

        <div className="not-found-suggestions">
          <span className="suggestions-label">RECOMMENDED DESTINATIONS</span>
          <div className="suggestions-grid">
            <button
              type="button"
              className="suggestion-card"
              onClick={() => onNavigate('studio')}
            >
              <Terminal size={18} className="text-mint" />
              <div>
                <strong>Studio Visualizer</strong>
                <p>Interactive tree, stack, and graph runtime debugger</p>
              </div>
            </button>

            <button
              type="button"
              className="suggestion-card"
              onClick={() => onNavigate('algorithms')}
            >
              <Binary size={18} className="text-mint" />
              <div>
                <strong>Data Structures & Algos</strong>
                <p>Live sandbox with complexity profiling</p>
              </div>
            </button>

            <button
              type="button"
              className="suggestion-card"
              onClick={() => onNavigate('templates')}
            >
              <Sparkles size={18} className="text-mint" />
              <div>
                <strong>Starter Templates</strong>
                <p>Pre-instrumented code patterns and paradigms</p>
              </div>
            </button>
          </div>
        </div>
      </main>

      <footer className="not-found-footer">
        <span>CodeLens Program Intelligence Platform</span>
        <span className="footer-dot">•</span>
        <span>Made for the process. Not just the progress.</span>
      </footer>
    </div>
  );
}
