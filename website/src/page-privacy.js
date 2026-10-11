/// page-privacy.js - Privacy Policy page.

import { renderLayout } from './layout.js';

export function renderPrivacy() {
  renderLayout(`
    <div class="container">
      <div class="legal-page">
        <h1>Privacy Policy</h1>
        <p class="legal-date">Last updated: October 2026</p>

        <h2>Summary</h2>
        <p>
          IsoCheck runs entirely in your browser. Your transaction histories are processed
          locally via WebAssembly and are never sent to any server. We do not collect, store,
          or transmit your data.
        </p>

        <h2>Data Collection</h2>
        <p>
          IsoCheck does not collect personal information. There are no user accounts, no
          analytics trackers, no cookies, and no server-side processing of your input data.
        </p>
        <p>
          When you use the Playground, your JSONL history is parsed and checked entirely
          within your browser's WebAssembly runtime. The data never leaves your machine.
        </p>

        <h2>Hosting and Third-Party Services</h2>
        <p>
          This website is served as a static site. The hosting provider may collect standard
          server access logs (IP address, request URL, timestamp, user agent) as part of
          normal HTTP serving. We do not access or analyze these logs.
        </p>
        <p>
          The site loads fonts from Google Fonts. Google's privacy policy applies to font
          requests: <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer">https://policies.google.com/privacy</a>.
        </p>

        <h2>Open Source</h2>
        <p>
          IsoCheck is open source under the MIT License. You can inspect all source code on
          <a href="https://github.com/afnan-0206/isocheck" target="_blank" rel="noopener noreferrer">GitHub</a>
          to verify these claims.
        </p>

        <h2>Changes to This Policy</h2>
        <p>
          If this policy changes, the updated version will be posted here with a revised
          "Last updated" date.
        </p>

        <h2>Contact</h2>
        <p>
          For questions about this policy, open an issue on the
          <a href="https://github.com/afnan-0206/isocheck/issues" target="_blank" rel="noopener noreferrer">GitHub repository</a>.
        </p>
      </div>
    </div>
  `);
}
