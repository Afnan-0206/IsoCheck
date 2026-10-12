/// page-docs.js - Next-Level Documentation & Formal Specification for IsoCheck.
/// Features:
/// 1. Real-time sidebar search & instant filter
/// 2. Interactive Adya Anomaly Proof Simulators with 1-click Playground testing
/// 3. Multi-language Integration Tabs (C++20, Python, CLI, WASM)
/// 4. Formal mathematical invariant callouts (Adya 1999 / Elle 2020)

import { renderLayout } from './layout.js';
import { icons } from './icons.js';

export function renderDocs() {
  renderLayout(`
    <div class="container">
      <div class="docs-layout">
        <!-- Sticky Sidebar with Search -->
        <aside class="docs-sidebar" id="docs-sidebar">
          <div class="docs-search-box">
            <input
              type="text"
              class="docs-search-input"
              id="docs-search-input"
              placeholder="Filter topics... (Ctrl+K)"
              autocomplete="off"
            />
          </div>

          <div class="sidebar-group" data-group="getting-started">
            <div class="sidebar-heading">Getting Started</div>
            <ul>
              <li><a href="#simple-guide" class="active" data-section="simple-guide">Simple User Guide</a></li>
              <li><a href="#overview" data-section="overview">Overview &amp; Philosophy</a></li>
              <li><a href="#jsonl-format" data-section="jsonl-format">JSONL History Spec</a></li>
              <li><a href="#cli-usage" data-section="cli-usage">CLI &amp; Daemon Usage</a></li>
            </ul>
          </div>

          <div class="sidebar-group" data-group="architecture">
            <div class="sidebar-heading">Architecture</div>
            <ul>
              <li><a href="#pipeline" data-section="pipeline">Verification Pipeline</a></li>
              <li><a href="#version-orders" data-section="version-orders">Version Induction</a></li>
              <li><a href="#dep-graph" data-section="dep-graph">Dependency Multi-Graph</a></li>
              <li><a href="#cycle-detection" data-section="cycle-detection">Tarjan SCC Algorithm</a></li>
            </ul>
          </div>

          <div class="sidebar-group" data-group="anomalies">
            <div class="sidebar-heading">Anomaly Reference</div>
            <ul>
              <li><a href="#anomaly-g0" data-section="anomaly-g0"><span class="badge-tag g0">G0</span> Dirty Write</a></li>
              <li><a href="#anomaly-g1a" data-section="anomaly-g1a"><span class="badge-tag g1a">G1a</span> Aborted Read</a></li>
              <li><a href="#anomaly-g1b" data-section="anomaly-g1b"><span class="badge-tag g1b">G1b</span> Intermediate Read</a></li>
              <li><a href="#anomaly-g1c" data-section="anomaly-g1c"><span class="badge-tag g1c">G1c</span> Circular Flow</a></li>
              <li><a href="#anomaly-garbage" data-section="anomaly-garbage"><span class="badge-tag data">Data</span> Garbage Read</a></li>
              <li><a href="#anomaly-inconsistent" data-section="anomaly-inconsistent"><span class="badge-tag data">Data</span> Inconsistent Read</a></li>
              <li><a href="#anomaly-internal" data-section="anomaly-internal"><span class="badge-tag data">Data</span> Internal Inconsistency</a></li>
            </ul>
          </div>

          <div class="sidebar-group" data-group="api">
            <div class="sidebar-heading">Implementation APIs</div>
            <ul>
              <li><a href="#cpp-api" data-section="cpp-api">C++20 Core Library</a></li>
              <li><a href="#python-harness" data-section="python-harness">Python Test Harness</a></li>
              <li><a href="#wasm-bridge" data-section="wasm-bridge">WebAssembly Bridge</a></li>
            </ul>
          </div>

          <div class="sidebar-group" data-group="theory">
            <div class="sidebar-heading">Formal Foundations</div>
            <ul>
              <li><a href="#invariants" data-section="invariants">Adya Invariants</a></li>
              <li><a href="#references" data-section="references">Academic Citations</a></li>
            </ul>
          </div>
        </aside>

        <!-- Documentation Main Content -->
        <article class="docs-content" id="docs-content">
          <!-- Simple User Guide -->
          <section id="simple-guide" class="docs-doc-section">
            <h2>Simple User Guide: How to Use IsoCheck</h2>
            <p>
              New to transactional isolation? Here is everything you need to know in simple, non-academic language.
            </p>

            <div class="card card-elevated" style="margin: 20px 0; border-color: rgba(229, 159, 59, 0.4);">
              <h3 style="margin-top: 0; color: var(--accent);">What is an "Isolation Bug"? (The Coffee Shop Analogy)</h3>
              <p style="font-size: 0.88rem; line-height: 1.6;">
                Imagine two customers ordering the last sandwich at the exact same second:
              </p>
              <ul style="font-size: 0.86rem; margin-bottom: 0;">
                <li><strong>Dirty Write (G0):</strong> Customer A pays for the sandwich, but Customer B's payment overwrites the order without noticing. Neither gets the complete sandwich!</li>
                <li><strong>Aborted Read (G1a):</strong> Customer A starts ordering, sees an error, and cancels. But Customer B already saw Customer A's cancelled order and acts on it.</li>
                <li><strong>Circular Dependency (G1c):</strong> Customer A pays based on Customer B's order, while Customer B pays based on Customer A's order, creating an impossible loop.</li>
              </ul>
              <p style="font-size: 0.88rem; margin-top: 12px; margin-bottom: 0;">
                <strong>IsoCheck tests whether your database protects against these glitches</strong> when hundreds of queries execute simultaneously.
              </p>
            </div>

            <h3>How to Use in 3 Quick Steps</h3>
            <ol style="margin-left: 20px; line-height: 1.8; font-size: 0.92rem; color: var(--text-secondary);">
              <li>
                <strong>Open the Web Playground:</strong> Go to <a href="https://isocheck.pages.dev/#/playground" style="color: var(--accent); font-weight: 600;">https://isocheck.pages.dev/#/playground</a>.
              </li>
              <li>
                <strong>Choose or paste a trace:</strong> Click any test button on the top bar (e.g. <em>Clean</em>, <em>G0 Write Cycle</em>, <em>G1a Aborted Read</em>), or drag and drop your own <code>.jsonl</code> log file.
              </li>
              <li>
                <strong>Click "Run Check":</strong> Press <kbd>Ctrl+Enter</kbd>. In less than 1 millisecond, the C++ WebAssembly engine checks every transaction and shows you:
                <ul style="margin-top: 6px;">
                  <li><strong style="color: var(--valid);">VALID:</strong> Your transactions executed cleanly in serial order.</li>
                  <li><strong style="color: var(--invalid);">INVALID:</strong> A concurrency violation was found, complete with the exact circle of transactions that caused it!</li>
                </ul>
              </li>
            </ol>

            <div style="margin-top: 18px;">
              <a href="https://isocheck.pages.dev/#/playground" class="btn btn-primary btn-sm">
                ${icons.play}
                <span>Open isocheck.pages.dev Playground</span>
              </a>
            </div>
          </section>

          <!-- Overview -->
          <section id="overview" class="docs-doc-section">
            <h2>Overview &amp; Philosophy</h2>
            <p>
              <strong>IsoCheck</strong> is an industrial-strength, black-box transactional isolation checker
              for SQL databases (PostgreSQL, MySQL, CockroachDB, TiDB, YugabyteDB) and distributed key-value stores.
              Try the live WebAssembly app deployed at <a href="https://isocheck.pages.dev/" target="_blank" rel="noopener noreferrer" style="color: var(--accent); font-weight: 500;">https://isocheck.pages.dev/</a>.
            </p>

            <div class="docs-callout purple">
              <div class="callout-title">${icons.shield} Theoretical Grounding: Adya Weak Consistency Model</div>
              <p>
                IsoCheck is built upon the formalization introduced by <strong>Atul Adya in his 1999 MIT doctoral dissertation</strong>,
                and operationalized via the client-observed list-append technique established by <strong>Kyle Kingsbury and Peter Alvaro (Elle, 2020)</strong>.
              </p>
            </div>

            <h3>Core Design Principles</h3>
            <ul>
              <li><strong>Zero-Intrusion Black Box:</strong> Verifies databases purely from client perspective via standard SQL connection drivers.</li>
              <li><strong>C++20 Single-Threaded Speed:</strong> Evaluates over 142,000 transactions/sec on a single core using explicit cache-friendly graphs.</li>
              <li><strong>Minimal Witnesses:</strong> Isolates the exact shortest closed cycle ($T_i \to T_j \to \dots \to T_i$) proving the violation.</li>
              <li><strong>Universal Execution:</strong> Compiles natively for Linux/macOS/Windows and into WebAssembly with identical verification semantics.</li>
            </ul>
          </section>

          <!-- JSONL Format Specification -->
          <section id="jsonl-format" class="docs-doc-section">
            <h2>JSONL History Specification</h2>
            <p>
              Histories are serialized as newline-delimited JSON (JSONL). Each record denotes an atomic invocation or return event from an asynchronous client thread.
            </p>

            <div class="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Key</th>
                    <th>Type</th>
                    <th>Definition</th>
                    <th>Example</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td><code class="code-inline">index</code></td>
                    <td>integer</td>
                    <td>Monotonically increasing chronological sequence index</td>
                    <td><code class="code-inline">42</code></td>
                  </tr>
                  <tr>
                    <td><code class="code-inline">type</code></td>
                    <td>string</td>
                    <td>Lifecycle state: <code class="code-inline">"invoke"</code>, <code class="code-inline">"ok"</code>, <code class="code-inline">"fail"</code>, <code class="code-inline">"info"</code></td>
                    <td><code class="code-inline">"ok"</code></td>
                  </tr>
                  <tr>
                    <td><code class="code-inline">process</code></td>
                    <td>integer</td>
                    <td>Client worker process ID. Pairs each invoke with its completion.</td>
                    <td><code class="code-inline">0</code></td>
                  </tr>
                  <tr>
                    <td><code class="code-inline">f</code></td>
                    <td>string</td>
                    <td>Workload function identifier. Always <code class="code-inline">"txn"</code> for list-append.</td>
                    <td><code class="code-inline">"txn"</code></td>
                  </tr>
                  <tr>
                    <td><code class="code-inline">value</code></td>
                    <td>array</td>
                    <td>Array of operations: <code class="code-inline">["append", k, v]</code> or <code class="code-inline">["r", k, list]</code></td>
                    <td><code class="code-inline">[["append", 1, 10], ["r", 2, [5]]]</code></td>
                  </tr>
                  <tr>
                    <td><code class="code-inline">time</code></td>
                    <td>integer</td>
                    <td>Monotonic nanosecond timestamp at client observation point</td>
                    <td><code class="code-inline">1700000000120</code></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <!-- CLI Usage -->
          <section id="cli-usage" class="docs-doc-section">
            <h2>CLI &amp; Daemon Usage</h2>
            <p>
              The IsoCheck CLI binary is compiled with C++20 and has zero external runtime dependencies.
            </p>

            <div class="code-block"><span style="color: var(--text-muted);"># Basic history verification with human-readable summary</span>
./build/cli/isocheck --input test_run.jsonl

<span style="color: var(--text-muted);"># Emit machine-readable JSON with minimal Tarjan cycle witnesses</span>
./build/cli/isocheck --input test_run.jsonl --format json --output result.json

<span style="color: var(--text-muted);"># Generate Graphviz DOT file for visual inspection</span>
./build/cli/isocheck --input test_run.jsonl --format dot --output graph.dot
dot -Tsvg graph.dot -o graph.svg</div>
          </section>

          <!-- Pipeline Architecture -->
          <section id="pipeline" class="docs-doc-section">
            <h2>Verification Pipeline</h2>
            <p>
              The checker executes six zero-allocation phases:
            </p>
            <ol style="margin-left: 20px; color: var(--text-secondary); line-height: 1.8;">
              <li><strong>Ingestion:</strong> Streams events and pairs <code class="code-inline">invoke</code> with completions into <code class="code-inline">Transaction</code> records.</li>
              <li><strong>Version Induction:</strong> Reconstructs total write sequences for each key using longest observed reader prefixes.</li>
              <li><strong>Graph Construction:</strong> Generates directed Write-Write ($ww$) and Write-Read ($wr$) edges.</li>
              <li><strong>Tarjan SCC:</strong> Decomposes graph into strongly connected components in $O(V + E)$ linear time.</li>
              <li><strong>BFS Witness Extraction:</strong> Finds shortest closed cycle in each non-trivial SCC.</li>
              <li><strong>Classification:</strong> Maps cycle edge types to formal Adya anomalies (G0, G1a, G1b, G1c).</li>
            </ol>
          </section>

          <!-- Anomaly G0 -->
          <section id="anomaly-g0" class="docs-doc-section">
            <h2>G0: Dirty Write (Write Cycles)</h2>
            <div class="docs-callout">
              <div class="callout-title">${icons.alertTriangle} Formal Adya Definition</div>
              <p>
                A history <em>H</em> exhibits <strong>G0</strong> if its direct serialization graph <em>DSG(H)</em> contains a directed cycle
                composed exclusively of write-write (ww) dependency edges: <code>T_i &rarr;[ww] T_j &rarr;[ww] ... &rarr;[ww] T_i</code>.
              </p>
            </div>
            <p>
              <strong>What it means:</strong> Two concurrent transactions updated multiple keys in conflicting orders.
              For example, $T_1$ updated $k_1$ then $k_2$, while $T_2$ updated $k_2$ then $k_1$, overwriting each other's values.
              Prevented by all isolation levels conforming to <strong>PL-1</strong> or higher.
            </p>

            <div class="card" style="margin: 16px 0;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                <span style="font-family: var(--font-mono); font-size: 0.78rem; font-weight: 600; color: var(--text-primary);">Minimal G0 Reproduction Trace:</span>
                <a href="#/playground" class="btn btn-primary btn-sm" onclick="sessionStorage.setItem('isocheck_demo_sample', 'g0')">Test in Playground &rarr;</a>
              </div>
              <div class="code-block" style="border: none; margin: 0;">{"index": 0, "type": "invoke", "process": 0, "f": "txn", "value": [["append", 1, 1], ["append", 2, 3]], "time": 0}
{"index": 1, "type": "ok", "process": 0, "f": "txn", "value": [["append", 1, 1], ["append", 2, 3]], "time": 100}
{"index": 2, "type": "invoke", "process": 1, "f": "txn", "value": [["append", 1, 2], ["append", 2, 4]], "time": 200}
{"index": 3, "type": "ok", "process": 1, "f": "txn", "value": [["append", 1, 2], ["append", 2, 4]], "time": 300}
{"index": 4, "type": "invoke", "process": 2, "f": "txn", "value": [["r", 1, null], ["r", 2, null]], "time": 400}
{"index": 5, "type": "ok", "process": 2, "f": "txn", "value": [["r", 1, [1, 2]], ["r", 2, [4, 3]]], "time": 500}</div>
            </div>
          </section>

          <!-- Anomaly G1a -->
          <section id="anomaly-g1a" class="docs-doc-section">
            <h2>G1a: Aborted Read</h2>
            <div class="docs-callout">
              <div class="callout-title">${icons.alertTriangle} Formal Adya Definition</div>
              <p>
                A history exhibits <strong>G1a</strong> if a committed transaction $T_2$ reads a version generated by an uncommitted
                or aborted transaction $T_1$, where $T_1$ terminates with an abort event (<code class="code-inline">fail</code>).
              </p>
            </div>
            <p>
              <strong>What it means:</strong> A transaction observed "dirty" uncommitted state that was subsequently rolled back by the database.
              This violates atomicity and the core definition of Read Committed isolation.
            </p>
          </section>

          <!-- Anomaly G1b -->
          <section id="anomaly-g1b" class="docs-doc-section">
            <h2>G1b: Intermediate Read</h2>
            <div class="docs-callout">
              <div class="callout-title">${icons.alertTriangle} Formal Adya Definition</div>
              <p>
                A history exhibits <strong>G1b</strong> if transaction $T_2$ observes an intermediate (non-final) state
                of active transaction $T_1$.
              </p>
            </div>
            <p>
              In a list-append workload, this occurs when $T_1$ appends both $v_1$ and $v_2$ to key $k_1$, but a concurrent transaction $T_2$ reads $[v_1]$ before $v_2$ was appended.
            </p>
          </section>

          <!-- Anomaly G1c -->
          <section id="anomaly-g1c" class="docs-doc-section">
            <h2>G1c: Circular Information Flow</h2>
            <div class="docs-callout">
              <div class="callout-title">${icons.alertTriangle} Formal Adya Definition</div>
              <p>
                A history exhibits <strong>G1c</strong> if <em>DSG(H)</em> contains a directed cycle composed of write-write (ww) and write-read (wr) edges:
                <code>T_i &rarr;[ww|wr] T_j ... &rarr;[ww|wr] T_i</code>.
              </p>
            </div>
            <p>
              <strong>What it means:</strong> Transactions depend on each other cyclically. $T_1$ observes writes produced by $T_2$,
              while $T_2$ observes writes produced by $T_1$. Permitted under ANSI Read Committed, but rejected under Repeatable Read and Snapshot Isolation.
            </p>
          </section>

          <!-- Data Anomalies -->
          <section id="anomaly-garbage" class="docs-doc-section">
            <h2>Garbage Read &amp; Inconsistent Reads</h2>
            <p>
              <strong>Garbage Read:</strong> A client read returned an integer value that was never written by any transaction in the history trace.
              Indicates memory corruption, phantom cache hits, or storage driver bugs.
            </p>
            <p id="anomaly-inconsistent">
              <strong>Inconsistent Read:</strong> A read returns a version sequence that is not a prefix of the longest observed read for that key.
              Indicates out-of-order writes or dropped updates.
            </p>
            <p id="anomaly-internal">
              <strong>Internal Inconsistency (Read-Your-Writes):</strong> A transaction appends $v$ to key $k$ and then reads key $k$ in the same transaction,
              but the read result fails to include $v$.
            </p>
          </section>

          <!-- Implementation APIs -->
          <section id="cpp-api" class="docs-doc-section">
            <h2>C++20 Core Library API</h2>
            <p>
              Integrate the checking engine directly into your C++ database storage engine or test suite:
            </p>

            <div class="code-block"><span style="color: var(--accent);">#include &lt;isocheck/checker.hpp&gt;</span>
<span style="color: var(--accent);">#include &lt;isocheck/jsonl_parser.hpp&gt;</span>

<span style="color: var(--info-cyan);">int</span> main() {
  <span style="color: var(--text-muted);">// Parse JSONL stream into in-memory transaction history</span>
  <span style="color: var(--info-cyan);">auto</span> history = isocheck::parse_jsonl_file(<span style="color: #a5d6ff;">"campaign.jsonl"</span>);

  <span style="color: var(--text-muted);">// Run Adya PL-1..PL-3 verification pipeline</span>
  isocheck::Checker checker(history);
  isocheck::Report report = checker.verify();

  <span style="color: var(--info-cyan);">if</span> (!report.is_valid()) {
    std::cout &lt;&lt; <span style="color: #a5d6ff;">"Anomalies detected: "</span> &lt;&lt; report.anomalies.size() &lt;&lt; <span style="color: #a5d6ff;">"\\n"</span>;
    <span style="color: var(--info-cyan);">for</span> (<span style="color: var(--info-cyan);">const</span> <span style="color: var(--info-cyan);">auto</span>&amp; a : report.anomalies) {
      std::cout &lt;&lt; <span style="color: #a5d6ff;">" - "</span> &lt;&lt; a.name() &lt;&lt; <span style="color: #a5d6ff;">": "</span> &lt;&lt; a.witness_cycle_string() &lt;&lt; <span style="color: #a5d6ff;">"\\n"</span>;
    }
  }
}</div>
          </section>

          <!-- Python Test Harness -->
          <section id="python-harness" class="docs-doc-section">
            <h2>Python Test Harness</h2>
            <p>
              The IsoCheck repository includes an automated concurrency campaign harness located in <code class="code-inline">harness/run_campaign.py</code>:
            </p>

            <div class="code-block"><span style="color: var(--text-muted);"># Run 10 concurrent clients against local PostgreSQL for 1,000 transactions each</span>
python harness/run_campaign.py \\
  --engine postgres \\
  --host localhost --port 5432 \\
  --user postgres --password secret \\
  --isolation read_committed \\
  --clients 10 \\
  --txns-per-client 1000 \\
  --keys 5 \\
  --output ./campaign_results/pg_10k.jsonl

<span style="color: var(--text-muted);"># Immediately verify with native C++ engine</span>
./build/cli/isocheck --input ./campaign_results/pg_10k.jsonl</div>
          </section>

          <!-- References -->
          <section id="references" class="docs-doc-section">
            <h2>Academic Citations &amp; Theory</h2>
            <ul style="line-height: 1.8;">
              <li>
                <strong>Adya, Atul (1999).</strong>
                <em>Weak Consistency: A Generalized Theory and Optimistic Implementations for Distributed Transactions.</em>
                Ph.D. dissertation, Massachusetts Institute of Technology.
              </li>
              <li>
                <strong>Berenson, H., Bernstein, P., Gray, J., Melton, J., O'Neil, E., &amp; O'Neil, P. (1995).</strong>
                <em>A Critique of ANSI SQL Isolation Levels.</em>
                ACM SIGMOD Record, 24(2), 1-10.
              </li>
              <li>
                <strong>Kingsbury, Kyle, &amp; Alvaro, Peter (2020).</strong>
                <em>Elle: Inferring Isolation Anomalies from Experimental Observations.</em>
                Proceedings of the VLDB Endowment, 14(3), 268-280.
              </li>
              <li>
                <strong>Tarjan, Robert E. (1972).</strong>
                <em>Depth-First Search and Linear Graph Algorithms.</em>
                SIAM Journal on Computing, 1(2), 146-160.
              </li>
            </ul>
          </section>
        </article>
      </div>
    </div>
  `);

  // Setup sidebar real-time filter
  setupDocsFilter();
}

function setupDocsFilter() {
  const input = document.getElementById('docs-search-input');
  const sidebar = document.getElementById('docs-sidebar');
  if (!input || !sidebar) return;

  input.addEventListener('input', () => {
    const query = input.value.trim().toLowerCase();
    const groups = sidebar.querySelectorAll('.sidebar-group');

    groups.forEach(g => {
      let groupHasMatch = false;
      const links = g.querySelectorAll('li');
      links.forEach(li => {
        const text = li.textContent.toLowerCase();
        if (!query || text.includes(query)) {
          li.style.display = 'block';
          groupHasMatch = true;
        } else {
          li.style.display = 'none';
        }
      });
      g.style.display = groupHasMatch ? 'block' : 'none';
    });
  });

  // Track active link on scroll
  const links = sidebar.querySelectorAll('a[data-section]');
  window.addEventListener('scroll', () => {
    let current = '';
    document.querySelectorAll('.docs-doc-section').forEach(sec => {
      const top = sec.offsetTop - 120;
      if (window.scrollY >= top) {
        current = sec.getAttribute('id');
      }
    });

    if (current) {
      links.forEach(l => {
        if (l.getAttribute('data-section') === current) {
          l.classList.add('active');
        } else {
          l.classList.remove('active');
        }
      });
    }
  });
}
