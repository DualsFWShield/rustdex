/**
 * label-scanner.js — Scan d'étiquette OCR (TextDetector natif) + Recherche rapide Fût / Pression
 */

import * as Utils from './utils.js';
import { i18n } from './i18n.js';

const STYLE_PILLS = [
    { id: 'all', label: 'Toutes' },
    { id: 'blonde', label: 'Blonde', match: (t) => /blond|golden|pils|lager|helles/i.test(t) },
    { id: 'ipa', label: 'IPA / Pale', match: (t) => /ipa|apa|pale ale|neipa/i.test(t) },
    { id: 'blanche', label: 'Blanche', match: (t) => /blanche|wit|weizen|wheat/i.test(t) },
    { id: 'ambree', label: 'Ambrée / Rousse', match: (t) => /ambr|amber|rousse|red|bock/i.test(t) },
    { id: 'brune', label: 'Brune / Stout', match: (t) => /brun|dubbel|stout|porter|quad|noire/i.test(t) },
    { id: 'tripel', label: 'Triple / Abbaye', match: (t) => /tripel|triple|trappist|abbaye|abdij/i.test(t) },
    { id: 'fruitee', label: 'Fruitée / Sour', match: (t) => /fruit|kriek|lambic|gueuze|sour|framboise|cerise|peche/i.test(t) }
];

const ABV_PILLS = [
    { id: 'all', label: 'Tout °', min: -1, max: 999 },
    { id: 'low', label: '< 5°', min: 0, max: 4.99 },
    { id: 'mid', label: '5° – 7°', min: 5, max: 7 },
    { id: 'strong', label: '7° – 9°', min: 7.01, max: 9 },
    { id: 'heavy', label: '9°+', min: 9.01, max: 99 }
];

function _parseAbv(raw) {
    if (!raw) return null;
    const v = parseFloat(String(raw).replace('%', '').replace('°', '').replace(',', '.'));
    return isNaN(v) ? null : v;
}

function _scoreBeerAgainstTokens(beer, tokens, abvHint) {
    const titleNorm = Utils.normalize(beer.title || '');
    const brewNorm = Utils.normalize(beer.brewery || '');
    const typeNorm = Utils.normalize(beer.type || '');
    let score = 0;

    for (const tok of tokens) {
        if (titleNorm.includes(tok)) score += 3;
        else if (brewNorm.includes(tok)) score += 2;
        else if (typeNorm.includes(tok)) score += 1;
    }

    if (abvHint !== null) {
        const bAbv = _parseAbv(beer.alcohol);
        if (bAbv !== null && Math.abs(bAbv - abvHint) <= 0.3) score += 2;
    }
    return score;
}

export function renderLabelAndTapTab(container, { onSelectBeer, onCreateManual } = {}) {
    const isEn = i18n.getLanguage() === 'en';
    const hasTextDetector = typeof window !== 'undefined' && 'TextDetector' in window;
    const allBeers = Array.isArray(window.allBeers) ? window.allBeers : [];

    let selectedStyle = 'all';
    let selectedAbv = 'all';
    let queryText = '';
    let ocrKeywords = [];

    const T = isEn ? {
        ocrTitle: 'Label Photo OCR',
        ocrBtn: '📸 Take / Pick Label Photo',
        ocrScanning: 'Reading label text...',
        ocrUnsupported: 'On-device OCR (TextDetector) is unavailable in this browser. Use the quick tap finder below!',
        ocrNoText: 'No readable text detected on this label. Refine manually below.',
        ocrDetected: 'Detected keywords:',
        tapTitle: 'Quick Tap & Multi-Criteria Finder',
        tapPlaceholder: 'Keywords from tap handle, beer or brewery...',
        noMatch: 'No matching beer found.',
        createBtn: '➕ Add Beer Manually'
    } : {
        ocrTitle: 'Scan photo d’étiquette (OCR)',
        ocrBtn: '📸 Prendre / Choisir une photo',
        ocrScanning: 'Analyse du texte de l’étiquette...',
        ocrUnsupported: 'La reconnaissance OCR native (TextDetector) n’est pas supportée ici. Utilisez la recherche rapide Pression juste dessous !',
        ocrNoText: 'Aucun texte lisible détecté sur l’image. Recherchez manuellement ci-dessous.',
        ocrDetected: 'Mots détectés :',
        tapTitle: 'Recherche rapide Pression / Multi-critères',
        tapPlaceholder: 'Nom sur la pompe, brasserie, mots-clés...',
        noMatch: 'Aucune bière correspondante.',
        createBtn: '➕ Ajouter cette bière'
    };

    container.innerHTML = `
        <div class="label-tap-panel">
            <div class="label-ocr-box">
                <div class="label-ocr-title">🏷️ ${T.ocrTitle}</div>
                <label class="label-ocr-upload-btn">
                    <input type="file" id="label-ocr-file" accept="image/*" capture="environment" hidden>
                    <span>${T.ocrBtn}</span>
                </label>
                <div id="label-ocr-preview-wrap" class="label-ocr-preview-wrap hidden">
                    <img id="label-ocr-preview" alt="Label preview">
                </div>
                <div id="label-ocr-status" class="label-ocr-status">
                    ${hasTextDetector ? '' : `<span class="label-ocr-note">${T.ocrUnsupported}</span>`}
                </div>
            </div>

            <div class="tap-finder-box">
                <div class="label-ocr-title">🍺 ${T.tapTitle}</div>
                <input type="search" id="tap-finder-query" class="form-input" placeholder="${T.tapPlaceholder}" autocomplete="off">

                <div class="tap-finder-pills" id="tap-style-pills">
                    ${STYLE_PILLS.map(p => `<button type="button" class="tap-pill ${p.id === selectedStyle ? 'is-active' : ''}" data-style="${p.id}">${p.label}</button>`).join('')}
                </div>

                <div class="tap-finder-pills" id="tap-abv-pills">
                    ${ABV_PILLS.map(p => `<button type="button" class="tap-pill ${p.id === selectedAbv ? 'is-active' : ''}" data-abv="${p.id}">${p.label}</button>`).join('')}
                </div>

                <div id="tap-finder-results" class="tap-finder-results"></div>
                ${onCreateManual ? `<button type="button" id="btn-tap-create-manual" class="setting-btn" style="width:100%; margin-top:8px;">${T.createBtn}</button>` : ''}
            </div>
        </div>
    `;

    const resultsEl = container.querySelector('#tap-finder-results');
    const queryEl = container.querySelector('#tap-finder-query');
    const ocrFileEl = container.querySelector('#label-ocr-file');
    const ocrStatusEl = container.querySelector('#label-ocr-status');
    const previewWrap = container.querySelector('#label-ocr-preview-wrap');
    const previewImg = container.querySelector('#label-ocr-preview');

    const renderResults = () => {
        const styleObj = STYLE_PILLS.find(s => s.id === selectedStyle);
        const abvObj = ABV_PILLS.find(a => a.id === selectedAbv);
        const normQ = Utils.normalize(queryText || '');
        const queryTokens = normQ.split(/\s+/).filter(t => t.length >= 2);
        const tokens = ocrKeywords.length > 0 ? ocrKeywords : queryTokens;

        let filtered = allBeers.filter(b => {
            if (styleObj && styleObj.match && !styleObj.match(`${b.type || ''} ${b.title || ''}`)) return false;
            if (abvObj && abvObj.id !== 'all') {
                const abv = _parseAbv(b.alcohol);
                if (abv === null || abv < abvObj.min || abv > abvObj.max) return false;
            }
            if (normQ) {
                const hay = Utils.normalize(`${b.title || ''} ${b.brewery || ''} ${b.type || ''}`);
                if (!queryTokens.every(tok => hay.includes(tok))) return false;
            }
            return true;
        });

        if (tokens.length > 0) {
            filtered = filtered
                .map(b => ({ beer: b, score: _scoreBeerAgainstTokens(b, tokens, null) }))
                .filter(item => ocrKeywords.length === 0 || item.score > 0 || normQ.length > 0)
                .sort((a, b) => b.score - a.score)
                .map(item => item.beer);
        }

        const top = filtered.slice(0, 12);
        if (top.length === 0) {
            resultsEl.innerHTML = `<div class="tap-finder-empty">${T.noMatch}</div>`;
            return;
        }

        resultsEl.innerHTML = top.map(b => `
            <button type="button" class="tap-result-item" data-beer-id="${Utils.escapeHtml(b.id)}">
                <img src="${b.image || 'images/beer/default.png'}" alt="" onerror="this.src='images/beer/default.png'">
                <div class="tap-result-info">
                    <strong>${Utils.escapeHtml(b.title)}</strong>
                    <span>${Utils.escapeHtml(b.brewery || '')}</span>
                </div>
                <span class="tap-result-badge">${Utils.escapeHtml(b.alcohol || '?')} • ${Utils.escapeHtml(b.type || '')}</span>
            </button>
        `).join('');

        resultsEl.querySelectorAll('.tap-result-item').forEach(btn => {
            btn.onclick = () => {
                const beer = allBeers.find(x => String(x.id) === String(btn.dataset.beerId));
                if (beer && typeof onSelectBeer === 'function') {
                    onSelectBeer(beer);
                }
            };
        });
    };

    container.querySelectorAll('#tap-style-pills .tap-pill').forEach(btn => {
        btn.onclick = () => {
            selectedStyle = btn.dataset.style;
            container.querySelectorAll('#tap-style-pills .tap-pill').forEach(b => b.classList.toggle('is-active', b === btn));
            renderResults();
        };
    });

    container.querySelectorAll('#tap-abv-pills .tap-pill').forEach(btn => {
        btn.onclick = () => {
            selectedAbv = btn.dataset.abv;
            container.querySelectorAll('#tap-abv-pills .tap-pill').forEach(b => b.classList.toggle('is-active', b === btn));
            renderResults();
        };
    });

    if (queryEl) {
        queryEl.addEventListener('input', (e) => {
            queryText = e.target.value;
            ocrKeywords = [];
            renderResults();
        });
    }

    const createManualBtn = container.querySelector('#btn-tap-create-manual');
    if (createManualBtn && onCreateManual) {
        createManualBtn.onclick = () => onCreateManual();
    }

    if (ocrFileEl) {
        ocrFileEl.addEventListener('change', async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;

            const objUrl = URL.createObjectURL(file);
            if (previewImg && previewWrap) {
                previewImg.src = objUrl;
                previewWrap.classList.remove('hidden');
            }

            if (!hasTextDetector) {
                setTimeout(() => URL.revokeObjectURL(objUrl), 60000);
                return;
            }

            ocrStatusEl.innerHTML = `<span>⏳ ${T.ocrScanning}</span>`;
            try {
                const bitmap = await createImageBitmap(file);
                const detector = new window.TextDetector();
                const blocks = await detector.detect(bitmap);
                if (typeof bitmap.close === 'function') bitmap.close();

                const rawText = blocks.map(b => b.rawValue || '').join(' ').trim();
                const tokens = Array.from(new Set(
                    Utils.normalize(rawText)
                        .split(/[^a-z0-9]+/)
                        .filter(w => w.length >= 3 && !/^(alc|vol|beer|biere|bierre|cl|ml|deg)$/.test(w))
                )).slice(0, 12);

                if (tokens.length === 0) {
                    ocrStatusEl.innerHTML = `<span class="label-ocr-note">${T.ocrNoText}</span>`;
                    ocrKeywords = [];
                } else {
                    ocrKeywords = tokens;
                    ocrStatusEl.innerHTML = `<div class="label-ocr-tokens"><span>${T.ocrDetected}</span> ${tokens.slice(0, 6).map(t => `<code>${Utils.escapeHtml(t)}</code>`).join(' ')}</div>`;
                    if (queryEl) queryEl.value = '';
                    queryText = '';
                }
                renderResults();
            } catch (err) {
                console.warn('[LabelOCR] Detection failed:', err);
                ocrStatusEl.innerHTML = `<span class="label-ocr-note">${T.ocrNoText}</span>`;
            } finally {
                setTimeout(() => URL.revokeObjectURL(objUrl), 60000);
            }
        });
    }

    renderResults();
}
