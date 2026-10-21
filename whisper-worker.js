// Transcrição no próprio telemóvel (Whisper). O áudio nunca sai do aparelho.
import { pipeline, env, WhisperTextStreamer } from './lib/transformers.min.js';
env.allowLocalModels = false;
env.useBrowserCache = true;
env.backends.onnx.wasm.wasmPaths = new URL('./lib/', self.location).href;
env.backends.onnx.wasm.numThreads = 1;
let asr = null, cur = null, dev = null;
async function hasGPU() { // placa gráfica do telemóvel: muito mais rápido
  try { if (self.navigator && navigator.gpu) { const ad = await navigator.gpu.requestAdapter(); return !!ad; } } catch (_) {}
  return false;
}
async function load(model) {
  if (asr && cur === model) return asr;
  asr = null;
  const progress_callback = p => postMessage({ type: 'dl', p });
  if (await hasGPU()) {
    try {
      asr = await pipeline('automatic-speech-recognition', model, {
        device: 'webgpu', dtype: { encoder_model: 'fp32', decoder_model_merged: 'q4' }, progress_callback
      });
      dev = 'webgpu';
    } catch (_) { asr = null; }
  }
  if (!asr) {
    asr = await pipeline('automatic-speech-recognition', model, { device: 'wasm', dtype: 'q8', progress_callback });
    dev = 'wasm';
  }
  cur = model;
  return asr;
}
self.onmessage = async e => {
  if (e.data && e.data.cmd === 'load') { // preparar na instalação, sem áudio
    try { await load(e.data.model); postMessage({ type: 'ready', model: e.data.model, dev }); }
    catch (err) { postMessage({ type: 'err', msg: String((err && err.message) || err) }); }
    return;
  }
  const { id, audio, model, lang } = e.data;
  try {
    const a = await load(model);
    postMessage({ type: 'ready', id, model });
    const total = Math.max(1, Math.ceil(audio.length / 16000 / 20));
    let done = 0, streamer = null;
    try {
      streamer = new WhisperTextStreamer(a.tokenizer, {
        skip_prompt: true,
        callback_function: () => {},
        on_chunk_end: () => { done++; postMessage({ type: 'prog', id, p: Math.min(0.97, done / total) }); }
      });
    } catch (_) { streamer = null; }
    const opts = { task: 'transcribe', chunk_length_s: 30, stride_length_s: 5 };
    if (lang) opts.language = lang;
    if (streamer) opts.streamer = streamer;
    const out = await a(audio, opts);
    postMessage({ type: 'done', id, text: ((out && out.text) || '').trim() });
  } catch (err) {
    postMessage({ type: 'err', id, msg: String((err && err.message) || err) });
  }
};
