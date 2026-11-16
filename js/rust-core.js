/**
 * Beerdex Rust WebAssembly Integration Bridge
 * Connects the high-performance Rust core (compiled to WebAssembly)
 * with the browser frontend for ultra-fast calculations.
 */

let wasmInstance = null;
let isReady = false;

export async function initRustCore() {
    if (isReady) return wasmInstance;

    try {
        const wasmModule = await import('../wasm/beerdex_app.js');
        const wasmUrl = new URL('../wasm/beerdex_app_bg.wasm', import.meta.url);
        
        await wasmModule.default(wasmUrl);
        wasmInstance = wasmModule;
        isReady = true;

        console.log(
            '%c🦀 [Beerdex Rust] WebAssembly Engine v5.1.0 loaded successfully! Native acceleration active.',
            'background: #ffc107; color: #111; font-weight: bold; padding: 4px 8px; border-radius: 4px;'
        );

        window.dispatchEvent(new CustomEvent('beerdex:rust-ready', {
            detail: { version: BeerdexRust.version() }
        }));

        // Update UI badge if present
        const badge = document.getElementById('rust-wasm-indicator');
        if (badge) {
            badge.style.display = 'inline-flex';
            badge.textContent = '🦀 Rust WASM';
            badge.title = 'Moteur haute performance WebAssembly actif (v5.1.0)';
        }

        return wasmInstance;
    } catch (err) {
        console.warn('[Beerdex Rust] WASM engine initialization notice (using JS fallback):', err.message);
        isReady = false;
        return null;
    }
}

export const BeerdexRust = {
    isAvailable() {
        return isReady && wasmInstance !== null;
    },

    version() {
        if (this.isAvailable() && typeof wasmInstance.beerdex_version === 'function') {
            return wasmInstance.beerdex_version();
        }
        return '5.1.0 (JS Fallback)';
    },

    validateEan13(barcode) {
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
        if (this.isAvailable() && typeof wasmInstance.beerdex_calculate_bac === 'function') {
            try {
                const historyJson = JSON.stringify(history || []);
                return wasmInstance.beerdex_calculate_bac(weight, isFemale, age || 25, historyJson, nowMs || Date.now());
            } catch (_) {}
        }
        return null;
    },

    calculateRarity(country, style, abv, distribution, barrelAged, ingredients) {
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

// Auto-initialize on import
initRustCore().catch(() => {});

// Global export for developer console & tests
if (typeof window !== 'undefined') {
    window.BeerdexRust = BeerdexRust;
}
