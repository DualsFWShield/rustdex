/**
 * vendor-loader.js — On-demand loading for the heavy, rarely used vendor libs.
 *
 * The QR scanner (~375 KB) and PeerJS (~95 KB) used to be parsed on every boot
 * even though they are only needed when the user opens a scanner or a P2P
 * session. Loading them on demand keeps the initial payload small while the
 * public API stays exactly the same (the libs still expose their globals).
 */

const _pending = new Map();

function loadScript(src) {
    if (_pending.has(src)) return _pending.get(src);

    const promise = new Promise((resolve, reject) => {
        // Already present (e.g. preloaded by a previous call or a cached HTML).
        if (document.querySelector(`script[data-vendor-src="${src}"]`)) {
            resolve();
            return;
        }
        const script = document.createElement('script');
        script.src = src;
        script.async = true;
        script.dataset.vendorSrc = src;
        script.onload = () => resolve();
        script.onerror = () => {
            _pending.delete(src);
            script.remove();
            reject(new Error(`Failed to load vendor script: ${src}`));
        };
        document.head.appendChild(script);
    });

    _pending.set(src, promise);
    return promise;
}

let _qrScannerPromise = null;

/** Loads html5-qrcode and resolves once `window.Html5Qrcode` exists. */
export function loadQrScanner() {
    if (window.Html5Qrcode) return Promise.resolve();
    if (!_qrScannerPromise) {
        _qrScannerPromise = loadScript('js/vendor/html5-qrcode.min.js').catch(err => {
            _qrScannerPromise = null;
            throw err;
        });
    }
    return _qrScannerPromise;
}

let _p2pPromise = null;

/** Loads PeerJS then the P2PEngine wrapper, in order. */
export function loadP2P() {
    if (window.P2PEngine) return Promise.resolve();
    if (!_p2pPromise) {
        _p2pPromise = loadScript('js/vendor/peerjs.min.js')
            .then(() => loadScript('js/vendor/p2p.js'))
            .catch(err => {
                _p2pPromise = null;
                throw err;
            });
    }
    return _p2pPromise;
}
