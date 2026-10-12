/// page-playground.js - Next-Level Interactive JSONL Checker & Visualizer.
/// Features:
/// 1. Interactive SVG Dependency Graph Engine with cycle witness highlighting
/// 2. Concurrent Execution Timeline (Waterfall swimlane view)
/// 3. Formal Verification Report with Adya anomaly classification
/// 4. Pro editor with live telemetry counters, JSONL formatter, and hotkeys

import { renderLayout } from './layout.js';
import { icons } from './icons.js';
import { samples } from './samples.js';
import { loadWasm, checkHistory, isLoaded, onStatusChange } from './wasm-loader.js';

export function renderPlayground() {
  renderLayout(`
    <div class="container">
      <section class="playground-section">
        <!-- Workspace Header -->
        <div class="workspace-header">
          <div class="workspace-title-group">
            <h1>Transaction Checker &amp; Graph Visualizer</h1>
            <p>
              Inspect client-observed JSONL histories. WebAssembly executes the C++20 Tarjan cycle detector locally in your browser.
            </p>
          </div>
          <div class="workspace-telemetry-badge" id="wasm-status-badge">
            <span class="pulse-dot loading" id="wasm-dot"></span>
            <span id="wasm-msg" style="color: var(--text-secondary);">Initializing WASM Engine...</span>
          </div>
        </div>

        <!-- Sample Selector Bar -->
        <div class="sample-bar">
          <span class="sample-bar-label">Test Histories:</span>
          <div class="sample-chips" id="sample-chips"></div>
        </div>

        <!-- Split Workspace Grid -->
        <div class="workspace-grid">
          <!-- Left Panel: Input History & Editor -->
          <div class="panel-container">
            <div class="panel-toolbar">
              <div class="panel-heading-group">
                <span class="panel-heading">Input Stream (JSONL)</span>
                <span class="panel-meta-counter" id="editor-counter">0 events</span>
              </div>
              <div class="panel-btn-group">
                <label class="file-upload-btn" title="Upload local .jsonl or .txt history">
                  ${icons.upload}
                  <span>Upload</span>
                  <input type="file" accept=".jsonl,.json,.txt" id="file-input" />
                </label>
                <button class="btn btn-ghost btn-sm" id="format-btn" title="Clean and format JSON lines">
                  ${icons.terminal}
                  <span>Format</span>
                </button>
                <button class="btn btn-primary btn-sm" id="check-btn" disabled>
                  ${icons.play}
                  <span>Run Check</span>
                  <kbd>Ctrl+↵</kbd>
                </button>
              </div>
            </div>

            <div class="editor-wrapper">
              <textarea
                class="editor-textarea"
                id="editor"
                placeholder="// Paste JSONL history here or select a sample above..."
                spellcheck="false"
              ></textarea>
              <div class="editor-statusbar">
                <div id="editor-stats-left">Lines: 0 | Bytes: 0 B</div>
                <div id="editor-stats-right">Format: Jepsen/Elle List-Append</div>
              </div>
            </div>
          </div>

          <!-- Right Panel: Visualizer & Verification Results -->
          <div class="panel-container">
            <div class="panel-toolbar">
              <div class="viz-tabs">
                <button class="viz-tab-btn active" data-view="graph" id="tab-graph">
                  ${icons.graph}
                  <span>Dependency Graph</span>
                </button>
                <button class="viz-tab-btn" data-view="timeline" id="tab-timeline">
                  ${icons.timeline}
                  <span>Timeline Waterfall</span>
                </button>
                <button class="viz-tab-btn" data-view="report" id="tab-report">
                  ${icons.shield}
                  <span>Verdict Report</span>
                </button>
              </div>

              <div class="panel-btn-group">
                <button class="btn btn-ghost btn-sm" id="copy-report-btn" title="Copy verification markdown report">
                  ${icons.copy}
                  <span>Copy Report</span>
                </button>
                <button class="btn btn-ghost btn-sm" id="clear-btn">
                  ${icons.x}
                  <span>Clear</span>
                </button>
              </div>
            </div>

            <div class="viz-content-container" id="viz-viewport">
              <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; color: var(--text-muted); padding: 40px; text-align: center;">
                <div style="margin-bottom: 12px; color: var(--text-dim);">${icons.graph}</div>
                <span style="font-family: var(--font-mono); font-size: 0.88rem; color: var(--text-secondary);">Awaiting Transaction Trace</span>
                <p style="font-size: 0.8rem; margin-top: 6px; max-width: 340px;">
                  Choose a test history from the bar above or paste your JSONL operations, then click <strong>Run Check</strong>.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  `);

  // DOM Elements
  const editor = document.getElementById('editor');
  const checkBtn = document.getElementById('check-btn');
  const clearBtn = document.getElementById('clear-btn');
  const formatBtn = document.getElementById('format-btn');
  const fileInput = document.getElementById('file-input');
  const wasmDot = document.getElementById('wasm-dot');
  const wasmMsg = document.getElementById('wasm-msg');
  const sampleChips = document.getElementById('sample-chips');
  const vizViewport = document.getElementById('viz-viewport');
  const editorCounter = document.getElementById('editor-counter');
  const editorStatsLeft = document.getElementById('editor-stats-left');
  const copyReportBtn = document.getElementById('copy-report-btn');

  let activeView = 'graph';
  let lastCheckResult = null;
  let parsedTransactions = [];
  let zoomLevel = 1;

  // Render Sample Chips
  samples.forEach((s, idx) => {
    const chip = document.createElement('button');
    chip.className = `sample-chip ${idx === 1 ? 'active' : ''}`;
    chip.dataset.sampleId = s.id;
    chip.textContent = s.label;
    chip.title = s.description;

    chip.addEventListener('click', () => {
      editor.value = s.content;
      sampleChips.querySelectorAll('.sample-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      updateEditorStats();
      if (isLoaded()) {
        executeCheck();
      }
    });
    sampleChips.appendChild(chip);
  });

  // Set default sample (G0)
  if (samples[1]) {
    editor.value = samples[1].content;
    updateEditorStats();
  }

  // Update editor telemetry counters
  function updateEditorStats() {
    const text = editor.value;
    const lines = text.split('\n').filter(l => l.trim().length > 0 && !l.trim().startsWith('#'));
    const bytes = new Blob([text]).size;
    editorCounter.textContent = `${lines.length} events`;
    editorStatsLeft.textContent = `Lines: ${text.split('\n').length} | Valid Events: ${lines.length} | Size: ${formatBytes(bytes)}`;
  }

  function formatBytes(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  editor.addEventListener('input', updateEditorStats);

  // WASM Lifecycle
  onStatusChange((state, message) => {
    wasmDot.className = `pulse-dot ${state === 'ready' ? 'active' : (state === 'error' ? 'error' : 'loading')}`;
    wasmMsg.textContent = state === 'ready' ? 'C++20 Engine Ready (WASM)' : message;
    if (state === 'ready') {
      checkBtn.disabled = false;
      // Auto-check default sample
      if (editor.value.trim().length > 0) {
        executeCheck();
      }
    }
  });

  loadWasm().catch(() => {});

  // Tab View Switcher
  document.querySelectorAll('.viz-tab-btn').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.viz-tab-btn').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      activeView = tab.getAttribute('data-view');
      renderActiveView();
    });
  });

  // Hotkey: Ctrl+Enter or Cmd+Enter to run
  editor.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      if (!checkBtn.disabled) {
        executeCheck();
      }
    }
  });

  // Run Check
  checkBtn.addEventListener('click', executeCheck);

  function executeCheck() {
    const raw = editor.value.trim();
    if (!raw) {
      vizViewport.innerHTML = '<div style="padding: 24px; color: var(--invalid); font-family: var(--font-mono);">Error: No JSONL history entered.</div>';
      return;
    }

    if (!isLoaded()) {
      vizViewport.innerHTML = '<div style="padding: 24px; color: var(--accent); font-family: var(--font-mono);">WASM Engine is still loading...</div>';
      return;
    }

    try {
      parsedTransactions = parseJsonlToTransactions(raw);
      lastCheckResult = checkHistory(raw);
      renderActiveView();
    } catch (err) {
      vizViewport.innerHTML = `<div style="padding: 24px; color: var(--invalid); font-family: var(--font-mono);">Parser or Checker Error: ${escapeHtml(err.message)}</div>`;
    }
  }

  // Clear Button
  clearBtn.addEventListener('click', () => {
    editor.value = '';
    lastCheckResult = null;
    parsedTransactions = [];
    updateEditorStats();
    sampleChips.querySelectorAll('.sample-chip').forEach(c => c.classList.remove('active'));
    vizViewport.innerHTML = `
      <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; color: var(--text-muted); padding: 40px; text-align: center;">
        <div style="margin-bottom: 12px; color: var(--text-dim);">${icons.graph}</div>
        <span style="font-family: var(--font-mono); font-size: 0.88rem; color: var(--text-secondary);">Workspace Cleared</span>
        <p style="font-size: 0.8rem; margin-top: 6px;">Select a sample or paste a new JSONL trace.</p>
      </div>
    `;
  });

  // Format JSONL
  formatBtn.addEventListener('click', () => {
    const lines = editor.value.split('\n');
    const cleaned = [];
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      if (trimmed.startsWith('#')) {
        cleaned.push(trimmed);
        continue;
      }
      try {
        const obj = JSON.parse(trimmed);
        cleaned.push(JSON.stringify(obj));
      } catch (e) {
        cleaned.push(trimmed);
      }
    }
    editor.value = cleaned.join('\n');
    updateEditorStats();
  });

  // File Upload
  fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      editor.value = ev.target.result;
      updateEditorStats();
      sampleChips.querySelectorAll('.sample-chip').forEach(c => c.classList.remove('active'));
      if (isLoaded()) executeCheck();
    };
    reader.readAsText(file);
    fileInput.value = '';
  });

  // Copy Markdown Report
  copyReportBtn.addEventListener('click', async () => {
    if (!lastCheckResult) {
      copyReportBtn.textContent = 'No results to copy';
      setTimeout(() => { copyReportBtn.innerHTML = `${icons.copy} <span>Copy Report</span>`; }, 1500);
      return;
    }

    const md = generateMarkdownReport(lastCheckResult, parsedTransactions);
    try {
      await navigator.clipboard.writeText(md);
      copyReportBtn.innerHTML = `${icons.check} <span>Report Copied!</span>`;
      setTimeout(() => { copyReportBtn.innerHTML = `${icons.copy} <span>Copy Report</span>`; }, 2000);
    } catch (e) {}
  });

  // View Renderer Router
  function renderActiveView() {
    if (!lastCheckResult) return;

    if (activeView === 'graph') {
      renderGraphView();
    } else if (activeView === 'timeline') {
      renderTimelineView();
    } else {
      renderReportView();
    }
  }

  // 1. Dependency Graph View (SVG Engine with Pan/Zoom & Cycle Highlights)
  function renderGraphView() {
    const txns = parsedTransactions;
    const res = lastCheckResult;
    const cycleNodes = new Set();
    const cycleEdges = [];

    // Extract cycle witness if present
    if (res.anomalies && res.anomalies.length > 0) {
      for (const a of res.anomalies) {
        if (Array.isArray(a.cycle)) {
          for (let i = 0; i < a.cycle.length; i++) {
            cycleNodes.add(a.cycle[i]);
            if (i < a.cycle.length - 1) {
              cycleEdges.push({ from: a.cycle[i], to: a.cycle[i + 1] });
            }
          }
        }
        if (Array.isArray(a.involved_txns)) {
          a.involved_txns.forEach(t => cycleNodes.add(t));
        }
      }
    }

    if (txns.length === 0) {
      vizViewport.innerHTML = '<div style="padding: 24px; color: var(--text-muted); font-family: var(--font-mono);">No transactions found in history to render.</div>';
      return;
    }

    // Build synthesized edges from version orders & reads
    const edges = synthesizeEdges(txns, cycleEdges);

    // Compute circular node layout
    const width = 560;
    const height = 480;
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(width, height) * 0.35;

    const nodeCoords = {};
    txns.forEach((t, i) => {
      const angle = (2 * Math.PI * i) / txns.length - Math.PI / 2;
      nodeCoords[t.id] = {
        x: centerX + radius * Math.cos(angle),
        y: centerY + radius * Math.sin(angle),
        txn: t
      };
    });

    let svgEdgesHtml = '';
    edges.forEach(e => {
      const src = nodeCoords[e.from];
      const dst = nodeCoords[e.to];
      if (!src || !dst) return;

      const isCycleEdge = e.isCycle;
      const isSelf = e.from === e.to;
      let pathD = '';

      if (isSelf) {
        pathD = `M ${src.x} ${src.y - 20} C ${src.x - 30} ${src.y - 50}, ${src.x + 30} ${src.y - 50}, ${src.x} ${src.y - 20}`;
      } else {
        // Curve slightly for directional distinction
        const dx = dst.x - src.x;
        const dy = dst.y - src.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const normX = -dy / dist;
        const normY = dx / dist;
        const curvature = 24;
        const midX = (src.x + dst.x) / 2 + normX * curvature;
        const midY = (src.y + dst.y) / 2 + normY * curvature;
        pathD = `M ${src.x} ${src.y} Q ${midX} ${midY} ${dst.x} ${dst.y}`;
      }

      const strokeColor = isCycleEdge ? '#ef4444' : (e.type === 'ww' ? '#f59e0b' : '#38bdf8');
      const strokeWidth = isCycleEdge ? '3' : '1.75';
      const strokeDash = isCycleEdge ? '4 3' : 'none';
      const markerId = isCycleEdge ? 'arrow-cycle' : (e.type === 'ww' ? 'arrow-ww' : 'arrow-wr');

      svgEdgesHtml += `
        <path d="${pathD}" fill="none" stroke="${strokeColor}" stroke-width="${strokeWidth}" stroke-dasharray="${strokeDash}" marker-end="url(#${markerId})" opacity="0.9"/>
      `;
    });

    let svgNodesHtml = '';
    Object.keys(nodeCoords).forEach(id => {
      const n = nodeCoords[id];
      const isCycle = cycleNodes.has(parseInt(id, 10)) || cycleNodes.has(id);
      const isAbort = n.txn.outcome === 'fail';

      const strokeColor = isCycle ? '#ef4444' : (isAbort ? '#f59e0b' : '#10b981');
      const fillColor = isCycle ? '#2a161b' : '#121622';
      const pulseClass = isCycle ? 'class="graph-node-pulse"' : '';

      svgNodesHtml += `
        <g transform="translate(${n.x}, ${n.y})" cursor="pointer" title="Txn ${id}: ${n.txn.ops.map(o => `${o.op}(k${o.key})`).join(', ')}">
          <circle r="22" fill="${fillColor}" stroke="${strokeColor}" stroke-width="${isCycle ? 2.5 : 1.75}" ${pulseClass}/>
          <text text-anchor="middle" dy="4" fill="#f0f3fa" font-family="JetBrains Mono" font-size="11" font-weight="bold">T${id}</text>
          <text text-anchor="middle" dy="32" fill="${isAbort ? '#f87171' : '#9ca6bd'}" font-family="JetBrains Mono" font-size="9">${isAbort ? 'ABORT' : (n.txn.ops[0] ? `${n.txn.ops[0].op}(k${n.txn.ops[0].key})` : 'ok')}</text>
        </g>
      `;
    });

    vizViewport.innerHTML = `
      <div class="graph-viewport-wrapper" id="graph-wrapper">
        <div class="graph-canvas-controls">
          <button class="graph-ctrl-btn" id="graph-zoom-in" title="Zoom In">${icons.zoomIn}</button>
          <button class="graph-ctrl-btn" id="graph-zoom-out" title="Zoom Out">${icons.zoomOut}</button>
          <button class="graph-ctrl-btn" id="graph-zoom-fit" title="Reset View">${icons.fitScreen}</button>
        </div>

        <svg viewBox="0 0 ${width} ${height}" width="100%" height="100%" id="graph-svg" style="transition: transform 120ms ease;">
          <defs>
            <marker id="arrow-ww" viewBox="0 0 10 10" refX="18" refY="5" markerWidth="6" markerHeight="6" orient="auto">
              <path d="M 0 1 L 9 5 L 0 9 z" fill="#f59e0b"/>
            </marker>
            <marker id="arrow-wr" viewBox="0 0 10 10" refX="18" refY="5" markerWidth="6" markerHeight="6" orient="auto">
              <path d="M 0 1 L 9 5 L 0 9 z" fill="#38bdf8"/>
            </marker>
            <marker id="arrow-cycle" viewBox="0 0 10 10" refX="18" refY="5" markerWidth="7" markerHeight="7" orient="auto">
              <path d="M 0 1 L 9 5 L 0 9 z" fill="#ef4444"/>
            </marker>
          </defs>

          <!-- Edges Group -->
          <g id="graph-edges">${svgEdgesHtml}</g>

          <!-- Nodes Group -->
          <g id="graph-nodes">${svgNodesHtml}</g>
        </svg>

        <div class="graph-legend">
          <div class="legend-key">
            <span class="legend-line ww"></span>
            <span>ww (write-write)</span>
          </div>
          <div class="legend-key">
            <span class="legend-line wr"></span>
            <span>wr (write-read)</span>
          </div>
          <div class="legend-key">
            <span class="legend-line cycle"></span>
            <span>Cycle Witness</span>
          </div>
        </div>
      </div>
    `;

    // Zoom controls
    const svgEl = document.getElementById('graph-svg');
    document.getElementById('graph-zoom-in')?.addEventListener('click', () => {
      zoomLevel = Math.min(zoomLevel + 0.15, 2.0);
      if (svgEl) svgEl.style.transform = `scale(${zoomLevel})`;
    });
    document.getElementById('graph-zoom-out')?.addEventListener('click', () => {
      zoomLevel = Math.max(zoomLevel - 0.15, 0.6);
      if (svgEl) svgEl.style.transform = `scale(${zoomLevel})`;
    });
    document.getElementById('graph-zoom-fit')?.addEventListener('click', () => {
      zoomLevel = 1;
      if (svgEl) svgEl.style.transform = `scale(1)`;
    });
  }

  // 2. Execution Timeline Waterfall (Swimlane concurrency view)
  function renderTimelineView() {
    const txns = parsedTransactions;
    if (txns.length === 0) {
      vizViewport.innerHTML = '<div style="padding: 24px; color: var(--text-muted); font-family: var(--font-mono);">No timeline events to display.</div>';
      return;
    }

    // Group by process ID
    const processes = {};
    let minTime = Infinity;
    let maxTime = -Infinity;

    txns.forEach(t => {
      if (!processes[t.process]) processes[t.process] = [];
      processes[t.process].push(t);
      if (t.startTime < minTime) minTime = t.startTime;
      if (t.endTime > maxTime) maxTime = t.endTime;
    });

    const timeSpan = Math.max(maxTime - minTime, 1);

    let rowsHtml = '';
    Object.keys(processes).sort((a,b) => parseInt(a)-parseInt(b)).forEach(pid => {
      const pTxns = processes[pid];
      let barsHtml = '';

      pTxns.forEach(t => {
        const leftPercent = Math.max(0, Math.min(95, ((t.startTime - minTime) / timeSpan) * 100));
        const widthPercent = Math.max(8, Math.min(100 - leftPercent, ((t.endTime - t.startTime) / timeSpan) * 100));
        const statusClass = t.outcome === 'ok' ? 'ok' : (t.outcome === 'fail' ? 'fail' : 'pending');

        const opsSummary = t.ops.map(o => `${o.op}(${o.key}${o.val ? `=${JSON.stringify(o.val)}` : ''})`).join('; ');

        barsHtml += `
          <div
            class="waterfall-txn-bar ${statusClass}"
            style="position: absolute; left: ${leftPercent}%; width: ${widthPercent}%;"
            title="Txn T${t.id} [Proc ${pid}] | t=${t.startTime}..${t.endTime} | ${opsSummary}"
          >
            <span style="font-weight: 700;">T${t.id}</span>
            <span style="color: var(--text-muted); font-size: 0.68rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${opsSummary}</span>
          </div>
        `;
      });

      rowsHtml += `
        <div class="waterfall-process-row">
          <div class="process-label-col">Process ${pid}</div>
          <div class="process-track">${barsHtml}</div>
        </div>
      `;
    });

    vizViewport.innerHTML = `
      <div class="waterfall-container">
        <div style="display: flex; justify-content: space-between; font-family: var(--font-mono); font-size: 0.72rem; color: var(--text-muted); margin-bottom: 16px; border-bottom: 1px solid var(--border-subtle); padding-bottom: 8px;">
          <span>t_start = ${minTime} ns</span>
          <span>Relative Execution Timeline (Concurrent Client Swimlanes)</span>
          <span>t_end = ${maxTime} ns (&Delta; = ${timeSpan} ns)</span>
        </div>
        ${rowsHtml}
      </div>
    `;
  }

  // 3. Verification Report View (Formal Adya Verdict & Anomaly Classes)
  function renderReportView() {
    const res = lastCheckResult;
    const isValid = res.valid;

    let html = `
      <div class="verdict-banner ${isValid ? 'valid' : 'invalid'}">
        <div class="verdict-main">
          <div class="verdict-icon">
            ${isValid ? icons.checkCircle : icons.alertTriangle}
          </div>
          <div>
            <div class="verdict-tag">${isValid ? 'VALID HISTORY' : 'ISOLATION VIOLATIONS DETECTED'}</div>
            <div class="verdict-sub">
              ${isValid ? 'Adya Weak Consistency & PL-3 Invariants Satisfied. Acyclic Dependency Graph.' : 'Non-trivial Strongly Connected Component found in dependency graph.'}
            </div>
          </div>
        </div>
        <span class="anomaly-badge ${isValid ? 'badge-clean' : 'badge-g0'}">
          ${isValid ? 'STRICT SERIAL' : (res.anomalies ? `${res.anomalies.length} VIOLATION(S)` : 'INVALID')}
        </span>
      </div>

      <div class="summary-pills">
        <div class="sum-pill">Transactions: <span>${res.transaction_count ?? parsedTransactions.length}</span></div>
        <div class="sum-pill">Committed: <span style="color: var(--valid);">${res.ok_count ?? 0}</span></div>
        <div class="sum-pill">Aborted: <span style="color: var(--invalid);">${res.fail_count ?? 0}</span></div>
        <div class="sum-pill">Indeterminate: <span>${res.info_count ?? 0}</span></div>
        <div class="sum-pill">Distinct Keys: <span>${res.key_count ?? 'N/A'}</span></div>
      </div>
    `;

    if (res.anomalies && res.anomalies.length > 0) {
      html += `<div style="padding: 16px 20px 8px; font-family: var(--font-mono); font-size: 0.78rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em;">Isolation Anomalies Proved by Cycle Witnesses:</div>`;

      res.anomalies.forEach((a, idx) => {
        const typeStr = a.type || `Anomaly #${idx + 1}`;
        const badgeClass = getBadgeClass(typeStr);

        html += `
          <div class="anomaly-item">
            <div class="anomaly-item-header">
              <span class="anomaly-class-title">
                <span class="anomaly-badge ${badgeClass}">${escapeHtml(typeStr)}</span>
              </span>
              <span style="font-family: var(--font-mono); font-size: 0.72rem; color: var(--text-muted);">Adya Invariant Violated</span>
            </div>
            <p class="anomaly-desc-text">${escapeHtml(a.description || 'Observed execution order violates serial dependency semantics.')}</p>
            ${a.cycle ? `
              <div style="font-family: var(--font-mono); font-size: 0.72rem; color: var(--text-muted); margin-bottom: 4px;">Minimal Cycle Witness:</div>
              <div class="witness-block">${escapeHtml(Array.isArray(a.cycle) ? a.cycle.map(t => `T${t}`).join(' → ') : JSON.stringify(a.cycle))}</div>
            ` : ''}
            ${a.involved_txns ? `
              <div style="margin-top: 8px; font-family: var(--font-mono); font-size: 0.72rem; color: var(--text-muted);">
                Involved Transactions: <strong style="color: var(--text-primary);">${a.involved_txns.map(t => `T${t}`).join(', ')}</strong>
              </div>
            ` : ''}
          </div>
        `;
      });
    } else if (isValid) {
      html += `
        <div style="padding: 32px 24px; text-align: center; color: var(--text-secondary);">
          <div style="margin-bottom: 12px; color: var(--valid);">${icons.checkCircle}</div>
          <h3 style="font-size: 1.1rem; margin-bottom: 6px;">Zero Isolation Anomalies</h3>
          <p style="font-size: 0.84rem; max-width: 440px; margin: 0 auto;">
            The transaction trace satisfies all Adya Weak Consistency invariants (G0, G1a, G1b, G1c) and Elle list-append version order consistency.
          </p>
        </div>
      `;
    }

    vizViewport.innerHTML = html;
  }

  function getBadgeClass(typeStr) {
    if (typeStr.includes('G0')) return 'badge-g0';
    if (typeStr.includes('G1a')) return 'badge-g1a';
    if (typeStr.includes('G1b')) return 'badge-g1b';
    if (typeStr.includes('G1c')) return 'badge-g1c';
    return 'badge-data';
  }

  // Parse JSONL string into structured transactions for graph & waterfall
  function parseJsonlToTransactions(raw) {
    const lines = raw.split('\n');
    const txnsByProcess = {};
    const completedTxns = [];
    let txnIdCounter = 0;

    lines.forEach(line => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) return;

      try {
        const ev = JSON.parse(trimmed);
        const pid = ev.process ?? 0;

        if (ev.type === 'invoke') {
          txnsByProcess[pid] = {
            id: txnIdCounter++,
            process: pid,
            startTime: ev.time ?? 0,
            endTime: (ev.time ?? 0) + 100,
            outcome: 'pending',
            ops: parseMicroOps(ev.value)
          };
        } else if (ev.type === 'ok' || ev.type === 'fail' || ev.type === 'info') {
          if (txnsByProcess[pid]) {
            const cur = txnsByProcess[pid];
            cur.endTime = ev.time ?? (cur.startTime + 100);
            cur.outcome = ev.type;
            if (ev.value) {
              // Update with observed read values
              cur.ops = parseMicroOps(ev.value);
            }
            completedTxns.push(cur);
            delete txnsByProcess[pid];
          } else {
            // Standalone completion event
            completedTxns.push({
              id: txnIdCounter++,
              process: pid,
              startTime: ev.time ?? 0,
              endTime: ev.time ?? 100,
              outcome: ev.type,
              ops: parseMicroOps(ev.value)
            });
          }
        }
      } catch (err) {}
    });

    // Append any uncompleted invocations
    Object.values(txnsByProcess).forEach(t => completedTxns.push(t));
    return completedTxns;
  }

  function parseMicroOps(val) {
    if (!Array.isArray(val)) return [];
    return val.map(item => {
      if (!Array.isArray(item)) return { op: 'unknown', key: '?', val: null };
      return {
        op: item[0] === 'r' ? 'read' : item[0],
        key: item[1],
        val: item[2]
      };
    });
  }

  // Synthesize edges between transactions
  function synthesizeEdges(txns, cycleEdges) {
    const edges = [];
    const edgeKeySet = new Set();

    // Add cycle witness edges explicitly
    cycleEdges.forEach(ce => {
      const k = `${ce.from}->${ce.to}`;
      if (!edgeKeySet.has(k)) {
        edgeKeySet.add(k);
        edges.push({ from: ce.from, to: ce.to, type: 'ww', isCycle: true });
      }
    });

    // Add ww and wr edges based on key operations
    const writesByKey = {};
    txns.forEach(t => {
      t.ops.forEach(op => {
        if (op.op === 'append') {
          if (!writesByKey[op.key]) writesByKey[op.key] = [];
          writesByKey[op.key].push(t.id);
        }
      });
    });

    // Write-Write edges
    Object.keys(writesByKey).forEach(k => {
      const writers = writesByKey[k];
      for (let i = 0; i < writers.length - 1; i++) {
        const u = writers[i];
        const v = writers[i + 1];
        const key = `${u}->${v}`;
        if (u !== v && !edgeKeySet.has(key)) {
          edgeKeySet.add(key);
          edges.push({ from: u, to: v, type: 'ww', isCycle: false });
        }
      }
    });

    // Write-Read edges
    txns.forEach(reader => {
      reader.ops.forEach(op => {
        if (op.op === 'read' && Array.isArray(op.val)) {
          op.val.forEach(readVal => {
            // Find who wrote this value
            txns.forEach(writer => {
              if (writer.id !== reader.id) {
                const wroteIt = writer.ops.some(o => o.op === 'append' && o.key === op.key && o.val === readVal);
                if (wroteIt) {
                  const key = `${writer.id}->${reader.id}`;
                  if (!edgeKeySet.has(key)) {
                    edgeKeySet.add(key);
                    edges.push({ from: writer.id, to: reader.id, type: 'wr', isCycle: false });
                  }
                }
              }
            });
          });
        }
      });
    });

    return edges;
  }

  function generateMarkdownReport(res, txns) {
    let md = `# IsoCheck Verification Report\n\n`;
    md += `**Verdict:** ${res.valid ? 'VALID (Strict Serial)' : 'VIOLATION DETECTED'}\n`;
    md += `**Transactions:** ${res.transaction_count ?? txns.length}\n`;
    md += `**Committed (ok):** ${res.ok_count ?? 0} | **Aborted (fail):** ${res.fail_count ?? 0}\n\n`;

    if (res.anomalies && res.anomalies.length > 0) {
      md += `## Isolation Violations (${res.anomalies.length})\n\n`;
      res.anomalies.forEach((a, i) => {
        md += `### ${i + 1}. ${a.type || 'Anomaly'}\n`;
        md += `- **Description:** ${a.description || 'N/A'}\n`;
        if (a.cycle) {
          md += `- **Minimal Cycle Witness:** \`${Array.isArray(a.cycle) ? a.cycle.map(t => `T${t}`).join(' -> ') : JSON.stringify(a.cycle)}\`\n`;
        }
        if (a.involved_txns) {
          md += `- **Involved Transactions:** ${a.involved_txns.map(t => `T${t}`).join(', ')}\n`;
        }
        md += `\n`;
      });
    } else {
      md += `*No cycles or Adya isolation anomalies detected.*\n`;
    }

    md += `\n---\n*Generated by IsoCheck C++20 / WebAssembly Engine*\n`;
    return md;
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // Return router cleanup function
  return () => {
    onStatusChange(null);
  };
}
