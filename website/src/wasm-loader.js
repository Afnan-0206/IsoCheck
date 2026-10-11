/// wasm-loader.js - Loads and manages the IsoCheck WebAssembly module.

let wasmModule = null;
let loadingPromise = null;
let statusCallback = null;

export function onStatusChange(cb) {
  statusCallback = cb;
}

function setStatus(state, message) {
  if (statusCallback) statusCallback(state, message);
}

export async function loadWasm() {
  if (wasmModule) return wasmModule;
  if (loadingPromise) return loadingPromise;

  loadingPromise = (async () => {
    setStatus('loading', 'Loading WebAssembly module...');
    try {
      // Import the Emscripten-generated loader
      const script = document.createElement('script');
      script.src = '/wasm/isocheck.js';

      await new Promise((resolve, reject) => {
        script.onload = resolve;
        script.onerror = () => reject(new Error('Failed to load WASM loader script'));
        document.head.appendChild(script);
      });

      // createIsoCheck is the factory function exposed by Emscripten MODULARIZE
      if (typeof window.createIsoCheck !== 'function') {
        throw new Error('WASM module factory not found');
      }

      wasmModule = await window.createIsoCheck({
        locateFile: (path) => `/wasm/${path}`,
      });

      setStatus('ready', 'Checker loaded and ready');
      return wasmModule;
    } catch (err) {
      setStatus('error', `Failed to load: ${err.message}`);
      loadingPromise = null;
      throw err;
    }
  })();

  return loadingPromise;
}

export function checkHistory(jsonlInput) {
  if (!wasmModule) {
    throw new Error('WASM module not loaded');
  }

  const resultJson = wasmModule.check_history(jsonlInput);
  return JSON.parse(resultJson);
}

export function isLoaded() {
  return wasmModule !== null;
}
