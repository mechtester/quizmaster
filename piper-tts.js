// Piper TTS (neural, WASM) engine — replaces the old browser speechSynthesis
// voice with real Piper voice models (https://github.com/rhasspy/piper) run
// fully client-side via ONNX Runtime Web. Loaded as a native ES module so it
// can use static/dynamic imports straight from a CDN with no build step;
// everything it exposes is hung off `window.piperTTS` so the classic
// (non-module) script.js can call into it synchronously-looking via async
// functions.
import * as vits from "https://cdn.jsdelivr.net/npm/@diffusionstudio/vits-web@1.0.3/dist/vits-web.js";

// English voices available in this library's bundled catalog
// (https://huggingface.co/diffusionstudio/piper-voices), with a friendly
// display name and the flag for their locale. "quality" is Piper's own
// model tier, which we translate into a letter grade for the UI badge.
const VOICE_CATALOG = [
    { id: 'en_US-amy-medium', flag: '🇺🇸', name: 'Amy', quality: 'medium' },
    { id: 'en_US-hfc_female-medium', flag: '🇺🇸', name: 'HFC Female', quality: 'medium' },
    { id: 'en_US-hfc_male-medium', flag: '🇺🇸', name: 'HFC Male', quality: 'medium' },
    { id: 'en_US-kristin-medium', flag: '🇺🇸', name: 'Kristin', quality: 'medium' },
    { id: 'en_US-kathleen-low', flag: '🇺🇸', name: 'Kathleen', quality: 'low' },
    { id: 'en_US-danny-low', flag: '🇺🇸', name: 'Danny', quality: 'low' },
    { id: 'en_US-joe-medium', flag: '🇺🇸', name: 'Joe', quality: 'medium' },
    { id: 'en_US-kusal-medium', flag: '🇺🇸', name: 'Kusal', quality: 'medium' },
    { id: 'en_US-lessac-high', flag: '🇺🇸', name: 'Lessac', quality: 'high' },
    { id: 'en_US-ljspeech-high', flag: '🇺🇸', name: 'LJSpeech', quality: 'high' },
    { id: 'en_US-ryan-high', flag: '🇺🇸', name: 'Ryan', quality: 'high' },
    { id: 'en_GB-alan-medium', flag: '🇬🇧', name: 'Alan', quality: 'medium' },
    { id: 'en_GB-alba-medium', flag: '🇬🇧', name: 'Alba', quality: 'medium' },
    { id: 'en_GB-cori-high', flag: '🇬🇧', name: 'Cori', quality: 'high' },
    { id: 'en_GB-jenny_dioco-medium', flag: '🇬🇧', name: 'Jenny Dioco', quality: 'medium' },
    { id: 'en_GB-northern_english_male-medium', flag: '🇬🇧', name: 'Northern English Male', quality: 'medium' },
    { id: 'en_GB-southern_english_female-low', flag: '🇬🇧', name: 'Southern English Female', quality: 'low' },
];

const QUALITY_GRADE = { x_low: 'C', low: 'B-', medium: 'B+', high: 'A' };
const QUALITY_LABEL = { x_low: 'X-Low', low: 'Low', medium: 'Medium', high: 'High' };
// Approximate on-disk size of the .onnx model for each quality tier, used
// only until the real Content-Length is known from a download.
const QUALITY_SIZE_MB = { x_low: 20, low: 32, medium: 63, high: 115 };

function getVoiceMeta(voiceId) {
    return VOICE_CATALOG.find(v => v.id === voiceId) || null;
}

async function listDownloaded() {
    try {
        return await vits.stored();
    } catch (err) {
        console.error('Piper: failed to read stored voices', err);
        return [];
    }
}

async function isDownloaded(voiceId) {
    const stored = await listDownloaded();
    return stored.includes(voiceId);
}

async function downloadVoice(voiceId, onProgress) {
    await vits.download(voiceId, onProgress);
}

async function removeVoice(voiceId) {
    await vits.remove(voiceId);
}

// Synthesizes `text` with `voiceId`, downloading the model first if it
// isn't already cached in OPFS. Returns a WAV Blob.
async function synthesize(text, voiceId, onProgress) {
    return vits.predict({ text, voiceId }, onProgress);
}

window.piperTTS = {
    VOICE_CATALOG,
    QUALITY_GRADE,
    QUALITY_LABEL,
    QUALITY_SIZE_MB,
    getVoiceMeta,
    listDownloaded,
    isDownloaded,
    downloadVoice,
    removeVoice,
    synthesize,
};

// Lets script.js know the module graph (this file + vits-web) finished
// loading, since it's a deferred `type="module"` script and may execute
// after the classic script.js has already run its top-level code.
window.dispatchEvent(new CustomEvent('piper-tts-ready'));
