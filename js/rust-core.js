/**
 * Beerdex Rust Multiplatform Core Integration Bridge
 * Connects the high-performance Rust core (via Android JNI Native Library or WebAssembly)
 * with the application frontend for zero-latency calculations.
 */

let wasmInstance = null;
let isReady = false;
let _initPromise = null;

export function isRustEnabledPreference() {
    try {
        const val = localStorage.getItem('beerdex_pref_feat_rust_enabled');
        if (val === null) return true;
        return JSON.parse(val) !== false;
    } catch {
        return true;
    }
}

export function isAndroidNative() {
    return typeof window !== 'undefined' && 
           window.BeerdexAndroidNative && 
           typeof window.BeerdexAndroidNative.isAvailable === 'function' &&
           window.BeerdexAndroidNative.isAvailable();
}

export async function initRustCore() {
    if (!isRustEnabledPreference()) {
        const indicator = document.getElementById('rust-wasm-indicator');
        if (indicator) indicator.style.display = 'none';
        return null;
    }

    // 1. Android Native JNI Engine (Highest Priority - Native ARM64/x86 Machine Code)
    if (isAndroidNative()) {
        isReady = true;
        console.log(
            '%c🦀 [Beerdex Rust] Android Native JNI Engine Active! Compiled ARM64/x86 Rust shared library (.so) running.',
            'background: #28a745; color: #fff; font-weight: bold; padding: 4px 8px; border-radius: 4px;'
        );

        window.dispatchEvent(new CustomEvent('beerdex:rust-ready', {
            detail: { version: BeerdexRust.version(), mode: 'android-jni' }
        }));

        updateUiBadge('Moteur haute performance natif ARM64 Rust (JNI) actif');
        return window.BeerdexAndroidNative;
    }

    // 2. WebAssembly Engine (Desktop / Web / PWA / Fallback)
    if (isReady && wasmInstance) {
        updateUiBadge('Moteur haute performance WebAssembly actif (v5.1.0)');
        return wasmInstance;
    }

    if (_initPromise) return _initPromise;

    _initPromise = (async () => {
        try {
            const wasmModule = await import('../wasm/beerdex_app.js');
            const wasmUrl = new URL('../wasm/beerdex_app_bg.wasm', import.meta.url);
            
            await wasmModule.default({ module_or_path: wasmUrl });
            wasmInstance = wasmModule;
            isReady = true;

            console.log(
                '%c🦀 [Beerdex Rust] WebAssembly Engine v5.1.0 loaded successfully! Native acceleration active.',
                'background: #ffc107; color: #111; font-weight: bold; padding: 4px 8px; border-radius: 4px;'
            );

            window.dispatchEvent(new CustomEvent('beerdex:rust-ready', {
                detail: { version: BeerdexRust.version(), mode: 'wasm' }
            }));

            updateUiBadge('Moteur haute performance WebAssembly actif (v5.1.0)');
            return wasmInstance;
        } catch (err) {
            console.warn('[Beerdex Rust] WASM engine initialization notice (using JS fallback):', err.message);
            isReady = false;
            return null;
        } finally {
            _initPromise = null;
        }
    })();

    return _initPromise;
}

function updateUiBadge(title) {
    if (!isRustEnabledPreference()) return;
    const badge = document.getElementById('rust-wasm-indicator');
    if (badge) {
        badge.style.display = 'inline-block';
        badge.title = title || 'Moteur haute performance WebAssembly actif (v5.1.0)';
    }
    const settingsStatus = document.getElementById('settings-rust-status');
    if (settingsStatus) {
        settingsStatus.textContent = `Moteur de calcul natif (${BeerdexRust.version()}) : ⚡ Actif (Accélération matérielle)`;
    }
}

export const BeerdexRust = {
    isAvailable() {
        if (!isRustEnabledPreference()) return false;
        return isAndroidNative() || (isReady && wasmInstance !== null);
    },

    version() {
        if (isAndroidNative()) {
            return window.BeerdexAndroidNative.version();
        }
        if (this.isAvailable() && typeof wasmInstance.beerdex_version === 'function') {
            return wasmInstance.beerdex_version();
        }
        return '5.1.0 (JS Fallback)';
    },

    validateEan13(barcode) {
        if (isAndroidNative()) {
            try {
                return window.BeerdexAndroidNative.validateEan13(barcode);
            } catch (_) {}
        }
        if (this.isAvailable() && typeof wasmInstance.beerdex_validate_ean13 === 'function') {
            try {
                return wasmInstance.beerdex_validate_ean13(barcode);
            } catch (_) {}
        }
        // Fallback: standard EAN-13 check
        if (!barcode || barcode.length !== 13 || !/^\d+$/.test(barcode)) return false;
        let sum = 0;
        for (let i = 0; i < 12; i++) {
            sum += parseInt(barcode[i], 10) * (i % 2 === 0 ? 1 : 3);
        }
        const check = (10 - (sum % 10)) % 10;
        return check === parseInt(barcode[12], 10);
    },

    parseScan(payload) {
        if (this.isAvailable() && typeof wasmInstance.beerdex_parse_scan === 'function') {
            try {
                const res = wasmInstance.beerdex_parse_scan(payload);
                return JSON.parse(res);
            } catch (_) {}
        }
        return { raw: payload, format: 'unknown' };
    },

    calculateBac(weight, isFemale, age, history, nowMs) {
        const historyJson = JSON.stringify(history || []);
        const now = nowMs || Date.now();

        if (isAndroidNative()) {
            try {
                return window.BeerdexAndroidNative.calculateBac(weight, !!isFemale, age || 25, historyJson, now);
            } catch (_) {}
        }
        if (this.isAvailable() && typeof wasmInstance.beerdex_calculate_bac === 'function') {
            try {
                return wasmInstance.beerdex_calculate_bac(weight, isFemale, age || 25, historyJson, now);
            } catch (_) {}
        }
        return null;
    },

    calculateRarity(country, style, abv, distribution, barrelAged, ingredients) {
        if (isAndroidNative()) {
            try {
                return window.BeerdexAndroidNative.calculateRarity(
                    country || '',
                    style || '',
                    abv || 5.0,
                    distribution || '',
                    !!barrelAged,
                    ingredients || ''
                );
            } catch (_) {}
        }
        if (this.isAvailable() && typeof wasmInstance.beerdex_calculate_rarity === 'function') {
            try {
                return wasmInstance.beerdex_calculate_rarity(
                    country || '',
                    style || '',
                    abv || 5.0,
                    distribution || '',
                    !!barrelAged,
                    ingredients || ''
                );
            } catch (_) {}
        }
        return null;
    },

    compressLz(text) {
        if (isAndroidNative()) {
            try {
                return window.BeerdexAndroidNative.compressLz(text);
            } catch (_) {}
        }
        if (this.isAvailable() && typeof wasmInstance.beerdex_compress_lz === 'function') {
            try {
                return wasmInstance.beerdex_compress_lz(text);
            } catch (_) {}
        }
        if (window.LZString) {
            return window.LZString.compressToEncodedURIComponent(text);
        }
        return encodeURIComponent(text);
    },

    decompressLz(text) {
        if (isAndroidNative()) {
            try {
                return window.BeerdexAndroidNative.decompressLz(text);
            } catch (_) {}
        }
        if (this.isAvailable() && typeof wasmInstance.beerdex_decompress_lz === 'function') {
            try {
                const res = wasmInstance.beerdex_decompress_lz(text);
                if (res !== undefined && res !== null) return res;
            } catch (_) {}
        }
        if (window.LZString) {
            return window.LZString.decompressFromEncodedURIComponent(text);
        }
        return decodeURIComponent(text);
    },

    generateQrSvg(text, sizePx = 256) {
        if (isAndroidNative()) {
            try {
                const svg = window.BeerdexAndroidNative.generateQrSvg(text, sizePx);
                if (svg && svg.length > 0) return svg;
            } catch (_) {}
        }
        if (this.isAvailable() && typeof wasmInstance.beerdex_generate_qr_svg === 'function') {
            try {
                return wasmInstance.beerdex_generate_qr_svg(text, sizePx);
            } catch (_) {}
        }
        return null;
    },

    similarity(a, b) {
        if (this.isAvailable() && typeof wasmInstance.beerdex_similarity === 'function') {
            try {
                return wasmInstance.beerdex_similarity(a, b);
            } catch (_) {}
        }
        return null;
    },

    frenchTypography(text) {
        if (this.isAvailable() && typeof wasmInstance.beerdex_french_typography === 'function') {
            try {
                return wasmInstance.beerdex_french_typography(text);
            } catch (_) {}
        }
        return text;
    },

    frenchElision(text) {
        if (this.isAvailable() && typeof wasmInstance.beerdex_french_elision === 'function') {
            try {
                return wasmInstance.beerdex_french_elision(text);
            } catch (_) {}
        }
        return text;
    },

    triggerHaptic(pattern) {
        if (this.isAvailable() && typeof wasmInstance.beerdex_trigger_haptic === 'function') {
            try {
                wasmInstance.beerdex_trigger_haptic(pattern);
                return;
            } catch (_) {}
        }
        // Browser Vibration Fallback
        if (navigator.vibrate) {
            navigator.vibrate(15);
        }
    }
};

// Auto-initialize on startup
if (typeof window !== 'undefined') {
    window.BeerdexRust = BeerdexRust;
    window.initRustCore = initRustCore;
    if (document.readyState === 'loading') {
        window.addEventListener('DOMContentLoaded', () => {
            initRustCore().catch(() => {});
        });
    } else {
        initRustCore().catch(() => {});
    }
}
