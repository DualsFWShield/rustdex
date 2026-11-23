/**
 * liquid-glass.js — SVG displacement + chromatic aberration Liquid Glass engine
 * Adapted from nikdelvin/liquid-glass (MIT License, Copyright (c) 2025 Nikita Stadnik)
 * https://github.com/nikdelvin/liquid-glass
 */

const FILTER_CACHE_MAX = 64;
const MAX_MAP_DIM = 320;
const _filterCache = new Map();

let _active = false;
let _quality = 'full'; // 'full' (SVG refraction on modals + bars) | 'light' (fast GPU blur on modals)
let _rafId = 0;
let _resizeObserver = null;
let _mutationObserver = null;
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

/**
 * Generate a capped-resolution SVG displacement map data URI matching nikdelvin/liquid-glass.
 */
export function getDisplacementMap({ height, width, radius, depth }) {
    const { w, h, d, r } = _normalizeGeometry(height, width, radius, depth);
    const maxDim = Math.max(w, h);
    const scale = maxDim > MAX_MAP_DIM ? MAX_MAP_DIM / maxDim : 1;
    const mapW = Math.max(16, Math.round(w * scale));
    const mapH = Math.max(16, Math.round(h * scale));
    const mapD = Math.max(2, Math.min(Math.round(d * scale), Math.floor(Math.min(mapW, mapH) / 3)));
    const mapR = Math.max(0, Math.min(Math.round(r * scale), Math.floor(Math.min(mapW, mapH) / 2)));

    const y1 = Math.ceil((mapR / mapH) * 15);
    const y2 = Math.floor(100 - (mapR / mapH) * 15);
    const x1 = Math.ceil((mapR / mapW) * 15);
    const x2 = Math.floor(100 - (mapR / mapW) * 15);

    const svg = `<svg height="${mapH}" width="${mapW}" viewBox="0 0 ${mapW} ${mapH}" xmlns="http://www.w3.org/2000/svg">
    <style>
        .mix { mix-blend-mode: screen; }
    </style>
    <defs>
        <linearGradient id="Y" x1="0" x2="0" y1="${y1}%" y2="${y2}%">
            <stop offset="0%" stop-color="#0F0" />
            <stop offset="100%" stop-color="#000" />
        </linearGradient>
        <linearGradient id="X" x1="${x1}%" x2="${x2}%" y1="0" y2="0">
            <stop offset="0%" stop-color="#F00" />
            <stop offset="100%" stop-color="#000" />
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

    return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
}

/**
 * Generate a cached SVG displacement filter (fast 1-pass when chromaticAberration === 0,
 * or full 3-channel RGB dispersion when chromaticAberration > 0).
 */
export function getDisplacementFilter({
    height,
    width,
    radius,
    depth,
    strength = 100,
    chromaticAberration = 0
}) {
    const qW = Math.max(16, Math.round((Number(width) || 16) / 8) * 8);
    const qH = Math.max(16, Math.round((Number(height) || 16) / 8) * 8);
    const { w, h, d, r } = _normalizeGeometry(qH, qW, radius, depth);
    const str = Math.max(0, Math.round(Number(strength) || 0));
    const cab = Math.max(0, Math.round(Number(chromaticAberration) || 0));

    const cacheKey = `${w}x${h}:${r}:${d}:${str}:${cab}`;
    const cached = _filterCache.get(cacheKey);
    if (cached) return cached;

    const mapHref = getDisplacementMap({ height: h, width: w, radius: r, depth: d });
    const filterBody = cab > 0
        ? `<feImage x="0" y="0" height="${h}" width="${w}" preserveAspectRatio="none" href="${mapHref}" result="displacementMap" />
            <feDisplacementMap in="SourceGraphic" in2="displacementMap" scale="${str + cab * 2}" xChannelSelector="R" yChannelSelector="G" />
            <feColorMatrix type="matrix" values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0" result="displacedR" />
            <feDisplacementMap in="SourceGraphic" in2="displacementMap" scale="${str + cab}" xChannelSelector="R" yChannelSelector="G" />
            <feColorMatrix type="matrix" values="0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0" result="displacedG" />
            <feDisplacementMap in="SourceGraphic" in2="displacementMap" scale="${str}" xChannelSelector="R" yChannelSelector="G" />
            <feColorMatrix type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0" result="displacedB" />
            <feBlend in="displacedR" in2="displacedG" mode="screen" />
            <feBlend in2="displacedB" mode="screen" />`
        : `<feImage x="0" y="0" height="${h}" width="${w}" preserveAspectRatio="none" href="${mapHref}" result="displacementMap" />
            <feDisplacementMap in="SourceGraphic" in2="displacementMap" scale="${str}" xChannelSelector="R" yChannelSelector="G" />`;

    const svg = `<svg height="${h}" width="${w}" viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg">
    <defs>
        <filter id="displace" color-interpolation-filters="sRGB">
            ${filterBody}
        </filter>
    </defs>
</svg>`;

    const result = 'data:image/svg+xml;utf8,' + encodeURIComponent(svg) + '#displace';
    if (_filterCache.size >= FILTER_CACHE_MAX) {
        const firstKey = _filterCache.keys().next().value;
        if (firstKey !== undefined) _filterCache.delete(firstKey);
    }
    _filterCache.set(cacheKey, result);
    return result;
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

    const qW = Math.round(width / 8) * 8;
    const qH = Math.round(height / 8) * 8;
    const elemKey = `${qW}x${qH}:${radius}:${cfg.depth}:${cfg.strength}:${cfg.chromaticAberration}:${cfg.blur}:${cfg.saturate}:${brightness}`;
    if (el.__lgKey === elemKey) return;

    if (supportsLiquidGlassRefraction()) {
        const filterUrl = getDisplacementFilter({
            height,
            width,
            radius,
            depth: cfg.depth,
            strength: cfg.strength,
            chromaticAberration: cfg.chromaticAberration
        });
        const backdropVal = `url('${filterUrl}') blur(${cfg.blur}px) brightness(${brightness}) saturate(${cfg.saturate})`;
        el.style.setProperty('--lg-backdrop-filter', backdropVal);
    } else {
        const fallbackBlur = Math.max(16, Math.round(cfg.blur * 4));
        const backdropVal = `blur(${fallbackBlur}px) saturate(${Math.max(1.8, cfg.saturate)}) brightness(${brightness})`;
        el.style.setProperty('--lg-backdrop-filter', backdropVal);
    }

    el.__lgKey = elemKey;
    _styledEls.add(el);
}

function _updateAllGlassElements() {
    if (!_active || typeof document === 'undefined') return;
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
                delete el.__lgKey;
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
            _mutationObserver.observe(document.body, { childList: true, subtree: false });
        }
    }
}

/**
 * Switch Liquid Glass quality between 'full' (SVG refraction on modals) and 'light' (fast GPU blur on modals).
 */
export function setLiquidGlassQuality(quality) {
    _quality = quality === 'light' ? 'light' : 'full';
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
    _observedEls.clear();
    for (const el of _styledEls) {
        el.style.removeProperty('--lg-backdrop-filter');
        delete el.__lgKey;
    }
    _styledEls.clear();
}
