import { pipeline, TextStreamer, env } from '@huggingface/transformers';

env.allowLocalModels = false;
env.useBrowserCache = true;

const MODEL_ID = 'onnx-community/Qwen2.5-0.5B-Instruct';

let generatorInstance = null;
let loadingPromise = null;

async function detectBestDevice() {
  try {
    if (typeof navigator !== 'undefined' && navigator.gpu) {
      const adapter = await navigator.gpu.requestAdapter();
      if (adapter) return 'webgpu';
    }
  } catch {
    // Fallback wasm
  }
  return 'wasm';
}

async function ensureModelLoaded() {
  if (generatorInstance) return generatorInstance;
  if (loadingPromise) return loadingPromise;

  loadingPromise = (async () => {
    const preferredDevice = await detectBestDevice();

    const progressCallback = (info) => {
      if (info.status === 'progress') {
        self.postMessage({
          type: 'progress',
          file: info.file,
          progress: Math.round(info.progress || 0),
          device: preferredDevice,
        });
      }
    };

    try {
      const gen = await pipeline('text-generation', MODEL_ID, {
        device: preferredDevice,
        dtype: 'q4',
        progress_callback: progressCallback,
      });
      generatorInstance = gen;
      self.postMessage({ type: 'ready', device: preferredDevice, modelId: MODEL_ID });
      return gen;
    } catch (err) {
      if (preferredDevice === 'webgpu') {
        // Repli transparent sur WebAssembly si le pilote WebGPU mobile refuse le shader
        const genWasm = await pipeline('text-generation', MODEL_ID, {
          device: 'wasm',
          dtype: 'q4',
          progress_callback: progressCallback,
        });
        generatorInstance = genWasm;
        self.postMessage({ type: 'ready', device: 'wasm', modelId: MODEL_ID });
        return genWasm;
      }
      loadingPromise = null;
      throw err;
    }
  })();

  return loadingPromise;
}

self.addEventListener('message', async (event) => {
  const { action, requestId, messages, maxNewTokens = 260 } = event.data || {};

  if (action === 'preload') {
    try {
      await ensureModelLoaded();
    } catch (err) {
      self.postMessage({
        type: 'error',
        requestId,
        error: err.message || 'Échec du chargement du modèle LLM local.',
      });
    }
    return;
  }

  if (action === 'generate') {
    try {
      const generator = await ensureModelLoaded();
      let fullText = '';

      const streamer = new TextStreamer(generator.tokenizer, {
        skip_prompt: true,
        skip_special_tokens: true,
        callback_function: (tokenChunk) => {
          fullText += tokenChunk;
          self.postMessage({
            type: 'stream',
            requestId,
            chunk: tokenChunk,
            text: fullText,
          });
        },
      });

      await generator(messages, {
        max_new_tokens: maxNewTokens,
        temperature: 0.45,
        top_p: 0.9,
        do_sample: true,
        repetition_penalty: 1.12,
        streamer,
      });

      self.postMessage({
        type: 'done',
        requestId,
        text: fullText.trim(),
      });
    } catch (err) {
      self.postMessage({
        type: 'error',
        requestId,
        error: err.message || 'Erreur lors de la génération locale.',
      });
    }
  }
});
