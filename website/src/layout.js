/// layout.js - Shared nav + footer layout used by all pages.

import { icons } from './icons.js';

export function renderLayout(mainContent) {
  const app = document.getElementById('app');
  app.innerHTML = `
    <nav class="nav" id="main-nav">
      <div class="nav-inner">
        <a href="#/" class="nav-logo">
          <img src="/favicon.svg" alt="IsoCheck" width="24" height="24" />
          Iso<span>Check</span>
        </a>
        <ul class="nav-links" id="nav-links">
          <li><a href="#/" data-route="/">Home</a></li>
          <li><a href="#/playground" data-route="/playground">Playground</a></li>
          <li><a href="#/docs" data-route="/docs">Docs</a></li>
        </ul>
        <div style="display: flex; align-items: center; gap: 12px;">
          <a href="https://github.com/afnan-0206/isocheck" target="_blank" rel="noopener noreferrer" class="nav-github" id="github-link">
            ${icons.github}
            GitHub
          </a>
          <button class="nav-toggle" id="nav-toggle" aria-label="Toggle navigation">
            ${icons.menu}
          </button>
        </div>
      </div>
    </nav>

    <main class="main" id="main-content">
      ${mainContent}
    </main>

    <footer class="footer">
      <div class="footer-inner">
        <div class="footer-left">IsoCheck. MIT License.</div>
        <ul class="footer-links">
          <li><a href="#/privacy">Privacy Policy</a></li>
          <li><a href="#/terms">Terms</a></li>
          <li><a href="https://github.com/afnan-0206/isocheck" target="_blank" rel="noopener noreferrer">GitHub</a></li>
        </ul>
      </div>
    </footer>
  `;

  // Mobile nav toggle
  const toggle = document.getElementById('nav-toggle');
  const links = document.getElementById('nav-links');
  if (toggle && links) {
    toggle.addEventListener('click', () => {
      links.classList.toggle('open');
    });
  }

  // Close mobile nav on link click
  links?.querySelectorAll('a').forEach(a => {
    a.addEventListener('click', () => {
      links.classList.remove('open');
    });
  });
}
