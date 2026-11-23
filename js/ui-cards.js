/**
 * ui-cards.js — Rendu des cartes, suppression de fond, bannière non-notées
 * et virtualisation DOM par chunks pour les collections > 144 cartes.
 */

import { i18n } from './i18n.js';
import * as Storage from './storage.js';
import * as BAC from './bac.js';
import * as Utils from './utils.js';
import { Feedback } from './feedback.js';
import * as Deduplicator from './deduplicator.js';
import { isMissingImage } from './data.js';
import { loadVanillaTilt } from './vendor-loader.js';
import {
    showToast,
    closeModal,
    applyRarityAnimations,
    getModalContainer
} from './ui-modals.js';

const NativeMap = window.Map;
const _bgRemovalCache = new NativeMap();
const BG_CACHE_MAX_ENTRIES = 240;
const BG_CACHE_MAX_CHARS = 4 * 1024 * 1024;
let _bgCacheChars = 0;
const BG_MAX_DIM = 240;
const _bgQueue = [];
let _bgQueueRunning = false;

const CHUNK_SIZE = 24;
const VIRTUALIZE_AFTER_CHUNKS = 6; // >= 144 cartes : recyclage DOM hors écran
let _chunkObserver = null;

function _bgCacheSet(rawSrc, dataUrl) {
    if (!rawSrc || dataUrl.length > BG_CACHE_MAX_CHARS) return;
    const src = _bgCacheKey(rawSrc);
    const existing = _bgRemovalCache.get(src);
    if (existing) _bgCacheChars -= existing.length;
    _bgRemovalCache.set(src, dataUrl);
    _bgCacheChars += dataUrl.length;
    while (_bgRemovalCache.size > BG_CACHE_MAX_ENTRIES || _bgCacheChars > BG_CACHE_MAX_CHARS) {
        const firstKey = _bgRemovalCache.keys().next().value;
        if (firstKey === undefined) break;
        const old = _bgRemovalCache.get(firstKey);
        _bgRemovalCache.delete(firstKey);
        _bgCacheChars -= old ? old.length : 0;
    }
}

function _bgCacheKey(src) {
    try {
        return new URL(src, document.baseURI).href;
    } catch {
        return src;
    }
}

export function _bgCachedSrc(src) {
    if (!src || src.startsWith('data:')) return null;
    const key = _bgCacheKey(src);
    const cached = _bgRemovalCache.get(key);
    if (!cached) return null;
    _bgRemovalCache.delete(key);
    _bgRemovalCache.set(key, cached);
    return cached;
}

export function removeImageBackground(img) {
    if (!img || img.dataset.processed) return;
    const src = img.currentSrc || img.src;
    if (!src || src.startsWith('data:')) {
        img.dataset.processed = 'true';
        return;
    }
    const cached = _bgCachedSrc(src);
    if (cached) {
        img.src = cached;
        img.dataset.processed = 'true';
        return;
    }
    if (img.dataset.bgQueued) return;
    img.dataset.bgQueued = 'true';
    _bgQueue.push(img);
    _pumpBgQueue();
}
window.removeImageBackground = removeImageBackground;

function _pumpBgQueue() {
    if (_bgQueueRunning) return;
    _bgQueueRunning = true;

    const step = (deadline) => {
        let processed = 0;
        while (_bgQueue.length > 0) {
            const img = _bgQueue.shift();
            if (img && img.isConnected && !img.dataset.processed) {
                _removeImageBackgroundSync(img);
            }
            processed++;
            if (deadline && typeof deadline.timeRemaining === 'function') {
                if (deadline.timeRemaining() < 4) break;
            } else if (processed >= 2) {
                break;
            }
        }
        if (_bgQueue.length === 0) {
            _bgQueueRunning = false;
            return;
        }
        if (typeof requestIdleCallback === 'function') {
            requestIdleCallback(step, { timeout: 1000 });
        } else {
            setTimeout(step, 16);
        }
    };

    if (typeof requestIdleCallback === 'function') {
        requestIdleCallback(step, { timeout: 800 });
    } else {
        setTimeout(step, 0);
    }
}

function _removeImageBackgroundSync(img) {
    if (img.dataset.processed) return;

    try {
        let width = img.naturalWidth;
        let height = img.naturalHeight;
        if (!width || !height) {
            img.dataset.processed = 'true';
            return;
        }

        const scale = Math.min(1, BG_MAX_DIM / Math.max(width, height));
        if (scale < 1) {
            width = Math.round(width * scale);
            height = Math.round(height * scale);
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });

        ctx.drawImage(img, 0, 0, width, height);

        const imgData = ctx.getImageData(0, 0, width, height);
        const data = imgData.data;

        if (data[3] < 20) {
            img.dataset.processed = 'true';
            return;
        }

        const tolerance = 20;
        const toleranceSq = tolerance * tolerance;
        const bgR = data[0];
        const bgG = data[1];
        const bgB = data[2];

        const totalPixels = width * height;
        const toRemove = new Uint8Array(totalPixels);

        const isBackground = (dataIdx) => {
            const dr = data[dataIdx] - bgR;
            const dg = data[dataIdx + 1] - bgG;
            const db = data[dataIdx + 2] - bgB;
            return (dr * dr + dg * dg + db * db) <= toleranceSq;
        };

        const stack = new Int32Array(totalPixels);
        const floodFill = (startX, startY) => {
            const startIdx = startY * width + startX;
            if (toRemove[startIdx] || !isBackground(startIdx * 4)) return;
            let sp = 0;
            stack[sp++] = startIdx;
            toRemove[startIdx] = 1;

            while (sp > 0) {
                const idx = stack[--sp];
                const x = idx % width;
                const y = (idx - x) / width;

                if (x + 1 < width) {
                    const n = idx + 1;
                    if (!toRemove[n] && isBackground(n * 4)) { toRemove[n] = 1; stack[sp++] = n; }
                }
                if (x > 0) {
                    const n = idx - 1;
                    if (!toRemove[n] && isBackground(n * 4)) { toRemove[n] = 1; stack[sp++] = n; }
                }
                if (y + 1 < height) {
                    const n = idx + width;
                    if (!toRemove[n] && isBackground(n * 4)) { toRemove[n] = 1; stack[sp++] = n; }
                }
                if (y > 0) {
                    const n = idx - width;
                    if (!toRemove[n] && isBackground(n * 4)) { toRemove[n] = 1; stack[sp++] = n; }
                }
            }
        };

        floodFill(0, 0);
        floodFill(width - 1, 0);
        floodFill(0, height - 1);
        floodFill(width - 1, height - 1);

        let hasChanges = false;
        for (let y = 0; y < height; y++) {
            const rowOffset = y * width;
            for (let x = 0; x < width; x++) {
                const idx = rowOffset + x;
                const dataIdx = idx * 4;

                if (toRemove[idx]) {
                    data[dataIdx + 3] = 0;
                    hasChanges = true;
                    continue;
                }

                if (
                    (x > 0 && toRemove[idx - 1]) ||
                    (x + 1 < width && toRemove[idx + 1]) ||
                    (y > 0 && toRemove[idx - width]) ||
                    (y + 1 < height && toRemove[idx + width])
                ) {
                    data[dataIdx + 3] = Math.min(data[dataIdx + 3], 128);
                    hasChanges = true;
                }
            }
        }

        if (hasChanges) {
            ctx.putImageData(imgData, 0, 0);
            let dataUrl = canvas.toDataURL('image/webp', 0.85);
            if (!dataUrl.startsWith('data:image/webp')) {
                dataUrl = canvas.toDataURL('image/png');
            }
            const src = img.currentSrc || img.src;
            if (src && src !== dataUrl) {
                _bgCacheSet(src, dataUrl);
            }
            img.src = dataUrl;
            img.dataset.processed = 'true';
        } else {
            img.dataset.processed = 'true';
        }
    } catch {
        img.dataset.processed = 'true';
    }
}

function _isKeg(vol) {
    if (!vol) return false;
    const v = vol.toUpperCase();
    return v.includes('20 L') || v.includes('30 L') || v.includes('50 L') || v.includes('FUT');
}

function _buildCardElement(beer, index, ctx) {
    const {
        userData,
        prefRevealRarity,
        prefAnimOnce,
        prefBacEnabled,
        prefCardCount,
        prefCardVolume,
        prefCardCountOrVolume,
        prefShowBBPct,
        getBacBadge,
        isLowEndPerf
    } = ctx;

    const u = userData[beer.id];
    const isDrunk = u && u.count > 0;
    const card = document.createElement('div');
    card.className = `beer-card ${isDrunk ? 'drunk' : ''}`;
    card.dataset.id = beer.id;

    const revealRarity = isDrunk || prefRevealRarity;
    const hasPlayed = window.__playedAnims && window.__playedAnims.has(beer.id);

    if (revealRarity && beer.rarity && beer.rarity !== 'base') {
        card.classList.add(`card-rarity-${beer.rarity}`);

        if (isDrunk && (!prefAnimOnce || !hasPlayed)) {
            if (beer.rarity === 'ultra_legendaire') {
                card.classList.add('card-anim-ultra_legendary');
            }
            if (window.__playedAnims) window.__playedAnims.add(beer.id);
            if (window.savePlayedAnims) window.savePlayedAnims();
        } else if (prefAnimOnce && hasPlayed) {
            if (beer.rarity === 'ultra_legendaire') {
                card.classList.add('card-anim-ultra_legendary');
            } else {
                card.classList.add('stop-animations');
            }
        }
    } else {
        card.style.borderColor = 'var(--border-color)';
    }

    if (!isDrunk) {
        card.removeAttribute('data-tilt');
        if (card.vanillaTilt) card.vanillaTilt.destroy();
    }

    if (beer.isSeasonal && (!beer.rarity || beer.rarity === 'base')) {
        card.style.borderColor = 'var(--rarity-seasonal)';
    }

    const abv = beer.alcohol ? `<span class="beer-meta-pill">${beer.alcohol}</span>` : '';
    const vol = beer.volume ? `<span class="beer-meta-pill">${Utils.formatVolume(beer.volume)}</span>` : '';
    const typeBadge = beer.type ? `<span class="beer-meta-pill beer-meta-pill--type">${beer.type}</span>` : '';

    const fallbackImage = _isKeg(beer.volume) ? 'images/beer/FUT.jpg' : 'images/beer/default.png';
    let displayImage = beer.image;
    if (!displayImage || isMissingImage(displayImage) || (displayImage.includes('FUT.jpg') && !_isKeg(beer.volume))) {
        displayImage = fallbackImage;
    }
    const cachedDisplayImage = _bgCachedSrc(displayImage);
    if (cachedDisplayImage) displayImage = cachedDisplayImage;

    const isFavorite = Boolean(u && u.favorite === true);
    const bacBadgeHtml = prefBacEnabled ? getBacBadge(beer.volume, beer.alcohol) : '';

    let cardStatsHtml = '';
    if (isDrunk && prefCardCountOrVolume) {
        const statsParts = [];
        if (prefCardCount) statsParts.push(`${u.count}x`);
        if (prefCardVolume) {
            let totalMl = 0;
            if (u.history) {
                totalMl = u.history.reduce((sum, h) => sum + (h.volume || 0), 0);
            } else if (beer.volume) {
                const parsed = Utils.parseVolumeToMl(beer.volume) || 330;
                totalMl = parsed * u.count;
            }
            if (totalMl > 0) {
                statsParts.push(totalMl >= 1000 ? `${(totalMl / 1000).toFixed(1)}L` : `${totalMl}ml`);
            }
        }
        if (statsParts.length > 0) {
            cardStatsHtml = `<div class="bac-speculative-badge" style="color:#ddd; border-color:rgba(255,255,255,0.08); font-weight:normal; display:inline-flex;">
                <span>${statsParts.join(' · ')}</span>
            </div>`;
        }
    }

    let bbMatchPct = beer.matchPercentage;
    if (prefShowBBPct && bbMatchPct === undefined && window.Recommendation && window.Recommendation.getBeerMatchScoreSync) {
        const syncMatch = window.Recommendation.getBeerMatchScoreSync(beer);
        if (syncMatch) bbMatchPct = syncMatch.total;
    }

    if (prefShowBBPct && bbMatchPct !== undefined) {
        const pct = Math.round(bbMatchPct * 100);
        const color = pct >= 75 ? '#2ecc71' : (pct >= 50 ? '#f1c40f' : '#e74c3c');
        cardStatsHtml += `<div class="bac-speculative-badge" style="color:${color}; border-color:${color}33; display:inline-flex; ${cardStatsHtml ? 'margin-top:4px;' : ''}">
            <span style="font-weight:bold;">🤖 ${pct}%</span>
        </div>`;
    }

    const trappistBadgeHtml = Utils.getTrappistBadgeHtml(beer);
    const badgesContainerHtml = cardStatsHtml
        ? `<div class="card-badges-left" style="position:absolute; top:6px; left:6px; z-index:3; display:flex; flex-direction:column; gap:5px; font-size:0.75rem;">${cardStatsHtml}</div>`
        : '';

    const bgAttr = (beer.removeBackground && !isLowEndPerf && displayImage !== fallbackImage)
        ? 'onload="removeImageBackground(this)"'
        : '';

    card.innerHTML = `
        ${badgesContainerHtml}
        <div class="card-badges-right">
            ${isFavorite ? '<span class="card-fav-star">⭐</span>' : ''}
            ${trappistBadgeHtml}
            <svg class="check-icon" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
        </div>
        <div class="beer-image-container">
            <img src="${displayImage}" alt="${beer.title}" class="beer-image" loading="${index < 10 ? 'eager' : 'lazy'}" decoding="async"
                 ${bgAttr}
                 onerror="if(this.src.includes('${fallbackImage}')) return; this.src='${fallbackImage}';">
        </div>
        <div class="beer-info">
            <h3 class="beer-title">${beer.title}</h3>
            <p class="beer-brewery">${beer.brewery}</p>
            <div class="beer-card-stats-row">
                ${beer._brewBrotherMatch ? `<span class="beer-meta-pill beer-meta-pill--match">🤖 ${beer._brewBrotherMatch.percentage}%</span>` : ''}
                ${abv} ${vol} ${typeBadge}
            </div>
            ${bacBadgeHtml}
        </div>
    `;

    return card;
}

function _hydrateChunk(chunk, isLowEndPerf, isTouchPrimary) {
    if (!chunk || chunk.dataset.virtualized !== '1' || !Array.isArray(chunk._beers)) return;
    const frag = document.createDocumentFragment();
    const ctx = chunk._renderCtx;
    const baseIndex = chunk._baseIndex || 0;
    chunk._beers.forEach((b, i) => {
        frag.appendChild(_buildCardElement(b, baseIndex + i, ctx));
    });
    chunk.appendChild(frag);
    chunk.dataset.virtualized = '0';
    chunk.style.minHeight = '';
    applyRarityAnimations(chunk);

    if (!isTouchPrimary && !isLowEndPerf) {
        _initTiltOnContainer(chunk);
    }
}

function _dehydrateChunk(chunk) {
    if (!chunk || chunk.dataset.virtualized === '1' || !chunk.childElementCount) return;
    const h = chunk.offsetHeight;
    if (h > 0) chunk.style.minHeight = `${h}px`;
    chunk.innerHTML = '';
    chunk.dataset.virtualized = '1';
}

function _ensureChunkObserver(grid, isLowEndPerf, isTouchPrimary) {
    if (typeof IntersectionObserver === 'undefined') return null;
    if (!_chunkObserver) {
        _chunkObserver = new IntersectionObserver((entries) => {
            const totalChunks = grid.querySelectorAll('.beer-grid-chunk').length;
            if (totalChunks <= VIRTUALIZE_AFTER_CHUNKS) return;

            for (const entry of entries) {
                const chunk = entry.target;
                if (entry.isIntersecting) {
                    _hydrateChunk(chunk, isLowEndPerf, isTouchPrimary);
                } else {
                    _dehydrateChunk(chunk);
                }
            }
        }, { rootMargin: '1800px 0px', threshold: 0 });
    }
    return _chunkObserver;
}

function _initTiltOnContainer(container) {
    loadVanillaTilt().then(() => {
        if (typeof VanillaTilt === 'undefined' || !container || !container.isConnected) return;
        const cards = container.querySelectorAll('.beer-card.drunk:not([data-tilt-init])');
        if (cards.length > 0) {
            cards.forEach(c => { c.dataset.tiltInit = '1'; });
            VanillaTilt.init(cards, {
                max: 12,
                speed: 400,
                glare: true,
                'max-glare': 0.3,
                scale: 1.02,
                perspective: 1000,
                transition: true,
                gyroscope: false
            });
        }
    }).catch(() => {});
}

export function renderBeerList(beers, container, filters = null, showCreatePrompt = false, isDiscoveryCallback = null, isAppend = false) {
    if (!isAppend) {
        if (_chunkObserver) {
            _chunkObserver.disconnect();
            _chunkObserver = null;
        }
        container.innerHTML = '';
    }
    const userData = Storage.getAllUserData();
    const filteredBeers = beers;

    if (filteredBeers.length === 0) {
        if (showCreatePrompt && isDiscoveryCallback) {
            container.innerHTML = `
                <div style="text-align:center; padding: 40px 20px;">
                    <p style="color: #888; margin-bottom: 20px;">${i18n.t('list_beer_not_exist')}</p>
                    <button id="btn-create-discovery" class="btn-primary" style="background:var(--accent-gold); color:var(--bg-dark);">
                        ${i18n.t('list_btn_create')}
                    </button>
                </div>`;
            document.getElementById('btn-create-discovery').onclick = isDiscoveryCallback;
            return;
        }

        if (isDiscoveryCallback && !showCreatePrompt) {
            container.innerHTML = `
                <div style="text-align:center; padding: 50px 20px; color: #888;">
                    <div style="font-size: 3rem; margin-bottom: 20px;">🕵️‍♂️</div>
                    <h3>${i18n.t('list_discovery_mode')}</h3>
                    <p style="margin-top: 10px;">${i18n.t('list_empty_collection')}</p>
                    <p style="font-size: 0.8rem; margin-top: 5px;">${i18n.t('list_use_search_desc')}</p>
                </div>`;
            return;
        }

        if (!isDiscoveryCallback && filters && filters.query && filters.query.length > 2) {
            container.innerHTML = `
                <div style="text-align:center; padding: 40px 20px; color: #888;">
                    <p style="font-size: 1.1rem; margin-bottom: 10px;">🔍 ${i18n.t('search_no_results')}</p>
                    <p style="font-size: 0.9rem; color: #666; margin-bottom: 20px;">${i18n.t('search_not_found') || 'Aucune bière ne correspond à votre recherche.'}</p>
                    <button id="btn-create-manual-empty" class="form-input" style="max-width: 250px; margin: 0 auto;">➕ ${i18n.t('search_btn_create_manual') || 'Ajouter une bière'}</button>
                </div>`;
            const btnManual = container.querySelector('#btn-create-manual-empty');
            if (btnManual) {
                btnManual.onclick = () => {
                    window.UI?.renderAddBeerForm?.((newBeer) => {
                        Storage.saveCustomBeer(newBeer);
                        window.updateBeerInState?.(newBeer);
                        window.dispatchEvent(new CustomEvent('beerdex-action'));
                        closeModal();
                        showToast(i18n.t('toast_beer_added'));
                        window.renderCurrentView?.();
                    });
                };
            }
            return;
        }

        container.innerHTML = `<div style="text-align:center; padding: 20px; color: #666;">${i18n.t('search_no_results')}</div>`;
        return;
    }

    let grid = isAppend ? container.querySelector('.beer-grid') : null;
    const viewMode = Storage.getPreference('viewMode', 'grid');
    const gridClasses = viewMode === 'list' ? 'beer-grid view-list is-chunked' : 'beer-grid is-chunked';

    const prefRevealRarity = Storage.getPreference('revealRarity', false);
    const prefAnimOnce = Storage.getPreference('anim_only_once', false);
    const prefBacEnabled = Storage.getPreference('bac_enabled', true);
    const prefCardCount = Storage.getPreference('card_stat_count', false);
    const prefCardVolume = Storage.getPreference('card_stat_volume', false);
    const prefShowBBPct = Storage.getPreference('card_brewbrother_pct', false)
        && Storage.getPreference('feat_brewbrother_enabled', true);
    const prefCardCountOrVolume = prefCardCount || prefCardVolume;
    const isLowEndPerf = document.body.classList.contains('perf-low-end');
    const isTouchPrimary = window.matchMedia('(hover: none) and (pointer: coarse)').matches;

    const bacBadgeCache = new NativeMap();
    const getBacBadge = (volume, alcohol) => {
        const key = `${volume}|${alcohol}`;
        if (bacBadgeCache.has(key)) return bacBadgeCache.get(key);
        let html = '';
        const driveInfo = BAC.getSpeculativeDriveInfo(volume, alcohol);
        if (driveInfo) {
            const timeHtml = driveInfo.timeStr ? `<span class="bac-time"> · ${driveInfo.timeStr}</span>` : '';
            html = `<div class="beer-card-bac-row" style="display:flex; justify-content:center; margin-top:8px;">
                    <div class="bac-speculative-badge" style="color:${driveInfo.color}; border-color:${driveInfo.color}33; display:inline-flex;">
                        <span class="bac-icon">${driveInfo.icon}</span>
                        <span>+${driveInfo.delta.toFixed(2)}</span>${timeHtml}
                    </div>
                </div>`;
        }
        bacBadgeCache.set(key, html);
        return html;
    };

    if (!grid) {
        if (!isAppend) container.innerHTML = '';
        grid = document.createElement('div');
        grid.className = gridClasses;
        container.appendChild(grid);
    } else {
        grid.className = gridClasses;
    }

    const renderCtx = {
        userData,
        prefRevealRarity,
        prefAnimOnce,
        prefBacEnabled,
        prefCardCount,
        prefCardVolume,
        prefCardCountOrVolume,
        prefShowBBPct,
        getBacBadge,
        isLowEndPerf
    };

    const existingOffset = isAppend ? grid.querySelectorAll('.beer-card').length : 0;
    const observer = _ensureChunkObserver(grid, isLowEndPerf, isTouchPrimary);

    for (let start = 0; start < filteredBeers.length; start += CHUNK_SIZE) {
        const slice = filteredBeers.slice(start, start + CHUNK_SIZE);
        const chunk = document.createElement('div');
        chunk.className = 'beer-grid-chunk';
        chunk.dataset.virtualized = '0';
        chunk._beers = slice;
        chunk._baseIndex = existingOffset + start;
        chunk._renderCtx = renderCtx;

        const frag = document.createDocumentFragment();
        slice.forEach((beer, offset) => {
            frag.appendChild(_buildCardElement(beer, existingOffset + start + offset, renderCtx));
        });
        chunk.appendChild(frag);
        grid.appendChild(chunk);
        applyRarityAnimations(chunk);

        if (observer) observer.observe(chunk);
    }

    if (!isTouchPrimary && !isLowEndPerf) {
        _initTiltOnContainer(grid);
    }
}

export function generateStarRatingHTML(currentValue = 0, beerId = '', maxStars = 5) {
    const value = Math.min(maxStars * 2, Math.max(0, currentValue));

    let starsHtml = '';
    for (let i = 1; i <= maxStars; i++) {
        const starValue = i * 2;
        const halfValue = starValue - 1;

        let cls = '';
        if (value >= starValue) cls = 'full';
        else if (value >= halfValue) cls = 'half';

        starsHtml += `
            <div class="star ${cls}" data-beer="${beerId}" data-half="${halfValue}" data-full="${starValue}">
                <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                        <clipPath id="star-left-${beerId}-${i}">
                            <rect x="0" y="0" width="12" height="24"/>
                        </clipPath>
                        <clipPath id="star-right-${beerId}-${i}">
                            <rect x="12" y="0" width="12" height="24"/>
                        </clipPath>
                    </defs>
                    <path class="star-bg" d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                    <path class="star-fill-left" clip-path="url(#star-left-${beerId}-${i})" d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                    <path class="star-fill-right" clip-path="url(#star-right-${beerId}-${i})" d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                </svg>
            </div>
        `;
    }

    const displayValue = value > 0 ? `${value}/10` : '';

    return `
        <div class="star-rating" data-beer="${beerId}" data-value="${value}">
            ${starsHtml}
        </div>
        <span class="star-label" data-beer="${beerId}">${displayValue}</span>
    `;
}

export function renderUnratedBanner(allBeers, container, migrationPrompts = []) {
    const userData = Storage.getAllUserData();
    const consumedIds = Storage.getAllConsumedBeerIds();

    const unratedBeers = [];
    consumedIds.forEach(id => {
        const user = userData[id];
        const beer = allBeers.find(b => String(b.id) === String(id));
        if (beer && user && (user.count || 0) > 0 && (!user.score && user.score !== 0)) {
            unratedBeers.push({ beer, user });
        }
    });

    const hasMigrations = migrationPrompts && migrationPrompts.length > 0;
    if (unratedBeers.length === 0 && !hasMigrations) return '';

    const migrationChipsHtml = hasMigrations ? migrationPrompts.map(m => {
        return `
            <div class="migration-chip" data-custom-id="${m.customBeer.id}" data-official-id="${m.officialBeer.id}"
                 style="display: flex; align-items: center; gap: 8px; background: linear-gradient(135deg, rgba(255,192,0,0.12), rgba(255,153,0,0.08)); border: 1px solid rgba(255,192,0,0.3); padding: 5px 12px 5px 5px; border-radius: 24px; flex: 0 0 auto; cursor: pointer; backdrop-filter: blur(5px); box-shadow: 0 4px 10px rgba(255,192,0,0.1);">
                <div style="width: 28px; height: 28px; border-radius: 50%; background: rgba(255,192,0,0.2); display: flex; align-items: center; justify-content: center; font-size: 14px;">🔄</div>
                <span style="font-size: 0.75rem; font-weight: 600; color: var(--accent-gold); max-width: 140px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${m.customBeer.title}</span>
                <span style="font-size: 0.6rem; color: #888; padding: 1px 5px; background: rgba(255,255,255,0.05); border-radius: 8px;">${m.score}%</span>
            </div>
        `;
    }).join('') : '';

    const slidesHtml = unratedBeers.slice(0, 15).map(({ beer }) => {
        const fallbackImg = 'images/beer/default.png';
        const img = (beer.image && !isMissingImage(beer.image)) ? beer.image : fallbackImg;

        return `
            <div class="unrated-chip" data-beer-id="${beer.id}" style="display: flex; align-items: center; gap: 8px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); padding: 5px 12px 5px 5px; border-radius: 24px; flex: 0 0 auto; cursor: pointer; backdrop-filter: blur(5px); box-shadow: 0 4px 10px rgba(0,0,0,0.2);">
                <img src="${img}" alt="" onerror="this.src='${fallbackImg}'" style="width: 28px; height: 28px; border-radius: 50%; object-fit: contain; background: #222;">
                <span style="font-size: 0.8rem; font-weight: 500; color: #fff; max-width: 140px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${beer.title}</span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent-gold)" stroke-width="2.5" style="margin-left: 2px;"><path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"></path></svg>
            </div>
        `;
    }).join('');

    const totalCount = unratedBeers.length + (migrationPrompts ? migrationPrompts.length : 0);

    const bannerHtml = `
        <div class="unrated-banner-modern" style="margin: 10px 15px 15px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                <h4 style="font-size: 0.8rem; color: var(--accent-gold); margin: 0; display: flex; align-items: center; gap: 6px;">${hasMigrations ? (i18n.t('banner_actions_title') || '⚡ Actions') : i18n.t('unrated_banner_title')}</h4>
                <span style="font-size: 0.7rem; color: #888; background: rgba(255, 255, 255, 0.06); padding: 2px 8px; border-radius: 10px;">${totalCount}</span>
            </div>
            <div style="display: flex; gap: 10px; overflow-x: auto; scrollbar-width: none; padding-bottom: 5px; -webkit-overflow-scrolling: touch;">
                ${migrationChipsHtml}${slidesHtml}
            </div>
        </div>
    `;

    container.insertAdjacentHTML('afterbegin', bannerHtml);

    const banner = container.querySelector('.unrated-banner-modern');
    if (banner) {
        banner.querySelectorAll('.unrated-chip').forEach(chip => {
            chip.addEventListener('click', (e) => {
                e.stopPropagation();
                const beerId = chip.dataset.beerId;
                const beer = allBeers.find(b => String(b.id) === String(beerId));
                if (beer && window.UI?.renderBeerDetail) {
                    window.UI.renderBeerDetail(beer, (ratingData) => {
                        if (window.UI._saveRatingFromDetail) {
                            window.UI._saveRatingFromDetail(beer, ratingData, () => window.renderCurrentView?.());
                        }
                    });
                }
            });
        });

        banner.querySelectorAll('.migration-chip').forEach(chip => {
            chip.addEventListener('click', (e) => {
                e.stopPropagation();
                const customId = chip.dataset.customId;
                const officialId = chip.dataset.officialId;
                const match = migrationPrompts.find(m =>
                    m.customBeer.id === customId && m.officialBeer.id === officialId
                );
                if (match) {
                    _renderMigrationModal(match, allBeers, container, migrationPrompts);
                }
            });
        });
    }

    return bannerHtml;
}

function _renderMigrationModal(match, allBeers, parentContainer, migrationPrompts) {
    const modalContainer = getModalContainer();
    if (!modalContainer) return;

    const { customBeer, officialBeer, score } = match;
    const userData = Storage.getAllUserData();
    const customData = userData[customBeer.id] || {};

    const customImg = customBeer.image || 'images/beer/default.png';
    const officialImg = officialBeer.image || 'images/beer/default.png';
    const drinkCount = customData.count || 0;
    const historyCount = (customData.history || []).length;
    const hasRating = customData.score !== undefined;

    const migrationTitleText = i18n.t('migration_title') || 'Transfert disponible';
    const migrationSubtitleText = i18n.t('migration_subtitle') || 'Votre bière personnalisée correspond à une bière officielle.';
    const migrationCustomLabel = i18n.t('migration_label_custom') || 'Personnalisée';
    const migrationOfficialLabel = i18n.t('migration_label_official') || 'Officielle';
    const migrationSimilarityText = i18n.t('migration_similarity') || 'Similarité';
    const migrationDrinksText = i18n.t('migration_drinks') || 'Consommations';
    const migrationHistoryText = i18n.t('migration_history') || 'Historique';
    const migrationEntriesText = i18n.t('migration_entries') || 'entrées';
    const migrationRatingText = i18n.t('migration_rating') || 'Note';
    const migrationDismissText = i18n.t('migration_btn_dismiss') || 'Ignorer';
    const migrationTransferText = i18n.t('migration_btn_reconcile') || 'Fusionner et remplacer';

    const hasComment = !!customData.comment;
    const isFav = !!customData.favorite;

    modalContainer.innerHTML = `
        <div class="modal-overlay active" id="migration-overlay">
            <div class="modal-content" style="max-width: 440px; border: 1px solid rgba(255,192,0,0.3); background: var(--bg-card); max-height: 90vh; overflow-y: auto;">
                <div style="text-align: center; padding: 20px 20px 10px;">
                    <div style="font-size: 2rem; margin-bottom: 8px;">🔄</div>
                    <h3 style="color: var(--accent-gold); font-family: 'Russo One', sans-serif; margin-bottom: 5px;">
                        ${migrationTitleText}
                    </h3>
                    <p style="font-size: 0.8rem; color: #888; margin-bottom: 12px;">
                        ${migrationSubtitleText}
                    </p>
                </div>

                <div style="display: flex; align-items: center; justify-content: center; gap: 12px; padding: 12px; background: rgba(255,255,255,0.03); border-radius: 12px; margin: 0 15px 12px;">
                    <div style="text-align: center; flex: 1;">
                        <img src="${customImg}" alt="" onerror="this.src='images/beer/default.png'"
                             style="width: 55px; height: 55px; object-fit: contain; border-radius: 8px; background: #222; margin-bottom: 6px;">
                        <div style="font-size: 0.8rem; font-weight: bold; color: #aaa; max-width: 130px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; margin: 0 auto;">${customBeer.title}</div>
                        <div style="font-size: 0.7rem; color: #777;">${customBeer.brewery || 'Brasserie inconnue'}</div>
                        <div style="font-size: 0.65rem; color: #888; margin-top: 2px;">${customBeer.alcohol || '?'}% • ${customBeer.volume || '33cl'}</div>
                        <div style="font-size: 0.65rem; color: #e67e22; font-weight: bold; margin-top: 2px;">${migrationCustomLabel}</div>
                    </div>

                    <div style="font-size: 1.5rem; color: var(--accent-gold); flex-shrink: 0;">→</div>

                    <div style="text-align: center; flex: 1;">
                        <img src="${officialImg}" alt="" onerror="this.src='images/beer/default.png'"
                             style="width: 55px; height: 55px; object-fit: contain; border-radius: 8px; background: #222; margin-bottom: 6px;">
                        <div style="font-size: 0.8rem; font-weight: bold; color: #fff; max-width: 130px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; margin: 0 auto;">${officialBeer.title}</div>
                        <div style="font-size: 0.7rem; color: var(--accent-gold);">${officialBeer.brewery || ''}</div>
                        <div style="font-size: 0.65rem; color: #aaa; margin-top: 2px;">${officialBeer.type || ''} • ${officialBeer.alcohol || ''}</div>
                        <div style="font-size: 0.65rem; color: var(--accent-gold); font-weight: bold; margin-top: 2px;">${migrationOfficialLabel}</div>
                    </div>
                </div>

                <div style="padding: 0 15px 12px; font-size: 0.8rem; color: #aaa;">
                    <div style="background: rgba(255,255,255,0.03); padding: 12px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.05);">
                        <div style="font-weight: bold; color: #ddd; margin-bottom: 6px; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.5px;">📋 Données à transférer</div>
                        <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                            <span>${migrationSimilarityText}</span>
                            <span style="color: var(--accent-gold); font-weight: bold;">${score}%</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                            <span>${migrationDrinksText}</span>
                            <span style="color: #fff; font-weight: bold;">${drinkCount} conso(s)</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                            <span>${migrationHistoryText}</span>
                            <span style="color: #fff;">${historyCount} ${migrationEntriesText}</span>
                        </div>
                        ${hasRating ? `<div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                            <span>${migrationRatingText}</span>
                            <span style="color: #fff; font-weight: bold;">${customData.score}/20</span>
                        </div>` : ''}
                        ${hasComment ? `<div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                            <span>Commentaire</span>
                            <span style="color: #aaa; font-style: italic; max-width: 180px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">"${customData.comment}"</span>
                        </div>` : ''}
                        ${isFav ? `<div style="display: flex; justify-content: space-between;">
                            <span>Statut</span>
                            <span style="color: var(--accent-gold);">⭐ Favori</span>
                        </div>` : ''}
                    </div>
                </div>

                <div style="margin: 0 15px 15px; padding: 10px 12px; background: rgba(244,67,54,0.12); border: 1px solid rgba(244,67,54,0.35); border-radius: 8px; color: #ff8a80; font-size: 0.75rem; line-height: 1.4; text-align: center;">
                    ⚠️ <strong>Action définitive :</strong> La bière personnalisée sera <u>définitivement supprimée</u> de votre collection après la fusion complète de vos consommations, notes et historique vers la bière officielle.
                </div>

                <div style="display: flex; gap: 10px; padding: 0 15px 20px;">
                    <button id="btn-migration-dismiss" class="btn-primary" style="flex: 1; background: #222; border: 1px solid #444; color: #aaa; margin: 0; padding: 10px;">
                        ${migrationDismissText}
                    </button>
                    <button id="btn-migration-confirm" class="btn-primary" style="flex: 1; background: var(--accent-gold); color: #000; font-weight: bold; margin: 0; padding: 10px;">
                        ${migrationTransferText}
                    </button>
                </div>
            </div>
        </div>
    `;

    modalContainer.style.display = '';
    modalContainer.classList.remove('hidden');

    const overlay = document.getElementById('migration-overlay');
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
            modalContainer.style.display = '';
            modalContainer.classList.add('hidden');
            modalContainer.innerHTML = '';
        }
    });

    document.getElementById('btn-migration-dismiss').addEventListener('click', () => {
        Deduplicator.dismissMatch(customBeer.id, officialBeer.id);
        const idx = migrationPrompts.findIndex(m => m.customBeer.id === customBeer.id && m.officialBeer.id === officialBeer.id);
        if (idx !== -1) migrationPrompts.splice(idx, 1);
        modalContainer.style.display = '';
        modalContainer.classList.add('hidden');
        modalContainer.innerHTML = '';
        showToast(i18n.t('migration_dismissed') || 'Suggestion ignorée', 'info');
        const existingBanner = parentContainer.querySelector('.unrated-banner-modern');
        if (existingBanner) existingBanner.remove();
        renderUnratedBanner(allBeers, parentContainer, migrationPrompts);
    });

    document.getElementById('btn-migration-confirm').addEventListener('click', () => {
        const result = Storage.migrateBeerData(customBeer.id, officialBeer.id);
        if (result.success) {
            Storage.savePreference('dedup_manually_triggered', true);
            window.dispatchEvent(new Event('beerdex-action'));

            const bIdx = allBeers.findIndex(b => b.id === customBeer.id);
            if (bIdx !== -1) allBeers.splice(bIdx, 1);

            const idx = migrationPrompts.findIndex(m => m.customBeer.id === customBeer.id && m.officialBeer.id === officialBeer.id);
            if (idx !== -1) migrationPrompts.splice(idx, 1);

            modalContainer.style.display = '';
            modalContainer.classList.add('hidden');
            modalContainer.innerHTML = '';
            showToast(i18n.t('migration_success') || `Transféré ! ${result.transferred.count} conso(s) et ${result.transferred.history} entrée(s) d'historique.`, 'success');
            Feedback.playSuccess();

            const existingBanner = parentContainer.querySelector('.unrated-banner-modern');
            if (existingBanner) existingBanner.remove();
            renderUnratedBanner(allBeers, parentContainer, migrationPrompts);
            if (migrationPrompts.length === 0) window.renderCurrentView?.();
        } else {
            showToast(i18n.t('migration_error') || 'Erreur lors du transfert.', 'error');
        }
    });
}
