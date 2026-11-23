/**
 * compare.js — Comparateur de bières côte à côte (2 à 3 fiches)
 */

import * as Storage from './storage.js';
import * as Utils from './utils.js';
import { i18n } from './i18n.js';

const MAX_COMPARE = 3;
let _compareIds = [];

function _getAllBeers() {
    return Array.isArray(window.allBeers) ? window.allBeers : [];
}

function _getBeerById(id) {
    const map = window.beerMap;
    if (map && typeof map.get === 'function') {
        const found = map.get(String(id));
        if (found) return found;
    }
    return _getAllBeers().find(b => String(b.id) === String(id)) || null;
}

export function getCompareIds() {
    return [..._compareIds];
}

export function addToCompare(beerOrId) {
    const id = typeof beerOrId === 'object' ? beerOrId?.id : beerOrId;
    if (!id) return _compareIds;
    const strId = String(id);
    if (_compareIds.includes(strId)) return _compareIds;
    if (_compareIds.length >= MAX_COMPARE) {
        _compareIds.shift();
    }
    _compareIds.push(strId);
    return _compareIds;
}

export function removeFromCompare(id) {
    const strId = String(id);
    _compareIds = _compareIds.filter(item => item !== strId);
    return _compareIds;
}

export function clearCompare() {
    _compareIds = [];
}

function _parseNum(val, fallback = 0) {
    if (val === null || val === undefined) return fallback;
    const n = parseFloat(String(val).replace('%', '').replace('°', '').replace(',', '.'));
    return isNaN(n) ? fallback : n;
}

function _computeMetrics(beer, userData) {
    const u = userData[beer.id] || {};
    const abv = _parseNum(beer.alcohol, 0);
    const volMl = Utils.parseVolumeToMl(beer.volume) || 330;
    const pureGrams = volMl * (abv / 100) * 0.8;
    const calories = Math.round(pureGrams * 7 + volMl * 0.03);
    const userScore = u.score !== undefined && u.score !== '' ? parseFloat(u.score) : null;
    const commScore = beer.community_rating ? parseFloat(beer.community_rating) : null;
    let bbMatch = null;
    if (window.Recommendation && typeof window.Recommendation.getBeerMatchScoreSync === 'function') {
        const res = window.Recommendation.getBeerMatchScoreSync(beer);
        if (res && typeof res.total === 'number') bbMatch = Math.round(res.total * 100);
    }
    return {
        abv,
        volMl,
        pureGrams,
        calories,
        userScore,
        commScore,
        count: u.count || 0,
        aromas: Array.isArray(u.aromas) ? u.aromas : [],
        bbMatch
    };
}

export function openCompareModal(initialBeer = null) {
    if (initialBeer) {
        addToCompare(initialBeer);
    }

    const lang = i18n.getLanguage() === 'en' ? 'en' : 'fr';
    const L = lang === 'en' ? {
        title: 'Beer Comparator',
        subtitle: 'Compare 2 to 3 beers side by side',
        searchPlaceholder: 'Search a beer to add (name, brewery, style)...',
        clear: 'Clear',
        emptyHint: 'Pick at least 2 beers using the search box above to compare specs side by side.',
        rowStyle: 'Style',
        rowAbv: 'ABV',
        rowVol: 'Volume',
        rowCalories: 'Calories',
        rowPureAlc: 'Pure Alcohol',
        rowUserScore: 'My Score',
        rowCommScore: 'Community',
        rowRarity: 'Rarity',
        rowMatch: 'BrewBrother',
        rowAromas: 'Aromas',
        rowOrigin: 'Origin',
        drunkCount: 'Tasted',
        addQuick: 'Quick Suggestions',
        openDetail: 'Open Sheet'
    } : {
        title: 'Comparateur de Bières',
        subtitle: 'Comparez 2 à 3 fiches côte à côte',
        searchPlaceholder: 'Rechercher une bière à ajouter (nom, brasserie, style)...',
        clear: 'Vider',
        emptyHint: 'Sélectionnez au moins 2 bières ci-dessus pour afficher le duel comparatif.',
        rowStyle: 'Style',
        rowAbv: 'Degré',
        rowVol: 'Format',
        rowCalories: 'Calories',
        rowPureAlc: 'Alcool pur',
        rowUserScore: 'Ma Note',
        rowCommScore: 'Communauté',
        rowRarity: 'Rareté',
        rowMatch: 'BrewBrother',
        rowAromas: 'Arômes',
        rowOrigin: 'Origine',
        drunkCount: 'Dégustations',
        addQuick: 'Suggestions rapides',
        openDetail: 'Voir la fiche'
    };

    const wrapper = document.createElement('div');
    wrapper.className = 'modal-content compare-modal';
    wrapper.style.maxWidth = '760px';

    const renderBody = () => {
        const allBeers = _getAllBeers();
        const userData = Storage.getAllUserData();
        const selectedBeers = _compareIds.map(_getBeerById).filter(Boolean);

        // Find top suggestions (tasted favorites or top community beers not yet in compare)
        const suggestions = selectedBeers.length < MAX_COMPARE
            ? allBeers
                .filter(b => !_compareIds.includes(String(b.id)))
                .sort((a, b) => ((userData[b.id]?.score || 0) - (userData[a.id]?.score || 0)) || ((b.community_rating || 0) - (a.community_rating || 0)))
                .slice(0, 6)
            : [];

        const metricsList = selectedBeers.map(b => _computeMetrics(b, userData));
        const maxUser = Math.max(-1, ...metricsList.map(m => m.userScore ?? -1));
        const maxComm = Math.max(-1, ...metricsList.map(m => m.commScore ?? -1));
        const maxAbv = Math.max(-1, ...metricsList.map(m => m.abv));
        const minCal = metricsList.length ? Math.min(...metricsList.map(m => m.calories)) : -1;
        const maxBB = Math.max(-1, ...metricsList.map(m => m.bbMatch ?? -1));

        const rarityLabel = (r) => i18n.t(`rarity_${r || 'commun'}`) || (r || 'Commun');

        const colsHtml = selectedBeers.map((b, idx) => {
            const m = metricsList[idx];
            const img = b.image || 'images/beer/default.png';
            const titleEsc = Utils.escapeHtml(b.title);
            const brewEsc = Utils.escapeHtml(b.brewery || '');

            const winClass = (cond) => (selectedBeers.length >= 2 && cond) ? ' compare-winner' : '';
            const aromasText = m.aromas.length > 0
                ? m.aromas.slice(0, 4).map(a => i18n.t(`aroma_${a}`) || a).join(', ')
                : '—';

            return `
                <div class="compare-col" data-beer-id="${Utils.escapeHtml(b.id)}">
                    <button type="button" class="compare-remove-btn" data-remove="${Utils.escapeHtml(b.id)}" aria-label="Retirer">×</button>
                    <div class="compare-col-hero" data-open-id="${Utils.escapeHtml(b.id)}">
                        <img src="${img}" alt="${titleEsc}" onerror="this.src='images/beer/default.png'">
                        <h4 class="compare-col-title">${titleEsc}</h4>
                        <span class="compare-col-brewery">${brewEsc}</span>
                    </div>
                    <div class="compare-metrics">
                        <div class="compare-cell"><span class="compare-k">${L.rowStyle}</span><span class="compare-v">${Utils.escapeHtml(b.type || '—')}</span></div>
                        <div class="compare-cell${winClass(m.abv === maxAbv && maxAbv > 0)}"><span class="compare-k">${L.rowAbv}</span><span class="compare-v">${m.abv}°</span></div>
                        <div class="compare-cell"><span class="compare-k">${L.rowVol}</span><span class="compare-v">${Utils.escapeHtml(Utils.formatVolume(b.volume) || '33cl')}</span></div>
                        <div class="compare-cell${winClass(m.calories === minCal)}"><span class="compare-k">${L.rowCalories}</span><span class="compare-v">${m.calories} kcal</span></div>
                        <div class="compare-cell"><span class="compare-k">${L.rowPureAlc}</span><span class="compare-v">${m.pureGrams.toFixed(1)} g</span></div>
                        <div class="compare-cell${winClass(m.userScore !== null && m.userScore === maxUser && maxUser > 0)}"><span class="compare-k">${L.rowUserScore}</span><span class="compare-v">${m.userScore !== null ? m.userScore + '/20' : '—'}</span></div>
                        <div class="compare-cell${winClass(m.commScore !== null && m.commScore === maxComm && maxComm > 0)}"><span class="compare-k">${L.rowCommScore}</span><span class="compare-v">${m.commScore !== null ? '⭐ ' + m.commScore + '/5' : '—'}</span></div>
                        <div class="compare-cell"><span class="compare-k">${L.rowRarity}</span><span class="compare-v">${Utils.escapeHtml(rarityLabel(b.rarity))}</span></div>
                        <div class="compare-cell${winClass(m.bbMatch !== null && m.bbMatch === maxBB && maxBB > 0)}"><span class="compare-k">${L.rowMatch}</span><span class="compare-v">${m.bbMatch !== null ? '🤖 ' + m.bbMatch + '%' : '—'}</span></div>
                        <div class="compare-cell"><span class="compare-k">${L.rowOrigin}</span><span class="compare-v">${Utils.escapeHtml(b.searchCountry || b.countryCode || '—')}</span></div>
                        <div class="compare-cell"><span class="compare-k">${L.drunkCount}</span><span class="compare-v">${m.count}x</span></div>
                        <div class="compare-cell compare-cell--aromas"><span class="compare-k">${L.rowAromas}</span><span class="compare-v">${Utils.escapeHtml(aromasText)}</span></div>
                    </div>
                    <button type="button" class="setting-btn compare-open-detail" data-open-id="${Utils.escapeHtml(b.id)}">${L.openDetail}</button>
                </div>
            `;
        }).join('');

        wrapper.innerHTML = `
            <div class="compare-header">
                <div>
                    <h2>⚖️ ${L.title} <span class="compare-count-pill">${selectedBeers.length}/${MAX_COMPARE}</span></h2>
                    <p>${L.subtitle}</p>
                </div>
                <div style="display:flex; gap:8px;">
                    ${selectedBeers.length > 0 ? `<button type="button" id="btn-compare-clear" class="setting-btn danger">${L.clear}</button>` : ''}
                    <button type="button" id="btn-compare-close" class="setting-btn">✕</button>
                </div>
            </div>

            <div class="compare-picker">
                <input type="search" id="compare-search-input" class="form-input" placeholder="${L.searchPlaceholder}" autocomplete="off">
                <div id="compare-search-results" class="compare-search-results hidden"></div>
            </div>

            ${suggestions.length > 0 ? `
                <div class="compare-suggestions">
                    <span class="compare-suggestions-label">${L.addQuick}:</span>
                    ${suggestions.map(s => `<button type="button" class="compare-chip-add" data-add-id="${Utils.escapeHtml(s.id)}">+ ${Utils.escapeHtml(s.title)}</button>`).join('')}
                </div>
            ` : ''}

            ${selectedBeers.length === 0 ? `
                <div class="compare-empty">${L.emptyHint}</div>
            ` : `
                <div class="compare-grid compare-cols-${selectedBeers.length}">
                    ${colsHtml}
                </div>
            `}
        `;

        wrapper.querySelector('#btn-compare-close').onclick = () => window.UI?.closeModal?.();
        const clearBtn = wrapper.querySelector('#btn-compare-clear');
        if (clearBtn) {
            clearBtn.onclick = () => {
                clearCompare();
                renderBody();
            };
        }

        wrapper.querySelectorAll('.compare-remove-btn').forEach(btn => {
            btn.onclick = (e) => {
                e.stopPropagation();
                removeFromCompare(btn.dataset.remove);
                renderBody();
            };
        });

        wrapper.querySelectorAll('.compare-chip-add').forEach(btn => {
            btn.onclick = () => {
                addToCompare(btn.dataset.addId);
                renderBody();
            };
        });

        wrapper.querySelectorAll('[data-open-id]').forEach(el => {
            el.onclick = () => {
                const beer = _getBeerById(el.dataset.openId);
                if (beer && window.UI?.renderBeerDetail) {
                    window.UI.closeModal?.();
                    window.UI.renderBeerDetail(beer, (ratingData) => {
                        if (window.UI._saveRatingFromDetail) {
                            window.UI._saveRatingFromDetail(beer, ratingData, () => window.renderCurrentView?.());
                        }
                    });
                }
            };
        });

        const searchInput = wrapper.querySelector('#compare-search-input');
        const resultsBox = wrapper.querySelector('#compare-search-results');
        if (searchInput && resultsBox) {
            searchInput.addEventListener('input', (e) => {
                const q = Utils.normalize(e.target.value || '');
                if (q.length < 2) {
                    resultsBox.innerHTML = '';
                    resultsBox.classList.add('hidden');
                    return;
                }
                const matches = allBeers
                    .filter(b => {
                        const hay = Utils.normalize(`${b.title} ${b.brewery || ''} ${b.type || ''}`);
                        return hay.includes(q);
                    })
                    .slice(0, 8);

                if (matches.length === 0) {
                    resultsBox.innerHTML = '';
                    resultsBox.classList.add('hidden');
                    return;
                }
                resultsBox.innerHTML = matches.map(m => `
                    <button type="button" class="compare-search-hit" data-add-id="${Utils.escapeHtml(m.id)}">
                        <span><strong>${Utils.escapeHtml(m.title)}</strong> <small>${Utils.escapeHtml(m.brewery || '')}</small></span>
                        <span class="compare-hit-meta">${Utils.escapeHtml(m.type || '')} • ${Utils.escapeHtml(m.alcohol || '?')}</span>
                    </button>
                `).join('');
                resultsBox.classList.remove('hidden');

                resultsBox.querySelectorAll('.compare-search-hit').forEach(hit => {
                    hit.onclick = () => {
                        addToCompare(hit.dataset.addId);
                        renderBody();
                    };
                });
            });
        }
    };

    renderBody();
    window.UI?.openModal?.(wrapper);
}
