/// page-docs.js - Documentation page with sidebar navigation.
/// Architecture, anomaly reference, JSONL format spec, CLI usage.

import { renderLayout } from './layout.js';

export function renderDocs() {
  renderLayout(`
    <div class="container">
      <div class="docs-layout">
        <aside class="docs-sidebar" id="docs-sidebar">
          <div class="sidebar-heading">Getting Started</div>
          <ul>
            <li><a href="#overview" class="active" data-section="overview">Overview</a></li>
            <li><a href="#jsonl-format" data-section="jsonl-format">JSONL Format</a></li>
            <li><a href="#cli-usage" data-section="cli-usage">CLI Usage</a></li>
          </ul>
          <div class="sidebar-heading">Architecture</div>
          <ul>
            <li><a href="#pipeline" data-section="pipeline">Checking Pipeline</a></li>
            <li><a href="#version-orders" data-section="version-orders">Version Orders</a></li>
            <li><a href="#dep-graph" data-section="dep-graph">Dependency Graph</a></li>
            <li><a href="#cycle-detection" data-section="cycle-detection">Cycle Detection</a></li>
          </ul>
          <div class="sidebar-heading">Anomaly Reference</div>
          <ul>
            <li><a href="#anomaly-g0" data-section="anomaly-g0">G0: Dirty Write</a></li>
            <li><a href="#anomaly-g1a" data-section="anomaly-g1a">G1a: Aborted Read</a></li>
            <li><a href="#anomaly-g1b" data-section="anomaly-g1b">G1b: Intermediate Read</a></li>
            <li><a href="#anomaly-g1c" data-section="anomaly-g1c">G1c: Circular Info Flow</a></li>
            <li><a href="#anomaly-garbage" data-section="anomaly-garbage">Garbage Read</a></li>
            <li><a href="#anomaly-inconsistent" data-section="anomaly-inconsistent">Inconsistent Read</a></li>
            <li><a href="#anomaly-internal" data-section="anomaly-internal">Internal Inconsistency</a></li>
          </ul>
          <div class="sidebar-heading">Theory</div>
          <ul>
            <li><a href="#invariants" data-section="invariants">Key Invariants</a></li>
            <li><a href="#references" data-section="references">References</a></li>
          </ul>
        </aside>

        <div class="docs-content" id="docs-content">
          <h2 id="overview">Overview</h2>
          <p>
            IsoCheck is a black-box transactional isolation checker for SQL databases and
            distributed key-value stores. It infers dependency graphs from client-observed
            transaction histories and detects isolation anomalies via cycle detection and
            version order analysis.
          </p>
          <p>
            The theoretical foundation is Adya et al.'s weak consistency model (2000),
            operationalized through the list-append workload approach described in Kingsbury
            and Alvaro's Elle paper (2020).
          </p>
          <p>
            IsoCheck treats the database as a black box. It requires no access to internal
            logs, lock tables, or MVCC metadata. The only input is the observed transaction
            history: a chronological log of operations and their outcomes.
          </p>

          <h3>What it detects</h3>
          <ul>
            <li><strong>G0</strong> (dirty write): Write-write cycles across transactions</li>
            <li><strong>G1a</strong> (aborted read): A committed transaction reads data from an aborted transaction</li>
            <li><strong>G1b</strong> (intermediate read): A transaction observes a non-final write from an active transaction</li>
            <li><strong>G1c</strong> (circular information flow): Cycles involving both write-write and write-read edges</li>
            <li><strong>Garbage reads</strong>: Reads containing values never written by any transaction</li>
            <li><strong>Inconsistent reads</strong>: Reads that are not a prefix of the longest observed read for that key</li>
            <li><strong>Internal inconsistency</strong>: A transaction cannot observe its own prior writes</li>
          </ul>

          <h2 id="jsonl-format">JSONL History Format</h2>
          <p>
            Histories are recorded as JSONL (newline-delimited JSON). Each line represents
            a single operation event. The format follows the Jepsen/Elle convention.
          </p>

          <h3>Operation fields</h3>
          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Field</th>
                  <th>Type</th>
                  <th>Description</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><code class="code-inline">index</code></td>
                  <td>integer</td>
                  <td>Globally unique, monotonically increasing event index</td>
                </tr>
                <tr>
                  <td><code class="code-inline">type</code></td>
                  <td>string</td>
                  <td>One of <code class="code-inline">invoke</code>, <code class="code-inline">ok</code>, <code class="code-inline">fail</code>, <code class="code-inline">info</code></td>
                </tr>
                <tr>
                  <td><code class="code-inline">process</code></td>
                  <td>integer</td>
                  <td>Client process ID. Each invoke is paired with its completion on the same process.</td>
                </tr>
                <tr>
                  <td><code class="code-inline">f</code></td>
                  <td>string</td>
                  <td>Always <code class="code-inline">"txn"</code> for the list-append workload</td>
                </tr>
                <tr>
                  <td><code class="code-inline">value</code></td>
                  <td>array</td>
                  <td>Array of micro-operations: <code class="code-inline">["append", key, val]</code> or <code class="code-inline">["r", key, list|null]</code></td>
                </tr>
                <tr>
                  <td><code class="code-inline">time</code></td>
                  <td>integer</td>
                  <td>Timestamp in nanoseconds (monotonic clock)</td>
                </tr>
              </tbody>
            </table>
          </div>

          <h3>Micro-operations</h3>
          <p>
            Each transaction's <code class="code-inline">value</code> field contains an ordered list of
            micro-operations:
          </p>
          <ul>
            <li>
              <code class="code-inline">["append", key, val]</code>: Appends a globally unique integer
              <code class="code-inline">val</code> to the list register at <code class="code-inline">key</code>.
              Uniqueness ensures every value can be traced back to exactly one transaction.
            </li>
            <li>
              <code class="code-inline">["r", key, result]</code>: Reads the list register at
              <code class="code-inline">key</code>. On <code class="code-inline">invoke</code>, <code class="code-inline">result</code>
              is <code class="code-inline">null</code>. On <code class="code-inline">ok</code>, it is the observed
              list (e.g., <code class="code-inline">[1, 3, 5]</code>).
            </li>
          </ul>

          <h3>Example</h3>
          <div class="code-block">{"index": 0, "type": "invoke", "process": 0, "f": "txn", "value": [["append", 1, 1]], "time": 0}
{"index": 1, "type": "ok",     "process": 0, "f": "txn", "value": [["append", 1, 1]], "time": 100}
{"index": 2, "type": "invoke", "process": 1, "f": "txn", "value": [["r", 1, null]],   "time": 200}
{"index": 3, "type": "ok",     "process": 1, "f": "txn", "value": [["r", 1, [1]]],    "time": 300}</div>

          <h3>Event types</h3>
          <ul>
            <li><code class="code-inline">invoke</code>: Client sent the transaction request</li>
            <li><code class="code-inline">ok</code>: Transaction committed successfully</li>
            <li><code class="code-inline">fail</code>: Transaction was definitively aborted</li>
            <li>
              <code class="code-inline">info</code>: Outcome is indeterminate (timeout, crash).
              IsoCheck conservatively includes these in analysis because they may have committed.
            </li>
          </ul>

          <h2 id="cli-usage">CLI Usage</h2>
          <p>
            Build IsoCheck from source using CMake, then run the checker on a JSONL file:
          </p>
          <div class="code-block"><span style="color: var(--text-muted);">$</span> cmake -B build -DCMAKE_BUILD_TYPE=Release
<span style="color: var(--text-muted);">$</span> cmake --build build --config Release
<span style="color: var(--text-muted);">$</span> ./build/isocheck history.jsonl</div>
          <p>
            The checker reads the specified JSONL file and outputs a JSON result containing the
            verdict (valid/invalid), statistics, and any detected anomalies with witness cycles.
          </p>

          <h2 id="pipeline">Checking Pipeline</h2>
          <p>
            The checker processes histories through six stages:
          </p>
          <ol>
            <li>
              <strong>History parsing</strong>: The JSONL file is parsed line-by-line into
              structured <code class="code-inline">Op</code> objects. Streaming parsing avoids loading the entire
              file into an intermediate DOM.
            </li>
            <li>
              <strong>Transaction extraction</strong>: Each <code class="code-inline">invoke</code> event is paired
              with its corresponding <code class="code-inline">ok</code>, <code class="code-inline">fail</code>, or
              <code class="code-inline">info</code> event using the process ID. Aborted (<code class="code-inline">fail</code>)
              transactions are recorded separately for G1a checking but excluded from dependency ordering.
            </li>
            <li>
              <strong>Version order inference</strong>: For each key, all reads from committed
              transactions are aggregated. The longest read establishes the ground-truth version
              order. Non-cycle anomalies (garbage reads, inconsistent reads, internal inconsistency)
              are detected during this phase.
            </li>
            <li>
              <strong>Dependency graph construction</strong>: Write-write (<code class="code-inline">ww</code>) and
              write-read (<code class="code-inline">wr</code>) directed edges are materialized between
              transactions based on the inferred version orders.
            </li>
            <li>
              <strong>G1a/G1b detection</strong>: Separate passes check for aborted reads (committed
              transaction read a value from a failed transaction) and intermediate reads (transaction
              observed a non-final state of another active transaction).
            </li>
            <li>
              <strong>Cycle detection</strong>: Tarjan's SCC algorithm identifies cyclical
              subgraphs. BFS extracts the shortest cycle as a proof witness. Edge labels determine
              the classification: G0 for pure <code class="code-inline">ww</code> cycles, G1c for
              <code class="code-inline">ww</code> + <code class="code-inline">wr</code> cycles.
            </li>
          </ol>

          <h2 id="version-orders">Version Orders</h2>
          <p>
            For each key <code class="code-inline">k</code>, IsoCheck collects all reads from committed
            transactions, then selects the longest read as the authoritative version order.
          </p>
          <p>
            Every other read of key <code class="code-inline">k</code> must be a strict prefix of this
            longest read. If a read is not a prefix, that constitutes an
            <strong>inconsistent read</strong> anomaly: updates were lost, reordered, or drawn
            from uncommitted state.
          </p>
          <p>
            The version order maps each appended value to its writing transaction, enabling
            directed edge construction in the dependency graph.
          </p>

          <h2 id="dep-graph">Dependency Graph</h2>
          <p>
            The dependency graph is a directed graph where each node represents a committed
            transaction. Two types of edges are added:
          </p>
          <ul>
            <li>
              <strong>ww (write-write)</strong>: For consecutive versions
              <code class="code-inline">v_i</code> and <code class="code-inline">v_{i+1}</code> in a key's version
              order, an edge is added from <code class="code-inline">txn(v_i)</code> to
              <code class="code-inline">txn(v_{i+1})</code>. This means the transaction that wrote
              <code class="code-inline">v_{i+1}</code> must have executed after the transaction that wrote
              <code class="code-inline">v_i</code>.
            </li>
            <li>
              <strong>wr (write-read)</strong>: For each transaction that read a list ending with
              value <code class="code-inline">v_i</code>, an edge is added from
              <code class="code-inline">txn(v_i)</code> to the reading transaction. This captures the
              causal dependency: the reader observed the writer's effect.
            </li>
          </ul>
          <p>
            No self-loops are created. A transaction cannot depend on itself through different keys.
          </p>

          <h2 id="cycle-detection">Cycle Detection</h2>
          <p>
            IsoCheck uses iterative Tarjan's SCC to identify strongly connected components
            (cyclical subgraphs). The iterative implementation uses an explicit heap-allocated
            stack to prevent stack overflow on deep transaction graphs (100,000+ transactions).
          </p>
          <p>
            Within each SCC, BFS finds the shortest cycle as a minimal witness. Short witnesses
            are easier to diagnose: they typically involve 2-3 transactions and clearly show the
            conflicting operation order.
          </p>
          <p>
            Cycles are classified by their edge labels:
          </p>
          <ul>
            <li>
              <strong>G0</strong>: The cycle contains only <code class="code-inline">ww</code> edges.
              Two or more transactions overwrote each other in conflicting orders on different keys.
            </li>
            <li>
              <strong>G1c</strong>: The cycle contains at least one <code class="code-inline">wr</code>
              edge alongside <code class="code-inline">ww</code> edges. This represents circular
              information flow between transactions.
            </li>
          </ul>

          <h2 id="anomaly-g0">G0: Dirty Write (Write Cycle)</h2>
          <p>
            A directed cycle consisting entirely of write-write edges. This means two or more
            transactions overwrote each other's updates in conflicting orders across different keys.
          </p>
          <p>
            For example, transaction T1 writes key A before T2, but T2 writes key B before T1.
            The database executed these writes in an order that cannot correspond to any serial
            execution.
          </p>
          <div class="code-block"><span style="color: var(--text-muted);"># T1 writes key 1 (val 1) and key 2 (val 3)</span>
<span style="color: var(--text-muted);"># T2 writes key 1 (val 2) and key 2 (val 4)</span>
<span style="color: var(--text-muted);"># Reader sees key 1 = [1, 2] (T1 before T2)</span>
<span style="color: var(--text-muted);"># but key 2 = [4, 3] (T2 before T1) -> contradiction</span></div>

          <h2 id="anomaly-g1a">G1a: Aborted Read</h2>
          <p>
            A committed transaction reads a value that was written by a transaction that
            was definitively aborted (status <code class="code-inline">fail</code>). The aborted
            transaction's writes should have been rolled back, so no committed transaction
            should observe them.
          </p>
          <p>
            Detection: For each aborted transaction, IsoCheck records the set of values it
            attempted to write. Then, for every committed transaction's reads, it checks
            whether any observed value belongs to an aborted writer.
          </p>

          <h2 id="anomaly-g1b">G1b: Intermediate Read</h2>
          <p>
            A committed transaction observes a non-final state of another transaction.
            If transaction T1 appends values [1, 2] to key K within a single transaction,
            then any reader should see either neither value or both. Seeing only [1] without
            [2] means the reader observed T1's intermediate, mid-execution state.
          </p>
          <p>
            Detection: For each transaction that performs multiple appends to the same key,
            IsoCheck checks whether any reader observed a prefix that includes some but not
            all of that transaction's appends.
          </p>

          <h2 id="anomaly-g1c">G1c: Circular Information Flow</h2>
          <p>
            A directed cycle in the dependency graph that includes at least one write-read edge.
            This is strictly weaker than G0 (which requires only write-write edges). G1c captures
            scenarios where transaction A wrote data that B read, and B wrote data that A (or a
            chain leading back to A) depended on.
          </p>

          <h2 id="anomaly-garbage">Garbage Read</h2>
          <p>
            A read returns a value that was never appended by any transaction in the history.
            Because every appended value is globally unique and tracked, any unrecognized value
            in a read result indicates data corruption, a stale cache returning phantom data,
            or a bug in the database or test harness.
          </p>

          <h2 id="anomaly-inconsistent">Inconsistent Read</h2>
          <p>
            A read for key K is not a prefix of the longest observed read for that key.
            In a correct list-append register, appends are monotonic: values are only ever
            added, never removed or reordered. If a read contains values in a different order,
            or is missing values that appear before its endpoint, updates were lost, observed
            out of order, or drawn from uncommitted state.
          </p>

          <h2 id="anomaly-internal">Internal Inconsistency</h2>
          <p>
            A transaction appends a value to a key and then reads the same key within the
            same transaction, but the read result does not include the previously appended
            value. Any correct implementation must guarantee read-your-own-writes within a
            single transaction.
          </p>

          <h2 id="invariants">Key Invariants</h2>
          <h3>Append Value Uniqueness</h3>
          <p>
            Every value appended across all transactions and keys must be globally unique.
            This ensures an exact bijection between an observed value and its writing transaction.
            Without uniqueness, a read containing value V could have come from multiple writers,
            making dependency inference ambiguous.
          </p>

          <h3>Version Prefix Consistency</h3>
          <p>
            For any key K, the longest observed read defines the version order. Every other
            committed read of key K must be a strict prefix of this longest read. Violations
            indicate lost updates, reordering, or reads from uncommitted state.
          </p>

          <h3>Indeterminate Outcome Soundness</h3>
          <p>
            Timeouts and connection errors must be classified as <code class="code-inline">info</code>,
            not <code class="code-inline">fail</code>. A timed-out transaction may have committed on
            the server before the network partition or client disconnection. Classifying it as
            <code class="code-inline">fail</code> would lead to false positives or false negatives.
            IsoCheck conservatively includes <code class="code-inline">info</code> transactions in
            analysis.
          </p>

          <h3>No Self-Loops</h3>
          <p>
            The dependency graph does not contain self-loops. Intra-transaction consistency
            is verified separately via internal inconsistency checks, not via cycles in the
            serialization graph.
          </p>

          <h2 id="references">References</h2>
          <ul>
            <li>
              Adya, A., Liskov, B., and O'Neil, P. "Generalized Isolation Level Definitions."
              Proceedings of ICDE, 2000.
            </li>
            <li>
              Kingsbury, K. and Alvaro, P. "Elle: Inferring Isolation Anomalies from
              Experimental Observations." VLDB, 2020.
            </li>
            <li>
              Tarjan, R. E. "Depth-first search and linear graph algorithms."
              SIAM Journal on Computing, 1972.
            </li>
          </ul>
        </div>
      </div>
    </div>
  `);

  // Sidebar active state on scroll
  const sections = document.querySelectorAll('.docs-content h2[id], .docs-content h3[id]');
  const sidebarLinks = document.querySelectorAll('.docs-sidebar a[data-section]');

  function updateActiveSidebarLink() {
    let current = '';
    sections.forEach(section => {
      const rect = section.getBoundingClientRect();
      if (rect.top <= 120) {
        current = section.id;
      }
    });

    sidebarLinks.forEach(link => {
      if (link.dataset.section === current) {
        link.classList.add('active');
      } else {
        link.classList.remove('active');
      }
    });
  }

  // Smooth scroll on sidebar click
  sidebarLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const target = document.getElementById(link.dataset.section);
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });

  window.addEventListener('scroll', updateActiveSidebarLink);
  updateActiveSidebarLink();

  return () => {
    window.removeEventListener('scroll', updateActiveSidebarLink);
  };
}
