/**
 * liquid-glass.js — SVG displacement + chromatic aberration Liquid Glass engine
 * Adapted from nikdelvin/liquid-glass (MIT License, Copyright (c) 2025 Nikita Stadnik)
 * https://github.com/nikdelvin/liquid-glass
 */

const FILTER_CACHE_MAX = 64;
const MAX_MAP_DIM = 240;
const LARGE_SURFACE_AREA = 140000;
const _mapCache = new Map();
const _filterCache = new Map();

let _mapCanvas = null;
let _mapCtx = null;
let _innerCanvas = null;
let _innerCtx = null;

let _active = false;
let _quality = 'full'; // 'full' (SVG refraction on modals + bars) | 'light' (fast GPU blur on modals)
let _rafId = 0;
let _resizeObserver = null;
let _mutationObserver = null;
let _windowResizeBound = false;
const _observedEls = new Set();
const _styledEls = new Set();

const GLASS_TARGETS_FULL = [
    {
        selector: '.bottom-nav',
        depth: 12,
        strength: 70,
        chromaticAberration: 5,
        blur: 2,
        saturate: 1.75,
        brightness: 1.08
    },
    {
        selector: '.app-header',
        depth: 12,
        strength: 72,
        chromaticAberration: 5,
        blur: 2,
        saturate: 1.78,
        brightness: 1.08
    },
    {
        selector: '.search-bar:not(.hidden)',
        depth: 9,
        strength: 52,
        chromaticAberration: 3,
        blur: 3,
        saturate: 1.65,
        brightness: 1.06
    },
    {
        selector: '.modal-content, .modal-dialog',
        depth: 15,
        strength: 78,
        chromaticAberration: 5,
        blur: 3,
        saturate: 1.8,
        brightness: 1.07
    }
];

const GLASS_TARGETS_LIGHT = [
    {
        selector: '.bottom-nav',
        depth: 12,
        strength: 70,
        chromaticAberration: 5,
        blur: 2,
        saturate: 1.75,
        brightness: 1.08
    },
    {
        selector: '.app-header',
        depth: 12,
        strength: 62,
        chromaticAberration: 0,
        blur: 2.5,
        saturate: 1.7,
        brightness: 1.07
    },
    {
        selector: '.search-bar:not(.hidden)',
        depth: 9,
        strength: 52,
        chromaticAberration: 0,
        blur: 3,
        saturate: 1.65,
        brightness: 1.06
    }
];

let _supportsRefraction = null;

/**
 * Check whether the browser supports SVG filter URLs inside CSS backdrop-filter (Chromium/Blink).
 */
export function supportsLiquidGlassRefraction() {
    if (_supportsRefraction !== null) return _supportsRefraction;
    if (typeof document === 'undefined') {
        _supportsRefraction = false;
        return false;
    }
    const testEl = document.createElement('div');
    testEl.style.cssText = 'backdrop-filter: url(#test)';
    _supportsRefraction =
        testEl.style.backdropFilter === 'url(#test)' ||
        testEl.style.backdropFilter === 'url("#test")';
    return _supportsRefraction;
}

function _normalizeGeometry(height, width, radius, depth) {
    const w = Math.max(16, Math.round(Number(width) || 16));
    const h = Math.max(16, Math.round(Number(height) || 16));
    const d = Math.max(2, Math.min(Math.round(Number(depth) || 8), Math.floor(Math.min(w, h) / 3)));
    const r = Math.max(0, Math.min(Math.round(Number(radius) || 0), Math.floor(Math.min(w, h) / 2)));
    return { w, h, d, r };
}

function _cacheSet(map, key, value) {
    if (map.size >= FILTER_CACHE_MAX) {
        const firstKey = map.keys().next().value;
        if (firstKey !== undefined) map.delete(firstKey);
    }
    map.set(key, value);
}

function _fillRoundedRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    if (typeof ctx.roundRect === 'function') {
        ctx.roundRect(x, y, w, h, r);
    } else {
        const rr = Math.min(r, w / 2, h / 2);
        ctx.moveTo(x + rr, y);
        ctx.lineTo(x + w - rr, y);
        ctx.arcTo(x + w, y, x + w, y + rr, rr);
        ctx.lineTo(x + w, y + h - rr);
        ctx.arcTo(x + w, y + h, x + w - rr, y + h, rr);
        ctx.lineTo(x + rr, y + h);
        ctx.arcTo(x, y + h, x, y + h - rr, rr);
        ctx.lineTo(x, y + rr);
        ctx.arcTo(x, y, x + rr, y, rr);
    }
    ctx.closePath();
    ctx.fill();
}

function _ensureMapCanvases(mapW, mapH) {
    if (typeof document === 'undefined') return false;
    if (!_mapCanvas) {
        _mapCanvas = document.createElement('canvas');
        _mapCtx = _mapCanvas.getContext('2d');
        _innerCanvas = document.createElement('canvas');
        _innerCtx = _innerCanvas.getContext('2d');
    }
    if (!_mapCtx || !_innerCtx) return false;
    if (_mapCanvas.width !== mapW || _mapCanvas.height !== mapH) {
        _mapCanvas.width = mapW;
        _mapCanvas.height = mapH;
        _innerCanvas.width = mapW;
        _innerCanvas.height = mapH;
    }
    return true;
}

/**
 * Generate a cached pre-rendered PNG displacement map via Canvas 2D matching nikdelvin/liquid-glass.
 * Eliminates runtime SVG <feImage> nested SVG parsing, CSS mix-blend-mode, and SVG blur passes.
 */
export function getDisplacementMap({ height, width, radius, depth }) {
    const { w, h, d, r } = _normalizeGeometry(height, width, radius, depth);
    const maxDim = Math.max(w, h);
    const scale = maxDim > MAX_MAP_DIM ? MAX_MAP_DIM / maxDim : 1;
    const mapW = Math.max(16, Math.round(w * scale));
    const mapH = Math.max(16, Math.round(h * scale));
    const mapD = Math.max(2, Math.min(Math.round(d * scale), Math.floor(Math.min(mapW, mapH) / 3)));
    const mapR = Math.max(0, Math.min(Math.round(r * scale), Math.floor(Math.min(mapW, mapH) / 2)));

    const mapKey = `${mapW}x${mapH}:${mapR}:${mapD}`;
    const cached = _mapCache.get(mapKey);
    if (cached) return cached;

    const y1 = Math.ceil((mapR / mapH) * 15) / 100;
    const y2 = Math.floor(100 - (mapR / mapH) * 15) / 100;
    const x1 = Math.ceil((mapR / mapW) * 15) / 100;
    const x2 = Math.floor(100 - (mapR / mapW) * 15) / 100;

    if (_ensureMapCanvases(mapW, mapH)) {
        const inner = _innerCtx;
        inner.filter = 'none';
        inner.globalCompositeOperation = 'source-over';
        inner.fillStyle = '#000080';
        inner.fillRect(0, 0, mapW, mapH);

        inner.globalCompositeOperation = 'screen';
        const gradY = inner.createLinearGradient(0, mapH * y1, 0, mapH * y2);
        gradY.addColorStop(0, '#00ff00');
        gradY.addColorStop(1, '#000000');
        inner.fillStyle = gradY;
        inner.fillRect(0, 0, mapW, mapH);

        const gradX = inner.createLinearGradient(mapW * x1, 0, mapW * x2, 0);
        gradX.addColorStop(0, '#ff0000');
        gradX.addColorStop(1, '#000000');
        inner.fillStyle = gradX;
        inner.fillRect(0, 0, mapW, mapH);

        inner.globalCompositeOperation = 'source-over';
        inner.filter = `blur(${mapD}px)`;
        inner.fillStyle = '#808080';
        _fillRoundedRect(inner, mapD, mapD, mapW - 2 * mapD, mapH - 2 * mapD, mapR);
        inner.filter = 'none';

        const main = _mapCtx;
        main.filter = 'none';
        main.fillStyle = '#808080';
        main.fillRect(0, 0, mapW, mapH);
        main.filter = 'blur(2px)';
        main.drawImage(_innerCanvas, 0, 0);
        main.filter = 'none';

        const pngUri = _mapCanvas.toDataURL('image/png');
        _cacheSet(_mapCache, mapKey, pngUri);
        return pngUri;
    }

    const svg = `<svg height="${mapH}" width="${mapW}" viewBox="0 0 ${mapW} ${mapH}" xmlns="http://www.w3.org/2000/svg">
    <style>.mix { mix-blend-mode: screen; }</style>
    <defs>
        <linearGradient id="Y" x1="0" x2="0" y1="${Math.round(y1 * 100)}%" y2="${Math.round(y2 * 100)}%">
            <stop offset="0%" stop-color="#0F0" /><stop offset="100%" stop-color="#000" />
        </linearGradient>
        <linearGradient id="X" x1="${Math.round(x1 * 100)}%" x2="${Math.round(x2 * 100)}%" y1="0" y2="0">
            <stop offset="0%" stop-color="#F00" /><stop offset="100%" stop-color="#000" />
        </linearGradient>
    </defs>
    <rect x="0" y="0" height="${mapH}" width="${mapW}" fill="#808080" />
    <g filter="blur(2px)">
        <rect x="0" y="0" height="${mapH}" width="${mapW}" fill="#000080" />
        <rect x="0" y="0" height="${mapH}" width="${mapW}" fill="url(#Y)" class="mix" />
        <rect x="0" y="0" height="${mapH}" width="${mapW}" fill="url(#X)" class="mix" />
        <rect x="${mapD}" y="${mapD}" height="${mapH - 2 * mapD}" width="${mapW - 2 * mapD}" fill="#808080" rx="${mapR}" ry="${mapR}" filter="blur(${mapD}px)" />
    </g>
</svg>`;
    const fallbackUri = 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
    _cacheSet(_mapCache, mapKey, fallbackUri);
    return fallbackUri;
}

function _buildColorMatrixValues(saturate, brightness) {
    const s = Number.isFinite(saturate) ? saturate : 1;
    const b = Number.isFinite(brightness) ? brightness : 1;
    const r0 = ((0.2126 + 0.7874 * s) * b).toFixed(4);
    const r1 = ((0.7152 - 0.7152 * s) * b).toFixed(4);
    const r2 = ((0.0722 - 0.0722 * s) * b).toFixed(4);
    const g0 = ((0.2126 - 0.2126 * s) * b).toFixed(4);
    const g1 = ((0.7152 + 0.2848 * s) * b).toFixed(4);
    const g2 = ((0.0722 - 0.0722 * s) * b).toFixed(4);
    const b0 = ((0.2126 - 0.2126 * s) * b).toFixed(4);
    const b1 = ((0.7152 - 0.7152 * s) * b).toFixed(4);
    const b2 = ((0.0722 + 0.9278 * s) * b).toFixed(4);
    return `${r0} ${r1} ${r2} 0 0  ${g0} ${g1} ${g2} 0 0  ${b0} ${b1} ${b2} 0 0  0 0 0 1 0`;
}

/**
 * Generate a cached SVG displacement filter.
 * Merges blur + combined saturate/brightness matrix inside the SVG filter graph, uses fast
 * 2-pass R/GB chromatic dispersion on chrome bars, and auto-switches to 1-pass refraction
 * on very large mobile surfaces (modals) to keep frame times fast.
 */
export function getDisplacementFilter({
    height,
    width,
    radius,
    depth,
    strength = 100,
    chromaticAberration = 0,
    blur = 0,
    saturate = 1,
    brightness = 1
}) {
    const qW = Math.max(16, Math.round((Number(width) || 16) / 8) * 8);
    const qH = Math.max(16, Math.round((Number(height) || 16) / 8) * 8);
    const { w, h, d, r } = _normalizeGeometry(qH, qW, radius, depth);
    const str = Math.max(0, Math.round(Number(strength) || 0));
    const cab = Math.max(0, Math.round(Number(chromaticAberration) || 0));
    const blr = Math.max(0, Number(blur) || 0);
    const sat = Number.isFinite(Number(saturate)) ? Number(saturate) : 1;
    const brt = Number.isFinite(Number(brightness)) ? Number(brightness) : 1;
    const isLargeSurface = w * h > LARGE_SURFACE_AREA;

    const cacheKey = `${w}x${h}:${r}:${d}:${str}:${cab}:${blr}:${sat}:${brt}:${isLargeSurface ? 1 : 0}`;
    const cached = _filterCache.get(cacheKey);
    if (cached) return cached;

    const mapHref = getDisplacementMap({ height: h, width: w, radius: r, depth: d });
    const useDispersion = cab > 0 && !isLargeSurface;

    const displacementStage = useDispersion
        ? `<feImage x="0" y="0" height="${h}" width="${w}" preserveAspectRatio="none" href="${mapHref}" result="displacementMap" />
            <feDisplacementMap in="SourceGraphic" in2="displacementMap" scale="${str + cab * 2}" xChannelSelector="R" yChannelSelector="G" />
            <feColorMatrix type="matrix" values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0" result="displacedR" />
            <feDisplacementMap in="SourceGraphic" in2="displacementMap" scale="${str}" xChannelSelector="R" yChannelSelector="G" />
            <feColorMatrix type="matrix" values="0 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 1 0" result="displacedGB" />
            <feBlend in="displacedR" in2="displacedGB" mode="screen" />`
        : `<feImage x="0" y="0" height="${h}" width="${w}" preserveAspectRatio="none" href="${mapHref}" result="displacementMap" />
            <feDisplacementMap in="SourceGraphic" in2="displacementMap" scale="${cab > 0 ? str + cab : str}" xChannelSelector="R" yChannelSelector="G" />`;

    const blurStage = blr > 0
        ? `\n            <feGaussianBlur stdDeviation="${blr}" edgeMode="duplicate" />`
        : '';

    const needsColorMatrix = sat !== 1 || brt !== 1;
    const colorStage = needsColorMatrix
        ? `\n            <feColorMatrix type="matrix" values="${_buildColorMatrixValues(sat, brt)}" />`
        : '';

    const svg = `<svg height="${h}" width="${w}" viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg">
    <defs>
        <filter id="displace" color-interpolation-filters="sRGB">
            ${displacementStage}${blurStage}${colorStage}
        </filter>
    </defs>
</svg>`;

    const result = 'data:image/svg+xml;utf8,' + encodeURIComponent(svg) + '#displace';
    _cacheSet(_filterCache, cacheKey, result);
    return result;
}

function _cleanupModalBackdrop(el) {
    if (!el) return;
    el.classList.remove('lg-has-backdrop');
    if (el.__lgBackdrop) {
        el.__lgBackdrop.remove();
        delete el.__lgBackdrop;
    }
}

function _syncModalBackdrop(el, rect, cs, backdropVal) {
    const parent = el.parentElement;
    if (!parent) return;

    let backdrop = el.__lgBackdrop;
    if (!backdrop || !backdrop.isConnected || backdrop.parentElement !== parent) {
        if (backdrop) backdrop.remove();
        backdrop = document.createElement('div');
        backdrop.className = 'lg-modal-backdrop';
        backdrop.setAttribute('aria-hidden', 'true');
        parent.insertBefore(backdrop, el);
        el.__lgBackdrop = backdrop;
    }

    const width = Math.round(rect.width);
    const height = Math.round(rect.height);
    const left = Math.round(rect.left);
    const top = Math.round(rect.top);
    const borderRadius = cs.borderRadius || `${parseFloat(cs.borderTopLeftRadius) || 24}px`;
    const rectKey = `${left},${top},${width},${height},${borderRadius}`;

    if (backdrop.__lgRectKey !== rectKey) {
        backdrop.style.left = `${left}px`;
        backdrop.style.top = `${top}px`;
        backdrop.style.width = `${width}px`;
        backdrop.style.height = `${height}px`;
        backdrop.style.borderRadius = borderRadius;
        backdrop.__lgRectKey = rectKey;
    }

    if (backdrop.__lgFilter !== backdropVal) {
        backdrop.style.setProperty('--lg-backdrop-filter', backdropVal);
        backdrop.__lgFilter = backdropVal;
    }

    el.classList.add('lg-has-backdrop');
    el.style.removeProperty('--lg-backdrop-filter');
}

function _applyGlassToElement(el, cfg) {
    if (!el || !el.isConnected) return;
    if (_resizeObserver && !_observedEls.has(el)) {
        _resizeObserver.observe(el);
        _observedEls.add(el);
    }

    const rect = el.getBoundingClientRect();
    const width = Math.round(rect.width);
    const height = Math.round(rect.height);
    if (width < 16 || height < 16) return;

    const cs = getComputedStyle(el);
    const parsedRadius = parseFloat(cs.borderTopLeftRadius);
    const radius = Number.isFinite(parsedRadius) ? Math.round(parsedRadius) : 16;
    const isLight = document.documentElement?.dataset?.colorScheme === 'light';
    const brightness = isLight ? Math.min(cfg.brightness, 1.05) : cfg.brightness;
    const isScrollableModal = el.classList.contains('modal-content');

    const qW = Math.round(width / 8) * 8;
    const qH = Math.round(height / 8) * 8;
    const posKey = isScrollableModal ? `:${Math.round(rect.left)}:${Math.round(rect.top)}` : '';
    const elemKey = `${qW}x${qH}:${radius}:${cfg.depth}:${cfg.strength}:${cfg.chromaticAberration}:${cfg.blur}:${cfg.saturate}:${brightness}${posKey}`;
    if (el.__lgKey === elemKey && (!isScrollableModal || (el.__lgBackdrop && el.__lgBackdrop.isConnected))) return;

    let backdropVal;
    if (supportsLiquidGlassRefraction()) {
        const filterUrl = getDisplacementFilter({
            height,
            width,
            radius,
            depth: cfg.depth,
            strength: cfg.strength,
            chromaticAberration: cfg.chromaticAberration,
            blur: cfg.blur,
            saturate: cfg.saturate,
            brightness
        });
        backdropVal = `url('${filterUrl}')`;
    } else {
        const fallbackBlur = Math.max(16, Math.round(cfg.blur * 4));
        backdropVal = `blur(${fallbackBlur}px) saturate(${Math.max(1.8, cfg.saturate)}) brightness(${brightness})`;
    }

    if (isScrollableModal) {
        _syncModalBackdrop(el, rect, cs, backdropVal);
    } else {
        el.style.setProperty('--lg-backdrop-filter', backdropVal);
    }

    el.__lgKey = elemKey;
    _styledEls.add(el);
}

function _syncModalOpenClass() {
    if (!document.body) return;
    const modalRoot = document.getElementById('modal-container');
    const hasModalRootOpen = !!(modalRoot && !modalRoot.classList.contains('hidden') && modalRoot.children.length > 0);
    const hasActiveOverlay = !!document.querySelector('.modal-overlay:not(.hidden)');
    const isModalOpen = hasModalRootOpen || hasActiveOverlay || document.body.classList.contains('modal-open');
    document.body.classList.toggle('lg-modal-open', isModalOpen);
}

function _updateAllGlassElements() {
    if (!_active || typeof document === 'undefined') return;
    _syncModalOpenClass();

    const targets = _quality === 'light' ? GLASS_TARGETS_LIGHT : GLASS_TARGETS_FULL;
    const handled = new Set();

    for (const cfg of targets) {
        const nodes = document.querySelectorAll(cfg.selector);
        for (let i = 0; i < nodes.length; i++) {
            const el = nodes[i];
            if (handled.has(el)) continue;
            handled.add(el);
            _applyGlassToElement(el, cfg);
        }
    }

    for (const el of _styledEls) {
        if (!el.isConnected || !handled.has(el)) {
            if (el.isConnected) {
                el.style.removeProperty('--lg-backdrop-filter');
                _cleanupModalBackdrop(el);
                delete el.__lgKey;
            } else {
                _cleanupModalBackdrop(el);
            }
            _styledEls.delete(el);
            _observedEls.delete(el);
        }
    }
}

function _scheduleUpdate() {
    if (!_active || _rafId) return;
    _rafId = requestAnimationFrame(() => {
        _rafId = 0;
        _updateAllGlassElements();
    });
}

function _ensureObservers() {
    if (!_resizeObserver && typeof ResizeObserver === 'function') {
        _resizeObserver = new ResizeObserver(() => _scheduleUpdate());
    }
    if (!_windowResizeBound && typeof window !== 'undefined') {
        window.addEventListener('resize', _scheduleUpdate, { passive: true });
        _windowResizeBound = true;
    }
    if (!_mutationObserver && typeof MutationObserver === 'function') {
        _mutationObserver = new MutationObserver(() => {
            _scheduleUpdate();
        });
        const bottomNav = document.querySelector('.bottom-nav');
        const modalRoot = document.getElementById('modal-container');
        const searchBar = document.getElementById('search-bar');
        if (bottomNav) {
            _mutationObserver.observe(bottomNav, { attributes: true, subtree: true, attributeFilter: ['class'] });
        }
        if (modalRoot) {
            _mutationObserver.observe(modalRoot, { childList: true, attributes: true, attributeFilter: ['class'] });
        }
        if (searchBar) {
            _mutationObserver.observe(searchBar, { attributes: true, attributeFilter: ['class'] });
        }
        if (document.body) {
            _mutationObserver.observe(document.body, {
                childList: true,
                subtree: false,
                attributes: true,
                attributeFilter: ['class']
            });
        }
    }
}

/**
 * Switch Liquid Glass quality between 'full' (SVG refraction on modals) and 'light' (fast GPU blur on modals).
 */
export function setLiquidGlassQuality(quality) {
    const next = quality === 'light' ? 'light' : 'full';
    if (_quality === next) return;
    _quality = next;
    if (!_active) return;
    for (const el of _styledEls) {
        delete el.__lgKey;
    }
    _updateAllGlassElements();
    _scheduleUpdate();
}

/**
 * Enable SVG displacement + chromatic aberration Liquid Glass across floating chrome.
 */
export function enableLiquidGlass(quality) {
    if (typeof document === 'undefined') return;
    if (quality === 'light' || quality === 'full') {
        _quality = quality;
    }
    _active = true;
    _ensureObservers();
    _updateAllGlassElements();
    _scheduleUpdate();
}

/**
 * Refresh cached glass filters (e.g. after radius or color scheme changes).
 */
export function refreshLiquidGlass() {
    if (!_active) return;
    for (const el of _styledEls) {
        delete el.__lgKey;
    }
    _scheduleUpdate();
}

/**
 * Disable Liquid Glass and strip generated backdrop-filter overrides.
 */
export function disableLiquidGlass() {
    _active = false;
    if (_rafId) {
        cancelAnimationFrame(_rafId);
        _rafId = 0;
    }
    if (_resizeObserver) {
        _resizeObserver.disconnect();
        _resizeObserver = null;
    }
    if (_mutationObserver) {
        _mutationObserver.disconnect();
        _mutationObserver = null;
    }
    if (_windowResizeBound && typeof window !== 'undefined') {
        window.removeEventListener('resize', _scheduleUpdate);
        _windowResizeBound = false;
    }
    if (typeof document !== 'undefined' && document.body) {
        document.body.classList.remove('lg-modal-open');
    }
    _observedEls.clear();
    for (const el of _styledEls) {
        el.style.removeProperty('--lg-backdrop-filter');
        _cleanupModalBackdrop(el);
        delete el.__lgKey;
    }
    _styledEls.clear();
}
