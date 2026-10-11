/// page-playground.js - Interactive JSONL checker playground.
/// Loads the WASM module and lets users paste/upload histories, see results.

import { renderLayout } from './layout.js';
import { icons } from './icons.js';
import { samples } from './samples.js';
import { loadWasm, checkHistory, isLoaded, onStatusChange } from './wasm-loader.js';

export function renderPlayground() {
  renderLayout(`
    <div class="container">
      <section class="playground">
        <div class="playground-header">
          <h1>Playground</h1>
          <p>
            Paste or upload a JSONL transaction history. The checker runs entirely
            in your browser via WebAssembly. Nothing is sent to any server.
          </p>
        </div>

        <div class="wasm-status" id="wasm-status">
          <span class="wasm-status-dot loading" id="wasm-dot"></span>
          <span id="wasm-msg">Loading checker...</span>
        </div>

        <div class="sample-selector" id="sample-selector"></div>

        <div class="playground-layout">
          <div class="playground-panel">
            <div class="panel-header">
              <span class="panel-title">Input</span>
              <div class="panel-actions">
                <label class="file-upload-label" id="file-upload-label">
                  ${icons.upload}
                  Upload .jsonl
                  <input type="file" accept=".jsonl,.json,.txt" class="file-upload-input" id="file-input" />
                </label>
                <button class="btn btn-primary btn-sm" id="check-btn" disabled>
                  ${icons.play}
                  Check
                </button>
              </div>
            </div>
            <textarea
              class="editor-area"
              id="editor"
              placeholder='Paste a JSONL history here, or choose a sample above...'
              spellcheck="false"
            ></textarea>
          </div>

          <div class="playground-panel">
            <div class="panel-header">
              <span class="panel-title">Results</span>
              <div class="panel-actions">
                <button class="btn btn-secondary btn-sm" id="clear-btn">Clear</button>
              </div>
            </div>
            <div class="results-area" id="results">
              <span class="result-stat">Results will appear here after checking.</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  `);

  const editor = document.getElementById('editor');
  const results = document.getElementById('results');
  const checkBtn = document.getElementById('check-btn');
  const clearBtn = document.getElementById('clear-btn');
  const fileInput = document.getElementById('file-input');
  const wasmDot = document.getElementById('wasm-dot');
  const wasmMsg = document.getElementById('wasm-msg');
  const sampleSelector = document.getElementById('sample-selector');

  // Render sample buttons
  samples.forEach(s => {
    const btn = document.createElement('button');
    btn.className = 'sample-btn';
    btn.textContent = s.label;
    btn.dataset.sampleId = s.id;
    btn.title = s.description;
    btn.addEventListener('click', () => {
      editor.value = s.content;
      // Update active state
      sampleSelector.querySelectorAll('.sample-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
    sampleSelector.appendChild(btn);
  });

  // WASM loading
  onStatusChange((state, message) => {
    wasmDot.className = `wasm-status-dot ${state}`;
    wasmMsg.textContent = message;
    if (state === 'ready') {
      checkBtn.disabled = false;
    }
  });

  loadWasm().catch(() => {
    // Status callback already handles the error display
  });

  // Check button
  checkBtn.addEventListener('click', () => {
    const input = editor.value.trim();
    if (!input) {
      results.innerHTML = '<span class="result-error">No input provided.</span>';
      return;
    }

    if (!isLoaded()) {
      results.innerHTML = '<span class="result-error">WASM module is not loaded yet.</span>';
      return;
    }

    try {
      const result = checkHistory(input);
      renderResults(result);
    } catch (err) {
      results.innerHTML = `<span class="result-error">Error: ${escapeHtml(err.message)}</span>`;
    }
  });

  // Clear button
  clearBtn.addEventListener('click', () => {
    results.innerHTML = '<span class="result-stat">Results will appear here after checking.</span>';
  });

  // File upload
  fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      editor.value = ev.target.result;
      // Clear sample active state
      sampleSelector.querySelectorAll('.sample-btn').forEach(b => b.classList.remove('active'));
    };
    reader.readAsText(file);
    // Reset input so re-uploading same file triggers change
    fileInput.value = '';
  });

  function renderResults(result) {
    if (result.error) {
      results.innerHTML = `<span class="result-error">Checker error: ${escapeHtml(result.message)}</span>`;
      return;
    }

    let html = '';

    // Verdict
    if (result.valid) {
      html += '<div style="margin-bottom: var(--space-md);"><span class="result-valid" style="font-weight: 600; font-size: 1.125rem;">VALID</span></div>';
    } else {
      html += '<div style="margin-bottom: var(--space-md);"><span class="result-invalid" style="font-weight: 600; font-size: 1.125rem;">INVALID</span></div>';
    }

    // Stats
    const stats = [];
    if (result.transaction_count !== undefined) stats.push(`${result.transaction_count} transactions`);
    if (result.ok_count !== undefined) stats.push(`${result.ok_count} committed`);
    if (result.fail_count !== undefined && result.fail_count > 0) stats.push(`${result.fail_count} aborted`);
    if (result.info_count !== undefined && result.info_count > 0) stats.push(`${result.info_count} indeterminate`);
    if (result.key_count !== undefined) stats.push(`${result.key_count} keys`);

    if (stats.length > 0) {
      html += `<div class="result-stat" style="margin-bottom: var(--space-md);">${stats.join(' / ')}</div>`;
    }

    // Anomalies
    if (result.anomalies && result.anomalies.length > 0) {
      html += `<div class="result-stat" style="margin-bottom: var(--space-sm);">${result.anomalies.length} anomal${result.anomalies.length === 1 ? 'y' : 'ies'} detected:</div>`;

      result.anomalies.forEach((a, i) => {
        html += `<div class="result-anomaly">`;
        html += `<div class="result-anomaly-title">${escapeHtml(a.type || `Anomaly ${i + 1}`)}</div>`;
        if (a.description) {
          html += `<div class="result-anomaly-desc">${escapeHtml(a.description)}</div>`;
        }
        if (a.cycle) {
          html += `<div class="result-anomaly-desc" style="margin-top: var(--space-xs);">Cycle witness: ${escapeHtml(JSON.stringify(a.cycle))}</div>`;
        }
        if (a.involved_txns && a.involved_txns.length > 0) {
          html += `<div class="result-anomaly-desc" style="margin-top: var(--space-xs);">Involved transactions: ${a.involved_txns.join(', ')}</div>`;
        }
        html += `</div>`;
      });
    }

    results.innerHTML = html;
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // Return cleanup function for the router
  return () => {
    onStatusChange(null);
  };
}
