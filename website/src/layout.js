/// layout.js - Precision technical header, navigation, and footer.
/// Authoritative developer tool layout with live engine telemetry indicators.

import { icons } from './icons.js';

export function renderLayout(mainContent) {
  const app = document.getElementById('app');
  app.innerHTML = `
    <header class="nav" id="main-nav">
      <div class="nav-inner">
        <div class="nav-brand-group">
          <a href="#/" class="nav-logo" id="nav-brand-logo">
            <div class="nav-logo-glyph">
              <svg viewBox="0 0 28 28" fill="none" width="22" height="22">
                <rect x="2" y="2" width="24" height="24" rx="5" fill="#141824" stroke="#e59f3b" stroke-width="1.75"/>
                <circle cx="8" cy="8" r="2.2" fill="#e59f3b"/>
                <circle cx="20" cy="8" r="2.2" fill="#38bdf8"/>
                <circle cx="14" cy="20" r="2.2" fill="#10b981"/>
                <path d="M9.8 9.2L18.2 18.8" stroke="#ef4444" stroke-width="1.5" stroke-dasharray="2 2"/>
                <path d="M18.5 9.5L14.8 18.2" stroke="#38bdf8" stroke-width="1.25"/>
                <path d="M9.5 8L18.5 8" stroke="#e59f3b" stroke-width="1.25"/>
              </svg>
            </div>
            <div class="nav-title-group">
              <span class="nav-title">Iso<span class="text-accent">Check</span></span>
              <span class="nav-version-chip">v0.3.0</span>
            </div>
          </a>

          <div class="nav-telemetry-pill" id="nav-telemetry" title="Single-threaded C++20 Core compiled to WebAssembly">
            <span class="pulse-dot active"></span>
            <span class="telemetry-label">CORE</span>
            <span class="telemetry-val">WASM / 142k tps</span>
          </div>
        </div>

        <nav class="nav-center" aria-label="Main Navigation">
          <ul class="nav-links" id="nav-links">
            <li>
              <a href="#/" data-route="/" class="nav-link-item">
                <span class="nav-link-text">Overview</span>
              </a>
            </li>
            <li>
              <a href="#/playground" data-route="/playground" class="nav-link-item">
                <span class="nav-link-text">Playground</span>
                <span class="nav-live-chip">LIVE</span>
              </a>
            </li>
            <li>
              <a href="#/docs" data-route="/docs" class="nav-link-item">
                <span class="nav-link-text">Docs & Spec</span>
              </a>
            </li>
          </ul>
        </nav>

        <div class="nav-actions">
          <a href="#/playground" class="nav-btn-playground" id="nav-launch-btn">
            ${icons.play}
            <span>Launch Checker</span>
          </a>
          <a href="https://github.com/Afnan-0206/IsoCheck" target="_blank" rel="noopener noreferrer" class="nav-github-btn" id="github-link" title="View Source on GitHub">
            ${icons.github}
            <span class="github-label">GitHub</span>
          </a>
          <button class="nav-toggle" id="nav-toggle" aria-label="Toggle navigation menu">
            ${icons.menu}
          </button>
        </div>
      </div>
    </header>

    <main class="main" id="main-content">
      ${mainContent}
    </main>

    <footer class="footer">
      <div class="footer-inner">
        <div class="footer-grid">
          <div class="footer-col-brand">
            <div class="footer-brand-header">
              <span class="footer-logo">Iso<span class="text-accent">Check</span></span>
              <span class="footer-badge">Formal Verification</span>
            </div>
            <p class="footer-desc">
              Black-box transactional isolation checker for SQL engines and distributed stores.
              Implements Adya weak consistency theory (1999) and Kingsbury/Alvaro Elle list-append invariants (2020)
              with sub-millisecond Tarjan cycle witnesses.
            </p>
            <div class="footer-meta-tags">
              <span class="tech-chip">C++20</span>
              <span class="tech-chip">WebAssembly</span>
              <span class="tech-chip">Adya PL-1..3</span>
              <span class="tech-chip">Zero-Alloc Graph</span>
            </div>
          </div>

          <div class="footer-col">
            <div class="footer-heading">Platform</div>
            <ul class="footer-list">
              <li><a href="#/playground">WebAssembly Playground</a></li>
              <li><a href="#/docs#cli-usage">CLI & Native Daemon</a></li>
              <li><a href="#/docs#jsonl-format">JSONL Specification</a></li>
              <li><a href="#/docs#pipeline">Checking Engine Pipeline</a></li>
            </ul>
          </div>

          <div class="footer-col">
            <div class="footer-heading">Anomalies Detected</div>
            <ul class="footer-list">
              <li><a href="#/docs#anomaly-g0"><span class="badge-tag g0">G0</span> Dirty Write</a></li>
              <li><a href="#/docs#anomaly-g1a"><span class="badge-tag g1a">G1a</span> Aborted Read</a></li>
              <li><a href="#/docs#anomaly-g1b"><span class="badge-tag g1b">G1b</span> Intermediate Read</a></li>
              <li><a href="#/docs#anomaly-g1c"><span class="badge-tag g1c">G1c</span> Circular Flow</a></li>
              <li><a href="#/docs#anomaly-garbage"><span class="badge-tag data">Data</span> Inconsistent & Garbage</a></li>
            </ul>
          </div>

          <div class="footer-col">
            <div class="footer-heading">Theoretical Grounding</div>
            <ul class="footer-list">
              <li><a href="https://pmg.csail.mit.edu/papers/adya-phd.pdf" target="_blank" rel="noopener noreferrer">Adya Thesis (MIT 1999) ${icons.externalLink}</a></li>
              <li><a href="https://arxiv.org/abs/2003.10554" target="_blank" rel="noopener noreferrer">Elle Consistency Paper ${icons.externalLink}</a></li>
              <li><a href="#/privacy">Privacy & Telemetry</a></li>
              <li><a href="#/terms">Terms of Service</a></li>
            </ul>
          </div>
        </div>

        <div class="footer-bottom">
          <div class="footer-bottom-left">
            <span>&copy; 2026 IsoCheck Systems. Released under MIT License. Client-side execution; zero data transmission.</span>
          </div>
          <div class="footer-bottom-right">
            <a href="https://github.com/Afnan-0206/IsoCheck" target="_blank" rel="noopener noreferrer" class="footer-link">
              ${icons.github} Repository
            </a>
            <span class="footer-dot">•</span>
            <a href="#/docs#invariants" class="footer-link">Invariants</a>
            <span class="footer-dot">•</span>
            <a href="#/playground" class="footer-link">Playground</a>
          </div>
        </div>
      </div>
    </footer>
  `;

  // Mobile nav toggle
  const toggle = document.getElementById('nav-toggle');
  const links = document.getElementById('nav-links');
  if (toggle && links) {
    toggle.addEventListener('click', () => {
      links.classList.toggle('open');
      toggle.setAttribute('aria-expanded', links.classList.contains('open') ? 'true' : 'false');
    });
  }

  // Close mobile nav on link click
  links?.querySelectorAll('a').forEach(a => {
    a.addEventListener('click', () => {
      links.classList.remove('open');
      if (toggle) toggle.setAttribute('aria-expanded', 'false');
    });
  });

  // Global keyboard shortcuts (P -> Playground, D -> Docs, H -> Home)
  if (!window._isocheckKeybindingsRegistered) {
    window._isocheckKeybindingsRegistered = true;
    window.addEventListener('keydown', (e) => {
      // Don't trigger when inside inputs/textareas
      const tag = (e.target && e.target.tagName) ? e.target.tagName.toLowerCase() : '';
      if (tag === 'textarea' || tag === 'input') return;

      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        const searchInput = document.getElementById('docs-search-input');
        if (searchInput) {
          searchInput.focus();
        } else {
          window.location.hash = '#/docs';
        }
      }
    });
  }
}
