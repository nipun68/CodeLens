import React from 'react';
import { Play } from 'lucide-react';

export default function Workspace({ onOpenStudio, navigate }) {
  const handleOpenWorkspace = () => {
    if (onOpenStudio) onOpenStudio('bubble-sort');
    else if (navigate) navigate('studio');
    else window.location.hash = 'studio';
  };

  const handleVisualizeAlgorithm = () => {
    if (onOpenStudio) onOpenStudio('binary-search');
    else if (navigate) navigate('studio');
    else window.location.hash = 'studio';
  };

  return (
    <div className="workspace-hero-wrapper">
      <div className="workspace-feature-card">
        {/* Left Side: Headline & Call To Action */}
        <div className="feature-card-left">
          <h1 className="feature-hero-title">
            <span className="title-white">Don't just see what your code</span>
            <span className="title-outputs">outputs.</span>
            <span className="title-does-row">
              <span className="title-white">See what it </span>
              <span className="title-gradient-does">does.</span>
            </span>
          </h1>

          <p className="feature-hero-desc">
            CodeLens AI executes your JavaScript <strong>line-by-line</strong>, captures every variable change,
            loop iteration and function call — then visualizes the entire execution so you can debug like a pro.
          </p>

          <div className="feature-hero-actions">
            <button className="open-workspace-btn" onClick={handleOpenWorkspace}>
              <Play size={15} fill="currentColor" />
              <span>Open Workspace</span>
            </button>

            <button className="visualize-algo-btn" onClick={handleVisualizeAlgorithm}>
              <span>Visualize an Algorithm</span>
            </button>
          </div>

          <div className="feature-hero-badges">
            <span className="feature-pill">Line-by-Line Execution</span>
            <span className="feature-pill">AST Interpreter</span>
            <span className="feature-pill">Breakpoints</span>
            <span className="feature-pill">Call Stack</span>
          </div>
        </div>

        {/* Right Side: Live Preview Window */}
        <div className="feature-card-right">
          <div className="live-preview-window">
            <div className="live-preview-header">
              <div className="window-dots">
                <i />
                <i />
                <i />
              </div>
              <span className="live-preview-title">LIVE PREVIEW // MAIN.JS</span>
              <span className="live-preview-badge">JavaScript</span>
            </div>

            <div className="live-preview-code">
              <pre>
                <code>
                  <span className="c-keyword">let</span> <span className="c-var">arr</span> = [<span className="c-num">10</span>, <span className="c-num">20</span>, <span className="c-num">30</span>, <span className="c-num">40</span>, <span className="c-num">50</span>];{'\n'}
                  <span className="c-keyword">let</span> <span className="c-var">target</span> = <span className="c-num">40</span>;{'\n'}
                  <span className="c-keyword">let</span> <span className="c-var">low</span> = <span className="c-num">0</span>, <span className="c-var">high</span> = <span className="c-var">arr</span>.length - <span className="c-num">1</span>;{'\n'}
                  {'\n'}
                  <span className="c-keyword">while</span> (<span className="c-var">low</span> &lt;= <span className="c-var">high</span>) {'{'}{'\n'}
                  {'  '}<span className="c-keyword">let</span> <span className="c-var">mid</span> = Math.<span className="c-fn">floor</span>((<span className="c-var">low</span> + <span className="c-var">high</span>) / <span className="c-num">2</span>);{'\n'}
                  {'  '}<span className="c-keyword">if</span> (<span className="c-var">arr</span>[<span className="c-var">mid</span>] === <span className="c-var">target</span>) {'{'}{'\n'}
                  {'    '}<span className="c-obj">console</span>.<span className="c-fn">log</span>(<span className="c-str">"Found at"</span>, <span className="c-var">mid</span>);{'\n'}
                  {'    '}<span className="c-keyword">break</span>;{'\n'}
                  {'  }'}{'\n'}
                  {'  '}<span className="c-var">arr</span>[<span className="c-var">mid</span>] &lt; <span className="c-var">target</span> ? <span className="c-var">low</span> = <span className="c-var">mid</span> + <span className="c-num">1</span> : <span className="c-var">high</span> = <span className="c-var">mid</span> - <span className="c-num">1</span>;{'\n'}
                  {'}'}
                </code>
              </pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
