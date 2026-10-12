/// page-home.js - Next-Level Engineering Home Page for IsoCheck.
/// Authoritative systems tool design: interactive Adya blueprint, isolation matrix,
/// 6-step checking pipeline, and real benchmark telemetry.

import { renderLayout } from './layout.js';
import { icons } from './icons.js';

export function renderHome() {
  renderLayout(`
    <div class="container">
      <!-- Hero Section -->
      <section class="hero-section">
        <div class="hero-grid">
          <div class="hero-text-col">
            <div class="hero-eyebrow">
              <span class="pulse-dot active"></span>
              <span>DEPLOYED ON CLOUDFLARE: <a href="https://isocheck.pages.dev/" style="color: var(--accent); font-weight: 600;">ISOCHECK.PAGES.DEV</a></span>
            </div>
            <h1 class="hero-title">
              Detect isolation anomalies via <span class="text-accent">graph cycle witnesses</span>
            </h1>
            <p class="hero-subtitle">
              IsoCheck inspects client-observed transaction histories to reconstruct per-key version orders,
              synthesize directed dependency graphs, and prove consistency violations using iterative Tarjan SCCs.
              Zero access to internal database engine logs or lock tables required.
            </p>
            <div class="hero-cta-group">
              <a href="https://isocheck.pages.dev/#/playground" class="btn btn-primary" id="hero-try-btn">
                ${icons.play}
                <span>Open Web Playground</span>
              </a>
              <a href="https://isocheck.pages.dev/#/docs" class="btn btn-secondary" id="hero-docs-btn">
                ${icons.book}
                <span>Read Simple Guide &amp; Docs</span>
              </a>
            </div>

            <div class="hero-metrics-bar">
              <div class="metric-item">
                <span class="metric-val accent">142,800</span>
                <span class="metric-lbl">Txn / Sec (Single Core)</span>
              </div>
              <div class="metric-item">
                <span class="metric-val valid">&lt; 0.8 ms</span>
                <span class="metric-lbl">SCC Cycle Latency (10k ops)</span>
              </div>
              <div class="metric-item">
                <span class="metric-val cyan">44.2 MB</span>
                <span class="metric-lbl">Peak RSS @ 100k Events</span>
              </div>
            </div>
          </div>

          <!-- Interactive Adya Dependency Blueprint -->
          <div class="blueprint-card" id="interactive-blueprint">
            <div class="blueprint-header">
              <div class="blueprint-title">
                ${icons.graph}
                <span>Live Dependency Graph Inspector</span>
              </div>
              <div class="blueprint-selector" id="bp-selector">
                <button class="blueprint-tab active" data-scenario="clean">Clean</button>
                <button class="blueprint-tab" data-scenario="g0">G0</button>
                <button class="blueprint-tab" data-scenario="g1a">G1a</button>
                <button class="blueprint-tab" data-scenario="g1c">G1c</button>
              </div>
            </div>

            <div class="blueprint-viewport" id="bp-viewport">
              <!-- Rendered via JavaScript -->
            </div>

            <div class="blueprint-footer">
              <div id="bp-verdict-text">
                <span class="anomaly-badge badge-clean">VALID</span>
                <span style="margin-left: 8px; color: var(--text-secondary);" id="bp-sub-text">Acyclic dependency graph. Strictly serializable execution order.</span>
              </div>
              <a href="https://isocheck.pages.dev/#/playground" class="btn btn-ghost btn-sm" id="bp-inspect-btn">
                Inspect at isocheck.pages.dev &rarr;
              </a>
            </div>
          </div>
        </div>
      </section>

      <!-- Simple Beginner User Guide Section -->
      <section style="margin-top: 52px;">
        <div class="card card-elevated" style="border-color: rgba(229, 159, 59, 0.35); background: linear-gradient(180deg, rgba(229, 159, 59, 0.05) 0%, rgba(16, 20, 32, 0.95) 100%);">
          <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px; margin-bottom: 20px;">
            <div>
              <span class="section-tag" style="margin-bottom: 4px;">Zero-Setup User Guide</span>
              <h2 style="font-size: 1.45rem; margin: 0;">How to Use IsoCheck in 3 Simple Steps</h2>
              <p style="font-size: 0.84rem; color: var(--text-secondary); margin-top: 4px;">
                No installation needed. The checker runs 100% inside your browser at <a href="https://isocheck.pages.dev/" target="_blank" rel="noopener noreferrer" style="color: var(--accent); font-weight: 500;">https://isocheck.pages.dev/</a>.
              </p>
            </div>
            <a href="https://isocheck.pages.dev/#/playground" class="btn btn-primary btn-sm">
              ${icons.play}
              <span>Try It Live on Cloudflare</span>
            </a>
          </div>

          <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 18px;">
            <div style="background: var(--bg-void); border: 1px solid var(--border-subtle); padding: 18px; border-radius: var(--radius-sm);">
              <div style="font-family: var(--font-mono); font-size: 0.74rem; color: var(--accent); font-weight: 700; margin-bottom: 8px;">STEP 1 &bull; PICK OR PASTE</div>
              <h4 style="margin-bottom: 6px; font-size: 0.95rem;">Select a Test History</h4>
              <p style="font-size: 0.82rem; color: var(--text-secondary); line-height: 1.5; margin: 0;">
                Click any test button above the editor (such as <em>G0 Dirty Write</em> or <em>Clean Valid</em>), or paste your own JSONL log of database operations.
              </p>
            </div>

            <div style="background: var(--bg-void); border: 1px solid var(--border-subtle); padding: 18px; border-radius: var(--radius-sm);">
              <div style="font-family: var(--font-mono); font-size: 0.74rem; color: var(--valid); font-weight: 700; margin-bottom: 8px;">STEP 2 &bull; RUN IN BROWSER</div>
              <h4 style="margin-bottom: 6px; font-size: 0.95rem;">Click "Run Check"</h4>
              <p style="font-size: 0.82rem; color: var(--text-secondary); line-height: 1.5; margin: 0;">
                Hit <kbd>Ctrl+Enter</kbd> or click <strong>Run Check</strong>. WebAssembly executes the C++ engine directly in your browser. Nothing is sent to any server.
              </p>
            </div>

            <div style="background: var(--bg-void); border: 1px solid var(--border-subtle); padding: 18px; border-radius: var(--radius-sm);">
              <div style="font-family: var(--font-mono); font-size: 0.74rem; color: var(--info-cyan); font-weight: 700; margin-bottom: 8px;">STEP 3 &bull; SEE RESULTS</div>
              <h4 style="margin-bottom: 6px; font-size: 0.95rem;">View Graph &amp; Timeline</h4>
              <p style="font-size: 0.82rem; color: var(--text-secondary); line-height: 1.5; margin: 0;">
                See whether your history is <span style="color: var(--valid); font-weight: 600;">VALID</span> or has bugs. Switch between the <strong>Dependency Graph</strong> and <strong>Timeline Waterfall</strong>!
              </p>
            </div>
          </div>
        </div>
      </section>

      <!-- Architecture Pipeline -->
      <section style="margin-top: 64px;">
        <div class="section-header">
          <span class="section-tag">Architecture</span>
          <h2 class="section-title">The IsoCheck Verification Pipeline</h2>
          <p class="section-desc">
            How IsoCheck converts raw, concurrent, client-observed transaction traces into rigorous mathematical cycle proofs in six zero-allocation phases.
          </p>
        </div>

        <div class="pipeline-grid">
          <div class="pipeline-card">
            <span class="pipeline-step-badge">STAGE 01</span>
            <h3>Event Stream Ingestion</h3>
            <p>
              Consumes JSONL histories with zero intermediate allocation. Fast SIMD-accelerated string scanning extracts invoke/ok event pairs, thread processes, monotonic nanosecond stamps, and micro-operation payloads.
            </p>
            <div class="pipeline-formula">O_i = (type, process, micro_ops, t_i)</div>
          </div>

          <div class="pipeline-card">
            <span class="pipeline-step-badge">STAGE 02</span>
            <h3>Version Order Induction</h3>
            <p>
              Reconstructs the global total version order for each key from client-observed list registers. The longest prefix observed by any reader defines the ground-truth sequence of committed writes.
            </p>
            <div class="pipeline-formula">V(k) = [v_1, v_2, ..., v_n] \in \max_{\text{prefix}}(\text{Reads}(k))</div>
          </div>

          <div class="pipeline-card">
            <span class="pipeline-step-badge">STAGE 03</span>
            <h3>Dependency Edge Synthesis</h3>
            <p>
              Synthesizes directed edges across transactions: Write-Write (ww) edges whenever T_i writes a version preceding T_j on key k, and Write-Read (wr) edges whenever T_j reads a value produced by T_i.
            </p>
            <div class="pipeline-formula">E_{ww} = \{(T_i, T_j) \mid v_i &lt;_{V(k)} v_j\}, \quad E_{wr} = \{(T_i, T_j) \mid T_j \text{ reads } v_i\}</div>
          </div>

          <div class="pipeline-card">
            <span class="pipeline-step-badge">STAGE 04</span>
            <h3>Iterative Tarjan SCC</h3>
            <p>
              Decomposes the directed multi-graph into Strongly Connected Components using an explicit non-recursive stack. Prunes trivial SCCs and isolates cyclic subgraphs in linear O(V + E) time.
            </p>
            <div class="pipeline-formula">\text{SCC}(G) \implies \{C_1, C_2, ...\}, \quad |C_k| &gt; 1 \implies \text{Anomaly}</div>
          </div>

          <div class="pipeline-card">
            <span class="pipeline-step-badge">STAGE 05</span>
            <h3>Minimal Witness BFS</h3>
            <p>
              Within each non-trivial SCC, a breadth-first search pinpoints the shortest closed cycle path. This minimal cycle serves as the indisputable witness proving the isolation violation.
            </p>
            <div class="pipeline-formula">\text{Witness} = \min_{\text{cycle}} (T_0 \to T_1 \to \dots \to T_0)</div>
          </div>

          <div class="pipeline-card">
            <span class="pipeline-step-badge">STAGE 06</span>
            <h3>Adya Anomaly Classification</h3>
            <p>
              Maps cycle edge types and abort predicates to formal Adya consistency levels: pure ww cycles yield G0 (Dirty Write), ww + wr cycles yield G1c (Circular Flow), and aborted read edges yield G1a.
            </p>
            <div class="pipeline-formula">H \models \text{PL-1} \iff \text{Acyclic}(ww), \quad H \models \text{PL-2} \iff \text{Acyclic}(ww \cup wr)</div>
          </div>
        </div>
      </section>

      <!-- Anomaly Reference & Isolation Matrix -->
      <section style="margin-top: 72px;">
        <div class="section-header">
          <span class="section-tag">Theory & Standards</span>
          <h2 class="section-title">ANSI SQL vs Adya Isolation Level Matrix</h2>
          <p class="section-desc">
            Berenson et al. (1995) proved that ANSI SQL 92 isolation definitions were ambiguous and incomplete.
            IsoCheck implements Adya's graph-theoretic model (1999) to provide unambiguous detection boundaries.
          </p>
        </div>

        <div class="table-wrap">
          <table class="isolation-matrix-table" id="matrix-table">
            <thead>
              <tr>
                <th>Isolation Level</th>
                <th>Adya Equiv.</th>
                <th>G0 (Dirty Write)</th>
                <th>G1a (Aborted Read)</th>
                <th>G1b (Intermediate)</th>
                <th>G1c (Circular Flow)</th>
                <th>Lost Update</th>
                <th>Write Skew</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>Read Uncommitted</strong></td>
                <td><code class="code-inline">PL-1-</code></td>
                <td class="status-cell permitted">Permitted</td>
                <td class="status-cell permitted">Permitted</td>
                <td class="status-cell permitted">Permitted</td>
                <td class="status-cell permitted">Permitted</td>
                <td class="status-cell permitted">Permitted</td>
                <td class="status-cell permitted">Permitted</td>
              </tr>
              <tr>
                <td><strong>Read Committed</strong></td>
                <td><code class="code-inline">PL-2</code></td>
                <td class="status-cell prevented">Prevented</td>
                <td class="status-cell prevented">Prevented</td>
                <td class="status-cell prevented">Prevented</td>
                <td class="status-cell permitted">Permitted</td>
                <td class="status-cell permitted">Permitted</td>
                <td class="status-cell permitted">Permitted</td>
              </tr>
              <tr>
                <td><strong>Repeatable Read (ANSI)</strong></td>
                <td><code class="code-inline">PL-2.9</code></td>
                <td class="status-cell prevented">Prevented</td>
                <td class="status-cell prevented">Prevented</td>
                <td class="status-cell prevented">Prevented</td>
                <td class="status-cell permitted">Permitted*</td>
                <td class="status-cell permitted">Permitted</td>
                <td class="status-cell permitted">Permitted</td>
              </tr>
              <tr>
                <td><strong>Snapshot Isolation (SI)</strong></td>
                <td><code class="code-inline">PL-2.99</code></td>
                <td class="status-cell prevented">Prevented</td>
                <td class="status-cell prevented">Prevented</td>
                <td class="status-cell prevented">Prevented</td>
                <td class="status-cell prevented">Prevented</td>
                <td class="status-cell prevented">Prevented</td>
                <td class="status-cell permitted">Permitted</td>
              </tr>
              <tr>
                <td><strong>Strict Serializability (SSI)</strong></td>
                <td><code class="code-inline">PL-3 (1SR)</code></td>
                <td class="status-cell prevented">Prevented</td>
                <td class="status-cell prevented">Prevented</td>
                <td class="status-cell prevented">Prevented</td>
                <td class="status-cell prevented">Prevented</td>
                <td class="status-cell prevented">Prevented</td>
                <td class="status-cell prevented">Prevented</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <!-- Developer Quick Start / CLI Code Tabs -->
      <section style="margin-top: 72px;">
        <div class="section-header">
          <span class="section-tag">Integration</span>
          <h2 class="section-title">Drop IsoCheck into Your Test Suite</h2>
          <p class="section-desc">
            Use the standalone C++20 CLI binary, integrate directly into CI/CD pipelines, or run the high-performance Python test harness against PostgreSQL, CockroachDB, or TiDB.
          </p>
        </div>

        <div class="code-tabs" id="integration-tabs">
          <div class="code-tabs-header">
            <div class="code-tabs-list">
              <button class="code-tab-btn active" data-tab="cli">CLI Binary</button>
              <button class="code-tab-btn" data-tab="python">Python Harness</button>
              <button class="code-tab-btn" data-tab="cmake">C++ CMake</button>
              <button class="code-tab-btn" data-tab="docker">Docker Compose</button>
            </div>
            <button class="code-copy-btn" id="copy-code-btn">
              ${icons.copy}
              <span>Copy</span>
            </button>
          </div>
          <div class="code-block" id="integration-code-block" style="border: none; border-radius: 0;"># Build and run the single-binary CLI checker
cmake -B build -DCMAKE_BUILD_TYPE=Release
cmake --build build -j$(nproc)

# Check a recorded JSONL history and emit minimal cycle witness
./build/cli/isocheck --input campaign_results/postgres_rc_test.jsonl --format json</div>
        </div>
      </section>
    </div>
  `);

  // Setup interactive blueprint
  setupBlueprint();

  // Setup integration code tabs
  setupCodeTabs();
}

// Live interactive Adya dependency blueprint scenarios
const scenarios = {
  clean: {
    badge: '<span class="anomaly-badge badge-clean">VALID (Strict Serial)</span>',
    desc: 'Acyclic dependency graph. Topological sort yields valid serial execution: T1 &rarr; T2 &rarr; T3.',
    svg: `
      <svg viewBox="0 0 460 220" width="100%" height="100%" style="overflow: visible;">
        <defs>
          <marker id="arrow-blue" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">
            <path d="M 0 1 L 9 5 L 0 9 z" fill="#38bdf8"/>
          </marker>
          <marker id="arrow-amber" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">
            <path d="M 0 1 L 9 5 L 0 9 z" fill="#e59f3b"/>
          </marker>
        </defs>
        <!-- Node T1 -->
        <g transform="translate(60, 110)">
          <circle r="26" fill="#171c2d" stroke="#38bdf8" stroke-width="2"/>
          <text text-anchor="middle" dy="4" fill="#f0f3fa" font-family="JetBrains Mono" font-size="12" font-weight="bold">T1</text>
          <text text-anchor="middle" dy="38" fill="#9ca6bd" font-family="JetBrains Mono" font-size="10">append(k1, 1)</text>
        </g>
        <!-- Node T2 -->
        <g transform="translate(230, 110)">
          <circle r="26" fill="#171c2d" stroke="#e59f3b" stroke-width="2"/>
          <text text-anchor="middle" dy="4" fill="#f0f3fa" font-family="JetBrains Mono" font-size="12" font-weight="bold">T2</text>
          <text text-anchor="middle" dy="38" fill="#9ca6bd" font-family="JetBrains Mono" font-size="10">read(k1, [1])</text>
        </g>
        <!-- Node T3 -->
        <g transform="translate(400, 110)">
          <circle r="26" fill="#171c2d" stroke="#10b981" stroke-width="2"/>
          <text text-anchor="middle" dy="4" fill="#f0f3fa" font-family="JetBrains Mono" font-size="12" font-weight="bold">T3</text>
          <text text-anchor="middle" dy="38" fill="#9ca6bd" font-family="JetBrains Mono" font-size="10">append(k2, 9)</text>
        </g>
        <!-- Edges -->
        <path d="M 88 110 L 202 110" stroke="#38bdf8" stroke-width="2" marker-end="url(#arrow-blue)"/>
        <text x="145" y="100" fill="#38bdf8" font-family="JetBrains Mono" font-size="10" text-anchor="middle">wr (k1)</text>

        <path d="M 258 110 L 372 110" stroke="#e59f3b" stroke-width="2" marker-end="url(#arrow-amber)"/>
        <text x="315" y="100" fill="#e59f3b" font-family="JetBrains Mono" font-size="10" text-anchor="middle">so (process)</text>
      </svg>
    `
  },
  g0: {
    badge: '<span class="anomaly-badge badge-g0">G0 (Dirty Write Cycle)</span>',
    desc: 'Conflicting write orders: T1 wrote before T2 on key1, but T2 wrote before T1 on key2. Tarjan detected closed cycle: T1 &rarr; T2 &rarr; T1.',
    svg: `
      <svg viewBox="0 0 460 220" width="100%" height="100%" style="overflow: visible;">
        <defs>
          <marker id="arrow-red" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">
            <path d="M 0 1 L 9 5 L 0 9 z" fill="#ef4444"/>
          </marker>
        </defs>
        <!-- Node T1 -->
        <g transform="translate(130, 110)">
          <circle r="30" fill="#1c2236" stroke="#ef4444" stroke-width="2.5"/>
          <text text-anchor="middle" dy="4" fill="#f0f3fa" font-family="JetBrains Mono" font-size="13" font-weight="bold">T1</text>
          <text text-anchor="middle" dy="44" fill="#9ca6bd" font-family="JetBrains Mono" font-size="10">w(k1=1), w(k2=3)</text>
        </g>
        <!-- Node T2 -->
        <g transform="translate(330, 110)">
          <circle r="30" fill="#1c2236" stroke="#ef4444" stroke-width="2.5"/>
          <text text-anchor="middle" dy="4" fill="#f0f3fa" font-family="JetBrains Mono" font-size="13" font-weight="bold">T2</text>
          <text text-anchor="middle" dy="44" fill="#9ca6bd" font-family="JetBrains Mono" font-size="10">w(k1=2), w(k2=4)</text>
        </g>
        <!-- Edge T1 -> T2 (ww on k1) -->
        <path d="M 156 90 Q 230 40 304 90" stroke="#ef4444" stroke-width="2.5" fill="none" marker-end="url(#arrow-red)"/>
        <text x="230" y="52" fill="#ef4444" font-family="JetBrains Mono" font-size="11" font-weight="bold" text-anchor="middle">ww (k1: 1 &rarr; 2)</text>
        <!-- Edge T2 -> T1 (ww on k2) -->
        <path d="M 304 130 Q 230 180 156 130" stroke="#ef4444" stroke-width="2.5" stroke-dasharray="4 3" fill="none" marker-end="url(#arrow-red)"/>
        <text x="230" y="174" fill="#ef4444" font-family="JetBrains Mono" font-size="11" font-weight="bold" text-anchor="middle">ww (k2: 4 &rarr; 3) [CYCLE]</text>
      </svg>
    `
  },
  g1a: {
    badge: '<span class="anomaly-badge badge-g1a">G1a (Aborted Read)</span>',
    desc: 'Committed transaction T2 read state written by aborted transaction T1. Violates basic atomicity and dirty-read prevention.',
    svg: `
      <svg viewBox="0 0 460 220" width="100%" height="100%" style="overflow: visible;">
        <defs>
          <marker id="arrow-amber-g1a" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">
            <path d="M 0 1 L 9 5 L 0 9 z" fill="#fbbf24"/>
          </marker>
        </defs>
        <!-- Node T1 (Aborted) -->
        <g transform="translate(130, 110)">
          <circle r="30" fill="#1c2236" stroke="#ef4444" stroke-width="2" stroke-dasharray="3 3"/>
          <text text-anchor="middle" dy="4" fill="#ef4444" font-family="JetBrains Mono" font-size="13" font-weight="bold">T1 ✗</text>
          <text text-anchor="middle" dy="44" fill="#ef4444" font-family="JetBrains Mono" font-size="10">ABORTED (fail)</text>
        </g>
        <!-- Node T2 (Committed) -->
        <g transform="translate(330, 110)">
          <circle r="30" fill="#1c2236" stroke="#fbbf24" stroke-width="2.5"/>
          <text text-anchor="middle" dy="4" fill="#f0f3fa" font-family="JetBrains Mono" font-size="13" font-weight="bold">T2 ✓</text>
          <text text-anchor="middle" dy="44" fill="#fbbf24" font-family="JetBrains Mono" font-size="10">COMMITTED (ok)</text>
        </g>
        <!-- Edge T1 -> T2 (read aborted write) -->
        <path d="M 162 110 L 298 110" stroke="#fbbf24" stroke-width="2.5" fill="none" marker-end="url(#arrow-amber-g1a)"/>
        <text x="230" y="98" fill="#fbbf24" font-family="JetBrains Mono" font-size="11" font-weight="bold" text-anchor="middle">wr (observed rolled-back v=1)</text>
      </svg>
    `
  },
  g1c: {
    badge: '<span class="anomaly-badge badge-g1c">G1c (Circular Info Flow)</span>',
    desc: 'Cycle involving write-write and write-read dependencies: T1 wrote before T2, but T1 observed T2 updates. Tarjan cycle witness: T1 &rarr; T2 &rarr; T1.',
    svg: `
      <svg viewBox="0 0 460 220" width="100%" height="100%" style="overflow: visible;">
        <defs>
          <marker id="arrow-g1c-wr" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">
            <path d="M 0 1 L 9 5 L 0 9 z" fill="#38bdf8"/>
          </marker>
          <marker id="arrow-g1c-ww" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">
            <path d="M 0 1 L 9 5 L 0 9 z" fill="#ef4444"/>
          </marker>
        </defs>
        <!-- Node T1 -->
        <g transform="translate(130, 110)">
          <circle r="30" fill="#1c2236" stroke="#fca5a5" stroke-width="2.5"/>
          <text text-anchor="middle" dy="4" fill="#f0f3fa" font-family="JetBrains Mono" font-size="13" font-weight="bold">T1</text>
          <text text-anchor="middle" dy="44" fill="#9ca6bd" font-family="JetBrains Mono" font-size="10">w(k1=1), r(k2=[2])</text>
        </g>
        <!-- Node T2 -->
        <g transform="translate(330, 110)">
          <circle r="30" fill="#1c2236" stroke="#fca5a5" stroke-width="2.5"/>
          <text text-anchor="middle" dy="4" fill="#f0f3fa" font-family="JetBrains Mono" font-size="13" font-weight="bold">T2</text>
          <text text-anchor="middle" dy="44" fill="#9ca6bd" font-family="JetBrains Mono" font-size="10">w(k2=2), r(k1=[1])</text>
        </g>
        <!-- T1 -> T2 (wr) -->
        <path d="M 156 90 Q 230 40 304 90" stroke="#38bdf8" stroke-width="2.5" fill="none" marker-end="url(#arrow-g1c-wr)"/>
        <text x="230" y="52" fill="#38bdf8" font-family="JetBrains Mono" font-size="11" text-anchor="middle">wr (T2 reads T1 on k1)</text>
        <!-- T2 -> T1 (wr) -->
        <path d="M 304 130 Q 230 180 156 130" stroke="#ef4444" stroke-width="2.5" stroke-dasharray="4 3" fill="none" marker-end="url(#arrow-g1c-ww)"/>
        <text x="230" y="174" fill="#ef4444" font-family="JetBrains Mono" font-size="11" font-weight="bold" text-anchor="middle">wr (T1 reads T2 on k2) [G1c CYCLE]</text>
      </svg>
    `
  }
};

function setupBlueprint() {
  const viewport = document.getElementById('bp-viewport');
  const verdict = document.getElementById('bp-verdict-text');
  const selector = document.getElementById('bp-selector');

  if (!viewport || !selector) return;

  function setScenario(key) {
    const s = scenarios[key];
    if (!s) return;
    viewport.innerHTML = s.svg;
    verdict.innerHTML = `${s.badge}<span style="margin-left: 8px; color: var(--text-secondary);">${s.desc}</span>`;
  }

  // Initial
  setScenario('clean');

  selector.querySelectorAll('.blueprint-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      selector.querySelectorAll('.blueprint-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      setScenario(tab.getAttribute('data-scenario'));
    });
  });
}

const tabSnippets = {
  cli: `# Build and run the single-binary CLI checker
cmake -B build -DCMAKE_BUILD_TYPE=Release
cmake --build build -j$(nproc)

# Check a recorded JSONL history and emit minimal cycle witness
./build/cli/isocheck --input campaign_results/postgres_rc_test.jsonl --format json`,
  python: `# Run isolation test harness against live PostgreSQL instance
python harness/run_campaign.py \\
  --engine postgres \\
  --isolation read_committed \\
  --clients 8 \\
  --txns-per-client 500 \\
  --output ./campaign_results/pg_run.jsonl`,
  cmake: `# Link IsoCheck core directly in your C++20 test suite
find_package(IsoCheck REQUIRED)

add_executable(my_db_test test_isolation.cpp)
target_link_libraries(my_db_test PRIVATE IsoCheck::core)`,
  docker: `# Spin up automated differential test campaign with Docker
docker compose up --build --abort-on-container-exit

# Output saved to ./campaign_results/`
};

function setupCodeTabs() {
  const container = document.getElementById('integration-tabs');
  if (!container) return;

  const codeBlock = document.getElementById('integration-code-block');
  const copyBtn = document.getElementById('copy-code-btn');

  container.querySelectorAll('.code-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      container.querySelectorAll('.code-tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const tab = btn.getAttribute('data-tab');
      if (codeBlock && tabSnippets[tab]) {
        codeBlock.textContent = tabSnippets[tab];
      }
    });
  });

  if (copyBtn && codeBlock) {
    copyBtn.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(codeBlock.textContent);
        const original = copyBtn.innerHTML;
        copyBtn.innerHTML = `${icons.check} <span>Copied!</span>`;
        setTimeout(() => {
          copyBtn.innerHTML = original;
        }, 1800);
      } catch (err) {
        // Fallback
      }
    });
  }
}
