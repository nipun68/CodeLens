import React, { useState } from 'react';
import { Binary, Play, RotateCcw, Plus, Trash2, ArrowRight } from 'lucide-react';

export default function Algorithms() {
  // 1. Array State
  const [arrayItems, setArrayItems] = useState([10, 25, 40, 75]);
  const [arrayValInput, setArrayValInput] = useState('');
  const [arrayIdxInput, setArrayIdxInput] = useState('');
  const [arrayLog, setArrayLog] = useState({ text: 'Deleted "34" at index 4. Time Complexity: O(1)', icon: '🗑️' });
  const [arrayHighlight, setArrayHighlight] = useState(null);

  // 2. Stack State (bottom to top)
  const [stackItems, setStackItems] = useState([5, 12, 28]);
  const [stackInput, setStackInput] = useState('');
  const [stackLog, setStackLog] = useState({ text: 'Popped "34" from top of stack. Time Complexity: O(1)', icon: '📥' });
  const [stackHighlight, setStackHighlight] = useState(null);

  // 3. Queue State (front to rear)
  const [queueItems, setQueueItems] = useState([15, 30, 45]);
  const [queueInput, setQueueInput] = useState('');
  const [queueLog, setQueueLog] = useState({ text: 'Enqueued "45" at rear. Time Complexity: O(1)', icon: '🚶' });
  const [queueHighlight, setQueueHighlight] = useState(null);

  // 4. Linked List State
  const [listItems, setListItems] = useState([34, 10, 20, 30]);
  const [listInput, setListInput] = useState('');
  const [listLog, setListLog] = useState({ text: 'Prepended "34" at head. Time Complexity: O(1)', icon: '🔗' });
  const [listHighlight, setListHighlight] = useState(null);

  // ---- Array Handlers ----
  const handleArrayInsert = () => {
    if (!arrayValInput.trim()) return;
    const val = isNaN(Number(arrayValInput)) ? arrayValInput.trim() : Number(arrayValInput);
    const idx = arrayIdxInput.trim() === '' ? arrayItems.length : Math.max(0, Math.min(arrayItems.length, parseInt(arrayIdxInput, 10) || 0));

    const updated = [...arrayItems];
    updated.splice(idx, 0, val);
    setArrayItems(updated);
    setArrayHighlight(idx);
    const complexity = idx === arrayItems.length ? 'O(1)' : 'O(n)';
    setArrayLog({ text: `Inserted "${val}" at index ${idx}. Time Complexity: ${complexity}`, icon: '⚡' });
    setArrayValInput('');
    setArrayIdxInput('');
    setTimeout(() => setArrayHighlight(null), 1200);
  };

  const handleArrayDelete = () => {
    if (arrayItems.length === 0) return;
    const idx = arrayIdxInput.trim() === '' ? arrayItems.length - 1 : Math.max(0, Math.min(arrayItems.length - 1, parseInt(arrayIdxInput, 10) || 0));
    const val = arrayItems[idx];
    const updated = arrayItems.filter((_, i) => i !== idx);
    setArrayItems(updated);
    const complexity = idx === arrayItems.length - 1 ? 'O(1)' : 'O(n)';
    setArrayLog({ text: `Deleted "${val}" at index ${idx}. Time Complexity: ${complexity}`, icon: '🗑️' });
    setArrayIdxInput('');
  };

  const handleArrayClear = () => {
    setArrayItems([]);
    setArrayLog({ text: 'Cleared array. Time Complexity: O(1)', icon: '🧹' });
  };

  // ---- Stack Handlers ----
  const handleStackPush = () => {
    if (!stackInput.trim()) return;
    const val = isNaN(Number(stackInput)) ? stackInput.trim() : Number(stackInput);
    setStackItems([...stackItems, val]);
    setStackHighlight(stackItems.length);
    setStackLog({ text: `Pushed "${val}" to top of stack. Time Complexity: O(1)`, icon: '🥞' });
    setStackInput('');
    setTimeout(() => setStackHighlight(null), 1200);
  };

  const handleStackPop = () => {
    if (stackItems.length === 0) {
      setStackLog({ text: 'Stack Underflow: Stack is already empty.', icon: '⚠️' });
      return;
    }
    const val = stackItems[stackItems.length - 1];
    setStackItems(stackItems.slice(0, -1));
    setStackLog({ text: `Popped "${val}" from top of stack. Time Complexity: O(1)`, icon: '📥' });
  };

  const handleStackPeek = () => {
    if (stackItems.length === 0) {
      setStackLog({ text: 'Stack is empty. Nothing to peek.', icon: '👀' });
      return;
    }
    const val = stackItems[stackItems.length - 1];
    setStackHighlight(stackItems.length - 1);
    setStackLog({ text: `Top element is "${val}". Time Complexity: O(1)`, icon: '👀' });
    setTimeout(() => setStackHighlight(null), 1200);
  };

  const handleStackClear = () => {
    setStackItems([]);
    setStackLog({ text: 'Cleared stack. Time Complexity: O(1)', icon: '🧹' });
  };

  // ---- Queue Handlers ----
  const handleQueueEnqueue = () => {
    if (!queueInput.trim()) return;
    const val = isNaN(Number(queueInput)) ? queueInput.trim() : Number(queueInput);
    setQueueItems([...queueItems, val]);
    setQueueHighlight(queueItems.length);
    setQueueLog({ text: `Enqueued "${val}" at rear. Time Complexity: O(1)`, icon: '🚶' });
    setQueueInput('');
    setTimeout(() => setQueueHighlight(null), 1200);
  };

  const handleQueueDequeue = () => {
    if (queueItems.length === 0) {
      setQueueLog({ text: 'Queue Underflow: Queue is already empty.', icon: '⚠️' });
      return;
    }
    const val = queueItems[0];
    setQueueItems(queueItems.slice(1));
    setQueueLog({ text: `Dequeued "${val}" from front. Time Complexity: O(1)`, icon: '🏃' });
  };

  const handleQueueFront = () => {
    if (queueItems.length === 0) {
      setQueueLog({ text: 'Queue is empty.', icon: '👀' });
      return;
    }
    const val = queueItems[0];
    setQueueHighlight(0);
    setQueueLog({ text: `Front element is "${val}". Time Complexity: O(1)`, icon: '👀' });
    setTimeout(() => setQueueHighlight(null), 1200);
  };

  const handleQueueClear = () => {
    setQueueItems([]);
    setQueueLog({ text: 'Cleared queue. Time Complexity: O(1)', icon: '🧹' });
  };

  // ---- Linked List Handlers ----
  const handleListAppend = () => {
    if (!listInput.trim()) return;
    const val = isNaN(Number(listInput)) ? listInput.trim() : Number(listInput);
    setListItems([...listItems, val]);
    setListHighlight(listItems.length);
    setListLog({ text: `Appended "${val}" to linked list. Time Complexity: O(n)`, icon: '🔗' });
    setListInput('');
    setTimeout(() => setListHighlight(null), 1200);
  };

  const handleListPrepend = () => {
    if (!listInput.trim()) return;
    const val = isNaN(Number(listInput)) ? listInput.trim() : Number(listInput);
    setListItems([val, ...listItems]);
    setListHighlight(0);
    setListLog({ text: `Prepended "${val}" at head. Time Complexity: O(1)`, icon: '🔗' });
    setListInput('');
    setTimeout(() => setListHighlight(null), 1200);
  };

  const handleListDeleteHead = () => {
    if (listItems.length === 0) {
      setListLog({ text: 'Linked List is already empty.', icon: '⚠️' });
      return;
    }
    const val = listItems[0];
    setListItems(listItems.slice(1));
    setListLog({ text: `Deleted head "${val}". Time Complexity: O(1)`, icon: '✂️' });
  };

  const handleListClear = () => {
    setListItems([]);
    setListLog({ text: 'Cleared linked list. Time Complexity: O(1)', icon: '🧹' });
  };

  return (
    <div className="ds-page">
      {/* Header section with accent bar */}
      <div className="ds-header">
        <div className="ds-title-row">
          <span className="ds-accent-bar" />
          <h2 className="ds-heading">Data Structure Visualizer</h2>
        </div>
        <p className="ds-subtitle">
          Interact with Array, Stack, Queue and Linked List — watch state change visually at each operation.
        </p>
      </div>

      {/* 2x2 Interactive Visualizer Grid */}
      <div className="ds-grid">
        {/* Card 1: Array */}
        <div className="ds-card">
          <div className="ds-card-top">
            <div className="ds-card-title">
              <span className="ds-card-emoji">📦</span>
              <h3>Array</h3>
            </div>
          </div>

          <div className="ds-controls">
            <input 
              type="text" 
              placeholder="Value to insert" 
              className="ds-input"
              value={arrayValInput}
              onChange={e => setArrayValInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleArrayInsert(); }}
            />
            <input 
              type="text" 
              placeholder="Index" 
              className="ds-input ds-input-sm"
              value={arrayIdxInput}
              onChange={e => setArrayIdxInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleArrayInsert(); }}
            />
            <button className="ds-btn ds-btn-primary" onClick={handleArrayInsert}>
              Insert
            </button>
            <button className="ds-btn ds-btn-outline" onClick={handleArrayDelete}>
              Delete at Index
            </button>
            <button className="ds-btn ds-btn-danger" onClick={handleArrayClear}>
              Clear
            </button>
          </div>

          <div className="ds-stage ds-stage-array">
            {arrayItems.length === 0 ? (
              <span className="ds-empty-msg">Array is empty. Insert a value above.</span>
            ) : (
              <div className="ds-array-row">
                {arrayItems.map((val, idx) => (
                  <div key={idx} className={`ds-array-cell ${arrayHighlight === idx ? 'cell-highlight' : ''}`}>
                    <div className="ds-cell-box">{val}</div>
                    <span className="ds-cell-idx">[{idx}]</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="ds-log-bar">
            <span className="ds-log-icon">{arrayLog.icon}</span>
            <span className="ds-log-text">{arrayLog.text}</span>
          </div>
        </div>

        {/* Card 2: Stack */}
        <div className="ds-card">
          <div className="ds-card-top">
            <div className="ds-card-title">
              <span className="ds-card-emoji">🥞</span>
              <h3>Stack</h3>
            </div>
            <span className="ds-badge ds-badge-mint">LIFO</span>
          </div>

          <div className="ds-controls">
            <input 
              type="text" 
              placeholder="Value to push" 
              className="ds-input"
              value={stackInput}
              onChange={e => setStackInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleStackPush(); }}
            />
            <button className="ds-btn ds-btn-primary" onClick={handleStackPush}>
              Push
            </button>
            <button className="ds-btn ds-btn-outline" onClick={handleStackPop}>
              Pop
            </button>
            <button className="ds-btn ds-btn-outline" onClick={handleStackPeek}>
              Peek
            </button>
            <button className="ds-btn ds-btn-danger" onClick={handleStackClear}>
              Clear
            </button>
          </div>

          <div className="ds-stage ds-stage-stack">
            {stackItems.length === 0 ? (
              <span className="ds-empty-msg">Stack is empty. Push a value above.</span>
            ) : (
              <div className="ds-stack-col">
                {/* Render from top to bottom */}
                {[...stackItems].reverse().map((val, revIdx) => {
                  const actualIdx = stackItems.length - 1 - revIdx;
                  const isTop = revIdx === 0;
                  return (
                    <div key={actualIdx} className={`ds-stack-cell ${stackHighlight === actualIdx ? 'cell-highlight' : ''}`}>
                      {isTop && <span className="ds-pill-top">TOP</span>}
                      <div className={`ds-cell-box ${isTop ? 'box-top' : ''}`}>{val}</div>
                      <span className="ds-cell-idx">[{actualIdx}]</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="ds-log-bar">
            <span className="ds-log-icon">{stackLog.icon}</span>
            <span className="ds-log-text">{stackLog.text}</span>
          </div>
        </div>

        {/* Card 3: Queue */}
        <div className="ds-card">
          <div className="ds-card-top">
            <div className="ds-card-title">
              <span className="ds-card-emoji">🚶</span>
              <h3>Queue</h3>
            </div>
            <span className="ds-badge ds-badge-mint">FIFO</span>
          </div>

          <div className="ds-controls">
            <input 
              type="text" 
              placeholder="Value to enqueue" 
              className="ds-input"
              value={queueInput}
              onChange={e => setQueueInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleQueueEnqueue(); }}
            />
            <button className="ds-btn ds-btn-primary" onClick={handleQueueEnqueue}>
              Enqueue
            </button>
            <button className="ds-btn ds-btn-outline" onClick={handleQueueDequeue}>
              Dequeue
            </button>
            <button className="ds-btn ds-btn-outline" onClick={handleQueueFront}>
              Front
            </button>
            <button className="ds-btn ds-btn-danger" onClick={handleQueueClear}>
              Clear
            </button>
          </div>

          <div className="ds-stage ds-stage-queue">
            {queueItems.length === 0 ? (
              <span className="ds-empty-msg">Queue is empty. Enqueue a value above.</span>
            ) : (
              <div className="ds-queue-row">
                {queueItems.map((val, idx) => {
                  const isFront = idx === 0;
                  const isRear = idx === queueItems.length - 1;
                  return (
                    <div key={idx} className={`ds-queue-cell ${queueHighlight === idx ? 'cell-highlight' : ''}`}>
                      {isFront && <span className="ds-pill-front">FRONT</span>}
                      {isRear && !isFront && <span className="ds-pill-rear">REAR</span>}
                      {isFront && isRear && <span className="ds-pill-rear ds-pill-rear-dual">REAR</span>}
                      <div className={`ds-cell-box ${isFront ? 'box-front' : isRear ? 'box-rear' : ''}`}>{val}</div>
                      <span className="ds-cell-idx">[{idx}]</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="ds-log-bar">
            <span className="ds-log-icon">{queueLog.icon}</span>
            <span className="ds-log-text">{queueLog.text}</span>
          </div>
        </div>

        {/* Card 4: Linked List */}
        <div className="ds-card">
          <div className="ds-card-top">
            <div className="ds-card-title">
              <span className="ds-card-emoji">🔗</span>
              <h3>Linked List</h3>
            </div>
            <span className="ds-badge ds-badge-mint">SINGLY</span>
          </div>

          <div className="ds-controls">
            <input 
              type="text" 
              placeholder="Value" 
              className="ds-input"
              value={listInput}
              onChange={e => setListInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleListAppend(); }}
            />
            <button className="ds-btn ds-btn-primary" onClick={handleListAppend}>
              Append
            </button>
            <button className="ds-btn ds-btn-outline" onClick={handleListPrepend}>
              Prepend
            </button>
            <button className="ds-btn ds-btn-outline" onClick={handleListDeleteHead}>
              Delete Head
            </button>
            <button className="ds-btn ds-btn-danger" onClick={handleListClear}>
              Clear
            </button>
          </div>

          <div className="ds-stage ds-stage-list">
            {listItems.length === 0 ? (
              <span className="ds-empty-msg">List is empty (NULL). Append a node above.</span>
            ) : (
              <div className="ds-list-row">
                {listItems.map((val, idx) => {
                  const isHead = idx === 0;
                  return (
                    <React.Fragment key={idx}>
                      <div className={`ds-node-wrapper ${listHighlight === idx ? 'cell-highlight' : ''}`}>
                        {isHead && <span className="ds-pill-head">HEAD</span>}
                        <div className="ds-node-capsule">
                          <span className="ds-node-val">{val}</span>
                          <span className="ds-node-sep">|</span>
                          <span className="ds-node-ptr">next</span>
                          <span className="ds-node-arrow">➔</span>
                        </div>
                      </div>
                    </React.Fragment>
                  );
                })}
                <div className="ds-node-null">NULL</div>
              </div>
            )}
          </div>

          <div className="ds-log-bar">
            <span className="ds-log-icon">{listLog.icon}</span>
            <span className="ds-log-text">{listLog.text}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
