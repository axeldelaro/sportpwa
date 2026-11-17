// Client léger pilotant le Web Worker du LLM Neural (Qwen2.5-0.5B-Instruct q4 WebGPU/WASM)

let worker = null;
let modelState = {
  ready: false,
  loading: false,
  progress: 0,
  device: null,
  error: null,
};

const listeners = new Set();
const activeRequests = new Map();

function notifyListeners() {
  listeners.forEach((cb) => cb({ ...modelState }));
}

function getOrCreateWorker() {
  if (worker) return worker;

  worker = new Worker(new URL('../workers/llmWorker.js', import.meta.url), {
    type: 'module',
  });

  worker.addEventListener('message', (e) => {
    const data = e.data || {};

    if (data.type === 'progress') {
      modelState = {
        ...modelState,
        loading: true,
        progress: data.progress,
        device: data.device,
        error: null,
      };
      notifyListeners();
      return;
    }

    if (data.type === 'ready') {
      modelState = {
        ready: true,
        loading: false,
        progress: 100,
        device: data.device,
        error: null,
      };
      notifyListeners();
      return;
    }

    if (data.type === 'stream' && data.requestId) {
      const req = activeRequests.get(data.requestId);
      if (req?.onStream) req.onStream(data.text);
      return;
    }

    if (data.type === 'done' && data.requestId) {
      const req = activeRequests.get(data.requestId);
      if (req) {
        activeRequests.delete(data.requestId);
        req.resolve(data.text);
      }
      return;
    }

    if (data.type === 'error') {
      modelState = {
        ...modelState,
        loading: false,
        error: data.error,
      };
      notifyListeners();
      if (data.requestId && activeRequests.has(data.requestId)) {
        const req = activeRequests.get(data.requestId);
        activeRequests.delete(data.requestId);
        req.reject(new Error(data.error));
      }
    }
  });

  return worker;
}

export function subscribeNeuralState(callback) {
  listeners.add(callback);
  callback({ ...modelState });
  return () => listeners.delete(callback);
}

export function preloadNeuralLLM() {
  const w = getOrCreateWorker();
  if (!modelState.ready && !modelState.loading) {
    modelState = { ...modelState, loading: true, progress: 1, error: null };
    notifyListeners();
    w.postMessage({ action: 'preload' });
  }
}

export function generateWithNeuralLLM(messages, onStream) {
  const w = getOrCreateWorker();
  const requestId = `llm_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

  return new Promise((resolve, reject) => {
    activeRequests.set(requestId, { resolve, reject, onStream });
    w.postMessage({
      action: 'generate',
      requestId,
      messages,
      maxNewTokens: 280,
    });
  });
}
