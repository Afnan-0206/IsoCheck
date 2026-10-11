/// page-home.js - Home page for IsoCheck.
/// Direct, technical copy. No vague hero text, no emoji, no em dashes.

import { renderLayout } from './layout.js';
import { icons } from './icons.js';

export function renderHome() {
  renderLayout(`
    <div class="container">
      <section class="hero">
        <h1>Black-box isolation checking<br/>for <span class="hero-accent">transactional databases</span></h1>
        <p>
          IsoCheck infers dependency graphs from client-observed transaction histories
          and detects isolation anomalies via cycle detection. It treats the database as a
          black box, requiring no access to internal logs or lock tables.
        </p>
        <div class="hero-actions">
          <a href="#/playground" class="btn btn-primary" id="try-playground-btn">
            ${icons.play}
            Try the Playground
          </a>
          <a href="#/docs" class="btn btn-secondary" id="read-docs-btn">
            ${icons.book}
            Read the Docs
          </a>
        </div>
      </section>

      <section class="features">
        <div class="features-grid">
          <div class="feature-card" id="feature-blackbox">
            <div class="feature-icon">${icons.eye}</div>
            <h3>Black-Box Analysis</h3>
            <p>
              No internal database access required. IsoCheck works entirely from
              client-observed transaction histories recorded as JSONL. It reconstructs
              per-key version orders from list-append read results.
            </p>
          </div>

          <div class="feature-card" id="feature-anomalies">
            <div class="feature-icon">${icons.search}</div>
            <h3>Seven Anomaly Classes</h3>
            <p>
              Detects G0 (dirty write), G1a (aborted read), G1b (intermediate read),
              G1c (circular information flow), garbage reads, inconsistent reads, and
              internal inconsistency violations.
            </p>
          </div>

          <div class="feature-card" id="feature-graphs">
            <div class="feature-icon">${icons.graph}</div>
            <h3>Dependency Graph + Cycle Witnesses</h3>
            <p>
              Builds directed dependency graphs with write-write and write-read edges.
              Uses iterative Tarjan SCC and BFS to extract the shortest cycle witness
              proving each violation.
            </p>
          </div>

          <div class="feature-card" id="feature-performance">
            <div class="feature-icon">${icons.cpu}</div>
            <h3>142k+ Transactions/Second</h3>
            <p>
              The C++20 core processes over 142,000 transactions per second on a single
              thread. Sub-millisecond cycle detection on histories with 10,000+ operations.
              Under 45 MB memory at 100k events.
            </p>
          </div>

          <div class="feature-card" id="feature-wasm">
            <div class="feature-icon">${icons.terminal}</div>
            <h3>Runs in Your Browser</h3>
            <p>
              The same C++ engine compiled to WebAssembly. Check histories directly in the
              browser playground with zero server roundtrips. Your data never leaves your machine.
            </p>
          </div>

          <div class="feature-card" id="feature-theory">
            <div class="feature-icon">${icons.shield}</div>
            <h3>Formally Grounded</h3>
            <p>
              Built on Adya's weak consistency theory (1999) and Kingsbury/Alvaro's
              Elle framework (2020). Differentially tested against Jepsen's Elle engine
              to verify theoretical conformance.
            </p>
          </div>
        </div>
      </section>

      <section class="anomaly-section">
        <h2>Anomaly Reference</h2>
        <div class="table-wrap">
          <table id="anomaly-table">
            <thead>
              <tr>
                <th>Anomaly</th>
                <th>Class</th>
                <th>Detection Method</th>
                <th>What It Means</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><span class="anomaly-badge badge-g0">G0</span></td>
                <td>Dirty Write</td>
                <td>Directed cycle of ww-only edges</td>
                <td>Transactions overwrote each other's updates in conflicting orders</td>
              </tr>
              <tr>
                <td><span class="anomaly-badge badge-g1a">G1a</span></td>
                <td>Aborted Read</td>
                <td>Committed txn read a value from a failed txn</td>
                <td>A committed transaction observed data that was rolled back</td>
              </tr>
              <tr>
                <td><span class="anomaly-badge badge-g1b">G1b</span></td>
                <td>Intermediate Read</td>
                <td>Read observed a non-final write of an active txn</td>
                <td>A transaction saw a partial, mid-transaction state</td>
              </tr>
              <tr>
                <td><span class="anomaly-badge badge-g1c">G1c</span></td>
                <td>Circular Info Flow</td>
                <td>Directed cycle of ww + wr edges</td>
                <td>Cyclic dependency between writes and reads across transactions</td>
              </tr>
              <tr>
                <td><span class="anomaly-badge badge-data">Garbage Read</span></td>
                <td>Data Corruption</td>
                <td>Read contains a value never written</td>
                <td>A read returned data that no transaction ever appended</td>
              </tr>
              <tr>
                <td><span class="anomaly-badge badge-data">Inconsistent Read</span></td>
                <td>Version Inconsistency</td>
                <td>Read is not a prefix of the longest read</td>
                <td>Updates were lost, reordered, or drawn from uncommitted state</td>
              </tr>
              <tr>
                <td><span class="anomaly-badge badge-data">Internal</span></td>
                <td>Read-Your-Writes</td>
                <td>Intra-txn read misses prior intra-txn write</td>
                <td>A transaction could not see its own preceding write</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section class="features" style="padding-bottom: var(--space-3xl);">
        <h2 style="margin-bottom: var(--space-lg);">How It Works</h2>
        <div class="card">
          <div class="code-block"><span style="color: var(--text-muted);">1.</span> Clients run transactions composed of <span style="color: var(--accent);">append</span> and <span style="color: var(--accent);">read</span> operations on list registers
<span style="color: var(--text-muted);">2.</span> Every appended integer is globally unique, enabling exact traceability
<span style="color: var(--text-muted);">3.</span> Reads return the ordered list of values observed so far on each key
<span style="color: var(--text-muted);">4.</span> IsoCheck infers per-key version orders from the longest observed read
<span style="color: var(--text-muted);">5.</span> From version orders, it builds a directed dependency graph (ww + wr edges)
<span style="color: var(--text-muted);">6.</span> Tarjan SCC + BFS extracts the shortest cycle as a proof witness</div>
        </div>
      </section>
    </div>
  `);
}
