/// main.js - Application entry point. Registers routes and starts the router.
/// No framework. Hash-based SPA routing.

import './style.css';
import { route, startRouter } from './router.js';
import { renderHome } from './page-home.js';
import { renderPlayground } from './page-playground.js';
import { renderDocs } from './page-docs.js';
import { renderPrivacy } from './page-privacy.js';
import { renderTerms } from './page-terms.js';

route('/', renderHome);
route('/playground', renderPlayground);
route('/docs', renderDocs);
route('/privacy', renderPrivacy);
route('/terms', renderTerms);

startRouter();
