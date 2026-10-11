/// router.js - Simple hash-based SPA router for IsoCheck website.
/// No dependencies. Routes are defined as hash fragments (#/playground, #/docs, etc.)

const routes = {};
let currentCleanup = null;

export function route(path, handler) {
  routes[path] = handler;
}

export function navigate(path) {
  window.location.hash = path;
}

export function getCurrentPath() {
  return window.location.hash.slice(1) || '/';
}

function resolveRoute() {
  const path = getCurrentPath();

  if (currentCleanup && typeof currentCleanup === 'function') {
    currentCleanup();
    currentCleanup = null;
  }

  const handler = routes[path] || routes['/'];
  if (handler) {
    const result = handler();
    if (typeof result === 'function') {
      currentCleanup = result;
    }
  }

  // Update nav active state
  document.querySelectorAll('.nav-links a[data-route]').forEach(link => {
    const linkPath = link.getAttribute('data-route');
    if (linkPath === path) {
      link.classList.add('active');
    } else {
      link.classList.remove('active');
    }
  });

  // Scroll to top on navigation
  window.scrollTo(0, 0);
}

export function startRouter() {
  window.addEventListener('hashchange', resolveRoute);
  resolveRoute();
}
