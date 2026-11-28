import { i18n } from './i18n.js';
import * as Env from './env.js';
import { Analytics } from './analytics.js';
import * as Storage from './storage.js';
import { EventSystem } from './event-system.js';
import * as Share from './share.js';
import Match from './match.js';
import * as Map from './map.js';
import * as API from './api.js';

import { Feedback } from './feedback.js';
import * as BAC from './bac.js';
import * as Achievements from './achievements.js';
import { AromaWheel } from './aroma-wheel.js';
import * as CrashLogger from './crashLogger.js';
import * as Deduplicator from './deduplicator.js';
import * as Theme from './theme.js';
import * as Utils from './utils.js';
import { isMissingImage } from './data.js';
import { updateWidgetData } from './widget-bridge.js';
import { renderFoodPairingSection } from './pairing.js';
import { openCompareModal } from './compare.js';
import { openBeerPassport } from './passport.js';

import {
    getModalContainer,
    showToast,
    modalStack,
    closeModal,
    openModal,
    showPromptModal,
    showConfirmModal,
    showAlertModal,
    applyRarityAnimations,
    updateNetworkStatus
} from './ui-modals.js';

import {
    _bgCachedSrc,
    isAlreadyCutoutSrc,
    removeImageBackground,
    renderBeerList,
    computeGridColumnCount,
    computeOptimalBatchSize,
    generateStarRatingHTML,
    renderUnratedBanner
} from './ui-cards.js';

import {
    renderSettings,
    filterSettings,
    checkPatchnotes,
    markPatchnotesSeen,
    renderPatchnotesSection
} from './ui-settings.js';

import { openUniversalScanner } from './ui-scanner.js';

export {
    updateNetworkStatus,
    showToast,
    modalStack,
    closeModal,
    openModal,
    showPromptModal,
    showConfirmModal,
    showAlertModal,
    applyRarityAnimations,
    removeImageBackground,
    renderBeerList,
    computeGridColumnCount,
    computeOptimalBatchSize,
    generateStarRatingHTML,
    renderUnratedBanner,
    renderSettings,
    filterSettings,
    checkPatchnotes,
    markPatchnotesSeen,
    renderPatchnotesSection,
    openUniversalScanner,
    openCompareModal,
    openBeerPassport
};

export function _saveRatingFromDetail(beer, ratingData, onDone) {
    const oldRating = Storage.getBeerRating(beer.id);
    Storage.saveBeerRating(beer.id, ratingData);
    if (window.allBeers) Achievements.checkAchievements(window.allBeers);

    const oldCount = oldRating ? (parseInt(oldRating.count) || 0) : 0;
    const newRating = Storage.getBeerRating(beer.id);
    const newCount = newRating ? (parseInt(newRating.count) || 0) : 0;
    Utils.syncBACFromCountDiff(beer, oldCount, newCount);

    showToast(i18n.t('toast_rating_saved'));
    updateWidgetData();
    if (typeof onDone === 'function') onDone(ratingData);
}

let editModeBeer = null;

function _loadScript(src) {
    return new Promise((resolve, reject) => {
        const s = document.createElement('script');
        s.src = src;
        s.onload = resolve;
        s.onerror = reject;
        document.head.appendChild(s);
    });
}

let chartJsPromise = null;
function loadChartJs() {
    if (chartJsPromise) return chartJsPromise;
    chartJsPromise = (async () => {
        if (window.Chart) return;
        try {
            await _loadScript('./js/vendor/chart.umd.min.js');
            try {
                await _loadScript('./js/vendor/chartjs-plugin-annotation.min.js');
            } catch {
                await _loadScript('https://cdn.jsdelivr.net/npm/chartjs-plugin-annotation@3.1.0/dist/chartjs-plugin-annotation.min.js');
            }
        } catch {
            await _loadScript('https://cdn.jsdelivr.net/npm/chart.js@4.4.7/dist/chart.umd.min.js');
            await _loadScript('https://cdn.jsdelivr.net/npm/chartjs-plugin-annotation@3.1.0/dist/chartjs-plugin-annotation.min.js');
        }
    })();
    return chartJsPromise;
}

import { checkAutoBackup, renderImportModal, renderExportModal, renderShareLink, renderOtaSyncModal } from './import-export.js';
export { checkAutoBackup, renderImportModal, renderExportModal, renderShareLink, renderOtaSyncModal };

window.UI = window.UI || {};
Object.assign(window.UI, {
    renderOtaSyncModal,
    renderImportModal,
    renderExportModal,
    openUniversalScanner,
    openCompareModal,
    openBeerPassport,
    showToast,
    openModal,
    closeModal,
    modalStack,
    showPromptModal,
    showConfirmModal,
    showAlertModal,
    _saveRatingFromDetail
});

// --- App Welcome & Consent Flow ---

export function checkAndShowWelcome() {
    if (Storage.getRawItem('beerdex_consent') !== 'true') return;

    const HAS_SEEN_KEY = 'beerdex_welcome_seen_v3';
    if (Storage.getRawItem(HAS_SEEN_KEY)) return;

    setTimeout(() => {
        if (typeof TutorialSystem !== 'undefined') {
            TutorialSystem.start();
        }
    }, 1000);
}

export async function checkAndShowConsent(onAccept) {
    const activeEvent = EventSystem.getActiveEvent();
    const shouldForce = EventSystem.shouldForceBanner();

    const bannerShownKey = activeEvent ? `event_banner_shown_${activeEvent.id}` : null;
    const eventBannerShown = bannerShownKey ? Storage.getPreference(bannerShownKey, false) : false;

    if (!shouldForce || eventBannerShown) {
        if (Storage.getRawItem('beerdex_consent') === 'true') {
            if (onAccept) onAccept();
            return;
        }
    }

    const bannerData = activeEvent?.banner;

    const wrapper = document.createElement('div');
    wrapper.style.cssText = `
        background: var(--bg-card);
        width: 90%;
        max-width: 500px;
        max-height: 85vh;
        display: flex;
        flex-direction: column;
        border-radius: 20px;
        padding: var(--spacing-lg);
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.8);
        border: 1px solid var(--accent-gold);
        position: relative;
    `;

    const bannerContent = (shouldForce && bannerData) ? `
        <div style="text-align: center; margin-bottom: 20px; flex-shrink: 0;">
            <div style="font-size: 3rem; margin-bottom: 10px;">🎭🏛️</div>
            <h2 style="color: var(--accent-gold); font-size: 1.6rem; margin-bottom: 10px;">${bannerData.title || "Exposition Beerdex"}</h2>
        </div>
        <div style="overflow-y: auto; flex: 1; padding-right: 5px; margin-bottom: 10px;">
            <div style="color: var(--text-primary); line-height: 1.6; font-size: 1.1rem; margin-bottom: 25px; text-align: center; background: rgba(255,192,0,0.1); padding: 20px; border-radius: 12px; border: 1px solid var(--accent-gold); font-family: 'Playfair Display', serif;">
                ${(bannerData.message || "").replace(/\n/g, '<br>')}
            </div>
        </div>
    ` : `
        <div style="text-align: center; margin-bottom: 20px; flex-shrink: 0;">
            <div style="font-size: 3rem; margin-bottom: 10px;">🍻</div>
            <h2 style="color: var(--accent-gold); font-size: 1.6rem; margin-bottom: 10px;">${i18n.t('filter_welcome')}</h2>
        </div>
        <div style="overflow-y: auto; flex: 1; padding-right: 5px; margin-bottom: 10px;">
            <div style="color: var(--text-secondary); line-height: 1.5; font-size: 0.95rem; margin-bottom: 25px; text-align: justify; background: var(--bg-dark); padding: 15px; border-radius: 12px; border: 1px solid var(--border-color);">
                <p style="margin-bottom: 15px; font-weight: bold; color: var(--text-primary);">${i18n.t('consent_intro')}</p>
                <ul style="padding-left: 20px; list-style-type: '👉 ';">
                    <li style="margin-bottom: 10px;"><strong>${i18n.t('consent_age_label')} :</strong> ${i18n.t('consent_age_text')}</li>
                    <li style="margin-bottom: 10px;"><strong>${i18n.t('consent_prevention_label')} :</strong> ${i18n.t('consent_prevention_text')}</li>
                    <li><strong>${i18n.t('consent_stats_label')} :</strong> ${i18n.t('consent_stats_text')}</li>
                </ul>
            </div>
        </div>
    `;

    wrapper.innerHTML = `
        ${bannerContent}
        <div style="display: flex; justify-content: center; width: 100%; margin-top: 10px; flex-shrink: 0;">
            <button id="btn-accept-consent" class="btn-primary" style="font-size: 1.1rem; padding: 16px 40px; width: auto; min-width: 250px; margin-top: 0; box-shadow: 0 4px 15px rgba(255,192,0,0.3);">
                ${(shouldForce && bannerData && bannerData.button) ? bannerData.button : i18n.t('consent_btn_accept')}
            </button>
        </div>
    `;

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.style.zIndex = '9999999';
    overlay.style.backdropFilter = 'blur(8px)';
    overlay.style.alignItems = 'center';

    overlay.onclick = (e) => {
        if (e.target === overlay) {
            wrapper.style.transform = 'translateX(-10px)';
            setTimeout(() => wrapper.style.transform = 'translateX(10px)', 100);
            setTimeout(() => wrapper.style.transform = 'translateX(-10px)', 200);
            setTimeout(() => wrapper.style.transform = 'translateX(0)', 300);
        }
    };

    overlay.appendChild(wrapper);
    document.body.appendChild(overlay);

    wrapper.querySelector('#btn-accept-consent').onclick = () => {
        if (window.navigator && window.navigator.vibrate) navigator.vibrate(50);

        Storage.setRawItem('beerdex_consent', 'true');

        if (activeEvent && bannerShownKey) {
            Storage.savePreference(bannerShownKey, true);
        }

        overlay.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
        overlay.style.opacity = '0';
        wrapper.style.transform = 'scale(0.9)';

        setTimeout(() => {
            overlay.remove();
            if (window.applyTheme) window.applyTheme();
            if (onAccept) onAccept();
            checkAndShowWelcome();
        }, 400);
    };
}

// --- Renders ---

export function renderFilterModal(allBeers, activeFilters, onApply) {
    const wrapper = document.createElement('div');
    wrapper.className = 'modal-content filter-modal';
    wrapper.style.padding = '0'; // Handle padding inside for layout
    wrapper.style.display = 'flex';
    wrapper.style.flexDirection = 'column';
    wrapper.style.maxHeight = '85vh';
    wrapper.style.overflow = 'hidden'; // Essential to prevent modal itself from scrolling, we scroll the form only

    const typeCategories = Utils.BEER_TYPE_CATEGORIES || [
        { id: 'Blonde', label: 'Blonde', icon: '🍺' },
        { id: 'Brune', label: 'Brune', icon: '🍫' },
        { id: 'Ambrée', label: 'Ambrée', icon: '🍯' },
        { id: 'Blanche', label: 'Blanche', icon: '🌾' },
        { id: 'Triple', label: 'Triple', icon: '⚡' },
        { id: 'Double', label: 'Double', icon: '✌️' },
        { id: 'Quadruple', label: 'Quadruple', icon: '👑' },
        { id: 'IPA', label: 'IPA', icon: '🌿' },
        { id: 'Stout / Porter', label: 'Stout / Porter', icon: '☕' },
        { id: 'Fruitée', label: 'Fruitée', icon: '🍒' },
        { id: 'Sour / Gueuze', label: 'Sour / Gueuze', icon: '🍋' },
        { id: 'Saison', label: 'Saison', icon: '🧑‍🌾' },
        { id: 'Pils / Lager', label: 'Pils / Lager', icon: '🧊' },
        { id: 'Sans Alcool', label: 'Sans Alcool', icon: '🚫' },
        { id: 'Noël / Saisonnière', label: 'Noël / Saisonnière', icon: '🎄' },
        { id: 'Spéciale / Autre', label: 'Spéciale / Autre', icon: '✨' }
    ];
    const breweries = ['All', ...new Set(allBeers.map(b => b.brewery).filter(Boolean))].sort();
    const countries = ['All', ...new Set(allBeers.map(b => b.searchCountry).filter(Boolean))].sort();
    const regions = ['All', ...new Set(allBeers.map(b => b.searchRegion).filter(Boolean))].sort();

    // Group regions by Country for a cleaner dropdown
    const regionByCountry = {};
    allBeers.forEach(b => {
        if (b.searchRegion && b.searchCountry) {
            if (!regionByCountry[b.searchCountry]) regionByCountry[b.searchCountry] = new Set();
            regionByCountry[b.searchCountry].add(b.searchRegion);
        }
    });

    let regionOptionsHtml = `<option value="All" ${activeFilters.region === 'All' || !activeFilters.region ? 'selected' : ''}>All</option>`;
    Object.keys(regionByCountry).sort().forEach(country => {
        regionOptionsHtml += `<optgroup label="${country}">`;
        [...regionByCountry[country]].sort().forEach(reg => {
            regionOptionsHtml += `<option value="${reg}" ${activeFilters.region === reg ? 'selected' : ''}>${reg}</option>`;
        });
        regionOptionsHtml += `</optgroup>`;
    });

    const prodVolumes = ['All', ...new Set(allBeers.map(b => b.production_volume).filter(Boolean))].sort();
    const distributions = ['All', ...new Set(allBeers.map(b => b.distribution).filter(Boolean))].sort();

    const createOptions = (list, selected) => list.map(item => `<option value="${item}" ${item === selected ? 'selected' : ''}>${item}</option>`).join('');

    wrapper.innerHTML = `
        <!-- HEADER -->
        <div style="background:var(--bg-card); padding:15px 20px; border-bottom:1px solid rgba(255,255,255,0.1); border-radius:12px 12px 0 0; display:flex; justify-content:space-between; align-items:center; flex-shrink:0;">
            <h2 style="margin:0; font-size:1.4rem;">${i18n.t('filter_title')}</h2>
            <button type="button" id="btn-reset-top" style="background:none; border:none; color:var(--accent-gold); font-size:0.9rem; cursor:pointer; font-weight:bold;">${i18n.t('btn_reset')}</button>
        </div>

        <!-- TABS -->
        <div class="filter-tabs" style="display:flex; overflow-x:auto; gap:10px; padding:12px 20px; scrollbar-width:none; flex-shrink:0; align-items:center;">
            <button type="button" class="ftab active" data-tab="tab-gen" style="background:var(--accent-gold); color:#000; border:none; padding:8px 14px; border-radius:20px; font-weight:bold; cursor:pointer; white-space:nowrap; display:flex; align-items:center; gap:6px;">
                <span>${i18n.t('tab_general')}</span>
                <span class="tab-badge" id="badge-tab-gen" style="display:none; background:rgba(0,0,0,0.25); color:#000; font-size:0.75rem; padding:1px 6px; border-radius:10px;">0</span>
            </button>
            <button type="button" class="ftab" data-tab="tab-tri" style="background:#333; color:#fff; border:none; padding:8px 14px; border-radius:20px; font-weight:bold; cursor:pointer; white-space:nowrap; display:flex; align-items:center; gap:6px;">
                <span>${i18n.t('tab_sort_notes')}</span>
                <span class="tab-badge" id="badge-tab-tri" style="display:none; background:var(--accent-gold); color:#000; font-size:0.75rem; padding:1px 6px; border-radius:10px;">0</span>
            </button>
            <button type="button" class="ftab" data-tab="tab-attr" style="background:#333; color:#fff; border:none; padding:8px 14px; border-radius:20px; font-weight:bold; cursor:pointer; white-space:nowrap; display:flex; align-items:center; gap:6px;">
                <span>${i18n.t('tab_attributes')}</span>
                <span class="tab-badge" id="badge-tab-attr" style="display:none; background:var(--accent-gold); color:#000; font-size:0.75rem; padding:1px 6px; border-radius:10px;">0</span>
            </button>
            ${Storage.getPreference('feat_brewbrother_enabled', true) ? `
            <button type="button" class="ftab" data-tab="tab-rec" style="background:#333; color:#fff; border:none; padding:8px 14px; border-radius:20px; font-weight:bold; cursor:pointer; white-space:nowrap; display:flex; align-items:center; gap:6px;">
                <span>🤖 ${i18n.t('tab_recommendations') || 'Recommandations'}</span>
                <span class="tab-badge" id="badge-tab-rec" style="display:none; background:var(--accent-gold); color:#000; font-size:0.75rem; padding:1px 6px; border-radius:10px;">✨</span>
            </button>` : ''}
        </div>

        <!-- SCROLLING FORM -->
        <form id="filter-form" style="padding:5px 20px 80px 20px; overflow-y:auto; flex-grow:1; display:flex; flex-direction:column; gap:20px;">
            
            <!-- TAB: GENERAL -->
            <div id="tab-gen" class="tab-pane">
                <!-- Type de bière (Catégories) -->
                <div class="stat-card mb-20" style="margin-bottom:15px;">
                    <h4 style="margin-bottom:10px; display:flex; justify-content:space-between; align-items:center;">
                        ${i18n.t('filter_type_label')} 
                        <span style="font-size:0.8rem; color:#888; font-weight:normal;">${i18n.t('filter_plural_suffix')}</span>
                    </h4>
                    <div style="display:flex; flex-wrap:wrap; gap:8px;">
                        ${typeCategories.map(cat => {
                            const isChecked = activeFilters.type && (activeFilters.type.includes(cat.id) || activeFilters.type.includes(cat.label));
                            return `
                                <label style="display:flex; align-items:center; gap:6px; background:${isChecked ? 'rgba(255,192,0,0.2)' : 'rgba(255,255,255,0.05)'}; padding:7px 12px; border-radius:18px; cursor:pointer; border:1px solid ${isChecked ? 'var(--accent-gold)' : 'rgba(255,255,255,0.1)'}; transition:all 0.2s;">
                                    <input type="checkbox" class="cb-type" value="${cat.id}" ${isChecked ? 'checked' : ''} style="display:none;">
                                    <span style="font-size:0.85rem; color:${isChecked ? 'var(--accent-gold)' : '#fff'}; font-weight:${isChecked ? 'bold' : 'normal'};">${cat.icon} ${cat.label}</span>
                                </label>
                            `;
                        }).join('')}
                    </div>
                </div>
                <!-- Rareté (avec Fondateur) -->
                <div class="stat-card mb-20" style="margin-bottom:15px;">
                    <h4 style="margin-bottom:10px;">${i18n.t('filter_rarity_label')}</h4>
                    <div style="display:flex; flex-wrap:wrap; gap:8px;">
                        ${['base', 'commun', 'rare', 'super_rare', 'epique', 'mythique', 'legendaire', 'ultra_legendaire', 'fondateur'].map(r => {
                            const isChecked = activeFilters.rarity && activeFilters.rarity.includes(r);
                            return `
                                <label style="display:flex; align-items:center; gap:6px; background:${isChecked ? 'rgba(255,192,0,0.2)' : 'rgba(255,255,255,0.05)'}; padding:6px 12px; border-radius:15px; cursor:pointer; border:1px solid var(--rarity-${r}); transition:all 0.2s;">
                                    <input type="checkbox" class="cb-rarity" value="${r}" ${isChecked ? 'checked' : ''} style="display:none;">
                                    <span style="font-size:0.8rem; text-transform:capitalize; color:${isChecked ? 'var(--accent-gold)' : '#fff'}; font-weight:${isChecked ? 'bold' : 'normal'};">${i18n.t('rarity_' + r)}</span>
                                </label>
                            `;
                        }).join('')}
                    </div>
                </div>
                <div class="form-group stat-card mb-20">
                    <h4 style="margin-bottom:10px;">${i18n.t('filter_country')}</h4>
                    <select name="country" class="form-select">${createOptions(countries, activeFilters.country || 'All')}</select>
                </div>
                <div class="form-group stat-card mb-20">
                    <h4 style="margin-bottom:10px;">${i18n.t('filter_region')}</h4>
                    <select name="region" class="form-select">${regionOptionsHtml}</select>
                </div>
                <div class="form-group stat-card mb-20">
                    <h4 style="margin-bottom:10px;">${i18n.t('filter_brewery')}</h4>
                    <select name="brewery" class="form-select">${createOptions(breweries, activeFilters.brewery || 'All')}</select>
                </div>
                <div class="form-group stat-card mb-20">
                     <label class="form-group" style="display:flex; align-items:center; gap:10px; cursor:pointer; margin:0;">
                        <input type="checkbox" name="onlyCustom" ${activeFilters.onlyCustom ? 'checked' : ''} style="width:20px; height:20px; accent-color:var(--accent-gold);">
                        <span style="font-weight:bold; color:var(--accent-gold);">${i18n.t('filter_my_creations')}</span>
                    </label>
                </div>
            </div>

            <!-- TAB: TRI ET NOTES -->
            <div id="tab-tri" class="tab-pane" style="display:none;">
                <div class="stat-card mb-20" style="margin-bottom:15px;">
                    <h4 style="margin-bottom:10px;">${i18n.t('filter_sort_by')}</h4>
                    <div style="display:flex; flex-direction:column; gap:10px;">
                        <div style="display:flex; gap:10px;">
                            <select name="sortBy" class="form-select" style="flex:2;">
                                <option value="default" ${!activeFilters.sortBy || activeFilters.sortBy === 'default' ? 'selected' : ''}>${i18n.t('filter_sort_default')}</option>
                                <option value="name" ${activeFilters.sortBy === 'name' ? 'selected' : ''}>${i18n.t('filter_sort_name') || 'Nom de la bière (A-Z)'}</option>
                                <option value="brewbrother" ${activeFilters.sortBy === 'brewbrother' ? 'selected' : ''}>${i18n.t('filter_sort_brewbrother') || 'Match BrewBrother'}</option>
                                <option value="brewery" ${activeFilters.sortBy === 'brewery' ? 'selected' : ''}>${i18n.t('filter_brewery')}</option>
                                <option value="alcohol" ${activeFilters.sortBy === 'alcohol' ? 'selected' : ''}>${i18n.t('filter_label_degree')} (%)</option>
                                <option value="volume" ${activeFilters.sortBy === 'volume' ? 'selected' : ''}>Volume</option>
                                <option value="rarity" ${activeFilters.sortBy === 'rarity' ? 'selected' : ''}>${i18n.t('filter_rarity_label')}</option>
                                <option value="my_rating" ${activeFilters.sortBy === 'my_rating' ? 'selected' : ''}>${i18n.t('filter_sort_my_rating') || 'Ma note personnelle'}</option>
                                <option value="community_rating" ${activeFilters.sortBy === 'community_rating' ? 'selected' : ''}>${i18n.t('filter_community_note')}</option>
                            </select>
                            <select name="sortOrder" class="form-select" style="flex:1;">
                                <option value="asc" ${activeFilters.sortOrder === 'asc' ? 'selected' : ''}>${i18n.t('filter_sort_asc')}</option>
                                <option value="desc" ${activeFilters.sortOrder === 'desc' ? 'selected' : ''}>${i18n.t('filter_sort_desc')}</option>
                            </select>
                        </div>
                    </div>
                    
                    <div style="margin-top:15px; display:flex; flex-direction:column; gap:10px;">
                        <label style="display:flex; justify-content:space-between; align-items:center; background:rgba(255,255,255,0.05); padding:10px 14px; border-radius:10px; cursor:pointer;">
                            <div>
                                <div style="font-size:0.95rem; font-weight:bold;">${i18n.t('filter_pin_favorites') || 'Épingler les favoris au début'}</div>
                                <div style="font-size:0.8rem; color:#888;">${i18n.t('filter_pin_favorites_desc') || 'Affiche vos bières favorites en premier'}</div>
                            </div>
                            <input type="checkbox" name="pinFavorites" id="pinFavorites" ${activeFilters.ignoreFavorites ? '' : 'checked'} style="width:20px; height:20px; accent-color:var(--accent-gold);">
                        </label>
                        <label style="display:flex; justify-content:space-between; align-items:center; background:rgba(255,255,255,0.05); padding:10px 14px; border-radius:10px; cursor:pointer;">
                            <span style="font-size:0.95rem;">⭐ ${i18n.t('filter_only_favs')}</span>
                            <input type="checkbox" name="onlyFavorites" id="onlyFavorites" ${activeFilters.onlyFavorites ? 'checked' : ''} style="width:20px; height:20px; accent-color:var(--accent-gold);">
                        </label>
                    </div>
                </div>

                <div class="stat-card mb-20">
                    <h4 style="margin-bottom:10px;">${i18n.t('filter_min_ratings')}</h4>
                    <div class="form-group" style="margin-bottom:15px;">
                        <label class="form-label" style="display:flex; justify-content:space-between;">${i18n.t('filter_personal_note')} <span><span id="rate-val">${activeFilters.minRating || 0}</span>/20</span></label>
                        <input type="range" name="minRating" class="form-input" min="0" max="20" step="1" value="${activeFilters.minRating || 0}" 
                            oninput="document.getElementById('rate-val').innerText = this.value" style="padding:0; height:30px;">
                    </div>
                    <div class="form-group">
                        <label class="form-label" style="display:flex; justify-content:space-between;">${i18n.t('filter_community_note')} <span><span id="comm-rate-val">${activeFilters.community_rating || 0}</span>/5</span></label>
                        <input type="range" name="community_rating" class="form-input" min="0" max="5" step="0.1" value="${activeFilters.community_rating || 0}" 
                            oninput="document.getElementById('comm-rate-val').innerText = this.value" style="padding:0; height:30px;">
                    </div>
                </div>
            </div>

            <!-- TAB: ATTRIBUTS -->
            <div id="tab-attr" class="tab-pane" style="display:none;">
                <div class="stat-card mb-20" style="margin-bottom:15px;">
                    <h4 style="margin-bottom:10px;">${i18n.t('filter_alc_vol')}</h4>
                    <div class="form-group" style="margin-bottom:15px; padding:10px; background:rgba(255,255,255,0.05); border-radius:8px;">
                        <label class="form-label">${i18n.t('filter_label_degree')}</label>
                        <select id="alc-mode" name="alcMode" class="form-select" style="margin-bottom:10px;">
                            <option value="max" ${activeFilters.alcMode === 'max' ? 'selected' : ''}>${i18n.t('filter_alc_max')}</option>
                            <option value="range" ${activeFilters.alcMode === 'range' ? 'selected' : ''}>${i18n.t('filter_alc_range')}</option>
                            <option value="exact" ${activeFilters.alcMode === 'exact' ? 'selected' : ''}>${i18n.t('filter_alc_exact')}</option>
                        </select>
                        <div id="alc-inputs"></div>
                    </div>
                    
                    <div class="form-group" style="padding:10px; background:rgba(255,255,255,0.05); border-radius:8px;">
                        <label class="form-label">Volume (ml)</label>
                        <select id="vol-mode" name="volMode" class="form-select" style="margin-bottom:10px;">
                            <option value="any" ${!activeFilters.volMode || activeFilters.volMode === 'any' ? 'selected' : ''}>${i18n.t('filter_any')}</option>
                            <option value="range" ${activeFilters.volMode === 'range' ? 'selected' : ''}>${i18n.t('filter_alc_range')}</option>
                            <option value="exact" ${activeFilters.volMode === 'exact' ? 'selected' : ''}>${i18n.t('filter_alc_exact')}</option>
                        </select>
                        <div id="vol-inputs"></div>
                    </div>
                </div>

                <div class="stat-card mb-20">
                    <h4 style="margin-bottom:10px;">${i18n.t('filter_production')}</h4>
                    <div class="form-group" style="margin-bottom:10px;">
                        <label class="form-label">${i18n.t('filter_production_label')}</label>
                        <select name="production_volume" class="form-select">${createOptions(prodVolumes, activeFilters.production_volume || 'All')}</select>
                    </div>
                    <div class="form-group" style="margin-bottom:15px;">
                        <label class="form-label">${i18n.t('detail_distribution')}</label>
                        <select name="distribution" class="form-select">${createOptions(distributions, activeFilters.distribution || 'All')}</select>
                    </div>
                    <label style="display:flex; justify-content:space-between; align-items:center; background:rgba(255,255,255,0.05); padding:10px 12px; border-radius:8px; cursor:pointer;">
                        <span style="font-size:0.95rem;">${i18n.t('detail_barrel_aged')}</span>
                        <input type="checkbox" name="barrel_aged" id="barrel_aged" ${activeFilters.barrel_aged ? 'checked' : ''} style="width:20px; height:20px;">
                    </label>
                    <div class="form-group" style="margin-top:15px;">
                        <label class="form-label">${i18n.t('detail_ingredients')}</label>
                        <input type="text" name="ingredients" class="form-input" placeholder="${i18n.t('detail_ingredients_placeholder')}" value="${activeFilters.ingredients || ''}">
                    </div>
                </div>
            </div>

            <!-- TAB: RECOMMANDATIONS (BrewBrother) -->
            ${Storage.getPreference('feat_brewbrother_enabled', true) ? `
            <div id="tab-rec" class="tab-pane" style="display:none;">
                <div class="stat-card mb-20" style="margin-bottom:15px; background:linear-gradient(135deg, rgba(35,30,15,0.85), rgba(15,15,15,0.95)); border:2px solid ${activeFilters.useBrewBrother ? 'var(--accent-gold)' : 'rgba(255,192,0,0.3)'}; border-radius:12px; padding:16px;">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
                        <h4 style="margin:0; color:var(--accent-gold); display:flex; align-items:center; gap:8px; font-size:1.1rem;">
                            🤖 BrewBrother AI
                        </h4>
                        <span id="bb-status-badge" style="background:${activeFilters.useBrewBrother ? 'var(--accent-gold)' : 'rgba(255,255,255,0.1)'}; color:${activeFilters.useBrewBrother ? '#000' : '#888'}; padding:3px 8px; border-radius:12px; font-size:0.75rem; font-weight:bold;">
                            ${activeFilters.useBrewBrother ? 'Activé' : 'Désactivé'}
                        </span>
                    </div>
                    
                    <p style="font-size:0.85rem; color:#bbb; margin-bottom:15px; line-height:1.4;">
                        ${i18n.t('brewbrother_desc') || "Générez les 20 meilleures recommandations basées sur vos goûts, vos dégustations et vos critères."}
                    </p>

                    <!-- Bouton / Switch d'activation clair -->
                    <label id="label-use-brewbrother" style="display:flex; justify-content:space-between; align-items:center; background:${activeFilters.useBrewBrother ? 'rgba(255,192,0,0.2)' : 'rgba(255,255,255,0.08)'}; border:1px solid ${activeFilters.useBrewBrother ? 'var(--accent-gold)' : 'rgba(255,255,255,0.15)'}; padding:14px 16px; border-radius:10px; cursor:pointer; margin-bottom:20px; transition:all 0.2s;">
                        <div>
                            <div style="font-size:1rem; font-weight:bold; color:var(--accent-gold);">${i18n.t('brewbrother_enable') || "Activer les Recommandations"}</div>
                            <div style="font-size:0.8rem; color:#aaa; margin-top:2px;">Filtre le catalogue pour afficher uniquement votre Top 20</div>
                        </div>
                        <input type="checkbox" name="useBrewBrother" id="useBrewBrother" ${activeFilters.useBrewBrother ? 'checked' : ''} style="width:24px; height:24px; accent-color:var(--accent-gold);">
                    </label>

                    <div class="form-group" style="margin-bottom:15px;">
                        <label class="form-label">${i18n.t('brewbrother_mood_label') || "Ambiance / Mood rapide"}</label>
                        <input type="hidden" name="recMood" id="rec-mood-input" value="${activeFilters.recMood || 'auto'}">
                        <div class="bb-mood-chips" id="filter-bb-moods">
                            ${Object.values(window.Recommendation?.MOOD_PRESETS || {
                                auto: { id: 'auto', icon: '🎯', labelFr: 'Mon Profil', labelEn: 'My Profile' },
                                refreshing: { id: 'refreshing', icon: '☀️', labelFr: 'Légère & Fraîche', labelEn: 'Crisp & Light' },
                                cozy: { id: 'cozy', icon: '🔥', labelFr: 'Costaud', labelEn: 'Rich & Strong' },
                                fruity: { id: 'fruity', icon: '🍓', labelFr: 'Fruitée', labelEn: 'Fruity' },
                                hoppy: { id: 'hoppy', icon: '🌿', labelFr: 'Houblon', labelEn: 'Hoppy' },
                                hidden_gem: { id: 'hidden_gem', icon: '💎', labelFr: 'Pépite', labelEn: 'Hidden Gem' }
                            }).map(m => {
                                const isSel = (activeFilters.recMood || 'auto') === m.id;
                                const lbl = i18n.getLanguage() === 'en' ? m.labelEn : m.labelFr;
                                return `<button type="button" class="bb-mood-chip ${isSel ? 'is-active' : ''}" data-mood="${m.id}">${m.icon} ${lbl}</button>`;
                            }).join('')}
                        </div>
                    </div>

                    <div class="form-group mb-20">
                        <label class="form-label">${i18n.t('brewbrother_mode_label') || "Mode de Profil"}</label>
                        <select name="recMode" id="rec-mode-select" class="form-select">
                            <option value="auto" ${activeFilters.recMode === 'auto' || !activeFilters.recMode ? 'selected' : ''}>${i18n.t('brewbrother_mode_auto') || "Automatique (Basé sur vos consos)"}</option>
                            <option value="manual" ${activeFilters.recMode === 'manual' ? 'selected' : ''}>${i18n.t('brewbrother_mode_manual') || "Manuel (Personnaliser)"}</option>
                        </select>
                    </div>

                    <div class="form-group" style="margin-bottom:14px;">
                        <label class="form-label" style="display:flex; justify-content:space-between;">
                            <span>Sûr ↔ Découverte (Exploration)</span>
                            <span id="rec-exp-val">${activeFilters.recExploration ?? Storage.getPreference('brewbrother_exploration', 35)}%</span>
                        </label>
                        <input type="range" name="recExploration" min="0" max="100" step="5" value="${activeFilters.recExploration ?? Storage.getPreference('brewbrother_exploration', 35)}"
                            oninput="document.getElementById('rec-exp-val').innerText = this.value + '%'" style="width:100%;">
                    </div>

                    <div class="form-group" style="margin-bottom:14px;">
                        <label class="form-label" style="display:flex; justify-content:space-between;">
                            <span>Similaire ↔ Varié (Diversité)</span>
                            <span id="rec-div-val">${activeFilters.recDiversity ?? Storage.getPreference('brewbrother_diversity', 65)}%</span>
                        </label>
                        <input type="range" name="recDiversity" min="0" max="100" step="5" value="${activeFilters.recDiversity ?? Storage.getPreference('brewbrother_diversity', 65)}"
                            oninput="document.getElementById('rec-div-val').innerText = this.value + '%'" style="width:100%;">
                    </div>

                    ${(() => {
                        const fb = typeof Storage.getBrewBrotherFeedback === 'function' ? Storage.getBrewBrotherFeedback() : { liked: [], disliked: [] };
                        if (!fb.liked.length && !fb.disliked.length) return '';
                        return `<div style="font-size:0.78rem; color:var(--text-secondary); margin-bottom:12px;">👍 ${fb.liked.length} aimée(s) · 👎 ${fb.disliked.length} ignorée(s)</div>`;
                    })()}

                    <div id="rec-manual-options" style="display:${activeFilters.recMode === 'manual' ? 'block' : 'none'}; border-left:2px solid var(--accent-gold); padding-left:12px; margin-bottom:15px;">
                        <label class="form-label">${i18n.t('filter_type_label')}</label>
                        <div style="display:flex; flex-wrap:wrap; gap:6px; margin-bottom:12px;">
                            ${['IPA', 'Blonde', 'Brune', 'Triple', 'Stout', 'Blanche', 'Fruitée', 'Sour', 'Trappiste', 'Saison'].map(t => {
                                const isChecked = activeFilters.recTypes && activeFilters.recTypes.includes(t);
                                return `
                                    <label style="display:flex; align-items:center; gap:4px; background:${isChecked ? 'rgba(255,192,0,0.2)' : 'rgba(255,255,255,0.05)'}; padding:6px 10px; border-radius:15px; cursor:pointer; border:1px solid ${isChecked ? 'var(--accent-gold)' : 'transparent'};">
                                        <input type="checkbox" name="recTypes" value="${t}" ${isChecked ? 'checked' : ''} style="display:none;">
                                        <span style="font-size:0.8rem; color:${isChecked ? 'var(--accent-gold)' : '#fff'};">${t}</span>
                                    </label>`;
                            }).join('')}
                        </div>
                        
                        <label class="form-label">${i18n.t('brewbrother_ideal_abv') || "Degré d'Alcool Idéal"}</label>
                        <div style="display:flex; align-items:center; gap:10px; margin-bottom:12px;">
                            <input type="range" name="recAbv" class="form-input" min="3" max="15" step="0.5" value="${activeFilters.recAbv || 7}" 
                                oninput="document.getElementById('rec-abv-display').innerText = this.value" style="padding:0; height:30px; flex:1;">
                            <span style="min-width:45px; text-align:right;"><span id="rec-abv-display">${activeFilters.recAbv || 7}</span>%</span>
                        </div>

                        <label class="form-label">${i18n.t('brewbrother_flavors') || "Saveurs"}</label>
                        <div style="display:flex; flex-wrap:wrap; gap:6px;">
                            ${(window.BrewBrother ? window.BrewBrother.FLAVOR_KEYWORDS.slice(0,12) : ['fruity', 'hoppy', 'roasted', 'spicy', 'sour', 'bitter', 'sweet', 'floral']).map(t => {
                                const isChecked = activeFilters.recFlavors && activeFilters.recFlavors.includes(t);
                                const labelText = window.BrewBrotherNLP ? window.BrewBrotherNLP.getFlavorName(t) : t;
                                return `
                                    <label style="display:flex; align-items:center; gap:4px; background:${isChecked ? 'rgba(255,192,0,0.2)' : 'rgba(255,255,255,0.05)'}; padding:6px 10px; border-radius:15px; cursor:pointer; border:1px solid ${isChecked ? 'var(--accent-gold)' : 'transparent'};">
                                        <input type="checkbox" name="recFlavors" value="${t}" ${isChecked ? 'checked' : ''} style="display:none;">
                                        <span style="font-size:0.8rem; color:${isChecked ? 'var(--accent-gold)' : '#fff'}; text-transform:capitalize;">${labelText}</span>
                                    </label>`;
                            }).join('')}
                        </div>
                    </div>

                    <div class="form-group" style="margin-bottom:15px;">
                        <label class="form-label">${i18n.t('filter_country')} (${i18n.t('brewbrother_availability') || "Disponibilité"})</label>
                        <select name="recCountry" class="form-select">${createOptions(countries, activeFilters.recCountry || 'All')}</select>
                    </div>
                    <div class="form-group" style="margin-bottom:15px;">
                        <label class="form-label">${i18n.t('filter_region')} (${i18n.t('brewbrother_availability') || "Disponibilité"})</label>
                        <select name="recRegion" class="form-select">${createOptions(regions, activeFilters.recRegion || 'All')}</select>
                    </div>
                </div>
            </div>
            ` : ''}

        </form>

        <!-- FOOTER -->
        <div style="background:var(--bg-card); padding:15px 20px; border-top:1px solid rgba(255,255,255,0.1); border-radius:0 0 12px 12px; flex-shrink:0;">
            <button type="submit" form="filter-form" class="btn-primary" style="margin:0; width:100%; font-size:1.1rem; box-shadow:0 -5px 20px rgba(0,0,0,0.5);">${i18n.t('detail_btn_apply_filters')}</button>
        </div>
    `;

    // Dynamic Alcohol Input logic
    const alcContainer = wrapper.querySelector('#alc-inputs');
    const alcModeSelect = wrapper.querySelector('#alc-mode');

    const renderAlcInputs = (mode) => {
        if (mode === 'max') {
            alcContainer.innerHTML = `
                <div style="display:flex; align-items:center; gap:10px;">
                    <input type="range" name="alcMax" class="form-input" min="0" max="15" step="0.5" value="${activeFilters.alcMax || 15}" 
                        oninput="document.getElementById('alc-display-max').innerText = this.value" style="padding:0; height:30px; flex:1;">
                    <span style="min-width:45px; text-align:right;"><span id="alc-display-max">${activeFilters.alcMax || 15}</span>%</span>
                </div>
            `;
        } else if (mode === 'range') {
            alcContainer.innerHTML = `
                <div style="display:flex; gap:10px; align-items:center;">
                    <input type="number" name="alcMin" class="form-input" placeholder="Min" step="0.1" value="${activeFilters.alcMin || ''}" style="flex:1;">
                    <span>${i18n.t('detail_range_separator')}</span>
                    <input type="number" name="alcMax" class="form-input" placeholder="Max" step="0.1" value="${activeFilters.alcMax || ''}" style="flex:1;">
                </div>
            `;
        } else if (mode === 'exact') {
            alcContainer.innerHTML = `
                 <input type="number" name="alcExact" class="form-input" placeholder="Ex: 5.5" step="0.1" value="${activeFilters.alcExact || ''}">
            `;
        }
    };

    alcModeSelect.onchange = (e) => renderAlcInputs(e.target.value);
    renderAlcInputs(activeFilters.alcMode || 'max'); // Init

    // Dynamic Volume Input logic
    const volContainer = wrapper.querySelector('#vol-inputs');
    const volModeSelect = wrapper.querySelector('#vol-mode');

    const renderVolInputs = (mode) => {
        if (mode === 'any') {
            volContainer.innerHTML = `<div style="color:#aaa; font-style:italic; font-size:0.9rem;">${i18n.t('detail_all_volumes')}</div>`;
        } else if (mode === 'range') {
            volContainer.innerHTML = `
                 <div style="display:flex; gap:10px; align-items:center;">
                    <input type="number" name="volMin" class="form-input" placeholder="Min (ml)" step="10" value="${activeFilters.volMin || ''}" style="flex:1;">
                    <span>${i18n.t('detail_range_separator')}</span>
                    <input type="number" name="volMax" class="form-input" placeholder="Max (ml)" step="10" value="${activeFilters.volMax || ''}" style="flex:1;">
                </div>
            `;
        } else if (mode === 'exact') {
            volContainer.innerHTML = `
                 <input type="number" name="volExact" class="form-input" placeholder="Ex: 330 (ml)" step="10" value="${activeFilters.volExact || ''}">
            `;
        }
    };

    volModeSelect.onchange = (e) => renderVolInputs(e.target.value);
    renderVolInputs(activeFilters.volMode || 'any');

    // Reset Button
    wrapper.querySelector('#btn-reset-top').onclick = () => {
        onApply({});
        closeModal();
    };

    // Tabs functionality
    const tabs = wrapper.querySelectorAll('.ftab');
    const panes = wrapper.querySelectorAll('.tab-pane');
    tabs.forEach(tab => {
        tab.onclick = () => {
            tabs.forEach(t => { t.style.background = '#333'; t.style.color = '#fff'; });
            tab.style.background = 'var(--accent-gold)';
            tab.style.color = '#000';
            const targetId = tab.getAttribute('data-tab');
            panes.forEach(pane => {
                pane.style.display = pane.id === targetId ? 'block' : 'none';
            });
        };
    });

    // Checkbox styling toggle on click (Type and Rarity)
    wrapper.querySelectorAll('label > .cb-type, label > .cb-rarity').forEach(cb => {
        cb.onchange = (e) => {
            const label = e.target.closest('label');
            const span = label.querySelector('span');
            if (e.target.checked) {
                label.style.background = 'rgba(255,192,0,0.2)';
                if (cb.classList.contains('cb-type')) label.style.borderColor = 'var(--accent-gold)';
                span.style.color = 'var(--accent-gold)';
                span.style.fontWeight = 'bold';
            } else {
                label.style.background = 'rgba(255,255,255,0.05)';
                if (cb.classList.contains('cb-type')) label.style.borderColor = 'rgba(255,255,255,0.1)';
                span.style.color = '#fff';
                span.style.fontWeight = 'normal';
            }
            updateTabBadges();
        };
    });

    // Mood chips selection
    const moodInput = wrapper.querySelector('#rec-mood-input');
    wrapper.querySelectorAll('#filter-bb-moods .bb-mood-chip').forEach(btn => {
        btn.onclick = () => {
            if (moodInput) moodInput.value = btn.dataset.mood;
            wrapper.querySelectorAll('#filter-bb-moods .bb-mood-chip').forEach(b => b.classList.toggle('is-active', b === btn));
        };
    });

    // Toggle manual options visibility
    const recModeSelect = wrapper.querySelector('#rec-mode-select');
    if (recModeSelect) {
        recModeSelect.onchange = (e) => {
            const manualDiv = wrapper.querySelector('#rec-manual-options');
            if (manualDiv) manualDiv.style.display = e.target.value === 'manual' ? 'block' : 'none';
        };
        // Set initial state
        const manualDiv = wrapper.querySelector('#rec-manual-options');
        if (manualDiv) manualDiv.style.display = recModeSelect.value === 'manual' ? 'block' : 'none';
    }

    // Toggle checkbox styles for recTypes and recFlavors
    wrapper.querySelectorAll('label > input[name="recTypes"], label > input[name="recFlavors"]').forEach(cb => {
        cb.onchange = (e) => {
            const label = e.target.closest('label');
            const span = label.querySelector('span');
            if (e.target.checked) {
                label.style.background = 'rgba(255,192,0,0.2)';
                label.style.borderColor = 'var(--accent-gold)';
                span.style.color = 'var(--accent-gold)';
            } else {
                label.style.background = 'rgba(255,255,255,0.05)';
                label.style.borderColor = 'transparent';
                span.style.color = '#fff';
            }
        };
    });

    // Dynamic BrewBrother activation toggle styling
    const useBbCb = wrapper.querySelector('#useBrewBrother');
    const labelUseBb = wrapper.querySelector('#label-use-brewbrother');
    const badgeBb = wrapper.querySelector('#bb-status-badge');
    if (useBbCb) {
        useBbCb.onchange = (e) => {
            const checked = e.target.checked;
            if (labelUseBb) {
                labelUseBb.style.background = checked ? 'rgba(255,192,0,0.2)' : 'rgba(255,255,255,0.08)';
                labelUseBb.style.borderColor = checked ? 'var(--accent-gold)' : 'rgba(255,255,255,0.15)';
            }
            if (badgeBb) {
                badgeBb.style.background = checked ? 'var(--accent-gold)' : 'rgba(255,255,255,0.1)';
                badgeBb.style.color = checked ? '#000' : '#888';
                badgeBb.innerText = checked ? 'Activé' : 'Désactivé';
            }
            updateTabBadges();
        };
    }

    // Dynamic Tab Active Badges Calculation
    const updateTabBadges = () => {
        const form = wrapper.querySelector('form');
        if (!form) return;
        const formData = new FormData(form);

        // General Tab Count
        const numTypes = wrapper.querySelectorAll('.cb-type:checked').length;
        const numRarity = wrapper.querySelectorAll('.cb-rarity:checked').length;
        const country = formData.get('country');
        const region = formData.get('region');
        const brewery = formData.get('brewery');
        const onlyCustom = formData.get('onlyCustom') === 'on';
        let genCount = numTypes + numRarity + (onlyCustom ? 1 : 0);
        if (country && country !== 'All') genCount++;
        if (region && region !== 'All') genCount++;
        if (brewery && brewery !== 'All') genCount++;

        const badgeGen = wrapper.querySelector('#badge-tab-gen');
        if (badgeGen) {
            badgeGen.style.display = genCount > 0 ? 'inline-block' : 'none';
            badgeGen.innerText = genCount;
        }

        // Tri & Notes Count
        const sortBy = formData.get('sortBy');
        const onlyFavs = formData.get('onlyFavorites') === 'on';
        const minR = parseInt(formData.get('minRating') || '0', 10);
        const commR = parseFloat(formData.get('community_rating') || '0');
        let triCount = (onlyFavs ? 1 : 0) + (minR > 0 ? 1 : 0) + (commR > 0 ? 1 : 0);
        if (sortBy && sortBy !== 'default') triCount++;

        const badgeTri = wrapper.querySelector('#badge-tab-tri');
        if (badgeTri) {
            badgeTri.style.display = triCount > 0 ? 'inline-block' : 'none';
            badgeTri.innerText = triCount;
        }

        // Attributes Count
        const alcMode = formData.get('alcMode');
        const alcMax = parseFloat(formData.get('alcMax') || '15');
        const volMode = formData.get('volMode');
        const prodVol = formData.get('production_volume');
        const dist = formData.get('distribution');
        const barrel = formData.get('barrel_aged') === 'on';
        const ings = (formData.get('ingredients') || '').trim();
        let attrCount = (barrel ? 1 : 0) + (ings ? 1 : 0);
        if (alcMode === 'range' || alcMode === 'exact' || (alcMode === 'max' && alcMax < 15)) attrCount++;
        if (volMode && volMode !== 'any') attrCount++;
        if (prodVol && prodVol !== 'All') attrCount++;
        if (dist && dist !== 'All') attrCount++;

        const badgeAttr = wrapper.querySelector('#badge-tab-attr');
        if (badgeAttr) {
            badgeAttr.style.display = attrCount > 0 ? 'inline-block' : 'none';
            badgeAttr.innerText = attrCount;
        }

        // Recommandations Count
        const useBb = formData.get('useBrewBrother') === 'on';
        const badgeRec = wrapper.querySelector('#badge-tab-rec');
        if (badgeRec) {
            badgeRec.style.display = useBb ? 'inline-block' : 'none';
            badgeRec.innerText = '✨';
        }
    };

    wrapper.querySelector('form').addEventListener('change', updateTabBadges);
    wrapper.querySelector('form').addEventListener('input', updateTabBadges);
    updateTabBadges();

    wrapper.querySelector('form').onsubmit = (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);

        // Collect Rarity & Type Checkboxes manually
        const rarity = [];
        wrapper.querySelectorAll('.cb-rarity:checked').forEach(cb => rarity.push(cb.value));

        const typeSelected = [];
        wrapper.querySelectorAll('.cb-type:checked').forEach(cb => typeSelected.push(cb.value));

        const recTypes = [];
        wrapper.querySelectorAll('input[name="recTypes"]:checked').forEach(cb => recTypes.push(cb.value));
        const recFlavors = [];
        wrapper.querySelectorAll('input[name="recFlavors"]:checked').forEach(cb => recFlavors.push(cb.value));

        const filters = Object.fromEntries(formData.entries());
        filters.onlyFavorites = formData.get('onlyFavorites') === 'on';
        const pinFavs = formData.get('pinFavorites') === 'on';
        filters.ignoreFavorites = !pinFavs;
        filters.onlyCustom = formData.get('onlyCustom') === 'on';
        filters.barrel_aged = formData.get('barrel_aged') === 'on';
        filters.useBrewBrother = formData.get('useBrewBrother') === 'on';
        filters.rarity = rarity;
        filters.type = typeSelected;
        filters.recTypes = recTypes;
        filters.recFlavors = recFlavors;

        onApply(filters);
        closeModal();
    };

    openModal(wrapper);
}

export function renderBeerDetail(beer, onSave) {
    const existingData = Storage.getBeerRating(beer.id) || {};
    const template = Storage.getRatingTemplate();

    const wrapper = document.createElement('div');
    const rarityClass = (existingData.count > 0 && beer.rarity && beer.rarity !== 'base') ? `modal-rarity-${beer.rarity}` : 'modal-rarity-base';
    wrapper.className = `modal-content ${rarityClass}`;

    // Assure that there is an explicit generic border class in CSS, we'll inline a fallback just in case or add it to style.css in next step.
    wrapper.style.border = '2px solid transparent'; // Will be overridden by CSS classes

    let imgPath = beer.image;
    if (!imgPath || isMissingImage(imgPath)) imgPath = 'images/beer/default.png';

    const renderHistoryPanel = (historyData) => {
        const historyPanel = wrapper.querySelector('#beer-history-panel');
        if (!historyPanel) return;
        if (historyData && historyData.length > 0) {
            const sortedHistory = [...historyData].sort((a, b) => new Date(b.date) - new Date(a.date));
            let histHtml = `<h4 style="margin-bottom:10px; font-size:1rem; color:var(--accent-gold); text-align:left;">${i18n.t('detail_history')}</h4>`;
            histHtml += `<div style="max-height:150px; overflow-y:auto; padding-right:5px; scrollbar-width:thin; font-size:0.85rem; text-align:left;">`;
            sortedHistory.forEach(h => {
                const dt = new Date(h.date);
                const dateStr = dt.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
                const timeStr = dt.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
                histHtml += `
                    <div style="display:flex; justify-content:space-between; border-bottom:1px solid rgba(255,255,255,0.05); padding:8px 0;">
                        <span>${dateStr} ${timeStr}</span>
                        <span style="color:#aaa;">${h.volume ? h.volume + 'ml' : ''}</span>
                    </div>
                `;
            });
            histHtml += `</div>`;
            historyPanel.innerHTML = histHtml;
        } else {
            historyPanel.innerHTML = '';
        }
    };

    // Build Dynamic Form
    let formFields = template.map(field => {
        const value = existingData[field.id] !== undefined ? existingData[field.id] : '';
        const label = i18n.t(field.label);

        if (field.type === 'number') {
            return `
                <div class="form-group">
                    <label class="form-label">${label}</label>
                    <input type="number" class="form-input" name="${field.id}" min="${field.min}" max="${field.max}" step="${field.step}" value="${value}" placeholder="${i18n.t('detail_note_placeholder')}">
                </div>`;
        } else if (field.type === 'textarea') {
            return `
                <div class="form-group">
                    <label class="form-label">${label}</label>
                    <textarea class="form-textarea" name="${field.id}" rows="3">${value}</textarea>
                </div>`;
        } else if (field.type === 'range') {
            const min = field.min !== undefined ? field.min : 0;
            const max = field.max !== undefined ? field.max : 10;
            const step = field.step !== undefined ? field.step : 1;
            const displayVal = value !== '' ? value : min;

            return `
                <div class="form-group">
                    <label class="form-label" style="display:flex; justify-content:space-between;">
                        <span>${label}</span>
                        <span id="val-${field.id}">${displayVal}/${max}</span>
                    </label>
                    <input type="range" class="form-input" name="${field.id}" min="${min}" max="${max}" step="${step}" value="${displayVal}"
                        oninput="document.getElementById('val-${field.id}').innerText = this.value + '/${max}'"
                        style="padding:0; height:40px;">
                </div>`;
        } else if (field.type === 'checkbox') {
            return `
                <div class="form-group" style="display:flex; align-items:center; gap:10px; background:var(--bg-card); padding:10px; border-radius:8px;">
                    <input type="checkbox" name="${field.id}" ${value ? 'checked' : ''} style="width:20px; height:20px;">
                        <label class="form-label" style="margin:0;">${label}</label>
                </div>`;
        }
        return '';
    }).join('');

    // --- Consumption Section ---
    const consumptionWrapper = document.createElement('div');
    consumptionWrapper.className = 'beer-consumption-card';
    consumptionWrapper.style.cssText = 'background:var(--bg-card); padding:15px; border-radius:12px; margin-bottom:20px; text-align:center;';

    // Default Volume logic: always use the beer's own volume
    let defaultVol = Utils.formatVolume(beer.volume) || '33cl';
    // For kegs (>1L), default to 50cl since nobody drinks 20L at once
    const volStr = defaultVol.toLowerCase();
    const numericVol = parseFloat(volStr) || 0;
    const isKegVol = volStr.includes('fut') || volStr.includes('fût') ||
        (volStr.includes('l') && !volStr.includes('cl') && !volStr.includes('ml') && numericVol >= 1) ||
        (volStr.includes('ml') && numericVol >= 1000);
    if (isKegVol) defaultVol = '50cl';
    // Clean string for display
    defaultVol = defaultVol.replace('.', ',');

    // Always use the beer's volume, not the last user selection
    const lastVolume = defaultVol;

    consumptionWrapper.innerHTML = `
                <h3 style="margin-bottom:10px; font-size:1rem;">${i18n.t('detail_consumption_title')}</h3>
                <div style="font-size:2rem; font-weight:bold; color:var(--accent-gold); margin-bottom:10px;">
                    <span id="consumption-count">${existingData.count || 0}</span> <span style="font-size:1rem; color:#666;">${i18n.t('detail_times')}</span>
                </div>

                <div class="form-group">
                    <label class="form-label" style="margin-bottom:5px;">${i18n.t('detail_volume_drunk')}</label>
                    <div class="vol-preset-grid" style="display: flex; flex-wrap: wrap; gap: 8px; justify-content: center; margin-bottom: 10px;">
                        <button type="button" class="vol-btn" data-vol="15cl" style="background:var(--bg-dark); border:1px solid #444; color:#fff; padding:6px 10px; border-radius:8px; cursor:pointer; font-size:0.9rem; flex:1 1 30%; max-width:120px;">15 cl</button>
                        <button type="button" class="vol-btn" data-vol="25cl" style="background:var(--bg-dark); border:1px solid #444; color:#fff; padding:6px 10px; border-radius:8px; cursor:pointer; font-size:0.9rem; flex:1 1 30%; max-width:120px;">25 cl</button>
                        <button type="button" class="vol-btn" data-vol="33cl" style="background:var(--bg-dark); border:1px solid #444; color:#fff; padding:6px 10px; border-radius:8px; cursor:pointer; font-size:0.9rem; flex:1 1 30%; max-width:120px;">33 cl</button>
                        <button type="button" class="vol-btn" data-vol="50cl" style="background:var(--bg-dark); border:1px solid #444; color:#fff; padding:6px 10px; border-radius:8px; cursor:pointer; font-size:0.9rem; flex:1 1 30%; max-width:120px;">50 cl</button>
                        <button type="button" class="vol-btn" data-vol="75cl" style="background:var(--bg-dark); border:1px solid #444; color:#fff; padding:6px 10px; border-radius:8px; cursor:pointer; font-size:0.9rem; flex:1 1 30%; max-width:120px;">75 cl</button>
                        <button type="button" class="vol-btn" data-vol="150cl" style="background:var(--bg-dark); border:1px solid #444; color:#fff; padding:6px 10px; border-radius:8px; cursor:pointer; font-size:0.9rem; flex:1 1 30%; max-width:120px;">150 cl</button>
                        <button type="button" class="vol-btn" data-vol="custom" style="background:var(--bg-dark); border:1px solid #444; color:#fff; padding:6px 10px; border-radius:8px; cursor:pointer; font-size:0.9rem; flex:1 1 30%; max-width:120px;">Personnalisé</button>
                    </div>
                    <div id="custom-vol-container" style="display: none; transition: 0.3s; text-align: center;">
                        <input type="text" id="custom-vol-input" class="form-input" placeholder="ex: 12.5cl ou 330ml" style="text-align: center;">
                    </div>
                    <div style="margin-top: 15px; margin-bottom: 15px;">
                        <label class="form-label" style="margin-bottom:5px; font-size: 0.85rem; color:#888;">${i18n.t('tasting_date_override')}</label>
                        <input type="datetime-local" id="consumption-date" class="form-input" style="text-align: center; background: var(--bg-dark); color: #fff; border: 1px solid #444; border-radius: 8px; color-scheme: dark; padding: 10px; width: 100%;">
                    </div>
                    <input type="hidden" id="consumption-volume" value="${lastVolume}">
                </div>

                <div style="display:flex; gap:10px; justify-content:center;">
                    <button id="btn-drink" class="btn-primary" style="margin:0; background:var(--success);">${i18n.t('detail_btn_drink')}</button>
                    <button id="btn-undrink" class="btn-primary" style="margin:0; background:var(--bg-card); border:1px solid #444; color:#aaa; width:auto;">${i18n.t('detail_btn_undrink')}</button>
                </div>
                <p style="font-size:0.75rem; color:#666; margin-top:10px;">${i18n.t('detail_drink_desc')}</p>
                <div id="beer-history-panel" style="margin-top: 15px; margin-bottom: 15px;"></div>
                `;

    // --- Custom Beer Actions ---
    const isCustom = String(beer.id).startsWith('CUSTOM_') || (Storage.getCustomBeers && Storage.getCustomBeers().some(b => String(b.id) === String(beer.id)));
    const customActionsHtml = isCustom ? `
        <div id="custom-actions-container" style="margin-top:20px; border-top:1px solid #333; padding-top:20px; display:flex; gap:10px;">
            <button id="btn-edit-beer" class="form-input" style="flex:1; padding:10px 14px; border-radius:25px; display:flex; align-items:center; justify-content:center; gap:6px; font-size:0.9rem; cursor:pointer;">${i18n.t('detail_btn_edit')}</button>
            <button id="btn-delete-beer" class="form-input" style="flex:1; padding:10px 14px; border-radius:25px; color:var(--danger); border-color:var(--danger); display:flex; align-items:center; justify-content:center; gap:6px; font-size:0.9rem; cursor:pointer;">${i18n.t('detail_btn_delete')}</button>
            <button id="btn-share-custom" class="form-input" style="flex:1; padding:10px 14px; border-radius:25px; color:var(--accent-gold); border-color:rgba(255,192,0,0.5); display:flex; align-items:center; justify-content:center; gap:6px; font-size:0.9rem; cursor:pointer;">🔗 Partager</button>
        </div>
    ` : `<div id="custom-actions-container"></div>`;

    // --- Rarity Logic Definition ---
    // Moved logic here: Reveal state is now tied to consumption (count > 0)
    const initRarityLogic = (forceReveal = false) => {
        const rarityContainer = wrapper.querySelector('#rarity-badge-container');
        if (!rarityContainer) return;

        // Determine if unlocked: Drunk at least once OR forceReveal triggered
        const isUnlocked = existingData.count > 0 || forceReveal;

        const renderBadge = () => {
            rarityContainer.innerHTML = '';

            if (beer.rarity && beer.rarity !== 'base') {
                if (isUnlocked) {
                    const badge = document.createElement('div');
                    const animOnce = Storage.getPreference('anim_only_once', false);
                    const hasPlayed = window.__playedAnims.has(`${beer.id}_modal`);

                    // Base badge class
                    badge.className = `rarity-badge rarity-${beer.rarity}`;

                    // Only add animation if it hasn't played or setting is OFF
                    if (!animOnce || !hasPlayed) {
                        badge.classList.add(`anim-${beer.rarity}`);
                        window.__playedAnims.add(`${beer.id}_modal`);
                        if (window.savePlayedAnims) window.savePlayedAnims();
                    }

                    badge.innerText = i18n.t('rarity_' + beer.rarity);
                    rarityContainer.appendChild(badge);
                } else {
                    const hiddenBadge = document.createElement('div');
                    hiddenBadge.className = 'rarity-badge rarity-hidden';
                    hiddenBadge.innerText = '???';
                    // No click handler anymore, must drink to unlock
                    rarityContainer.appendChild(hiddenBadge);
                }
            }

            if (beer.isSeasonal) {
                const seasonBadge = document.createElement('div');
                seasonBadge.className = 'rarity-badge rarity-saisonniere';
                seasonBadge.innerHTML = i18n.t('detail_seasonal');
                rarityContainer.appendChild(seasonBadge);
            }

            // Import bonus indicator
            if (beer.importBonus && beer.importBonus > 0 && isUnlocked) {
                const importBadge = document.createElement('div');
                importBadge.style.cssText = 'font-size: 0.7rem; color: #aaa; margin-top: 4px; text-align: center;';
                const baseLabel = i18n.t('rarity_' + (beer.baseRarity || 'commun'));
                const arrows = '↑'.repeat(beer.importBonus);
                importBadge.innerHTML = `🌍 ${i18n.t('import_bonus_label') || 'Import'} +${beer.importBonus} ${arrows} <span style="color:#666;">(${baseLabel})</span>`;
                rarityContainer.appendChild(importBadge);
            }
        };

        renderBadge();
    };

    // Image Fallback Logic
    const isKeg = (vol) => {
        if (!vol) return false;
        const v = vol.toUpperCase();
        return v.includes('20 L') || v.includes('30 L') || v.includes('50 L') || v.includes('FUT');
    };
    const fallbackImage = isKeg(beer.volume) ? 'images/beer/FUT.jpg' : 'images/beer/default.png';

    let displayImage = imgPath;
    if (!displayImage || (displayImage.includes('FUT.jpg') && !isKeg(beer.volume))) {
        displayImage = fallbackImage;
    }
    const cachedDisplayImage = _bgCachedSrc(displayImage);
    if (cachedDisplayImage) displayImage = cachedDisplayImage;

    const isFav = Storage.isFavorite(beer.id);

    wrapper.innerHTML = `
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px;">
                    <button id="btn-toggle-fav" style="background:none; border:none; font-size:1.8rem; cursor:pointer;">
                        ${isFav ? '⭐' : '🤍'}
                    </button>
                    <div style="display:flex; align-items:center; gap:10px;">
                        ${Utils.isTrappistBeer(beer) ? `
                            <div class="modal-trappist-pill" title="Authentic Trappist Product" style="margin-bottom:0;">
                                <div class="trappist-logo-icon"></div>
                                <span>Bière Trappiste Authentique</span>
                            </div>` : ''}
                        <button id="btn-close-modal" style="background:none; border:none; color:#fff; font-size:1.8rem; cursor:pointer; line-height:1;">&times;</button>
                    </div>
                </div>

                <div style="text-align: center; margin-bottom: 20px;">
                    ${beer.id === 'NEVER_GONNA_GIVE_YOU_ALE_AMBREE_0.50' ? `
                        <video src="images/Rickroll.mp4" autoplay loop muted playsinline style="height: 150px; object-fit: contain; border-radius: 8px; filter: drop-shadow(0 0 10px rgba(255,255,255,0.1));"></video>
                    ` : `
                        <img src="${displayImage}" style="height: 150px; object-fit: contain; filter: drop-shadow(0 0 10px rgba(255,255,255,0.1));" 
                             ${beer.removeBackground && displayImage !== fallbackImage && !isAlreadyCutoutSrc(displayImage) ? 'onload="removeImageBackground(this)"' : ''}
                             onerror="if(this.src.includes('${fallbackImage}')) return; this.src='${fallbackImage}';">
                    `}
                        <h2 style="margin-top: 10px; color: var(--accent-gold);">${beer.title}</h2>
                        <p style="color: #888;"><a href="#" class="brewery-link" data-brewery="${beer.brewery}" style="color: inherit; text-decoration: underline;">${beer.brewery}</a> - ${beer.type}</p>
                        <div style="display: flex; justify-content: center; gap: 15px; margin-top: 5px; font-size: 0.8rem; color: #aaa;">
                            <span>${beer.alcohol || '?'}</span>
                            <span>${Utils.formatVolume(beer.volume) || '?'}</span>
                        </div>
                        <div id="rarity-badge-container" style="margin-top:10px; display:flex; justify-content:center; gap:5px; flex-wrap:wrap;">
                            <!-- Auto-injected by JS logic below -->
                        </div>
                </div>

                ${consumptionWrapper.outerHTML}
                
                <div id="brewbrother-match-container"></div>

                <div class="info-panel">
                    <h4>${i18n.t('info_title')}</h4>
                    <div class="info-stats-grid">
                        ${(() => {
            const abvVal = parseFloat((beer.alcohol || '0').replace('%', '').replace('°', '').replace(',', '.')) || 0;
            const volMl = (() => {
                const s = (beer.volume || '').toLowerCase();
                if (s.includes('ml')) return parseFloat(s) || 330;
                if (s.includes('cl')) return (parseFloat(s) || 33) * 10;
                if (s.includes('l')) return (parseFloat(s) || 0.33) * 1000;
                const v = parseFloat(s) || 33;
                return v < 5 ? v * 1000 : (v < 100 ? v * 10 : v);
            })();
            const gramsAlc = volMl * (abvVal / 100) * 0.8;
            const mlAlc = volMl * (abvVal / 100);
            const calories = Math.round(gramsAlc * 7 + (volMl * 0.03)); // ~7kcal/g alcohol + carbs approx

            // Speculative BAC
            let bacHtml = '';
            if (Storage.getPreference('bac_enabled', true)) {
                const driveInfo = BAC.getSpeculativeDriveInfo(beer.volume, beer.alcohol);
                if (driveInfo) {
                    const waitText = driveInfo.timeStr ? i18n.t('info_wait_drive', { time: driveInfo.timeStr }) : i18n.t('info_ok_drive');
                    bacHtml = `
                                        <div class="info-stat-card info-stat-wide bac-status-card" style="--bac-color:${driveInfo.color};">
                                            <span class="stat-icon">${driveInfo.icon}</span>
                                            <span class="stat-value" style="color:${driveInfo.color};">+${driveInfo.delta.toFixed(2)} g/l</span>
                                            <span class="stat-label">${waitText}</span>
                                        </div>
                                    `;
                }
            }

            return `
                                <div class="info-stat-card">
                                    <span class="stat-icon">🧪</span>
                                    <span class="stat-value">${gramsAlc.toFixed(1)}g</span>
                                    <span class="stat-label">${i18n.t('info_label_pure_alcohol')}</span>
                                </div>
                                <div class="info-stat-card">
                                    <span class="stat-icon">💧</span>
                                    <span class="stat-value">${mlAlc.toFixed(1)}ml</span>
                                    <span class="stat-label">${i18n.t('info_label_vol_alcohol')}</span>
                                </div>
                                <div class="info-stat-card">
                                    <span class="stat-icon">🔥</span>
                                    <span class="stat-value">${calories}</span>
                                    <span class="stat-label">${i18n.t('info_label_calories')}</span>
                                </div>
                                <div class="info-stat-card">
                                    <span class="stat-icon">🍺</span>
                                    <span class="stat-value">${abvVal}°</span>
                                    <span class="stat-label">${i18n.t('info_label_degree')}</span>
                                </div>
                                ${bacHtml}
                            `;
        })()}
                    </div>
                    ${(beer.production_volume || beer.distribution || beer.barrel_aged !== undefined || beer.community_rating || beer.ingredients) ? `
                    <div style="margin-top:12px; padding-top:12px; border-top:1px solid rgba(255,255,255,0.06);">
                        <div class="info-stats-grid">
                            ${beer.production_volume ? `
                                <div class="info-stat-card">
                                    <span class="stat-icon">🏭</span>
                                    <span class="stat-value" style="font-size:0.9rem;">${beer.production_volume}</span>
                                    <span class="stat-label">${i18n.t('info_label_production')}</span>
                                </div>` : ''}
                            ${beer.distribution ? `
                                <div class="info-stat-card">
                                    <span class="stat-icon">🚚</span>
                                    <span class="stat-value" style="font-size:0.9rem;">${beer.distribution}</span>
                                    <span class="stat-label">${i18n.t('info_label_distribution')}</span>
                                </div>` : ''}
                            ${beer.barrel_aged !== undefined ? `
                                <div class="info-stat-card">
                                    <span class="stat-icon">🪵</span>
                                    <span class="stat-value" style="font-size:0.9rem;">${beer.barrel_aged ? i18n.t('yes') : i18n.t('no')}</span>
                                    <span class="stat-label">${i18n.t('info_label_barrel_aged')}</span>
                                </div>` : ''}
                            ${beer.community_rating ? `
                                <div class="info-stat-card">
                                    <span class="stat-icon">⭐</span>
                                    <span class="stat-value" style="font-size:0.9rem;">${beer.community_rating}/5</span>
                                    <span class="stat-label">${i18n.t('info_label_community')}</span>
                                </div>` : ''}
                            ${beer.ingredients ? `
                                <div class="info-stat-card info-stat-wide" style="display:flex; flex-direction:row; align-items:center; gap:10px; padding:10px; justify-content: flex-start;">
                                    <span class="stat-icon" style="margin:0;">🌿</span>
                                    <div style="text-align:left;">
                                        <span class="stat-label" style="display:block; margin:0; text-align:left;">${i18n.t('info_label_ingredients')}</span>
                                        <span class="stat-value" style="font-size:0.85rem; line-height:1.2; white-space:normal; display:block; margin-top:2px; text-transform:none;">${beer.ingredients}</span>
                                    </div>
                                </div>` : ''}
                        </div>
                    </div>
                    ` : ''}
                </div>

                ${renderFoodPairingSection(beer, existingData)}

                <details class="beer-tasting-details" style="background:var(--bg-card); padding:10px; border-radius:12px; margin-bottom:20px;">
                    <summary style="font-weight:bold; cursor:pointer; list-style:none;">📝 ${i18n.t('info_label_tasting_note')} ${existingData.score ? '✅' : ''}</summary>
                    <form id="rating-form" style="margin-top:15px;">
                        ${formFields}

                        <div style="margin-top:20px; border-top:1px solid #333; padding-top:15px; padding-bottom: 15px;">
                            <label class="form-label" style="text-align:center; display:block; margin-bottom:10px;">Sélectionnez les arômes ressentis</label>
                            <div id="aroma-wheel-container"></div>
                        </div>

                        <button type="submit" class="btn-primary">${i18n.t('info_btn_save_note')}</button>
                    </form>
                </details>

                <div style="display:flex; gap:10px; margin-bottom:10px;">
                    <button id="btn-share-beer" class="form-input" style="flex:1;">📤 ${i18n.t('info_btn_link')}</button>
                    <button id="btn-share-insta" class="form-input" style="flex:1;">📸 ${i18n.t('info_btn_fast_story')}</button>
                </div>
                <div style="display:flex; gap:10px; margin-bottom:10px;">
                    <button id="btn-compare-beer" class="form-input" style="flex:1;">⚖️ Comparer</button>
                    <button id="btn-share-tcg" class="form-input" style="flex:1;">🃏 Carte TCG</button>
                </div>
                <button id="btn-share-advanced" class="btn-primary" style="margin-top:0; border:1px solid var(--accent-gold); color:var(--accent-gold); background:transparent;">
                    ✨ ${i18n.t('info_btn_custom_story')}
                </button>

                ${customActionsHtml}

                <div id="similar-beers-container"></div>
                `;

    // Fetch and display BrewBrother match if applicable
    if (window.Recommendation) {
        window.Recommendation.getBeerMatchScore(beer).then(async match => {
            if (match && match.percentage > 0) {
                const container = wrapper.querySelector('#brewbrother-match-container');
                if (container) {
                    const matchColor = match.percentage >= 75 ? 'var(--success)' : (match.percentage >= 50 ? 'var(--accent-gold)' : '#aaa');
                    
                    let explanationHtml = "";
                    if (window.BrewBrotherNLP) {
                        const tone = Storage.getPreference('brewbrother_tone', 'brewbrother');
                        const lang = Storage.getPreference('app_language', 'fr');
                        
                        try {
                            const existingData = Storage.getBeerRating(beer.id);
                            const tastedCount = (existingData && existingData.count > 0) ? parseInt(existingData.count, 10) : 0;
                            const isAlreadyTasted = tastedCount > 0 ? tastedCount : (existingData && (existingData.score > 0 || existingData.date) ? 1 : false);
                            const explanation = await window.BrewBrotherNLP.generateExplanation(beer, match, tone, lang, isAlreadyTasted);
                            explanationHtml = `<div style="margin-top:10px; padding:12px; background:rgba(0,0,0,0.4); border-left:3px solid ${matchColor}; border-radius:4px; font-style:italic; line-height:1.4; color:#ddd;">"${explanation}"</div>`;
                        } catch(e) {
                            console.error(e);
                        }
                    } 
                    
                    if (!explanationHtml) {
                        // Fallback
                        const translateReason = (key) => i18n.t(key) || key;
                        const fallbackReasons = [];
                        if (match.typeScore > 0.7) fallbackReasons.push(translateReason('brewbrother_reason_type') || "Ce type de bière");
                        if (match.breweryScore > 0.7) fallbackReasons.push(translateReason('brewbrother_reason_brewery') || "Cette brasserie");
                        if (match.abvScore > 0.8) fallbackReasons.push(translateReason('brewbrother_reason_abv') || "Taux d'alcool idéal");
                        if (match.flavorScore > 0.7) fallbackReasons.push(translateReason('brewbrother_reason_flavor') || "Saveurs recherchées");
                        
                        if (fallbackReasons.length > 0) {
                            explanationHtml = `<ul style="margin:5px 0 0 15px; font-size:0.8rem; color:#ccc; text-align:left;">
                                ${fallbackReasons.map(r => `<li>${r}</li>`).join('')}
                            </ul>`;
                        } else {
                            explanationHtml = `<div style="font-style:italic; font-size:0.8rem; color:#aaa; margin-top:5px;">${i18n.t('brewbrother_no_strong_match') || "Profil de recommandation global."}</div>`;
                        }
                    }

                    const curVote = typeof Storage.getBrewBrotherBeerFeedback === 'function'
                        ? Storage.getBrewBrotherBeerFeedback(beer.id)
                        : null;
                    const bd = match.breakdown || {};
                    const gaugeRow = (label, val) => (val === undefined || val === null) ? '' : `
                        <div class="bb-gauge-row">
                            <span class="bb-gauge-label">${label}</span>
                            <div class="bb-gauge-track"><div class="bb-gauge-fill" style="width:${Math.max(4, Math.min(100, val))}%; background:${matchColor};"></div></div>
                            <span class="bb-gauge-val">${val}%</span>
                        </div>`;

                    container.innerHTML = `
                        <div class="stat-card bb-detail-card" style="margin-bottom:15px; background:linear-gradient(135deg, rgba(30,30,30,0.8), rgba(15,15,15,0.9)); border:1px solid ${matchColor}; padding:15px; text-align:left;">
                            <h4 style="margin-bottom:10px; color:${matchColor}; display:flex; justify-content:space-between; align-items:center;">
                                <span>🤖 Note BrewBrother</span>
                                <span style="font-size:1.2rem; font-weight:bold;">${match.score20}/20</span>
                            </h4>
                            <div style="font-size:0.9rem;">
                                Affinité estimée à <strong style="color:${matchColor};">${match.percentage}%</strong>${match.confidencePct ? ` <span style="font-size:0.75rem; color:var(--text-secondary);">· confiance ${match.confidencePct}%</span>` : ''}.
                                ${explanationHtml}
                            </div>
                            <div class="bb-gauges-list">
                                ${gaugeRow('Style', bd.type)}
                                ${gaugeRow('Brasserie', bd.brewery)}
                                ${gaugeRow('Saveurs', bd.flavor)}
                                ${gaugeRow('Alcool', bd.abv)}
                                ${match.community ? gaugeRow('Communauté', bd.community) : ''}
                            </div>
                            <div class="bb-feedback-bar">
                                <button type="button" class="bb-vote-btn ${curVote === 'like' ? 'is-liked' : ''}" data-bb-detail-vote="like">👍 J'aime cette reco</button>
                                <button type="button" class="bb-vote-btn ${curVote === 'dislike' ? 'is-disliked' : ''}" data-bb-detail-vote="dislike">👎 Pas mon style</button>
                            </div>
                        </div>
                    `;

                    container.querySelectorAll('[data-bb-detail-vote]').forEach(btn => {
                        btn.onclick = () => {
                            if (typeof Storage.setBrewBrotherBeerFeedback !== 'function') return;
                            const nextVote = Storage.setBrewBrotherBeerFeedback(beer.id, btn.dataset.bbDetailVote);
                            window.Recommendation?.invalidateProfile?.();
                            container.querySelectorAll('[data-bb-detail-vote]').forEach(b => {
                                b.classList.toggle('is-liked', b.dataset.bbDetailVote === 'like' && nextVote === 'like');
                                b.classList.toggle('is-disliked', b.dataset.bbDetailVote === 'dislike' && nextVote === 'dislike');
                            });
                            showToast(nextVote === 'like' ? '👍 Préférence BrewBrother enregistrée !' : (nextVote === 'dislike' ? '👎 Bière exclue de vos recommandations' : 'Vote retiré'));
                        };
                    });
                }
            }
        }).catch(err => console.error("BrewBrother error:", err));
    }

    // ── Similar Beers ("Vous aimerez aussi") ──────────────────
    if (window.Recommendation && typeof window.Recommendation.getSimilarBeers === 'function') {
        try {
            const similarResults = window.Recommendation.getSimilarBeers(beer, { limit: 5, minScore: 0.70 });
            if (similarResults && similarResults.length > 0) {
                const simContainer = wrapper.querySelector('#similar-beers-container');
                if (simContainer) {
                    const isKegFn = (v) => {
                        if (!v) return false;
                        v = String(v).toUpperCase();
                        return v.includes('20 L') || v.includes('30 L') || v.includes('50 L') || v.includes('FUT');
                    };

                    const cardsHtml = similarResults.map(item => {
                        const sb = item.beer;
                        const pct = Math.round(item.score * 100);
                        const badgeClass = pct >= 80 ? 'high' : 'medium';
                        const fallback = isKegFn(sb.volume) ? 'images/beer/FUT.jpg' : 'images/beer/default.png';
                        let img = sb.image;
                        if (!img || (img.includes('FUT.jpg') && !isKegFn(sb.volume))) img = fallback;

                        return `
                            <div class="similar-beer-card" data-beer-id="${sb.id}">
                                <img src="${img}" alt="${sb.title}" class="similar-beer-img" loading="lazy"
                                     onerror="if(this.src.includes('${fallback}')) return; this.src='${fallback}';">
                                <div class="similar-beer-name">${sb.title}</div>
                                <div class="similar-beer-brewery">${sb.brewery || ''}</div>
                                <span class="similar-beer-badge ${badgeClass}">${i18n.t('similar_beers_match', { pct })}</span>
                            </div>`;
                    }).join('');

                    simContainer.innerHTML = `
                        <div class="similar-beers-section">
                            <h4>🍻 ${i18n.t('similar_beers_title')}</h4>
                            <div class="similar-beers-track-wrapper">
                                <div class="similar-beers-track">${cardsHtml}</div>
                            </div>
                        </div>`;

                    // Bind click to navigate to similar beer detail
                    simContainer.querySelectorAll('.similar-beer-card').forEach(card => {
                        card.addEventListener('click', () => {
                            const targetId = card.dataset.beerId;
                            // Find the beer in the Recommendation cache
                            const targetBeer = similarResults.find(r => String(r.beer.id) === String(targetId));
                            if (targetBeer) {
                                renderBeerDetail(targetBeer.beer, onSave);
                            }
                        });
                    });
                }
            }
        } catch (err) {
            console.error('Similar beers error:', err);
        }
    }

    // Volume Presets Logic
    const volBtns = wrapper.querySelectorAll('.vol-btn');
    const hiddenVol = wrapper.querySelector('#consumption-volume');
    const customVolContainer = wrapper.querySelector('#custom-vol-container');
    const customVolInput = wrapper.querySelector('#custom-vol-input');

    const PRESET_VOLUMES = [
        { key: '15cl', ml: 150 },
        { key: '25cl', ml: 250 },
        { key: '33cl', ml: 330 },
        { key: '50cl', ml: 500 },
        { key: '75cl', ml: 750 },
        { key: '150cl', ml: 1500 }
    ];

    const updateVolUI = (vol, isDirectCustom = false) => {
        if (isDirectCustom || vol === 'custom') {
            volBtns.forEach(btn => {
                const isSelected = btn.dataset.vol === 'custom';
                btn.classList.toggle('is-active', isSelected);
                if (isSelected) {
                    btn.style.background = 'var(--accent-gold)';
                    btn.style.color = '#000';
                    btn.style.borderColor = 'var(--accent-gold)';
                    btn.style.fontWeight = 'bold';
                } else {
                    btn.style.background = 'var(--bg-dark)';
                    btn.style.color = '#fff';
                    btn.style.borderColor = '#444';
                    btn.style.fontWeight = 'normal';
                }
            });
            customVolContainer.style.display = 'block';
            if (vol && vol !== 'custom') customVolInput.value = vol;
            setTimeout(() => customVolInput.focus(), 50);
            return;
        }

        let matchingPreset = PRESET_VOLUMES.find(p => p.key === vol);
        if (!matchingPreset && vol) {
            const ml = Utils.parseVolumeToMl(vol);
            if (ml > 0) matchingPreset = PRESET_VOLUMES.find(p => p.ml === ml);
        }

        if (matchingPreset) {
            volBtns.forEach(btn => {
                const isSelected = btn.dataset.vol === matchingPreset.key;
                btn.classList.toggle('is-active', isSelected);
                if (isSelected) {
                    btn.style.background = 'var(--accent-gold)';
                    btn.style.color = '#000';
                    btn.style.borderColor = 'var(--accent-gold)';
                    btn.style.fontWeight = 'bold';
                } else {
                    btn.style.background = 'var(--bg-dark)';
                    btn.style.color = '#fff';
                    btn.style.borderColor = '#444';
                    btn.style.fontWeight = 'normal';
                }
            });
            customVolContainer.style.display = 'none';
            hiddenVol.value = matchingPreset.key;
        } else {
            volBtns.forEach(btn => {
                const isSelected = btn.dataset.vol === 'custom';
                btn.classList.toggle('is-active', isSelected);
                if (isSelected) {
                    btn.style.background = 'var(--accent-gold)';
                    btn.style.color = '#000';
                    btn.style.borderColor = 'var(--accent-gold)';
                    btn.style.fontWeight = 'bold';
                } else {
                    btn.style.background = 'var(--bg-dark)';
                    btn.style.color = '#fff';
                    btn.style.borderColor = '#444';
                    btn.style.fontWeight = 'normal';
                }
            });
            customVolContainer.style.display = 'block';
            if (vol) customVolInput.value = vol;
            hiddenVol.value = vol || '';
        }
    };

    volBtns.forEach(btn => {
        btn.onclick = () => {
            const v = btn.dataset.vol;
            if (v === 'custom') {
                updateVolUI(customVolInput.value || 'custom', true);
                if (customVolInput.value) {
                    hiddenVol.value = customVolInput.value;
                }
            } else {
                hiddenVol.value = v;
                updateVolUI(v);
                Storage.savePreference('last_volume_preset', v);
            }
        };
    });

    customVolInput.oninput = (e) => {
        const rawVal = e.target.value.trim();
        hiddenVol.value = e.target.value;
        Storage.savePreference('last_volume_preset', e.target.value);

        if (rawVal) {
            const ml = Utils.parseVolumeToMl(rawVal);
            if (ml > 0) {
                const match = PRESET_VOLUMES.find(p => p.ml === ml);
                if (match) {
                    hiddenVol.value = match.key;
                    Storage.savePreference('last_volume_preset', match.key);
                    volBtns.forEach(btn => {
                        if (btn.dataset.vol === match.key) {
                            btn.style.background = 'var(--accent-gold)';
                            btn.style.color = '#000';
                            btn.style.borderColor = 'var(--accent-gold)';
                            btn.style.fontWeight = 'bold';
                        } else {
                            btn.style.background = 'var(--bg-dark)';
                            btn.style.color = '#fff';
                            btn.style.borderColor = '#444';
                            btn.style.fontWeight = 'normal';
                        }
                    });
                    customVolContainer.style.display = 'none';
                }
            }
        }
    };

    // Init Volume UI
    updateVolUI(hiddenVol.value);

    // Initialize Aroma Wheel from within the modal wrapper
    let currentAromas = existingData.aromas || [];
    const aromaWheel = new AromaWheel(wrapper.querySelector('#aroma-wheel-container'), currentAromas, (selected) => {
        currentAromas = selected;
    });

    // Initialize Rarity Logic *after* HTML is in DOM
    initRarityLogic();

    // Close Modal Handler
    wrapper.querySelector('#btn-close-modal').onclick = () => {
        closeModal();
    };

    // Toggle Favorite Handler
    const btnFav = wrapper.querySelector('#btn-toggle-fav');
    btnFav.onclick = () => {
        const isNowFav = Storage.toggleFavorite(beer.id);
        btnFav.innerHTML = isNowFav ? '⭐' : '🤍';

        // Trigger save callback to update list if needed? 
        // Or just let user refresh manually. 
        // Achievements check might not be needed for favs, but consistent state is good.
        if (onSave) onSave(null);
    };

    // Share Link Handler
    wrapper.querySelector('#btn-share-beer').onclick = async () => {
        showToast(i18n.t('toast_preparing_share'));
        await Storage.shareBeer(beer);
    };

    // Share Image Handler (Insta-Beer)
    wrapper.querySelector('#btn-share-insta').onclick = async () => {
        const btn = wrapper.querySelector('#btn-share-insta');
        const originalText = btn.innerHTML;
        btn.innerHTML = i18n.t('reveal_creating');

        try {
            const latestData = Storage.getBeerRating(beer.id) || {};
            const userRating = latestData.score || 0;
            const userComment = latestData.comment || "";

            const blob = await Share.generateBeerCard(beer, userRating, userComment);
            await Share.shareImage(blob, i18n.t('share_title_checkin', { title: beer.title }));
            btn.innerHTML = originalText;
        } catch (err) {
            console.error(err);
            btn.innerHTML = originalText;
            showToast(err.message === 'Web Share API not supported' ? i18n.t('toast_share_unsupported') : i18n.t('toast_share_error'));
        }
    };

    wrapper.querySelector('#btn-compare-beer').onclick = () => {
        openCompareModal(beer);
    };

    wrapper.querySelector('#btn-share-tcg').onclick = async () => {
        const btn = wrapper.querySelector('#btn-share-tcg');
        const originalText = btn.innerHTML;
        btn.innerHTML = i18n.t('reveal_creating');
        try {
            const latestData = Storage.getBeerRating(beer.id) || {};
            const blob = await Share.generateTCGCard(beer, latestData);
            await Share.shareImage(blob, `${beer.title} — TCG`);
        } catch (err) {
            console.error(err);
            showToast(i18n.t('toast_share_error'));
        } finally {
            btn.innerHTML = originalText;
        }
    };

    // Advanced Share
    wrapper.querySelector('#btn-share-advanced').onclick = () => {
        renderAdvancedShareModal(beer, existingData);
    };

    // Re-binding Logic for Consumption
    wrapper.querySelector('#btn-drink').onclick = async () => {
        const wasLocked = !existingData.count || existingData.count === 0;

        if (beer.id === 'NEVER_GONNA_GIVE_YOU_ALE_AMBREE_0.50') {
            const trollAudio = new Audio('images/music/Trolololo.mp3');
            trollAudio.play().catch(err => console.log('Audio playback failed', err));
        }

        const vol = wrapper.querySelector('#consumption-volume').value;
        const dateOverride = wrapper.querySelector('#consumption-date') ? wrapper.querySelector('#consumption-date').value : null;
        const newData = Storage.addConsumption(beer.id, vol, dateOverride);

        // --- BAC INTEGRATION ---
        if (Storage.getPreference('bac_enabled', true) && !Storage.getPreference('bac_manual_only', false)) {
            BAC.addDrinkToBAC(vol, beer.alcohol || 5.0, dateOverride);
        }

        Analytics.track('beer_consumed', {
            beer_id: beer.id,
            name: beer.title,
            brewery: beer.brewery || i18n.t('label_unknown'),
            type: beer.type || i18n.t('label_unknown'),
            volume: vol
        });

        // Update local object reference for immediate UI updates relying on it
        existingData.count = newData.count;
        wrapper.querySelector('#consumption-count').innerText = newData.count;
        renderHistoryPanel(newData.history);

        showToast(i18n.t('toast_glou_glou', { vol: vol }));

        // Premium Reveal Sequence if FIRST TIME
        if (wasLocked && beer.rarity && beer.rarity !== 'base') {
            // Create Premium Overlay
            const overlay = document.createElement('div');
            overlay.className = 'reveal-overlay premium-reveal';

            // Get Rarity Info
            const rarityColors = {
                'commun': '#2ecc71',
                'rare': '#3498db',
                'super_rare': '#00bcd4',
                'epique': '#9b59b6',
                'mythique': '#e74c3c',
                'legendaire': '#f39c12',
                'ultra_legendaire': '#ff00cc'
            };
            const particleColor = rarityColors[beer.rarity] || '#FFC000';
            const rarityName = i18n.t('rarity_' + beer.rarity).toUpperCase();

            // Construct a clone of the actual card for the reveal
            const fallbackImage = isKeg(beer.volume) ? 'images/beer/FUT.jpg' : 'images/beer/default.png';
            let displayImage = beer.image;
            if (!displayImage || (displayImage.includes('FUT.jpg') && !isKeg(beer.volume))) {
                displayImage = fallbackImage;
            }
            const cachedDisplayImage = _bgCachedSrc(displayImage);
            if (cachedDisplayImage) displayImage = cachedDisplayImage;

            // Create Canvas for Particles
            const canvas = document.createElement('canvas');
            canvas.style.cssText = 'position:absolute; top:0; left:0; width:100%; height:100%; pointer-events:none; z-index: 5;';

            overlay.innerHTML = `
                <div class="premium-reveal-container" style="position: relative; z-index: 10; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; width: 100%;">
                    
                    <!-- Mystery Capsule (Phase 1) -->
                    <div id="mystery-box" style="width: 140px; height: 140px; background: linear-gradient(135deg, #222, #000); border: 4px solid var(--accent-gold); border-radius: 50%; display: flex; justify-content: center; align-items: center; box-shadow: 0 0 30px var(--accent-gold); transition: all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);">
                        <span style="font-size: 4rem; filter: drop-shadow(0 0 10px var(--accent-gold));">🍺</span>
                    </div>

                    <!-- Revealed Content (Phase 2) -->
                    <div id="revealed-content" style="display: none; flex-direction: column; align-items: center; width: 100%; padding: 20px;">
                        <h2 class="animate__animated animate__fadeInDown" style="color: ${particleColor}; text-shadow: 0 0 20px ${particleColor}; font-size: clamp(1.8rem, 5vw, 2.5rem); margin-bottom: 30px; text-transform: uppercase; font-weight: 900; letter-spacing: 2px; text-align: center;">${i18n.t('reveal_new_beer')}</h2>
                        
                        <div class="reveal-card-wrapper animate__animated animate__zoomIn" data-tilt data-tilt-glare data-tilt-max-glare="0.8" style="perspective: 1000px; max-width: 90vw;">
                            <div class="beer-card card-rarity-${beer.rarity} ${beer.rarity === 'ultra_legendaire' ? 'card-anim-ultra_legendary' : ''}" style="width: 260px; height: auto; min-height: 400px; margin: 0; background: var(--bg-card); display: flex; flex-direction: column; cursor: pointer; border-width: 3px;">
                                
                                <div style="width:100%; height:200px; display:flex; justify-content:center; align-items:center; margin-bottom: 15px;">
                                    ${beer.id === 'NEVER_GONNA_GIVE_YOU_ALE_AMBREE_0.50' ? `
                                        <video src="images/Rickroll.mp4" autoplay loop muted playsinline style="max-height: 180px; object-fit: contain; border-radius: 8px;"></video>
                                    ` : `
                                        <img src="${displayImage}" alt="${Utils.escapeHtml(beer.title)}" class="beer-image" style="max-height: 180px; object-fit: contain;" ${beer.removeBackground && !isAlreadyCutoutSrc(displayImage) ? 'onload="removeImageBackground(this)"' : ''}>
                                    `}
                                </div>
                                <div class="beer-info" style="text-align: center; flex-grow: 1; display: flex; flex-direction: column; justify-content: center;">
                                    <h3 class="beer-title" style="font-size: 1.5rem; margin-bottom: 5px;">${beer.title}</h3>
                                    <p class="beer-brewery" style="font-size: 1.1rem; color: #aaa;">${beer.brewery}</p>
                                </div>
                                <div class="reveal-rarity-banner" style="background: ${particleColor}; color: #000; text-align: center; font-weight: bold; padding: 10px; margin-top: 15px; border-radius: 5px; text-shadow: none; font-size: 1.2rem; text-transform: uppercase; box-shadow: 0 0 15px ${particleColor}; margin-bottom: 10px;">
                                    ${rarityName}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;

            overlay.appendChild(canvas);
            document.body.appendChild(overlay);

            const box = overlay.querySelector('#mystery-box');
            const content = overlay.querySelector('#revealed-content');

            // Sequence Timing
            // 1. Shake the Mystery Box
            setTimeout(() => {
                box.classList.add('rumble-effect');
                box.style.transform = 'scale(1.2)';
                box.style.boxShadow = `0 0 100px ${particleColor}`;
                box.style.borderColor = particleColor;
            }, 500);

            // 2. Explode & Reveal 
            setTimeout(() => {
                box.style.display = 'none';
                content.style.display = 'flex'; // Trigger display

                // Fireworks
                import('./fx.js').then(m => {
                    m.FX.burst(window.innerWidth / 2, window.innerHeight / 2, particleColor);
                    if (['epique', 'mythique', 'legendaire', 'ultra_legendaire'].includes(beer.rarity)) {
                        m.FX.confetti();
                    }
                    if (['mythique', 'legendaire', 'ultra_legendaire'].includes(beer.rarity)) {
                        const count = beer.rarity === 'ultra_legendaire' ? 300 : 200;
                        m.FX.particleExplosion(canvas, particleColor, count);
                    }
                }).catch(e => console.log('FX Module issue'));

                import('./feedback.js').then(m => m.Feedback.impactHeavy()).catch(e => { });

                // Initialize Tilt on Reveal (desktop only)
                setTimeout(() => {
                    const isTouchPrimary = window.matchMedia("(hover: none) and (pointer: coarse)").matches;
                    if (!isTouchPrimary && !document.body.classList.contains('perf-low-end')) {
                        loadVanillaTilt().then(() => {
                            const target = overlay.querySelector('.reveal-card-wrapper');
                            if (typeof VanillaTilt !== 'undefined' && target) {
                                VanillaTilt.init(target, {
                                    max: 15,
                                    speed: 400,
                                    glare: true,
                                    "max-glare": 0.8,
                                    scale: 1.05,
                                    gyroscope: false
                                });
                            }
                        }).catch(() => {});
                    }
                }, 500);

            }, 2000);

            // 3. Close & cleanup after user views it or clicks
            const cleanup = () => {
                overlay.style.transition = 'opacity 0.6s';
                overlay.style.opacity = '0';
                setTimeout(() => {
                    overlay.remove();
                    // Show Rarity Badge inside modal
                    initRarityLogic(true);

                    // Animate Badge
                    const badge = wrapper.querySelector(`.rarity-${beer.rarity}`);
                    if (badge) {
                        badge.animate([
                            { transform: 'scale(0) rotate(-180deg)', filter: 'brightness(3)' },
                            { transform: 'scale(2.5) rotate(10deg)', filter: 'brightness(2)' },
                            { transform: 'scale(1) rotate(0deg)', filter: 'brightness(1)' }
                        ], { duration: 1000, easing: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)' });
                    }
                }, 600);
            };

            // Interaction to close
            setTimeout(() => {
                overlay.onclick = cleanup;
                setTimeout(cleanup, 5000);
            }, 4000);
        } else {
            // Normal update just in case
            initRarityLogic();
        }

        // Play Sound
        if (typeof Feedback !== 'undefined') {
            Feedback.playRarity(beer.rarity);
            Feedback.impactHeavy();
        }

        // Async achievements check
        import('./achievements.js').then(module => {
            // trigger achievement check if needed
        }).catch(err => console.error(err));

        window.dispatchEvent(new CustomEvent('beerdex-action'));
    };

    wrapper.querySelector('#btn-undrink').onclick = () => {
        const volInput = wrapper.querySelector('#consumption-volume');
        const vol = Utils.formatVolume(volInput ? volInput.value : beer.volume);
        const newData = Storage.removeConsumption(beer.id);
        if (newData) {
            // --- BAC INTEGRATION ---
            if (Storage.getPreference('bac_enabled', true) && !Storage.getPreference('bac_manual_only', false)) {
                BAC.removeDrinkFromBAC(vol, beer.alcohol || 5.0);
            }

            existingData.count = newData.count; // Update ref
            wrapper.querySelector('#consumption-count').innerText = newData.count;
            renderHistoryPanel(newData.history);
            showToast(i18n.t('toast_drink_cancelled'));

            // Re-lock if count back to 0
            if (newData.count === 0) {
                initRarityLogic(); // Will see count=0 and hide it
            }
        }
    };

    // Binding for Custom Actions (only if buttons already exist, i.e. beer was CUSTOM_ from the start)
    const existingEditBtn = wrapper.querySelector('#btn-edit-beer');
    const existingDeleteBtn = wrapper.querySelector('#btn-delete-beer');
    const btnShareCustom = wrapper.querySelector('#btn-share-custom');
    if (existingDeleteBtn) {
        existingDeleteBtn.onclick = async () => {
            if (await showConfirmModal(i18n.t('modal_confirm_delete_beer'))) {
                Storage.deleteCustomBeer(beer.id);
                window.removeBeerFromState?.(beer.id);
                closeModal();
                showToast(i18n.t('toast_beer_deleted'));
                window.renderCurrentView?.();
            }
        };
    }
    if (btnShareCustom) {
        btnShareCustom.onclick = () => {
            const wrapperShare = document.createElement('div');
            wrapperShare.className = 'modal-dialog';
            wrapperShare.style.maxWidth = '400px';
            wrapperShare.style.padding = '24px 20px';
            const inParty = Match && Match.roomCode;
            
            wrapperShare.innerHTML = `
                <div style="display:flex; justify-content:flex-end; margin-top:-6px; margin-bottom:4px;">
                    <button type="button" class="close-btn" style="background:none; border:none; color:var(--text-secondary); font-size:1.6rem; cursor:pointer; padding:2px 8px; line-height:1;">&times;</button>
                </div>
                <div class="dialog-icon" style="font-size:2.2rem; margin-bottom:8px;">🍻</div>
                <h3 style="margin:0 0 12px 0; color:var(--accent-gold); font-size:1.3rem;">Partager la bière</h3>
                <div style="background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.08); border-radius:12px; padding:12px 14px; margin-bottom:18px;">
                    <strong style="display:block; font-size:1rem; color:#fff; margin-bottom:4px;">${beer.title}</strong>
                    <span style="font-size:0.8rem; color:#aaa;">Partagez directement avec vos amis via Beer Party P2P</span>
                </div>
                ${inParty ? `
                    <div style="background: rgba(255,255,255,0.04); border: 1px solid var(--accent-gold); border-radius: 12px; padding: 12px; margin-bottom: 15px;">
                        <span style="font-size:0.75rem; color:#aaa; display:block; margin-bottom:4px; text-transform:uppercase; letter-spacing:1px;">Beer Party active</span>
                        <span style="font-family:'Courier New', monospace; font-size:1.4rem; color:var(--accent-gold); font-weight:bold; letter-spacing:3px;">${Match.roomCode}</span>
                    </div>
                    <div style="display:flex; flex-direction:column; gap:10px;">
                        <button id="btn-share-single-party" class="btn-confirm" style="padding:12px 18px; border-radius:25px; font-weight:700;">
                            🚀 Partager dans la Party
                        </button>
                        <button class="close-btn btn-cancel" style="padding:10px 18px; border-radius:25px;">Fermer</button>
                    </div>
                ` : `
                    <div style="display:flex; flex-direction:column; gap:10px;">
                        <button id="btn-create-host-party" class="btn-confirm" style="padding:12px 18px; border-radius:25px; font-weight:700;">
                            👑 Créer une Beer Party (Hôte)
                        </button>
                        <button id="btn-join-party-opt" class="btn-cancel" style="padding:11px 18px; border-radius:25px;">
                            Rejoindre une Party existante
                        </button>
                        <button class="close-btn btn-cancel" style="padding:10px 18px; border-radius:25px;">Fermer</button>
                    </div>
                `}
            `;
            
            if (inParty) {
                wrapperShare.querySelector('#btn-share-single-party').onclick = () => {
                    Match.shareCustomBeer([beer]); 
                    closeModal();
                    showToast("Bière envoyée dans la Party !");
                };
            } else {
                const btnHost = wrapperShare.querySelector('#btn-create-host-party');
                btnHost.onclick = async () => {
                    btnHost.textContent = "Création de la Party...";
                    btnHost.disabled = true;
                    try {
                        const code = await Match.createParty(window.allBeers || [], handleGlobalPartyState);
                        updateHeaderPartyUI();
                        Match.shareCustomBeer([beer]);
                        closeModal();
                        showToast(`Party ${code} créée ! Bière partagée.`);
                        if (window.UI && window.UI.renderPartyQRModal) {
                            window.UI.renderPartyQRModal(code);
                        }
                    } catch (err) {
                        showAlertModal("Erreur de création de la Party : " + err.message, { icon: '❌' });
                        btnHost.textContent = "👑 Créer une Beer Party (Hôte)";
                        btnHost.disabled = false;
                    }
                };
                wrapperShare.querySelector('#btn-join-party-opt').onclick = () => {
                    closeModal();
                    if (window.UI && window.UI.renderMatchModal) {
                        window.UI.renderMatchModal(window.allBeers || []);
                    }
                };
            }
            
            wrapperShare.querySelectorAll('.close-btn').forEach(btn => btn.onclick = () => closeModal());
            openModal(wrapperShare);
        };
    }
    if (existingEditBtn) {
        existingEditBtn.onclick = () => {
            closeModal();
            setTimeout(() => {
                renderAddBeerForm((updatedBeer) => {
                    window.updateBeerInState?.(updatedBeer);
                    closeModal();
                    showToast(i18n.t('toast_beer_modified'));
                    window.renderCurrentView?.();
                }, beer);
            }, 60);
        };
    }

    wrapper.querySelector('#rating-form').onsubmit = (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const data = {};

        template.forEach(field => {
            if (field.type === 'checkbox') {
                data[field.id] = formData.get(field.id) === 'on';
            } else {
                data[field.id] = formData.get(field.id);
            }
        });

        // Validation for core score if present
        if (template.find(t => t.id === 'score') && !data.score) {
            showAlertModal("Veuillez mettre une note !", { icon: '⭐' });
            return;
        }

        data.aromas = currentAromas;

        onSave(data);

        // Track rating optionally filtering out null score
        if (data.score) {
            Analytics.track('beer_rated', {
                beer_id: beer.id,
                name: beer.title,
                score: data.score
            });
        }

        showToast(i18n.t('toast_rating_saved'));

        wrapper.querySelector('details').open = false;
        wrapper.querySelector('summary').innerHTML = "📝 Note de dégustation ✅";
    };

    const breweryLink = wrapper.querySelector('.brewery-link');
    if (breweryLink) {
        breweryLink.onclick = (e) => {
            e.preventDefault();
            const bName = e.target.getAttribute('data-brewery');
            if (bName) {
                closeModal();
                setTimeout(() => {
                    window.dispatchEvent(new CustomEvent('beerdex-open-brewery', { detail: { brewery: bName } }));
                }, 50);
            }
        };
    }

    renderHistoryPanel(existingData.history);
    openModal(wrapper);
}

export function renderAddBeerForm(onSave, editModeBeer = null, prefillData = null) {
    const wrapper = document.createElement('div');
    wrapper.className = 'modal-content';

    const title = editModeBeer ? i18n.t('modal_title_edit') : i18n.t('modal_title_add');
    const btnText = editModeBeer ? i18n.t('btn_save_changes') : i18n.t('btn_add');

    // Fill values: Priority -> editModeBeer -> prefillData -> ''
    const v = (key) => {
        if (editModeBeer && editModeBeer[key]) return editModeBeer[key];
        if (prefillData && prefillData[key]) return prefillData[key];
        return '';
    };

    let provinceOptionsHtml = `<option value="">${i18n.t('form_option_unspecified')}</option>`;
    const currentProvince = v('province');

    Object.entries(Map.MAPS || {}).forEach(([scope, mapObj]) => {
        if (mapObj.isContinental) return;
        const groupLabel = `${mapObj.icon} ${i18n.t(mapObj.titleKey)}`;
        provinceOptionsHtml += `<optgroup label="${groupLabel}">`;
        if (mapObj.names) {
            Object.entries(mapObj.names).forEach(([code]) => {
                const selected = (currentProvince === code) ? 'selected' : '';
                const displayName = Map.getRegionName(scope, code);
                provinceOptionsHtml += `<option value="${code}" ${selected}>${displayName}</option>`;
            });
        }
        provinceOptionsHtml += `</optgroup>`;
    });
    provinceOptionsHtml += `
        <optgroup label="🌍 ${i18n.t('region_others') || 'Autres'}">
            <option value="OTHER" ${currentProvince === 'OTHER' ? 'selected' : ''}>${i18n.t('province_other') || 'Autre'}</option>
        </optgroup>
    `;

    wrapper.innerHTML = `
                <h2 style="margin-bottom: 15px;">${title}</h2>
                <form id="add-beer-form">
                    <div class="form-group">
                        <label class="form-label">${i18n.t('label_beer_name')}</label>
                        <input type="text" class="form-input" name="title" value="${v('title')}" required>
                    </div>

                    <div class="form-group">
                        <label class="form-label">${i18n.t('form_label_brewery') || 'Brasserie'}</label>
                        <input type="text" class="form-input" name="brewery" value="${v('brewery')}" required>
                    </div>

                    <div class="form-group">
                        <label class="form-label">${i18n.t('form_label_province')}</label>
                        <select class="form-select" name="province">
                            ${provinceOptionsHtml}
                        </select>
                    </div>

                    <div class="form-group">
                        <label class="form-label">${i18n.t('form_label_type')}</label>
                        <input type="text" class="form-input" name="type" value="${v('type')}">
                    </div>

                    <div class="form-group">
                        <label class="form-label">${i18n.t('form_label_alcohol')}</label>
                        <input type="text" class="form-input" name="alcohol" value="${v('alcohol')}">
                    </div>

                    <div class="form-group">
                        <label class="form-label">${i18n.t('form_label_volume')}</label>
                        <input type="text" class="form-input" name="volume" value="${v('volume')}">
                    </div>

                    <div class="form-group">
                        <label class="form-label">${i18n.t('form_label_distribution')}</label>
                        <select class="form-select" name="distribution">
                            <option value="1" ${v('distribution') === 'Partout' ? 'selected' : ''}>${i18n.t('form_dist_partout')} (1 pt)</option>
                            <option value="2" ${v('distribution') === 'Supermarché' ? 'selected' : ''}>${i18n.t('form_dist_supermarket')} (2 pts)</option>
                            <option value="3" ${v('distribution') === 'Cavistes' ? 'selected' : ''}>${i18n.t('form_dist_cavistes')} (3 pts)</option>
                            <option value="4" ${v('distribution') === 'Cavistes spécialisés' ? 'selected' : ''}>${i18n.t('form_dist_cavistes_spec')} (4 pts)</option>
                            <option value="5" ${v('distribution') === 'À la brasserie' ? 'selected' : ''}>${i18n.t('form_dist_brewery')} (5 pts)</option>
                        </select>
                    </div>

                    <div class="form-group">
                        <label class="form-label">${i18n.t('form_label_availability')}</label>
                        <select class="form-select" name="availability">
                            <option value="1">${i18n.t('form_avail_perm')} (1 pt)</option>
                            <option value="2">${i18n.t('form_avail_seasonal')} (2 pts)</option>
                            <option value="3">${i18n.t('form_avail_limited')} (3 pts)</option>
                            <option value="4">${i18n.t('form_avail_batch')} (4 pts)</option>
                            <option value="5">${i18n.t('form_avail_unique')} (5 pts)</option>
                        </select>
                    </div>

                    <div class="form-group">
                        <label class="form-label">${i18n.t('form_label_ingr_notes')}</label>
                        <input type="text" class="form-input" name="ingredients" value="${v('ingredients') || ''}" placeholder="${i18n.t('detail_ingredients_placeholder')}">
                    </div>

                    <div class="form-group" style="display:flex; align-items:center; gap:10px; margin-bottom:15px;">
                        <input type="checkbox" name="barrel_aged" id="barrel_aged" ${v('barrel_aged') ? 'checked' : ''} style="width:20px; height:20px;">
                        <label for="barrel_aged" style="font-size:0.9rem; margin:0;">${i18n.t('form_label_barrel_aged')}</label>
                    </div>

                    <div class="form-group">
                        <label class="form-label">${i18n.t('form_label_rarity')}</label>
                        <div style="display:flex; gap:10px; margin-bottom:10px;">
                            <select class="form-select" name="rarity" style="flex:1;">
                                <option value="" selected>${i18n.t('form_rarity_auto')}</option>
                                <option value="base" ${v('rarity') === 'base' ? 'selected' : ''}>${i18n.t('form_rarity_base')}</option>
                                <option value="commun" ${v('rarity') === 'commun' ? 'selected' : ''}>${i18n.t('form_rarity_comm')}</option>
                                <option value="rare" ${v('rarity') === 'rare' ? 'selected' : ''}>${i18n.t('form_rarity_rare')}</option>
                                <option value="super_rare" ${v('rarity') === 'super_rare' ? 'selected' : ''}>${i18n.t('form_rarity_super')}</option>
                                <option value="epique" ${v('rarity') === 'epique' ? 'selected' : ''}>${i18n.t('form_rarity_epic')}</option>
                                <option value="mythique" ${v('rarity') === 'mythique' ? 'selected' : ''}>${i18n.t('form_rarity_myth')}</option>
                                <option value="legendaire" ${v('rarity') === 'legendaire' ? 'selected' : ''}>${i18n.t('form_rarity_legend')}</option>
                                <option value="ultra_legendaire" ${v('rarity') === 'ultra_legendaire' ? 'selected' : ''}>${i18n.t('form_rarity_ultra')}</option>
                            </select>
                        </div>
                        <div style="display:flex; align-items:center; gap:10px;">
                            <input type="checkbox" name="isSeasonal" id="isSeasonal" ${v('isSeasonal') ? 'checked' : ''} style="width:20px; height:20px;">
                            <label for="isSeasonal" style="font-size:0.9rem; margin:0;">${i18n.t('form_label_event')}</label>
                        </div>
                    </div>

                    <div class="form-group">
                        <label class="form-label">${i18n.t('form_label_image')}</label>
                        <div style="display: flex; gap: 10px; align-items: center; margin-bottom: 5px;">
                            <input type="file" id="image-file-input" accept="image/*" style="display: none;">
                            <input type="file" id="image-camera-input" accept="image/*" capture="environment" style="display: none;">
                            <button type="button" class="form-input" style="flex:1; padding: 10px; font-size: 0.9rem;" onclick="document.getElementById('image-file-input').click()">📁 ${i18n.t('btn_gallery') || 'Galerie'}</button>
                            <button type="button" class="form-input" style="flex:1; padding: 10px; font-size: 0.9rem;" onclick="document.getElementById('image-camera-input').click()">📷 ${i18n.t('btn_photo') || 'Photo'}</button>
                        </div>
                        <div style="text-align: center;">
                            <span id="file-name" style="font-size: 0.8rem; color: #888;">${editModeBeer ? (i18n.t('form_status_img_keep') || 'Image conservée') : (i18n.t('form_status_img_default') || 'Aucune image')}</span>
                        </div>
                    </div>

                    <button type="submit" class="btn-primary">${btnText}</button>
                </form>
                `;

    let imageBase64 = (editModeBeer ? editModeBeer.image : '') || (prefillData ? prefillData.image : '');

    // File Reader Logic with Resize
    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            wrapper.querySelector('#file-name').innerText = i18n.t('status_processing') || "Traitement...";
            resizeImage(file, 250, 250, (resizedBase64) => {
                imageBase64 = resizedBase64;
                wrapper.querySelector('#file-name').innerText = file.name + " (" + (i18n.t('status_resized') || "Redimensionné") + ")";
            });
        }
    };
    
    wrapper.querySelector('#image-file-input').onchange = handleImageChange;
    wrapper.querySelector('#image-camera-input').onchange = handleImageChange;

    // Point-Based Rarity Calculation
    const calculatePointRarity = (distributionPts, typePts, availabilityPts, barrelAged) => {
        let score = parseInt(distributionPts) + parseInt(typePts) + parseInt(availabilityPts);
        if (barrelAged) score += 2; // Bonus for barrel aged

        // Score: 3-4 = Base, 5-6 = Commun, 7-8 = Rare, 9-10 = Super Rare, 11-12 = Epique, 13-14 = Mythique, 15+ = Légendaire
        if (score <= 4) return 'base';
        if (score <= 6) return 'commun';
        if (score <= 8) return 'rare';
        if (score <= 10) return 'super_rare';
        if (score <= 12) return 'epique';
        if (score <= 14) return 'mythique';
        return 'legendaire';
    };

    // Type Points Mapping
    const getTypePts = (type) => {
        const t = (type || '').toLowerCase();
        if (t.match(/pils|lager/)) return 1;
        if (t.match(/blonde|blanche|pils/)) return 1;
        if (t.match(/ipa|stout|porter|saison|tripel|dubbel|double|quadrupel/)) return 2;
        if (t.match(/sour|gose|berliner|wild|farmhouse|framboise|brut/)) return 3;
        if (t.match(/gueuze|lambic|kriek|barrel aged|vieillie|barrique|ba |bourbon|cognac|whisky|rum/)) return 4;
        return 2; // Default
    };


    wrapper.querySelector('form').onsubmit = (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);

        const distributionPts = formData.get('distribution');
        const availabilityPts = formData.get('availability');
        const barrelAged = formData.get('barrel_aged') === 'on';
        const typePts = getTypePts(formData.get('type'));

        // Distribution label mapping
        const distLabels = {
            '1': i18n.t('dist_everywhere'),
            '2': i18n.t('dist_supermarket'),
            '3': i18n.t('dist_bottleshop'),
            '4': i18n.t('dist_specialized'),
            '5': i18n.t('dist_brewery')
        };

        // Auto-calculate rarity if not manually selected
        let selectedRarity = formData.get('rarity');
        if (!selectedRarity || selectedRarity === '') {
            selectedRarity = calculatePointRarity(distributionPts, typePts, availabilityPts, barrelAged);
        }

        const newBeer = {
            id: editModeBeer ? editModeBeer.id : 'CUSTOM_' + Date.now(),
            title: formData.get('title'),
            brewery: formData.get('brewery'),
            province: formData.get('province') || '',
            type: formData.get('type') || i18n.t('label_unknown'),
            alcohol: formData.get('alcohol'),
            volume: formData.get('volume'),
            distribution: distLabels[distributionPts] || i18n.t('label_unknown'),
            barrel_aged: barrelAged,
            ingredients: formData.get('ingredients'),
            rarity: selectedRarity,
            isSeasonal: formData.get('isSeasonal') === 'on',
            image: imageBase64 || 'images/beer/FUT.jpg'
        };

        if (editModeBeer) {
            Storage.deleteCustomBeer(editModeBeer.id);
            Storage.saveCustomBeer(newBeer);
        }

        Analytics.track('beer_added', {
            beer_id: newBeer.id,
            name: newBeer.title,
            brewery: newBeer.brewery || i18n.t('label_unknown'),
            type: newBeer.type || i18n.t('label_unknown'),
            source: editModeBeer ? 'edit' : 'manual'
        });

        onSave(newBeer);
    };

    openModal(wrapper);
}


export function renderStats(allBeers, userData, container) {
    const customBeersCount = allBeers.filter(b => String(b.id).startsWith('CUSTOM_')).length;
    const jsonBeersCount = Math.max(0, allBeers.length - customBeersCount);

    const totalBeers = jsonBeersCount + customBeersCount;
    let drunkCount = 0;
    let totalDrunkCount = 0;
    for (const u of Object.values(userData)) {
        const c = u?.count || 0;
        if (c > 0) {
            drunkCount++;
            totalDrunkCount += c;
        }
    }

    const percentage = Math.round((drunkCount / totalBeers) * 100) || 0;

    // Compute Rarity ranks
    let userRank = { name: i18n.t('stats_rank_novice'), color: "#888", nextRankThresh: 10 };
    const uniqueCount = drunkCount;

    // Quick rank calculation
    if (uniqueCount >= 10) userRank = { name: i18n.t('stats_rank_amateur'), color: "#4CAF50", nextRankThresh: 50 };
    if (uniqueCount >= 50) userRank = { name: i18n.t('stats_rank_connaisseur'), color: "#2196F3", nextRankThresh: 100 };
    if (uniqueCount >= 100) userRank = { name: i18n.t('stats_rank_expert'), color: "#9C27B0", nextRankThresh: 250 };
    if (uniqueCount >= 250) userRank = { name: i18n.t('stats_rank_master'), color: "#E91E63", nextRankThresh: 500 };
    if (uniqueCount >= 500) userRank = { name: i18n.t('stats_rank_legend'), color: "var(--accent-gold)", nextRankThresh: 1000 };

    // --- Calculate Achievements for Badge Evolution ---
    let allAch = [];
    let unlockedIds = [];
    
    if (typeof Achievements !== 'undefined') {
        allAch = Achievements.getAllAchievements();
        unlockedIds = Achievements.getUnlockedAchievements();
    }
    
    const unlockedAch = allAch.filter(a => unlockedIds.includes(a.id));
    const achPct = allAch.length > 0 ? (unlockedAch.length / allAch.length) * 100 : 0;
    
    let trophies = { bronze: 0, silver: 0, gold: 0, plat: 0 };
    unlockedAch.forEach(a => {
        if (a.rarity === 'commun') trophies.bronze++;
        else if (['rare', 'super_rare'].includes(a.rarity)) trophies.silver++;
        else if (['epique', 'mythique'].includes(a.rarity)) trophies.gold++;
        else if (['legendaire', 'ultra_legendaire'].includes(a.rarity)) trophies.plat++;
    });
    // Le Graal (Platinum) for 100%
    if (achPct >= 100 && allAch.length > 0) trophies.plat++;

    // --- Valorant Badge Evolution ---
    let badgeGlow = "0 0 10px rgba(0,0,0,0)";
    let badgeStroke = userRank.color;
    let rankColor = userRank.color;
    let badgeFx = "";
    
    if (achPct >= 20 && achPct < 40) {
        badgeStroke = "url(#grad-bronze)";
        rankColor = "#cd7f32";
        badgeGlow = "0 0 15px rgba(205,127,50,0.5)";
    } else if (achPct >= 40 && achPct < 60) {
        badgeStroke = "url(#grad-silver)";
        rankColor = "#c0c0c0";
        badgeGlow = "0 0 20px rgba(192,192,192,0.6)";
    } else if (achPct >= 60 && achPct < 80) {
        badgeStroke = "url(#grad-gold)";
        rankColor = "var(--accent-gold)";
        badgeGlow = "0 0 25px rgba(255,215,0,0.7)";
    } else if (achPct >= 80 && achPct < 100) {
        badgeStroke = "url(#grad-diamond)";
        rankColor = "#00ffff";
        badgeGlow = "0 0 30px rgba(0,255,255,0.8)";
    } else if (achPct >= 100) {
        badgeStroke = "url(#grad-radiant)";
        rankColor = "#ff00ff";
        badgeFx = "animation: pulse-radiant 2s infinite;";
        badgeGlow = "0 0 40px rgba(255,0,255,1)";
    }

    let totalVolumeMl = 0;
    let totalAlcoholMl = 0;

    Object.keys(userData).forEach(id => {
        const user = userData[id];
        if (user.history) {
            user.history.forEach(h => {
                totalVolumeMl += h.volume;
                // Find beer data for alcohol
                const beer = allBeers.find(b => b.id === id);
                if (beer && beer.alcohol) {
                    const degree = parseFloat(beer.alcohol.replace('%', '').replace('°', ''));
                    if (!isNaN(degree)) {
                        totalAlcoholMl += h.volume * (degree / 100);
                    }
                }
            });
        }
    });

    const blocks = {
        'progression': `
            <style>
            @keyframes pulse-radiant {
                0% { filter: drop-shadow(0 0 20px #ff00ff) drop-shadow(0 0 40px #00ffff); }
                50% { filter: drop-shadow(0 0 40px #ff00ff) drop-shadow(0 0 20px #00ffff); }
                100% { filter: drop-shadow(0 0 20px #ff00ff) drop-shadow(0 0 40px #00ffff); }
            }
            </style>
            <svg width="0" height="0">
                <defs>
                    <linearGradient id="grad-bronze" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#cd7f32" /><stop offset="100%" stop-color="#8a5a22" /></linearGradient>
                    <linearGradient id="grad-silver" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#e6e6e6" /><stop offset="100%" stop-color="#808080" /></linearGradient>
                    <linearGradient id="grad-gold" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#ffd700" /><stop offset="100%" stop-color="#b8860b" /></linearGradient>
                    <linearGradient id="grad-diamond" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#00ffff" /><stop offset="100%" stop-color="#00008b" /></linearGradient>
                    <linearGradient id="grad-radiant" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stop-color="#ff00ff"><animate attributeName="stop-color" values="#ff00ff;#00ffff;#ff00ff" dur="3s" repeatCount="indefinite"/></stop>
                        <stop offset="100%" stop-color="#00ffff"><animate attributeName="stop-color" values="#00ffff;#ff00ff;#00ffff" dur="3s" repeatCount="indefinite"/></stop>
                    </linearGradient>
                </defs>
            </svg>
            <!-- SVG Donut Chart with Valorant Evolution -->
            <div style="width:160px; height:160px; margin:0 auto; position:relative; border-radius:50%; box-shadow:${badgeGlow}; ${badgeFx}">
                <svg viewBox="0 0 36 36" style="width:100%; height:100%; transform: rotate(-90deg);">
                    <path class="circle-bg" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#333" stroke-width="3" stroke-dasharray="100, 100" />
                    <path class="circle" stroke-dasharray="${percentage}, 100" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="${badgeStroke}" stroke-width="3" style="transition: stroke-dasharray 1s ease-out;" />
                </svg>
                <div style="position:absolute; top:50%; left:50%; transform:translate(-50%, -50%); text-align:center;">
                    <span style="font-size:2rem; font-family:'Russo One', sans-serif; color:${rankColor}; text-shadow:0 0 10px ${rankColor}66;">${uniqueCount}</span>
                    <span style="display:block; font-size:0.75rem; color:#888; text-transform:uppercase; letter-spacing:1px; margin-top:-5px;">${i18n.t('stats_label_uniques')}</span>
                </div>
            </div>
            
            <h2 style="color:${rankColor}; margin-top:20px; font-family:'Russo One', sans-serif; letter-spacing:1px; text-shadow:0 0 10px ${rankColor}33;">${userRank.name}</h2>
            <p style="font-size:0.85rem; color:#888; margin-top:5px;">${i18n.t('stats_next_rank_desc', { count: Math.max(0, userRank.nextRankThresh - uniqueCount) })}</p>

            <!-- PlayStation Trophies Summary -->
            <div style="display:flex; justify-content:center; align-items:center; gap:12px; margin-top:15px; background:rgba(0,0,0,0.2); padding:10px 15px; border-radius:20px; border:1px solid rgba(255,255,255,0.05); width:fit-content; margin-inline:auto;">
                ${trophies.plat > 0 ? `<div style="display:flex; align-items:center; gap:5px; color:#ff00ff; text-shadow:0 0 8px #ff00ff; font-weight:bold;">🏆 ${trophies.plat}</div>` : ''}
                <div style="display:flex; align-items:center; gap:5px; color:var(--accent-gold); font-weight:bold;">🟡 ${trophies.gold}</div>
                <div style="display:flex; align-items:center; gap:5px; color:#c0c0c0; font-weight:bold;">⚪ ${trophies.silver}</div>
                <div style="display:flex; align-items:center; gap:5px; color:#cd7f32; font-weight:bold;">🟤 ${trophies.bronze}</div>
            </div>
            
            <div style="margin-top:20px; text-align:center; padding:15px; background:var(--bg-card); border-radius:12px; border:1px solid rgba(255,255,255,0.05);">
                <div style="font-size:0.85rem; color:#aaa; margin-bottom:5px; text-transform:uppercase; font-weight:bold;">${i18n.t('stats_app_count_label')}</div>
                <div class="stats-total-app-count" style="font-size:1.5rem; font-weight:bold; color:#FFF;">${totalBeers.toLocaleString()}</div>
                <div style="display:flex; justify-content:center; gap:8px; flex-wrap:wrap; margin-top:10px; font-size:0.75rem;">
                     <div class="stat-badge stat-badge-json"><span style="font-weight:bold;">${jsonBeersCount}</span> JSON</div>
                     <div class="stat-badge stat-badge-custom"><span style="font-weight:bold;">${customBeersCount}</span> Custom</div>
                </div>
            </div>

            <div style="margin-top: 25px; padding: 20px; background: linear-gradient(135deg, rgba(30,30,30,0.8), rgba(15,15,15,0.9)); border-radius: 12px; border: 1px solid rgba(255,255,255,0.05); box-shadow: 0 4px 15px rgba(0,0,0,0.3); text-align: center;">
                <div style="font-size: 0.75rem; color: #888; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 5px;">
                    ${i18n.t('stats_volume_total')} 
                </div>
                <div style="font-size: 2.2rem; font-family: 'Russo One', sans-serif; color: #fff; text-shadow: 0 2px 4px rgba(0,0,0,0.5);">
                    ${totalDrunkCount} <span style="font-size: 1rem; color: #888; font-family: sans-serif; font-weight: normal;">${i18n.t('stats_beers_count')}</span>
                </div>
            </div>

            ${renderAdvancedStats(totalVolumeMl, totalAlcoholMl)}
        `,
        'equivalences': Storage.getPreference('feat_equivalences_enabled', true) ? `
            ${renderEquivalences(totalVolumeMl, totalAlcoholMl)}
        ` : '',
        'bac': Storage.getPreference('bac_enabled', true) ? `
            <!-- BAC Section -->
            <div class="stat-card mt-20 text-center" id="bac-stats-container" style="border-top: 2px solid var(--accent-gold);">
                <h3 style="margin-bottom:15px; display:flex; align-items:center; justify-content:center; gap:8px;">
                    ${i18n.t('settings_bac_title')} <span style="font-size: 0.8rem; background: #333; padding: 2px 6px; border-radius: 10px; font-weight: normal;">${Storage.getPreference('bac_country', 'BE')}</span>
                </h3>
                
                <div id="bac-dynamic-content">
                    <div class="spinner"></div> ${i18n.t('loading_app')}
                </div>
            </div>` : '',
        'streak': Storage.getPreference('bac_show_streak', true) ? `
            <div class="stat-card mt-20 text-center">
                <div id="streak-container">
                    <div class="spinner"></div> ${i18n.t('loading_app')}
                </div>
            </div>` : '',
        'history': `
            <div class="stat-card mt-20 text-center">
                <h3 style="margin-bottom:15px;">${i18n.t('stats_block_history') || "Historique des consos"}</h3>
                <div id="history-only-container">
                    <div class="spinner"></div> ${i18n.t('loading_app')}
                </div>
            </div>
        `,
        'calendar': `
            <div class="stat-card mt-20 text-center">
                <h3 style="margin-bottom:15px;">${i18n.t('stats_block_calendar') || "Calendrier de l'Avent"}</h3>
                <div id="calendar-only-container">
                    <div class="spinner"></div> ${i18n.t('loading_app')}
                </div>
            </div>
        `,
        'achievements': `
            <div id="card-achievements" class="stat-card mt-20 text-center">
                <h3 style="margin-bottom:15px;">${i18n.t('stats_achievements_title')}</h3>
                ${renderAchievementsList()}
            </div>
        `,
        'map': Storage.getPreference('feat_map_enabled', true) ? `
            <div class="stat-card mt-20 text-center">
                <div id="beer-map-container" style="min-height:200px;">
                    <span class="spinner"></span> ${i18n.t('stats_loading_map')}
                </div>
            </div>
        ` : '',
        'brewbrother': Storage.getPreference('feat_brewbrother_enabled', true) ? `
            <div id="brewbrother-stats-container"></div>
        ` : ''
    };

    const currentOrder = Storage.getPreference('stats_order', ['progression', 'equivalences', 'bac', 'streak', 'history', 'calendar', 'achievements', 'map', 'brewbrother']);

    const currentPseudo = Storage.getPreference('beermatch_pseudo', '') || 'Anonyme';
    const isPartyActive = !!(window.Match && window.Match.roomCode);
    const activeCode = isPartyActive ? window.Match.roomCode : '';
    const activeMembersCount = isPartyActive && window.Match.members ? window.Match.members.size : 1;

    const partyActiveHtml = isPartyActive ? `
        <div class="beerparty-active-box">
            <div class="beerparty-active-header">
                <span class="party-pulse-dot"></span>
                <span>${i18n.t('party_active_badge') || 'SALON EN COURS'} (${activeMembersCount} participant${activeMembersCount > 1 ? 's' : ''})</span>
            </div>
            <div class="beerparty-active-code" id="beerparty-card-code" title="Cliquer pour copier le code">${activeCode}</div>
            <div style="display:flex; gap:8px; width:100%; justify-content:center; flex-wrap:wrap;">
                <button type="button" id="btn-party-open-active" class="beerparty-btn-primary" style="flex:1;">
                    ${i18n.t('party_btn_open') || '🍻 Accéder au Salon'}
                </button>
                <button type="button" id="btn-party-leave-active" class="beerparty-btn-danger">
                    ${i18n.t('party_btn_leave') || 'Quitter'}
                </button>
            </div>
        </div>
    ` : `
        <div class="beerparty-features-grid">
            <div class="beerparty-feature-pill">
                <span class="beerparty-feature-icon">👥</span>
                <span>${i18n.t('party_feat_rooms') || 'Salons P2P en direct'}</span>
            </div>
            <div class="beerparty-feature-pill">
                <span class="beerparty-feature-icon">📊</span>
                <span>${i18n.t('party_feat_stats') || 'Stats collectives'}</span>
            </div>
            <div class="beerparty-feature-pill">
                <span class="beerparty-feature-icon">🏆</span>
                <span>${i18n.t('party_feat_podiums') || 'Podiums du groupe'}</span>
            </div>
            <div class="beerparty-feature-pill">
                <span class="beerparty-feature-icon">📦</span>
                <span>${i18n.t('party_feat_share') || 'Partage de bières perso'}</span>
            </div>
        </div>

        <div class="beerparty-pseudo-strip">
            <span>${i18n.t('party_pseudo_label') || 'Connecté en tant que'} :</span>
            <strong id="beerparty-display-pseudo">${currentPseudo}</strong>
            <button type="button" id="btn-edit-party-pseudo" class="beerparty-pseudo-edit-btn" title="${i18n.t('party_change_pseudo') || 'Modifier'}">✏️</button>
            <button type="button" id="btn-dice-party-pseudo" class="beerparty-pseudo-edit-btn" title="Générer un animal aléatoire">🎲</button>
        </div>

        <div class="beerparty-actions">
            <button type="button" id="btn-match" class="beerparty-btn-primary">
                ${i18n.t('stats_match_btn') || '🎉 Lancer la Beer Party'}
            </button>
            <button type="button" id="btn-party-quick-scan" class="beerparty-btn-secondary" title="${i18n.t('party_btn_scan') || 'Scanner un QR'}">
                ${i18n.t('party_btn_scan') || '📷 Scanner un QR'}
            </button>
        </div>
    `;

    const matchBlock = Storage.getPreference('feat_beermatch_enabled', true) ? `
        <div class="beerparty-hero-card">
            <div class="beerparty-badge">
                <span class="party-pulse-dot"></span>
                <span>${i18n.t('party_badge_live') || 'COMPARAISON EN DIRECT'}</span>
            </div>
            <div class="beerparty-title">
                <span>🍻</span>
                <span>${i18n.t('stats_match_title') || 'Beer Party'}</span>
            </div>
            <p class="beerparty-pitch" data-i18n="party_pitch">
                ${i18n.t('party_pitch') || 'Connectez vos téléphones sans serveur : partagez vos verres en direct, comparez vos collections, découvrez vos bières en commun et suivez les trophées du groupe !'}
            </p>
            ${partyActiveHtml}
        </div>
    ` : '';

    const wrappedBlock = Storage.getPreference('feat_wrapped_enabled', true) ? `
        <div style="background: linear-gradient(135deg, #111, #222); padding: 15px; border-radius: 12px; border: 1px solid var(--accent-gold); margin-bottom: 20px; text-align: center; margin-top: 20px;">
            <div style="font-size: 2rem; margin-bottom: 5px;">🎬</div>
            <h3 style="margin: 0 0 10px 0; color: var(--accent-gold); font-family: 'Russo One', sans-serif;">Beerdex Wrapped</h3>
            <p style="font-size: 0.85rem; color: #ccc; margin-bottom: 15px;">${i18n.t('wrapped_subtitle')}</p>
            <button id="btn-open-wrapped" class="btn-primary" style="background: var(--accent-gold); color: black; font-weight: bold; width: 100%;">
                ${i18n.t('wrapped_btn_start')}
            </button>
        </div>
    ` : '';

    const toolsBlock = `
        <div class="stats-tools-grid">
            <button type="button" id="btn-open-passport" class="stats-tool-btn">
                <span class="stats-tool-icon">🛂</span>
                <span class="stats-tool-text">
                    <strong>Passeport Brassicole</strong>
                    <span>Tampons par pays &amp; régions</span>
                </span>
            </button>
            <button type="button" id="btn-open-compare" class="stats-tool-btn">
                <span class="stats-tool-icon">⚖️</span>
                <span class="stats-tool-text">
                    <strong>Comparateur de Bières</strong>
                    <span>Duel 2 à 3 fiches côte à côte</span>
                </span>
            </button>
        </div>
    `;

    container.innerHTML = `
        <div class="stats-view-wrapper" style="max-width: 600px; margin: 0 auto; width: 100%;">
            <div class="text-center p-20">
                ${currentOrder.map(key => blocks[key] || '').join('')}
                ${toolsBlock}
                ${matchBlock}
                ${wrappedBlock}
            </div>
        </div>
    `;

    const btnPassport = container.querySelector('#btn-open-passport');
    if (btnPassport) btnPassport.onclick = () => openBeerPassport(allBeers);

    const btnCompare = container.querySelector('#btn-open-compare');
    if (btnCompare) btnCompare.onclick = () => openCompareModal();

    // Hook up events
    const btnMatch = container.querySelector('#btn-match');
    if (btnMatch) btnMatch.onclick = () => renderMatchModal(allBeers);

    const btnPartyOpenActive = container.querySelector('#btn-party-open-active');
    if (btnPartyOpenActive) btnPartyOpenActive.onclick = () => renderMatchModal(allBeers);

    const cardCodeEl = container.querySelector('#beerparty-card-code');
    if (cardCodeEl && activeCode) {
        cardCodeEl.onclick = () => {
            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(activeCode).then(() => showToast(`Code ${activeCode} copié !`)).catch(() => showToast(`Code : ${activeCode}`));
            } else {
                showToast(`Code : ${activeCode}`);
            }
        };
    }

    const btnPartyLeaveActive = container.querySelector('#btn-party-leave-active');
    if (btnPartyLeaveActive) {
        btnPartyLeaveActive.onclick = async () => {
            const ok = await showConfirmModal("Voulez-vous vraiment quitter la Beer Party ?", {
                confirmText: "Quitter",
                cancelText: "Rester",
                danger: true
            });
            if (!ok) return;
            if (window.Match) window.Match.leaveParty();
            if (window.UI && window.UI.updateHeaderPartyUI) window.UI.updateHeaderPartyUI();
            renderStats(allBeers, userData, container);
        };
    }

    const btnPartyQuickScan = container.querySelector('#btn-party-quick-scan');
    if (btnPartyQuickScan) {
        btnPartyQuickScan.onclick = () => {
            if (window.UI && window.UI.openUniversalScanner) {
                window.UI.openUniversalScanner();
            } else {
                renderMatchModal(allBeers);
            }
        };
    }

    const btnEditPseudo = container.querySelector('#btn-edit-party-pseudo');
    if (btnEditPseudo) {
        btnEditPseudo.onclick = async () => {
            const oldP = Storage.getPreference('beermatch_pseudo', '');
            const sampleP = window.Match && window.Match.getRandomPseudo ? window.Match.getRandomPseudo() : "Renard Houblonné";
            const newP = await showPromptModal("Choisissez votre pseudo pour la Beer Party :", {
                defaultValue: oldP,
                placeholder: `Ex: ${sampleP}`
            });
            if (newP !== null) {
                const trimmed = newP.trim();
                Storage.savePreference('beermatch_pseudo', trimmed);
                if (window.Match) {
                    if (window.Match.updateMyPseudo) window.Match.updateMyPseudo(trimmed);
                    else if (window.Match.myProfile) window.Match.myProfile.pseudo = trimmed || 'Anonyme';
                    if (window.Match.broadcastState) window.Match.broadcastState();
                }
                const pseudoEl = container.querySelector('#beerparty-display-pseudo');
                if (pseudoEl) pseudoEl.textContent = trimmed || 'Anonyme';
                showToast(`Pseudo mis à jour : ${trimmed || 'Anonyme'}`);
            }
        };
    }

    const btnDicePseudo = container.querySelector('#btn-dice-party-pseudo');
    if (btnDicePseudo) {
        btnDicePseudo.onclick = () => {
            const randomP = window.Match && window.Match.getRandomPseudo ? window.Match.getRandomPseudo() : 'Renard Houblonné';
            Storage.savePreference('beermatch_pseudo', randomP);
            if (window.Match) {
                if (window.Match.updateMyPseudo) window.Match.updateMyPseudo(randomP);
                else if (window.Match.myProfile) window.Match.myProfile.pseudo = randomP;
                if (window.Match.broadcastState) window.Match.broadcastState();
            }
            const pseudoEl = container.querySelector('#beerparty-display-pseudo');
            if (pseudoEl) pseudoEl.textContent = randomP;
            showToast(`Nouveau pseudo : ${randomP}`);
        };
    }

    const btnWrapped = container.querySelector('#btn-open-wrapped');
    if (btnWrapped) {
        btnWrapped.onclick = () => window.Wrapped.start();
    }

    // Init Map
    setTimeout(() => {
        const history = [];
        const ratings = userData || {};
        Object.keys(ratings).forEach(ratingKey => {
            const coreId = ratingKey.split('_')[0];
            const beer = allBeers.find(b => b.id == coreId || b.id == ratingKey);
            const userRating = ratings[ratingKey];
            if (beer && userRating && (userRating.count || 0) > 0) {
                history.push({ beer: beer, rating: userRating });
            }
        });

        const mapContainer = container.querySelector('#beer-map-container');
        if (mapContainer) Map.renderMapWithData(mapContainer, history);
    }, 100);

    // Render BAC Content
    if (Storage.getPreference('bac_enabled', true)) {
        setTimeout(() => renderBACStatsContent(container.querySelector('#bac-dynamic-content')), 50);
    }

    // Render BrewBrother Taste Profile & Top Picks
    setTimeout(() => {
        if (window.Recommendation) {
            const bbContainer = container.querySelector('#brewbrother-stats-container');
            if (bbContainer) {
                Promise.all([
                    window.Recommendation.getUserTasteProfile(allBeers),
                    window.Recommendation.getRecommendedBeers(allBeers, { limit: 4 })
                ]).then(([res, topPicks]) => {
                    const { archetype, archetypeIcon, confidencePct, topTypes, topBreweries, topFlavors, topCountries, profile } = res;
                    const hasData = Object.keys(profile.typeAffinity || {}).length > 0;
                    const translateKey = (k) => i18n.t(k) || k;

                    const topTypesHtml = (topTypes || []).map(t => `<span class="stat-badge">${t[0]}</span>`).join(' ');
                    const topBreweriesHtml = (topBreweries || []).map(b => `<span class="stat-badge">${b[0]}</span>`).join(' ');
                    const topCountriesHtml = (topCountries || []).map(c => `<span class="stat-badge">${c[0]}</span>`).join(' ');
                    const topFlavorsHtml = (topFlavors || []).map(f => `<span class="stat-badge" style="background:var(--bg-dark);">${window.BrewBrotherNLP ? window.BrewBrotherNLP.getFlavorName(f[0]) : f[0]}</span>`).join(' ');

                    const picksHtml = (topPicks || []).map(p => {
                        const pct = p._brewBrotherMatch ? p._brewBrotherMatch.percentage : 0;
                        const img = (p.image && !isMissingImage(p.image)) ? p.image : 'images/beer/default.png';
                        return `
                            <div class="bb-mini-pick" data-beer-id="${p.id}">
                                <img src="${img}" alt="${Utils.escapeHtml(p.title)}" onerror="this.src='images/beer/default.png'">
                                <div class="bb-mini-pick-info">
                                    <strong>${Utils.escapeHtml(p.title)}</strong>
                                    <span>${Utils.escapeHtml(p.brewery || '')}</span>
                                </div>
                                <span class="bb-mini-pick-pct">${pct}%</span>
                            </div>
                        `;
                    }).join('');

                    bbContainer.innerHTML = `
                        <div class="stat-card mt-20 text-center" style="border:1px solid var(--accent-gold); background:linear-gradient(135deg, rgba(30,30,30,0.8), rgba(15,15,15,0.9));">
                            <h3 style="margin-bottom:15px; color:var(--accent-gold); display:flex; align-items:center; justify-content:center; gap:8px;">
                                🤖 ${i18n.t('brewbrother_profile_title') || "Profil BrewBrother"}
                            </h3>

                            ${hasData ? `
                                <div style="display:flex; justify-content:center; align-items:center; gap:15px; margin-bottom:14px;">
                                    <div style="font-size:3rem; filter:drop-shadow(0 0 10px rgba(255,255,255,0.2));">${archetypeIcon}</div>
                                    <div style="text-align:left;">
                                        <div style="font-size:0.75rem; color:#aaa; text-transform:uppercase;">${i18n.t('brewbrother_archetype') || "Votre Archétype"}</div>
                                        <div style="font-size:1.2rem; font-weight:bold; color:#fff;">${translateKey(archetype)}</div>
                                        <div style="font-size:0.85rem; color:#ccc; margin-top:4px; font-style:italic;">${translateKey(archetype + '_desc')}</div>
                                    </div>
                                </div>

                                <div style="margin-bottom:14px; text-align:left;">
                                    <div style="display:flex; justify-content:space-between; font-size:0.75rem; color:#aaa; margin-bottom:4px;">
                                        <span>Précision du profil IA</span>
                                        <strong style="color:var(--accent-gold);">${confidencePct || 0}%</strong>
                                    </div>
                                    <div class="bb-gauge-track"><div class="bb-gauge-fill" style="width:${Math.max(4, confidencePct || 0)}%; background:var(--accent-gold);"></div></div>
                                </div>

                                <div style="margin-bottom:10px; text-align:left; background:rgba(0,0,0,0.2); padding:10px; border-radius:8px;">
                                    <div style="font-size:0.8rem; color:#aaa; margin-bottom:5px;">${i18n.t('brewbrother_top_types') || "Styles Favoris"}</div>
                                    <div>${topTypesHtml || "-"}</div>
                                </div>

                                ${topBreweriesHtml ? `
                                <div style="margin-bottom:10px; text-align:left; background:rgba(0,0,0,0.2); padding:10px; border-radius:8px;">
                                    <div style="font-size:0.8rem; color:#aaa; margin-bottom:5px;">Brasseries Favorites</div>
                                    <div>${topBreweriesHtml}</div>
                                </div>` : ''}

                                <div style="margin-bottom:10px; text-align:left; background:rgba(0,0,0,0.2); padding:10px; border-radius:8px;">
                                    <div style="font-size:0.8rem; color:#aaa; margin-bottom:5px;">${i18n.t('brewbrother_top_flavors') || "Saveurs Préférées"}</div>
                                    <div>${topFlavorsHtml || "-"}</div>
                                </div>

                                ${topCountriesHtml ? `
                                <div style="margin-bottom:10px; text-align:left; background:rgba(0,0,0,0.2); padding:10px; border-radius:8px;">
                                    <div style="font-size:0.8rem; color:#aaa; margin-bottom:5px;">Origines Préférées</div>
                                    <div>${topCountriesHtml}</div>
                                </div>` : ''}

                                ${profile.idealAbv ? `
                                <div style="margin-bottom:14px; text-align:left; background:rgba(0,0,0,0.2); padding:10px; border-radius:8px; display:flex; justify-content:space-between; align-items:center;">
                                    <span style="font-size:0.8rem; color:#aaa;">${i18n.t('brewbrother_ideal_abv_stat') || "Degré idéal moyen"}</span>
                                    <span style="font-weight:bold; color:var(--accent-gold);">${profile.idealAbv.toFixed(1)}%</span>
                                </div>` : ''}
                            ` : `
                                <p style="font-size:0.85rem; color:var(--text-secondary); margin-bottom:14px;">
                                    Goûtez ou notez quelques bières (ou utilisez 👍/👎) pour que BrewBrother affine votre profil. En attendant, voici ses meilleures suggestions !
                                </p>
                            `}

                            ${picksHtml ? `
                                <div style="text-align:left; margin-top:10px;">
                                    <div style="font-size:0.8rem; color:var(--accent-gold); font-weight:700; margin-bottom:8px;">✨ Sélection du moment</div>
                                    <div class="bb-mini-picks-grid">${picksHtml}</div>
                                </div>
                            ` : ''}

                            <button type="button" id="btn-stats-explore-bb" class="btn-primary" style="margin-top:14px;">🤖 Explorer mon Top 20 BrewBrother</button>
                        </div>
                    `;

                    bbContainer.querySelectorAll('.bb-mini-pick').forEach(el => {
                        el.onclick = () => {
                            const b = allBeers.find(x => String(x.id) === String(el.dataset.beerId));
                            if (b) renderBeerDetail(b, () => window.renderCurrentView?.());
                        };
                    });

                    const btnExplore = bbContainer.querySelector('#btn-stats-explore-bb');
                    if (btnExplore) {
                        btnExplore.onclick = () => {
                            if (typeof window.activateBrewBrotherHome === 'function') {
                                window.activateBrewBrotherHome();
                            }
                        };
                    }
                }).catch(err => console.error("BrewBrother Profil Error:", err));
            }
        }
    }, 150);

    // Render Streak
    setTimeout(() => {
        const streakCtn = container.querySelector('#streak-container');
        if (streakCtn) renderStreakSection(streakCtn, allBeers, userData);
    }, 60);

    // Render History
    setTimeout(() => {
        const histCtn = container.querySelector('#history-only-container');
        if (histCtn) _renderHistoryList(histCtn, allBeers, userData);
    }, 70);

    // Render Calendar
    setTimeout(() => {
        const calCtn = container.querySelector('#calendar-only-container');
        if (calCtn) _renderCalendar(calCtn, allBeers, userData);
    }, 80);
}

// ======================================= //
// Streak Section                           //
// ======================================= //

function _localDateKey(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

function _buildDayMap(allBeers, userData) {
    const dayMap = {}; // { 'YYYY-MM-DD': count }
    const ratings = userData || {};
    Object.keys(ratings).forEach(ratingKey => {
        const entry = ratings[ratingKey];
        if (!entry || !entry.history) return;
        entry.history.forEach(h => {
            if (!h.date) return;
            // Convert stored ISO date to local date key
            const day = _localDateKey(new Date(h.date));
            dayMap[day] = (dayMap[day] || 0) + 1;
        });
    });
    return dayMap;
}

function renderStreakSection(container, allBeers, userData) {
    const dayMap = _buildDayMap(allBeers, userData);
    const streakMode = Storage.getPreference('streak_mode', 'sober'); // 'sober' or 'party'
    const isSober = streakMode === 'sober';

    // If no drink data at all, show 0
    const hasDrinkData = Object.keys(dayMap).length > 0;
    let currentStreak = 0;
    let bestStreak = 0;

    if (hasDrinkData) {
        // Compute streaks using local dates
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        let streak = 0;

        // Walk backward from today
        for (let i = 0; i < 3650; i++) {
            const d = new Date(today);
            d.setDate(d.getDate() - i);
            const key = _localDateKey(d);
            const had = (dayMap[key] || 0) > 0;
            const streakContinues = isSober ? !had : had;

            if (i === 0 && !streakContinues) {
                // Today broke the streak: current = 0
                currentStreak = 0;
                // Still count best going backward from yesterday
                for (let j = 1; j < 3650; j++) {
                    const d2 = new Date(today);
                    d2.setDate(d2.getDate() - j);
                    const k2 = _localDateKey(d2);
                    const ok2 = isSober ? !(dayMap[k2] || 0) : (dayMap[k2] || 0) > 0;
                    if (ok2) streak++; else break;
                }
                bestStreak = streak;
                break;
            }

            if (streakContinues) {
                currentStreak++;
            } else {
                break;
            }
        }

        // For sobriety mode, cap current streak to days since first drink
        if (isSober) {
            const allDays = Object.keys(dayMap).sort();
            if (allDays.length > 0) {
                const firstDrinkDate = new Date(allDays[0]);
                const daysSinceFirst = Math.floor((today - firstDrinkDate) / 86400000) + 1;
                currentStreak = Math.min(currentStreak, daysSinceFirst);
            }
        }

        // Best ever (full scan)
        let runBest = 0;
        const allDays = Object.keys(dayMap).sort();
        if (allDays.length > 0) {
            const first = new Date(allDays[0]);
            const last = new Date();
            let run = 0;
            for (let d = new Date(first); d <= last; d.setDate(d.getDate() + 1)) {
                const key = _localDateKey(d);
                const had = (dayMap[key] || 0) > 0;
                const ok = isSober ? !had : had;
                if (ok) { run++; runBest = Math.max(runBest, run); }
                else { run = 0; }
            }
        }
        bestStreak = Math.max(bestStreak, runBest, currentStreak);
    }

    // Message
    const prefix = isSober ? 'stats_streak_msg' : 'stats_streak_party_msg';
    let msgKey;
    if (currentStreak === 0) msgKey = `${prefix}_0`;
    else if (currentStreak < 7) msgKey = `${prefix}_low`;
    else if (currentStreak < 30) msgKey = `${prefix}_mid`;
    else msgKey = `${prefix}_high`;

    // Flame intensity
    const flameSize = Math.min(3, 0.8 + currentStreak * 0.05);
    const titleKey = isSober ? 'stats_streak_sober_title' : 'stats_streak_party_title';

    container.innerHTML = `
        <div class="streak-section">
            <div class="streak-header">
                <h4>${i18n.t(titleKey)}</h4>
                <div class="streak-mode-toggle">
                    <button class="streak-mode-btn ${isSober ? 'active' : ''}" data-mode="sober">${i18n.t('stats_streak_mode_sober')}</button>
                    <button class="streak-mode-btn ${!isSober ? 'active' : ''}" data-mode="party">${i18n.t('stats_streak_mode_party')}</button>
                </div>
            </div>
            <div class="streak-counter">
                <div class="streak-flame" style="font-size:${flameSize}rem;">${isSober ? '🔥' : '🎉'}</div>
                <div class="streak-number">${currentStreak}</div>
                <div class="streak-label">${i18n.t('stats_streak_days')}</div>
            </div>
            <div class="streak-msg">${i18n.t(msgKey)}</div>
            <div class="streak-best">
                <span class="streak-best-label">${i18n.t('stats_streak_best')}:</span>
                <span class="streak-best-value">${bestStreak} ${i18n.t('stats_streak_days')}</span>
            </div>
        </div>
    `;

    // Mode toggle handlers
    container.querySelectorAll('.streak-mode-btn').forEach(btn => {
        btn.onclick = () => {
            Storage.savePreference('streak_mode', btn.dataset.mode);
            renderStreakSection(container, allBeers, userData);
        };
    });
}

// ======================================= //
// History & Calendar Section               //
// ======================================= //

function renderHistorySection(container, allBeers, userData) {
    const showHistory = Storage.getPreference('bac_show_history', true);
    const showCalendar = Storage.getPreference('bac_show_calendar', true);
    const activeTab = Storage.getPreference('history_tab', showHistory ? 'list' : 'calendar');

    let tabsHtml = '';
    if (showHistory && showCalendar) {
        tabsHtml = `
            <div class="history-tabs">
                <button class="history-tab-btn ${activeTab === 'list' ? 'active' : ''}" data-tab="list">${i18n.t('stats_history_tab_list')}</button>
                <button class="history-tab-btn ${activeTab === 'calendar' ? 'active' : ''}" data-tab="calendar">${i18n.t('stats_history_tab_calendar')}</button>
            </div>`;
    }

    container.innerHTML = `
        <div class="history-section">
            <h4>${i18n.t('stats_history_title')}</h4>
            ${tabsHtml}
            <div id="history-content"></div>
        </div>
    `;

    const contentDiv = container.querySelector('#history-content');

    if ((showHistory && activeTab === 'list') || (!showCalendar)) {
        _renderHistoryList(contentDiv, allBeers, userData);
    } else {
        _renderCalendar(contentDiv, allBeers, userData);
    }

    container.querySelectorAll('.history-tab-btn').forEach(btn => {
        btn.onclick = () => {
            Storage.savePreference('history_tab', btn.dataset.tab);
            renderHistorySection(container, allBeers, userData);
        };
    });
}

function _renderHistoryList(container, allBeers, userData) {
    const ratings = userData || {};
    const allDrinks = [];
    Object.keys(ratings).forEach(ratingKey => {
        const entry = ratings[ratingKey];
        if (!entry || !entry.history) return;
        const coreId = ratingKey.split('_')[0];
        const beer = allBeers.find(b => b.id == coreId || b.id == ratingKey);
        entry.history.forEach(h => {
            if (!h.date) return;
            allDrinks.push({ date: h.date, volume: h.volume || 330, beer: beer, beerId: ratingKey });
        });
    });

    allDrinks.sort((a, b) => new Date(b.date) - new Date(a.date));

    if (allDrinks.length === 0) {
        container.innerHTML = `<div class="history-empty">${i18n.t('stats_history_no_data')}</div>`;
        return;
    }

    const limit = 30;
    const shown = allDrinks.slice(0, limit);
    let html = '<div class="history-list">';
    shown.forEach(d => {
        const dt = new Date(d.date);
        const dateStr = dt.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
        const timeStr = dt.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
        const name = d.beer ? (d.beer.title || d.beerId) : d.beerId;
        const vol = d.volume ? `${d.volume}ml` : '';
        html += `
            <div class="history-item" data-beer-id="${d.beerId}">
                <div class="history-item-date"><span class="history-date">${dateStr}</span> <span class="history-time">${timeStr}</span></div>
                <div class="history-item-info">
                    <span class="history-beer-name">${name}</span>
                    <span class="history-beer-vol">${vol}</span>
                </div>
            </div>`;
    });
    html += '</div>';

    if (allDrinks.length > limit) {
        html += `<button class="history-show-more" id="btn-history-more">${i18n.t('stats_history_show_more')} (${allDrinks.length - limit})</button>`;
    }

    container.innerHTML = html;

    // Click on beer opens its detail
    container.querySelectorAll('.history-item').forEach(el => {
        el.onclick = () => {
            const beerId = el.dataset.beerId;
            const beer = allBeers.find(b => b.id == beerId || b.id == beerId.split('_')[0]);
            if (beer) renderBeerDetail(beer, (ratingData) => _saveRatingFromDetail(beer, ratingData, () => window.renderCurrentView?.()));
        };
    });

    const btnMore = container.querySelector('#btn-history-more');
    if (btnMore) {
        btnMore.onclick = () => {
            // Show all
            const listDiv = container.querySelector('.history-list');
            allDrinks.slice(limit).forEach(d => {
                const dt = new Date(d.date);
                const dateStr = dt.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
                const timeStr = dt.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
                const name = d.beer ? (d.beer.title || d.beerId) : d.beerId;
                const vol = d.volume ? `${d.volume}ml` : '';
                const el = document.createElement('div');
                el.className = 'history-item';
                el.dataset.beerId = d.beerId;
                el.innerHTML = `
                    <div class="history-item-date"><span class="history-date">${dateStr}</span> <span class="history-time">${timeStr}</span></div>
                    <div class="history-item-info">
                        <span class="history-beer-name">${name}</span>
                        <span class="history-beer-vol">${vol}</span>
                    </div>`;
                el.onclick = () => {
                    const beer = allBeers.find(b => b.id == d.beerId || b.id == d.beerId.split('_')[0]);
                    if (beer) renderBeerDetail(beer, (ratingData) => _saveRatingFromDetail(beer, ratingData, () => window.renderCurrentView?.()));
                };
                listDiv.appendChild(el);
            });
            btnMore.remove();
        };
    }
}

function _renderCalendar(container, allBeers, userData) {
    const dayMap = _buildDayMap(allBeers, userData);
    const calMonth = Storage.getPreference('cal_month', new Date().getMonth());
    const calYear = Storage.getPreference('cal_year', new Date().getFullYear());

    const now = new Date(calYear, calMonth, 1);
    const monthName = now.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
    const firstDay = now.getDay() || 7; // Monday = 1
    const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();

    // Max drinks in a day for color scaling
    let maxDrinks = 1;
    for (let d = 1; d <= daysInMonth; d++) {
        const key = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        maxDrinks = Math.max(maxDrinks, dayMap[key] || 0);
    }

    // Day names header
    const dayNames = [i18n.t('day_mon'), i18n.t('day_tue'), i18n.t('day_wed'), i18n.t('day_thu'), i18n.t('day_fri'), i18n.t('day_sat'), i18n.t('day_sun')];
    let headerHtml = dayNames.map(n => `<div class="cal-day-name">${n}</div>`).join('');

    // Build cells
    let cellsHtml = '';
    const offsetStart = (firstDay === 0 ? 6 : firstDay - 1);
    for (let i = 0; i < offsetStart; i++) cellsHtml += '<div class="cal-cell cal-empty"></div>';

    for (let d = 1; d <= daysInMonth; d++) {
        const key = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const count = dayMap[key] || 0;
        const intensity = count > 0 ? Math.min(1, count / Math.max(maxDrinks, 1)) : 0;
        // Color: transparent → green → yellow → orange → red
        let bgColor = 'transparent';
        if (count > 0) {
            const h = Math.round(120 - (intensity * 120)); // 120=green, 0=red
            bgColor = `hsla(${h}, 70%, 45%, ${0.3 + intensity * 0.55})`;
        }
        const isToday = d === new Date().getDate() && calMonth === new Date().getMonth() && calYear === new Date().getFullYear();
        cellsHtml += `<div class="cal-cell ${isToday ? 'cal-today' : ''} ${count > 0 ? 'cal-has-drinks' : ''}" data-day="${key}" style="background:${bgColor};">
            <span class="cal-day-num">${d}</span>
            ${count > 0 ? `<span class="cal-count">${count}</span>` : ''}
        </div>`;
    }

    container.innerHTML = `
        <div class="calendar-section">
            <div class="cal-nav">
                <button id="cal-prev" class="cal-nav-btn">◀</button>
                <span class="cal-month-name">${monthName}</span>
                <button id="cal-next" class="cal-nav-btn">▶</button>
            </div>
            <div class="cal-grid">
                ${headerHtml}
                ${cellsHtml}
            </div>
            <div id="cal-day-detail"></div>
        </div>
    `;

    // Navigation
    container.querySelector('#cal-prev').onclick = () => {
        let m = calMonth - 1, y = calYear;
        if (m < 0) { m = 11; y--; }
        Storage.savePreference('cal_month', m);
        Storage.savePreference('cal_year', y);
        _renderCalendar(container, allBeers, userData);
    };
    container.querySelector('#cal-next').onclick = () => {
        let m = calMonth + 1, y = calYear;
        if (m > 11) { m = 0; y++; }
        Storage.savePreference('cal_month', m);
        Storage.savePreference('cal_year', y);
        _renderCalendar(container, allBeers, userData);
    };

    // Click on day
    container.querySelectorAll('.cal-cell[data-day]').forEach(cell => {
        cell.onclick = () => {
            const dayKey = cell.dataset.day;
            const detail = container.querySelector('#cal-day-detail');
            // Find drinks for that day
            const ratings = userData || {};
            const drinks = [];
            Object.keys(ratings).forEach(ratingKey => {
                const entry = ratings[ratingKey];
                if (!entry || !entry.history) return;
                const coreId = ratingKey.split('_')[0];
                const beer = allBeers.find(b => b.id == coreId || b.id == ratingKey);
                entry.history.forEach(h => {
                    if (h.date && _localDateKey(new Date(h.date)) === dayKey) {
                        drinks.push({ beer, volume: h.volume || 330, date: h.date, beerId: ratingKey });
                    }
                });
            });

            if (drinks.length === 0) {
                detail.innerHTML = `<div class="cal-detail-empty">${i18n.t('stats_history_no_data_day')}</div>`;
            } else {
                detail.innerHTML = drinks.map(d => {
                    const name = d.beer ? (d.beer.title || d.beerId) : d.beerId;
                    const time = new Date(d.date).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
                    return `<div class="cal-detail-item" data-beer-id="${d.beerId}" style="cursor: pointer;"><span>${time}</span> <strong>${name}</strong> <span>${d.volume}ml</span></div>`;
                }).join('');

                detail.querySelectorAll('.cal-detail-item').forEach(el => {
                    el.onclick = () => {
                        const beerId = el.dataset.beerId;
                        const beer = allBeers.find(b => b.id == beerId || b.id == beerId.split('_')[0]);
                        if (beer) renderBeerDetail(beer, (ratingData) => _saveRatingFromDetail(beer, ratingData, () => window.renderCurrentView?.()));
                    };
                });
            }
        };
    });
}

export function renderBACStatsContent(container) {
    if (!Storage.getPreference('stats_bac_used', false)) {
        Storage.savePreference('stats_bac_used', true);
        window.dispatchEvent(new Event('beerdex-action'));
    }
    if (!container) return;
    const rules = BAC.getCurrentRules() || { sanctionThreshold: 0.5, withdrawThreshold: 0.8 };
    const bacStatus = BAC.getBACStatus();
    const currentBAC = BAC.getCurrentBAC();
    const formattedBAC = currentBAC.toFixed(2);

    // Dynamic visualization range: always at least 1.0 g/l, or 1.5x the withdraw threshold, or 1.1x current
    const visualMax = Math.max(1.0, rules.withdrawThreshold * 1.5, currentBAC * 1.1);
    const percentageOfLimit = Math.min(100, (currentBAC / visualMax) * 100);

    const curveData = BAC.getBACCurveData();
    let svgGraphHtml = "";

    if (curveData && curveData.length > 1) {
        const width = 100;
        const height = 40;
        const tMin = curveData[0].time;
        const tMax = curveData[curveData.length - 1].time;
        const tRange = tMax - tMin || 1;
        const bacMax = Math.max(rules.withdrawThreshold, ...curveData.map(d => d.bac));

        let polylinePoints = "";
        let currentX = width;
        let currentY = height;
        const now = new Date().getTime();

        // CHART.JS INTEGRATION
        svgGraphHtml = `
            <div style="margin: 20px 0; background: #1a1a1a; padding: 15px; border-radius: 10px;">
                <div style="font-size: 0.8rem; color:#888; margin-bottom: 10px; text-align: left;">${i18n.t('bac_evolution_title')}</div>
                <div style="position: relative; height: 250px; width: 100%;">
                    <canvas id="bacChartCanvas"></canvas>
                </div>
            </div>
        `;

        // Let the DOM update, then initialize Chart.js
        setTimeout(async () => {
            const ctx = document.getElementById('bacChartCanvas');
            if (ctx && curveData.length > 0) {
                try {
                    await loadChartJs();
                } catch (e) {
                    console.error("Failed to load Chart.js", e);
                    return;
                }

                if (window.bacChartInstance) {
                    window.bacChartInstance.destroy();
                }

                const chartData = curveData.map(d => ({
                    x: d.time,
                    y: parseFloat(d.bac.toFixed(3))
                }));

                const nowTime = new Date().getTime();

                // Emphasize the current time dot
                const currentBACPointIndex = chartData.findIndex(d => d.x >= nowTime);
                const pointColors = chartData.map((d, i) => (i === currentBACPointIndex) ? '#ffffff' : 'transparent');
                const pointRadii = chartData.map((d, i) => (i === currentBACPointIndex) ? 4 : 0);

                window.bacChartInstance = new Chart(ctx, {
                    type: 'line',
                    data: {
                        datasets: [{
                            label: i18n.t('bac_label'),
                            data: chartData,
                            borderColor: bacStatus.color,
                            backgroundColor: bacStatus.color + '33',
                            borderWidth: 2,
                            fill: true,
                            tension: 0.4,
                            pointBackgroundColor: pointColors,
                            pointBorderColor: pointColors,
                            pointRadius: pointRadii,
                            pointHitRadius: 10,
                            pointHoverRadius: 6
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        interaction: { intersect: false, mode: 'index' },
                        plugins: {
                            legend: { display: false },
                            tooltip: {
                                callbacks: {
                                    title: function (context) {
                                        const d = new Date(context[0].parsed.x);
                                        const now = new Date();
                                        const isToday = d.toDateString() === now.toDateString();
                                        const timeStr = d.getHours().toString().padStart(2, '0') + 'h' + d.getMinutes().toString().padStart(2, '0');
                                        if (isToday) return timeStr;

                                        const days = [
                                            i18n.t('day_sun'), i18n.t('day_mon'), i18n.t('day_tue'),
                                            i18n.t('day_wed'), i18n.t('day_thu'), i18n.t('day_fri'), i18n.t('day_sat')
                                        ];
                                        return `${days[d.getDay()]} ${d.getDate()}/${d.getMonth() + 1} - ${timeStr}`;
                                    },
                                    label: function (context) { return ` ${context.parsed.y} g/l`; }
                                },
                                backgroundColor: 'rgba(0, 0, 0, 0.9)',
                                titleColor: '#fff',
                                bodyColor: '#fff',
                                borderColor: bacStatus.color,
                                borderWidth: 1
                            },
                            annotation: {
                                annotations: (() => {
                                    const rules = BAC.getCurrentRules() || { sanctionThreshold: 0.5, withdrawThreshold: 0.8 };
                                    const l1 = rules.sanctionThreshold;
                                    const l2 = rules.withdrawThreshold;

                                    const limitLabel = i18n.t('bac_chart_limit');

                                    let annots = {};
                                    if (l1 > 0) {
                                        annots.limitSanction = {
                                            type: 'line', yMin: l1, yMax: l1, borderColor: '#FF9800', borderWidth: 1, borderDash: [5, 5],
                                            label: { display: true, content: `${l1} ${limitLabel}`, position: 'end', backgroundColor: 'transparent', color: '#FF9800', font: { size: 10 } }
                                        };
                                    }
                                    if (l2 > 0 && l2 !== l1) {
                                        annots.limitWithdraw = {
                                            type: 'line', yMin: l2, yMax: l2, borderColor: '#F44336', borderWidth: 1, borderDash: [5, 5],
                                            label: { display: true, content: `${l2} ${limitLabel}`, position: 'end', backgroundColor: 'transparent', color: '#F44336', font: { size: 10 } }
                                        };
                                    }

                                    annots.nowLine = {
                                        type: 'line', xMin: nowTime, xMax: nowTime, borderColor: '#888', borderWidth: 1, borderDash: [2, 2],
                                        label: { display: true, content: i18n.t('bac_now'), position: 'start', backgroundColor: 'rgba(0,0,0,0.5)', color: '#fff', font: { size: 9 } }
                                    };

                                    return annots;
                                })()
                            }
                        },
                        scales: {
                            x: {
                                type: 'linear', min: tMin, max: tMax, grid: { color: '#333', drawBorder: false },
                                ticks: {
                                    color: '#888',
                                    stepSize: tRange > 12 * 3600 * 1000 ? 6 * 3600 * 1000 : 3600 * 1000,
                                    callback: function (value) {
                                        const d = new Date(value);
                                        const h = d.getHours();
                                        if (h === 0 || tRange > 24 * 3600 * 1000) {
                                            const days = [
                                                i18n.t('day_sun'), i18n.t('day_mon'), i18n.t('day_tue'),
                                                i18n.t('day_wed'), i18n.t('day_thu'), i18n.t('day_fri'), i18n.t('day_sat')
                                            ];
                                            return days[d.getDay()] + ' ' + d.getDate();
                                        }
                                        return h + 'h';
                                    }
                                }
                            },
                            y: { min: 0, suggestedMax: Math.max(0.8, bacMax * 1.2), grid: { color: '#333', drawBorder: false }, ticks: { color: '#888', stepSize: 0.2 } }
                        }
                    }
                });
            }
        }, 100);
    }

    const breathBAC = (currentBAC * 0.44).toFixed(2);

    container.innerHTML = `
        <div style="font-size: 3rem; font-family: 'Russo One'; color: ${bacStatus.color}; line-height: 1;">
            ${formattedBAC} <span style="font-size: 1.2rem; color: #888;">g/l</span>
        </div>
        <div style="font-size: 1rem; color: #888; margin-top: 8px; margin-bottom: 5px;">
            <i style="color: #666;">${i18n.t('bac_air_expired')}:</i> <span style="color: ${bacStatus.color}; font-weight: bold;">${breathBAC}</span> mg/l
        </div>
        
        <div style="margin: 25px 0 35px 0; background: #222; border-radius: 10px; height: 12px; position: relative; overflow: visible;">
            <!-- Limit markers -->
            ${rules.sanctionThreshold > 0 ? `
            <div style="position: absolute; left: ${(rules.sanctionThreshold / visualMax) * 100}%; top: -5px; bottom: -5px; width: 2px; background: #FF9800; z-index: 2;">
                <span style="position: absolute; bottom: -18px; left: 50%; transform: translateX(-50%); white-space: nowrap; font-size: 0.7rem; color: #FF9800;">${rules.sanctionThreshold}</span>
            </div>
            ` : ''}
            
            ${rules.withdrawThreshold > rules.sanctionThreshold ? `
            <div style="position: absolute; left: ${(rules.withdrawThreshold / visualMax) * 100}%; top: -5px; bottom: -5px; width: 2px; background: #F44336; z-index: 2;">
                <span style="position: absolute; bottom: -18px; left: 50%; transform: translateX(-50%); white-space: nowrap; font-size: 0.7rem; color: #F44336;">${rules.withdrawThreshold}</span>
            </div>
            ` : (rules.withdrawThreshold === rules.sanctionThreshold ? `
                <script>/* Withdrawal and Sanction are same, handled by one orange mark */</script>
            ` : `
            <div style="position: absolute; left: ${(rules.withdrawThreshold / visualMax) * 100}%; top: -5px; bottom: -5px; width: 2px; background: #F44336; z-index: 2;">
                 <span style="position: absolute; bottom: -18px; left: 50%; transform: translateX(-50%); white-space: nowrap; font-size: 0.7rem; color: #F44336;">${rules.withdrawThreshold}</span>
            </div>
            `)}

            <!-- Fill -->
            <div style="position: absolute; left: 0; top: 0; bottom: 0; width: ${percentageOfLimit}%; background: ${bacStatus.color}; z-index: 1; transition: width 1s ease; border-radius: 10px;"></div>
            
            <!-- Scale Labels -->
            <span style="position: absolute; left: 0; bottom: -18px; font-size: 0.7rem; color: #666;">0</span>
            <span style="position: absolute; right: 0; bottom: -18px; font-size: 0.7rem; color: #666;">${visualMax.toFixed(1)}+</span>
        </div>

        ${svgGraphHtml}
        
        <!-- Recovery Section -->
        ${currentBAC > 0 ? `
        <div style="background: #1a1a1a; border: 1px solid #333; border-radius: 12px; padding: 15px; margin-bottom: 20px; text-align: left;">
            <div style="font-size: 0.8rem; color: #888; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 12px;">
                🕒 ${i18n.t('bac_recovery_title')}
            </div>
            
            <div style="display: flex; flex-direction: column; gap: 12px;">
                <!-- Drive Recovery -->
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <span style="font-size: 0.9rem; color: #ccc;">
                        🚗 ${i18n.t('bac_recovery_legal', { limit: rules.sanctionThreshold })}
                    </span>
                    <div style="text-align: right;">
                        <span style="display: block; font-weight: bold; color: ${bacStatus.canDrive ? '#4CAF50' : '#FF9800'};">
                            ${bacStatus.canDrive ? i18n.t('time_now') : i18n.t('bac_recovery_in', { wait: bacStatus.timeToWaitShort })}
                        </span>
                        <span style="display: block; font-size: 0.75rem; color: #777;">
                            ${bacStatus.canDrive ? '✅' : bacStatus.timeAt}
                        </span>
                    </div>
                </div>

                <!-- Sober Recovery -->
                <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #222; padding-top: 12px;">
                    <span style="font-size: 0.9rem; color: #ccc;">
                        ✨ ${i18n.t('bac_recovery_sober')}
                    </span>
                    <div style="text-align: right;">
                        <span style="display: block; font-weight: bold; color: #2196F3;">
                            ${i18n.t('bac_recovery_in', { wait: bacStatus.timeToZero })}
                        </span>
                    </div>
                </div>
            </div>
        </div>
        ` : ''}

        <div class="bac-status-enhanced" style="background: ${bacStatus.color}11; border: 1px solid ${bacStatus.color}44; margin-bottom: 20px;">
            <h2 style="color:${bacStatus.color}; margin-bottom: 4px;">${bacStatus.title}</h2>
            ${bacStatus.subtitle ? `<div class="bac-subtitle" style="display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 0.75rem; background:${bacStatus.color}22; color:${bacStatus.color}; margin-bottom: 12px; font-weight: bold; text-transform: uppercase;">${bacStatus.subtitle}</div>` : ''}
            <span style="color: #eee; font-size: 0.9rem; line-height:1.4; display:block;">${bacStatus.message}</span>
            ${bacStatus.symptoms ? `<div class="bac-symptoms" style="margin-top: 10px; font-size: 0.85rem; color: #ff9800; font-style: italic;">⚠️ ${bacStatus.symptoms}</div>` : ''}
        </div>

        ${Storage.getPreference('bac_vehicle', 'voiture') === 'gamer' ? (() => {
            const sim = BAC.simulateBAC();
            const now = new Date().getTime();
            const futureCurve = sim.curve.filter(p => p.time >= now);
            const peakBac = futureCurve.length > 0 ? Math.max(...futureCurve.map(p => p.bac)) : currentBAC;
            const peakVal = Math.max(currentBAC, peakBac);
            const cur = BAC.getGamerStats(currentBAC);
            const peak = BAC.getGamerStats(peakVal);
            const statColor = cur.rankColor;

            const statCard = (icon, label, curVal, peakV, unit = '') => `
                <div class="gamer-stat-card">
                    <div class="gamer-stat-icon">${icon}</div>
                    <div class="gamer-stat-label">${label}</div>
                    <div class="gamer-stat-values">
                        <div class="gamer-stat-val"><span class="gamer-stat-tag">${i18n.t('bac_gamer_current')}</span>${curVal}${unit}</div>
                        <div class="gamer-stat-val gamer-stat-peak"><span class="gamer-stat-tag">${i18n.t('bac_gamer_peak')}</span>${peakV}${unit}</div>
                    </div>
                </div>`;

            return `
            <div class="gamer-hud-container" style="margin-bottom: 20px;">
                <div class="gamer-hud-title">${i18n.t('bac_gamer_hud_title')}</div>

                <!-- Rank Badge -->
                <div class="gamer-rank-badge" style="border-color: ${cur.rankColor}44; background: ${cur.rankColor}11;">
                    <div class="gamer-rank-icon" style="color: ${cur.rankColor}; text-shadow: 0 0 15px ${cur.rankColor}66;">🏆</div>
                    <div class="gamer-rank-name" style="color: ${cur.rankColor};">${i18n.t(cur.rankKey)}</div>
                    <div class="gamer-rank-sub">${i18n.t(cur.rankSubKey)}</div>
                    ${peakVal > currentBAC ? `<div class="gamer-rank-peak" style="color: ${peak.rankColor};">${i18n.t('bac_gamer_peak')}: ${i18n.t(peak.rankKey)}</div>` : ''}
                </div>

                <!-- Stats Grid -->
                <div class="gamer-stats-grid">
                    ${statCard('📡', i18n.t('bac_gamer_ping'), cur.ping, peak.ping, i18n.t('bac_gamer_ping_unit'))}
                    ${statCard('🖥️', i18n.t('bac_gamer_fps'), cur.fps, peak.fps, '')}
                    ${statCard('🎯', i18n.t('bac_gamer_aim_assist'), cur.aimAssist, peak.aimAssist, '%')}
                    ${statCard('👁️', i18n.t('bac_gamer_fov'), cur.fov, peak.fov, i18n.t('bac_gamer_fov_unit'))}
                </div>
                <div class="gamer-stats-grid gamer-stats-grid-wide">
                    ${statCard('📺', i18n.t('bac_gamer_resolution'), i18n.t(cur.resolutionKey), i18n.t(peak.resolutionKey))}
                    ${statCard('🖱️', i18n.t('bac_gamer_setup'), i18n.t(cur.setupKey), i18n.t(peak.setupKey))}
                </div>
            </div>`;
        })() : ''}

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
            <button id="btn-bac-add-drink" class="btn-primary" style="margin: 0; padding: 10px; font-size: 0.9rem; background: #333;">
                ${i18n.t('bac_btn_add')}
            </button>
            <button id="btn-bac-set-manual" class="btn-primary" style="margin: 0; padding: 10px; font-size: 0.9rem; background: #222; border: 1px solid #444; color: #ccc;">
                ${i18n.t('bac_btn_manual')}
            </button>
        </div>
    `;

    container.querySelector('#btn-bac-add-drink').onclick = async () => {
        const vol = await showPromptModal(i18n.t('bac_prompt_vol'), "330", { placeholder: "ex: 330", inputType: "number" });
        if (!vol) return;
        const abv = await showPromptModal(i18n.t('bac_prompt_abv'), "5.0", { placeholder: "ex: 8.5", inputType: "text" });
        if (!abv) return;

        const v = parseFloat(vol);
        const a = parseFloat(abv.replace(',', '.'));
        if (!isNaN(v) && !isNaN(a)) {
            BAC.addDrinkToBAC(v, a);
            renderBACStatsContent(container); // Refresh
        }
    };

    container.querySelector('#btn-bac-set-manual').onclick = async () => {
        const val = await showPromptModal("Forcer le taux actuel (g/l)", "0.0", { placeholder: "ex: 0.5", inputType: "text" });
        if (val !== null) {
            const v = parseFloat(val.replace(',', '.'));
            if (!isNaN(v) && v >= 0) {
                BAC.logManualBAC(v);
                renderBACStatsContent(container); // Refresh
            }
        }
    };
}

export function renderDeduplicationWizard(allBeers) {
    const modalContainer = getModalContainer();
    const matches = Deduplicator.runCheck(allBeers, true);
    if (!matches || matches.length === 0) {
        showToast(i18n.t('toast_nothing_found') || 'Aucun doublon trouvé.');
        return;
    }

    let currentIndex = 0;
    let mergedCount = 0;

    let handleKeyDown = null;
    const exitWizard = () => {
        if (handleKeyDown) {
            document.removeEventListener('keydown', handleKeyDown);
            handleKeyDown = null;
        }
        if (modalContainer) {
            modalContainer.style.display = '';
            modalContainer?.classList.add('hidden');
            if (modalContainer) modalContainer.innerHTML = '';
        }
    };

    const showNext = () => {
        if (currentIndex >= matches.length) {
            exitWizard();
            if (mergedCount > 0) {
                Storage.savePreference('dedup_manually_triggered', true);
                window.dispatchEvent(new Event('beerdex-action'));
                showToast(`Nettoyage terminé ! ${mergedCount} bière(s) fusionnée(s) avec succès.`, 'success');
                setTimeout(() => window.location.reload(), 1200);
            } else {
                showToast('Nettoyage terminé. Aucune bière fusionnée.');
                renderSettings(allBeers, Storage.getAllUserData(), document.getElementById('main-content'));
            }
            return;
        }

        const match = matches[currentIndex];
        const { customBeer, officialBeer, score } = match;
        const userData = Storage.getAllUserData();
        const customData = userData[customBeer.id] || {};
        
        const customImg = customBeer.image || 'images/beer/default.png';
        const officialImg = officialBeer.image || 'images/beer/default.png';
        const drinkCount = customData.count || 0;
        const historyCount = (customData.history || []).length;
        const hasRating = customData.score !== undefined;
        const hasComment = !!customData.comment;
        const isFav = !!customData.favorite;

        const migrationTitleText = i18n.t('migration_title') || 'Transfert disponible';
        const migrationSubtitleText = `${currentIndex + 1} / ${matches.length} — Remplacer votre bière personnalisée par l'entrée officielle`;
        const migrationCustomLabel = i18n.t('migration_label_custom') || 'Personnalisée';
        const migrationOfficialLabel = i18n.t('migration_label_official') || 'Officielle';
        const migrationSimilarityText = i18n.t('migration_similarity') || 'Similarité :';
        const migrationDrinksText = i18n.t('migration_drinks') || 'Consommations';
        const migrationHistoryText = i18n.t('migration_history') || 'Historique';
        const migrationEntriesText = i18n.t('migration_entries') || 'entrées';
        const migrationRatingText = i18n.t('migration_rating') || 'Note';
        const migrationDismissText = i18n.t('migration_btn_dismiss') || 'Ignorer';
        const migrationTransferText = i18n.t('migration_btn_reconcile') || 'Fusionner et remplacer';

        const warningActionText = `⚠️ <strong>Action définitive :</strong> La bière personnalisée sera <u>définitivement supprimée</u> de votre collection après la fusion complète de vos consommations, notes et historique vers la bière officielle.`;

        if (modalContainer) modalContainer.innerHTML = `
            <div class="modal-overlay active" id="migration-overlay">
                <div class="modal-content" style="max-width: 440px; border: 1px solid rgba(255,192,0,0.3); background: var(--bg-card); max-height: 90vh; overflow-y: auto; position: relative;">
                    <button id="btn-wiz-top-close" aria-label="Fermer l'assistant" title="Fermer l'assistant" style="position: absolute; top: 12px; right: 14px; background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.2); color: #fff; border-radius: 50%; width: 34px; height: 34px; display: flex; align-items: center; justify-content: center; font-size: 1.2rem; cursor: pointer; transition: all 0.2s; z-index: 10;">✕</button>

                    <div style="text-align: center; padding: 20px 20px 10px;">
                        <div style="font-size: 2rem; margin-bottom: 8px;">🧹</div>
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
                            ${match.canonicalDisplay ? `<div style="font-size:0.75rem; color:#aaa; margin-top:8px; padding:6px 8px; background:rgba(0,0,0,0.25); border-radius:6px; text-align:center;">✨ Cible Thanos : <strong style="color:var(--accent-gold);">${match.canonicalDisplay}</strong></div>` : ''}
                        </div>
                    </div>

                    ${match.uniqueImpact === -1 ? `
                    <div style="margin: 0 15px 12px; padding: 10px 12px; background: rgba(255,152,0,0.15); border: 1px solid rgba(255,152,0,0.4); border-radius: 8px; color: #ffb74d; font-size: 0.75rem; line-height: 1.4; text-align: left;">
                        ⚠️ <strong>Impact sur vos bières uniques (-1) :</strong><br>
                        Vous possédez déjà cette bière officielle (${match.officialExistingCount} dégustation${match.officialExistingCount > 1 ? 's' : ''}). Fusionner cumulera vos consommations (${drinkCount} + ${match.officialExistingCount} = ${drinkCount + match.officialExistingCount}) mais réduira votre compteur unique de <strong>1</strong>.
                    </div>
                    ` : `
                    <div style="margin: 0 15px 12px; padding: 10px 12px; background: rgba(76,175,80,0.12); border: 1px solid rgba(76,175,80,0.35); border-radius: 8px; color: #81c784; font-size: 0.75rem; line-height: 1.4; text-align: left;">
                        ✅ <strong>Transfert neutre (0 perte) :</strong><br>
                        Cette bière officielle n'a jamais été bue dans votre Dex. Votre compteur de bières uniques reste <u>strictement inchangé</u>.
                    </div>
                    `}

                    <div style="margin: 0 15px 15px; padding: 10px 12px; background: rgba(244,67,54,0.12); border: 1px solid rgba(244,67,54,0.35); border-radius: 8px; color: #ff8a80; font-size: 0.75rem; line-height: 1.4; text-align: center;">
                        ${warningActionText}
                    </div>

                    <div style="display: flex; gap: 10px; padding: 0 15px 10px;">
                        <button id="btn-wiz-dismiss" class="btn-primary" style="flex: 1; background: #222; border: 1px solid #444; color: #aaa; margin: 0; padding: 10px;">
                            ${migrationDismissText}
                        </button>
                        <button id="btn-wiz-confirm" class="btn-primary" style="flex: 1; background: var(--accent-gold); color: #000; font-weight: bold; margin: 0; padding: 10px;">
                            ${migrationTransferText}
                        </button>
                    </div>
                    <div style="text-align: center; padding-bottom: 16px;">
                        <button id="btn-wiz-exit" style="background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.15); color: #bbb; font-size: 0.82rem; padding: 6px 16px; border-radius: 20px; cursor: pointer; transition: all 0.2s;">
                            ✕ Quitter l'assistant
                        </button>
                    </div>
                </div>
            </div>
        `;

        if (modalContainer) modalContainer?.classList.remove('hidden');

        if (!handleKeyDown) {
            handleKeyDown = (e) => {
                if (e.key === 'Escape') exitWizard();
            };
            document.addEventListener('keydown', handleKeyDown);
        }

        const overlay = document.getElementById('migration-overlay');
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) exitWizard();
        });

        document.getElementById('btn-wiz-top-close')?.addEventListener('click', exitWizard);
        document.getElementById('btn-wiz-exit')?.addEventListener('click', exitWizard);

        document.getElementById('btn-wiz-dismiss').addEventListener('click', () => {
            Deduplicator.dismissMatch(customBeer.id, officialBeer.id);
            currentIndex++;
            showNext();
        });

        document.getElementById('btn-wiz-confirm').addEventListener('click', () => {
            const result = Storage.migrateBeerData(customBeer.id, officialBeer.id);
            if (result.success) {
                mergedCount++;
                const bIdx = allBeers.findIndex(b => b.id === customBeer.id);
                if (bIdx !== -1) allBeers.splice(bIdx, 1);
                Feedback.playSuccess();
                showToast(`Fusion réussie (${mergedCount}/${matches.length})`, 'success');
            } else {
                showToast(i18n.t('migration_error') || 'Erreur lors du transfert.', 'error');
            }
            currentIndex++;
            showNext();
        });
    };

    showNext();
}

export function renderRequestBeerForm(allBeers = []) {
    const wrapper = document.createElement('div');
    wrapper.className = 'modal-content';
    wrapper.style.maxHeight = '85vh';
    wrapper.style.overflowY = 'auto';

    const sectionStyle = `background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);border-radius:12px;padding:14px;margin-bottom:2px;`;
    const sectionTitle = (icon, text) => `<div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;"><span style="font-size:1.1rem;">${icon}</span><strong style="color:var(--accent-gold);font-size:0.85rem;text-transform:uppercase;letter-spacing:0.5px;">${text}</strong></div>`;
    const reqStar = `<span style="color:#f44336;margin-left:2px;">*</span>`;

    wrapper.innerHTML = `
        <div style="text-align:center;margin-bottom:18px;">
            <div style="font-size:2.8rem;margin-bottom:6px;filter:drop-shadow(0 2px 8px rgba(245,158,11,0.4));">🍺</div>
            <h2 style="color:var(--accent-gold);margin-bottom:4px;font-size:1.3rem;">${i18n.t('request_beer_title')}</h2>
            <p style="font-size:0.8rem;color:#666;">${i18n.t('request_beer_subtitle')}</p>
        </div>

        <div style="background:linear-gradient(135deg,rgba(255,152,0,0.08),rgba(255,152,0,0.03));padding:10px 14px;border-radius:10px;margin-bottom:16px;text-align:left;border:1px solid rgba(255,152,0,0.15);">
            <span style="font-size:0.78rem;color:#ffb74d;line-height:1.5;">${i18n.t('request_beer_search_first')}</span>
        </div>

        <form id="request-beer-form" style="display:flex;flex-direction:column;gap:10px;">

            <!-- Section 1: Identity -->
            <div style="${sectionStyle}">
                ${sectionTitle('👤', i18n.t('request_beer_firstname').split(' ')[0] === 'First' ? 'Your Info' : 'Vos Infos')}
                <div style="display:flex;gap:8px;margin-bottom:10px;">
                    <div style="flex:1;">
                        <label class="form-label" style="font-size:0.78rem;display:flex;align-items:center;gap:3px;">${i18n.t('request_beer_firstname')}${reqStar}</label>
                        <input type="text" class="form-input" name="firstname" required placeholder="${i18n.t('request_beer_firstname_placeholder')}" style="padding:10px;font-size:0.9rem;">
                    </div>
                    <div style="flex:1;">
                        <label class="form-label" style="font-size:0.78rem;display:flex;align-items:center;gap:3px;">${i18n.t('request_beer_lastname')}${reqStar}</label>
                        <input type="text" class="form-input" name="lastname" required placeholder="${i18n.t('request_beer_lastname_placeholder')}" style="padding:10px;font-size:0.9rem;">
                    </div>
                </div>
                <div>
                    <label class="form-label" style="font-size:0.78rem;display:flex;align-items:center;gap:3px;">📧 ${i18n.t('request_beer_email_label')}${reqStar}</label>
                    <input type="email" class="form-input" name="user_email" required placeholder="${i18n.t('request_beer_email_placeholder_v2')}" style="padding:10px;font-size:0.9rem;">
                </div>
            </div>

            <!-- Section 2: Beer Info -->
            <div style="${sectionStyle}">
                ${sectionTitle('🍻', i18n.t('request_beer_name').split(' ')[0] === 'Beer' ? 'Beer Details' : 'Détails Bière')}
                <div style="margin-bottom:10px;">
                    <label class="form-label" style="font-size:0.78rem;display:flex;align-items:center;gap:3px;">${i18n.t('request_beer_name')}${reqStar}</label>
                    <input type="text" class="form-input" name="beer_name" required placeholder="${i18n.t('request_beer_name_placeholder')}" style="padding:10px;font-size:0.9rem;">
                </div>
                <div style="margin-bottom:10px;">
                    <label class="form-label" style="font-size:0.78rem;">${i18n.t('request_beer_brewery')}</label>
                    <input type="text" class="form-input" name="brewery" placeholder="${i18n.t('request_beer_brewery_placeholder')}" style="padding:10px;font-size:0.9rem;">
                </div>
                <div style="display:flex;gap:8px;margin-bottom:10px;">
                    <div style="flex:1;">
                        <label class="form-label" style="font-size:0.78rem;">${i18n.t('request_beer_type')}</label>
                        <input type="text" class="form-input" name="beer_type" placeholder="${i18n.t('request_beer_type_placeholder')}" style="padding:10px;font-size:0.9rem;">
                    </div>
                    <div style="flex:0.5;">
                        <label class="form-label" style="font-size:0.78rem;">${i18n.t('request_beer_alcohol')}</label>
                        <input type="text" class="form-input" name="alcohol" placeholder="${i18n.t('request_beer_alcohol_placeholder')}" style="padding:10px;font-size:0.9rem;">
                    </div>
                </div>
                <div style="display:flex;gap:8px;">
                    <div style="flex:1;">
                        <label class="form-label" style="font-size:0.78rem;">${i18n.t('request_beer_volume')}</label>
                        <input type="text" class="form-input" name="volume" placeholder="${i18n.t('request_beer_volume_placeholder')}" style="padding:10px;font-size:0.9rem;">
                    </div>
                    <div style="flex:1;">
                        <label class="form-label" style="font-size:0.78rem;">${i18n.t('request_beer_country')}</label>
                        <input type="text" class="form-input" name="country" placeholder="${i18n.t('request_beer_country_placeholder')}" style="padding:10px;font-size:0.9rem;">
                    </div>
                </div>
            </div>

            <!-- Section 3: Extra Details -->
            <div style="${sectionStyle}">
                ${sectionTitle('📋', i18n.t('request_beer_region').split(' ')[0] === 'Region' ? 'Extra Details' : 'Détails Supplémentaires')}
                <div style="margin-bottom:10px;">
                    <label class="form-label" style="font-size:0.78rem;">${i18n.t('request_beer_region')}</label>
                    <input type="text" class="form-input" name="region" placeholder="${i18n.t('request_beer_region_placeholder')}" style="padding:10px;font-size:0.9rem;">
                </div>
                <div style="display:flex;gap:8px;margin-bottom:10px;">
                    <div style="flex:1;">
                        <label class="form-label" style="font-size:0.78rem;">${i18n.t('request_beer_distribution')}</label>
                        <select class="form-select" name="distribution" style="padding:10px;font-size:0.9rem;">
                            <option value="">${i18n.t('request_beer_dist_unknown')}</option>
                            <option value="Partout">${i18n.t('form_dist_partout')}</option>
                            <option value="Supermarché">${i18n.t('form_dist_supermarket')}</option>
                            <option value="Cavistes">${i18n.t('form_dist_cavistes')}</option>
                            <option value="Cavistes spécialisés">${i18n.t('form_dist_cavistes_spec')}</option>
                            <option value="À la brasserie">${i18n.t('form_dist_brewery')}</option>
                        </select>
                    </div>
                    <div style="flex:1;">
                        <label class="form-label" style="font-size:0.78rem;">${i18n.t('request_beer_barcode')}</label>
                        <input type="text" class="form-input" name="barcode" inputmode="numeric" placeholder="${i18n.t('request_beer_barcode_placeholder')}" style="padding:10px;font-size:0.9rem;">
                    </div>
                </div>
                <div style="margin-bottom:10px;">
                    <label class="form-label" style="font-size:0.78rem;">${i18n.t('request_beer_ingredients')}</label>
                    <input type="text" class="form-input" name="ingredients" placeholder="${i18n.t('request_beer_ingredients_placeholder')}" style="padding:10px;font-size:0.9rem;">
                </div>
                <div style="display:flex;gap:16px;padding:6px 0;margin-bottom:10px;">
                    <label style="display:flex;align-items:center;gap:6px;font-size:0.82rem;color:var(--text-secondary);cursor:pointer;">
                        <input type="checkbox" name="barrel_aged" style="width:18px;height:18px;accent-color:var(--accent-gold);">
                        ${i18n.t('request_beer_barrel')}
                    </label>
                    <label style="display:flex;align-items:center;gap:6px;font-size:0.82rem;color:var(--text-secondary);cursor:pointer;">
                        <input type="checkbox" name="seasonal" style="width:18px;height:18px;accent-color:var(--accent-gold);">
                        ${i18n.t('request_beer_seasonal')}
                    </label>
                </div>
                <div>
                    <label class="form-label" style="font-size:0.78rem;">🔗 ${i18n.t('request_beer_link')}</label>
                    <input type="url" class="form-input" name="link" placeholder="${i18n.t('request_beer_link_placeholder')}" style="padding:10px;font-size:0.9rem;">
                </div>
            </div>

            <button type="submit" id="btn-submit-request" class="btn-primary"
                style="background:linear-gradient(135deg,#f59e0b,#d97706);color:#000;font-weight:bold;margin-top:4px;padding:14px;font-size:1rem;border-radius:12px;box-shadow:0 4px 20px rgba(245,158,11,0.35);transition:transform 0.15s,box-shadow 0.15s;letter-spacing:0.3px;">
                ${i18n.t('request_beer_submit')}
            </button>
        </form>
    `;

    openModal(wrapper);

    const form = wrapper.querySelector('#request-beer-form');
    const submitBtn = wrapper.querySelector('#btn-submit-request');

    form.onsubmit = async (e) => {
        e.preventDefault();

        // --- Rate limiting (60s cooldown) ---
        const lastSent = parseInt(Storage.getRawItem('beerdex_req_ts', '0'), 10);
        const cooldown = 60000;
        if (Date.now() - lastSent < cooldown) {
            const secs = Math.ceil((cooldown - (Date.now() - lastSent)) / 1000);
            showToast(`⏳ ${secs}s`, 'error');
            return;
        }

        // --- Sanitize helper ---
        const clean = (v) => (v || '').trim().replace(/[<>]/g, '');

        const firstname = clean(form.querySelector('[name="firstname"]').value);
        const lastname = clean(form.querySelector('[name="lastname"]').value);
        const userEmail = clean(form.querySelector('[name="user_email"]').value);

        if (!firstname || !lastname || !userEmail) {
            showToast(i18n.t('request_beer_identity_required'), 'error');
            return;
        }

        // Email format check
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(userEmail)) {
            showToast(i18n.t('request_beer_identity_required'), 'error');
            return;
        }

        const beerName = clean(form.querySelector('[name="beer_name"]').value);
        if (!beerName) {
            showToast(i18n.t('request_beer_required'), 'error');
            return;
        }

        // --- Levenshtein distance for fuzzy matching ---
        const levenshtein = (a, b) => {
            const m = a.length, n = b.length;
            if (!m) return n; if (!n) return m;
            const d = Array.from({length: m + 1}, (_, i) => [i]);
            for (let j = 1; j <= n; j++) d[0][j] = j;
            for (let i = 1; i <= m; i++)
                for (let j = 1; j <= n; j++)
                    d[i][j] = Math.min(d[i-1][j]+1, d[i][j-1]+1, d[i-1][j-1]+(a[i-1]!==b[j-1]?1:0));
            return d[m][n];
        };

        if (allBeers && allBeers.length > 0) {
            const norm = (s) => (s||'').toUpperCase().replace(/[^A-Z0-9]/g,'');
            const searchN = norm(beerName);
            const matches = allBeers.filter(b => {
                if (!b || !b.title) return false;
                const tn = norm(b.title);
                if (tn === searchN || tn.includes(searchN) || searchN.includes(tn)) return true;
                return searchN.length > 3 && levenshtein(tn, searchN) <= 3;
            }).slice(0, 5);

            if (matches.length > 0) {
                const list = matches.map(b => `• ${b.title}${b.brewery ? ' ('+b.brewery+')' : ''}`).join('\n');
                const msg = `${i18n.t('request_beer_duplicate_warning')}\n\n${list}\n\n${i18n.t('request_beer_duplicate_confirm')}`;
                if (!await showConfirmModal(msg, { danger: false, confirmText: i18n.t('request_beer_submit') })) return;
            }
        }

        submitBtn.disabled = true;
        submitBtn.innerHTML = `<span class="spinner"></span> ${i18n.t('request_beer_sending')}`;

        const brewery = clean(form.querySelector('[name="brewery"]').value);
        const beerType = clean(form.querySelector('[name="beer_type"]').value);
        const alcohol = clean(form.querySelector('[name="alcohol"]').value);
        const volume = clean(form.querySelector('[name="volume"]').value);
        const country = clean(form.querySelector('[name="country"]').value);
        const region = clean(form.querySelector('[name="region"]').value);
        const distribution = form.querySelector('[name="distribution"]').value;
        const ingredients = clean(form.querySelector('[name="ingredients"]').value);
        const barcode = clean(form.querySelector('[name="barcode"]').value);
        const barrelAged = form.querySelector('[name="barrel_aged"]').checked;
        const seasonal = form.querySelector('[name="seasonal"]').checked;
        const link = clean(form.querySelector('[name="link"]').value);

        const volNormalized = volume.replace(/[^0-9.]/g, '') || '0';
        const idBase = `${beerName}_${beerType}_${volNormalized}`
            .toUpperCase().replace(/\s+/g, '_').replace(/[^A-Z0-9_.]/g, '');

        const beerEntry = {
            title: beerName.toUpperCase(), brewery: brewery.toUpperCase() || '',
            type: beerType || '', volume: volume ? `${volNormalized} L` : '',
            alcohol: alcohol || '', id: idBase, image: '', distribution: distribution || '',
            barrel_aged: barrelAged, community_rating: 0, ingredients: ingredients || '', isSeasonal: seasonal
        };
        if (region) beerEntry.province = region;
        if (country) beerEntry.country = country;
        if (barcode) beerEntry.barcode = barcode;
        if (link) beerEntry.link = link;

        const formData = {
            access_key: 'dc29b29d-99f5-4ea7-9a42-8c4f41ad1a14',
            subject: `🍺 Beer Request: ${beerName}`,
            from_name: `${firstname} ${lastname}`,
            replyto: userEmail,
            message: `From: ${firstname} ${lastname} (${userEmail})\n\n${JSON.stringify(beerEntry, null, 2)}`
        };

        try {
            const response = await fetch('https://api.web3forms.com/submit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                body: JSON.stringify(formData)
            });

            const result = await response.json();

            if (result.success) {
                Storage.setRawItem('beerdex_req_ts', Date.now().toString());
                closeModal();
                showToast(i18n.t('toast_request_beer_success'));
            } else {
                throw new Error(result.message || 'Unknown error');
            }
        } catch (err) {
            console.error('[RequestBeer] Error:', err);
            showToast(i18n.t('toast_request_beer_error'), 'error');
            submitBtn.disabled = false;
            submitBtn.innerHTML = i18n.t('request_beer_submit');
        }
    };
}

export function resizeImage(file, maxWidth, maxHeight, callback) {
    const reader = new FileReader();
    reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            let width = img.width;
            let height = img.height;

            if (width > height) {
                if (width > maxWidth) {
                    height *= maxWidth / width;
                    width = maxWidth;
                }
            } else {
                if (height > maxHeight) {
                    width *= maxHeight / height;
                    height = maxHeight;
                }
            }

            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);
            callback(canvas.toDataURL('image/jpeg', 0.8)); // 0.8 quality jpeg
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

function renderAdvancedStats(totalVolumeMl, totalAlcoholMl) {
    const totalLiters = (totalVolumeMl / 1000).toFixed(1);
    const alcoholLiters = (totalAlcoholMl / 1000).toFixed(2);

    return `
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-top:15px;">
            <div style="padding:15px; background:linear-gradient(135deg, rgba(30,30,30,0.8), rgba(15,15,15,0.9)); border-radius:12px; border:1px solid rgba(255,255,255,0.05); box-shadow:0 4px 15px rgba(0,0,0,0.3); text-align:center; display:flex; flex-direction:column; justify-content:center;">
                <div style="font-size:1.8rem; font-family:'Russo One', sans-serif; color:#fff; text-shadow:0 2px 4px rgba(0,0,0,0.5);">${totalLiters} L</div>
                <div style="font-size:0.75rem; color:#888; text-transform:uppercase; letter-spacing:0.5px; margin-top:5px;">${i18n.t('stats_volume_total')}</div>
            </div>
            <div style="padding:15px; background:linear-gradient(135deg, rgba(30,30,30,0.8), rgba(15,15,15,0.9)); border-radius:12px; border:1px solid rgba(255,255,255,0.05); box-shadow:0 4px 15px rgba(0,0,0,0.3); text-align:center; display:flex; flex-direction:column; justify-content:center;">
                <div style="font-size:1.8rem; font-family:'Russo One', sans-serif; color:#fff; text-shadow:0 2px 4px rgba(0,0,0,0.5);">${alcoholLiters} L</div>
                <div style="font-size:0.75rem; color:#888; text-transform:uppercase; letter-spacing:0.5px; margin-top:5px;">${i18n.t('stats_pure_alcohol')}</div>
            </div>
        </div>
    `;
}

function renderEquivalences(totalVolumeMl, totalAlcoholMl) {
    // Fun Comparisons logic (Volume)
    const comparisons = [
        { label: i18n.t('stats_label_pints'), vol: 500, icon: '🍺' },
        { label: i18n.t('stats_label_packs'), vol: 1980, icon: '📦' },
        { label: i18n.t('stats_label_buckets'), vol: 10000, icon: '🪣' },
        { label: i18n.t('stats_label_barrels'), vol: 30000, icon: '🛢️' },
        { label: i18n.t('stats_label_showers'), vol: 60000, icon: '🚿' },
        { label: i18n.t('stats_label_bathtubs'), vol: 150000, icon: '🛁' },
        { label: i18n.t('stats_label_jacuzzis'), vol: 1000000, icon: '🧖' },
        { label: i18n.t('stats_label_trucks'), vol: 30000000, icon: '🚚' },
        { label: i18n.t('stats_label_pools'), vol: 50000000, icon: '🏊' },
        { label: i18n.t('stats_label_olympic_pools'), vol: 2500000000, icon: '🏟️' }
    ];

    let compHTML = '';
    comparisons.forEach(c => {
        const val = (totalVolumeMl / c.vol).toFixed(1);
        if (parseFloat(val) >= 1) {
            compHTML += `
                <div style="background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.05); padding:6px 12px; border-radius:20px; font-size:0.85rem; color:#ddd; display:inline-flex; gap:6px; align-items:center; white-space:nowrap;">
                    <span style="font-size:1.1rem; filter:drop-shadow(0 2px 4px rgba(0,0,0,0.5));">${c.icon}</span>
                    <span><strong style="color:var(--accent-gold);">${val}</strong> ${c.label}</span>
                </div>`;
        }
    });

    // Alcohol Comparisons Logic
    // totalAlcoholMl is pure alcohol.
    const alcComps = [
        { label: i18n.t('stats_label_pints_pils'), pure: 25, icon: '🍺' },
        { label: i18n.t('stats_label_tequila_shots'), pure: 12, icon: '🥃' },
        { label: i18n.t('stats_label_wine_bottles'), pure: 90, icon: '🍷' },
        { label: i18n.t('stats_label_whisky_bottles'), pure: 280, icon: '🍾' },
        { label: i18n.t('stats_label_vodka_bottles'), pure: 280, icon: '🍸' }
    ];

    let alcHTML = '';
    alcComps.forEach(c => {
        const val = (totalAlcoholMl / c.pure).toFixed(0);
        if (parseInt(val) > 0) {
            alcHTML += `
                <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid rgba(255,255,255,0.05); padding:10px 5px;">
                    <span style="color:#bbb; font-size:0.9rem; display:flex; align-items:center; gap:10px;">
                        <span style="font-size:1.1rem; background:rgba(255,255,255,0.05); width:32px; height:32px; display:flex; justify-content:center; align-items:center; border-radius:8px;">${c.icon}</span> 
                        ${c.label}
                    </span>
                    <strong style="color:var(--accent-gold); font-size:1.1rem; text-shadow:0 0 10px rgba(255,192,0,0.3);">${val}</strong>
                </div>`;
        }
    });

    // If nothing matches (too small volume), show at least one small one
    if (compHTML === '' && totalVolumeMl > 0) {
        compHTML = `
                <div style="background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.05); padding:6px 12px; border-radius:20px; font-size:0.85rem; color:#ddd; display:inline-flex; gap:6px; align-items:center;">
                    <span style="font-size:1.1rem; filter:drop-shadow(0 2px 4px rgba(0,0,0,0.5));">🍺</span>
                    <span><strong style="color:var(--accent-gold);">${(totalVolumeMl / 500).toFixed(2)}</strong> ${i18n.t('stats_label_pints')}</span>
                </div>`;
    }

    return `
        <div class="stat-card mt-20" style="padding:0; overflow:hidden; border:1px solid rgba(255,192,0,0.15); background:linear-gradient(180deg, rgba(20,20,20,0.6) 0%, rgba(10,10,10,0.8) 100%);">
            <div style="background: linear-gradient(90deg, rgba(255,192,0,0.1), transparent); padding: 15px; border-bottom: 1px solid rgba(255,255,255,0.05);">
                <h4 style="color:var(--accent-gold); margin:0; display:flex; align-items:center; gap:8px;">
                    <span style="font-size:1.2rem; filter:drop-shadow(0 2px 4px rgba(255,192,0,0.3));">⚖️</span> 
                    ${i18n.t('stats_equiv_alcohol').replace('Alcohol Equivalents', 'Equivalences').replace("Équivalences d'alcool", 'Équivalences')}
                </h4>
                <p style="font-size:0.75rem; color:#888; margin:5px 0 0 0;">${i18n.t('stats_equiv_desc')}</p>
            </div>
            
            <div style="padding: 15px;">
                <h5 style="color:#888; font-size:0.75rem; margin-bottom:12px; text-transform:uppercase; letter-spacing:1px; display:flex; align-items:center; gap:8px;">
                    <span style="flex:1; height:1px; background:rgba(255,255,255,0.1);"></span>
                    ${i18n.t('stats_equiv_volume')}
                    <span style="flex:1; height:1px; background:rgba(255,255,255,0.1);"></span>
                </h5>
                <div style="display:flex; flex-wrap:wrap; justify-content:center; gap:8px; margin-bottom: 25px;">
                    ${compHTML}
                </div>

                <h5 style="color:#888; font-size:0.75rem; margin-bottom:12px; text-transform:uppercase; letter-spacing:1px; display:flex; align-items:center; gap:8px;">
                    <span style="flex:1; height:1px; background:rgba(255,255,255,0.1);"></span>
                    ${i18n.t('stats_equiv_alcohol')}
                    <span style="flex:1; height:1px; background:rgba(255,255,255,0.1);"></span>
                </h5>
                <div style="background: rgba(0,0,0,0.2); border-radius: 12px; border: 1px solid rgba(255,255,255,0.03); padding: 5px 10px;">
                    ${alcHTML}
                </div>
            </div>
        </div>
    `;
}

// --- Achievements Helper ---

function renderAchievementsList() {
    const all = Achievements.getAllAchievements();
    const unlockedIds = Achievements.getUnlockedAchievements();

    // Group by Category
    const byCategory = {};
    all.forEach(ach => {
        const catKey = ach.categoryKey || 'ach_cat_fun';
        if (!byCategory[catKey]) byCategory[catKey] = [];
        byCategory[catKey].push(ach);
    });

    let html = '';

    Object.keys(byCategory).forEach(catKey => {
        const catTranslated = i18n.t(catKey);
        html += `<h4 class="ach-category-title text-center">${catTranslated}</h4>`;
        html += `<div class="ach-grid">`;

        html += byCategory[catKey].map(ach => {
            const isUnlocked = unlockedIds.includes(ach.id);
            const opacity = isUnlocked ? '1' : '0.4';
            const filter = isUnlocked ? 'none' : 'grayscale(100%)';

            let title = i18n.t(ach.titleKey, ach.titleData || {});
            let desc = i18n.t(ach.descKey, ach.descData || {});

            if (!isUnlocked && ach.hidden) {
                title = '???';
                desc = i18n.t('ach_hidden_desc'); // Or hardcoded if not in i18n
            }

            const safeTitle = title.replace(/'/g, "\\'").replace(/"/g, '&quot;');
            const safeDesc = desc.replace(/'/g, "\\'").replace(/"/g, '&quot;');
            const safeIcon = ach.icon.replace(/'/g, "\\'").replace(/"/g, '&quot;');

            const rarityClass = isUnlocked && ach.rarity ? `ach-rarity-${ach.rarity}` : '';

            return `
        <div class="ach-item ${rarityClass}" style="opacity:${opacity}; filter:${filter}; position:relative; cursor:pointer;"
    onclick="UI.showAchievementDetails('${safeTitle}', '${safeDesc}', '${safeIcon}', ${isUnlocked}, '${ach.rarity || ''}')" >
        <div class="ach-icon">${ach.icon}</div>
                    </div>`;
        }).join('');

        html += `</div>`;
    });

    return html;
}


// --- Real App Overlay Tutorial ---

// --- Real App Overlay Tutorial ---

const TutorialSystem = {
    steps: [
        {
            id: 'intro',
            target: null,
            message: () => `
                <div style="font-size:3rem; margin-bottom:10px;">👋</div>
                <h3 style="color:var(--accent-gold); margin-bottom:10px;">${i18n.t('tuto_intro_title')}</h3>
                <p>${i18n.t('tuto_intro_msg')}</p>
                <button class="btn-primary mt-20" onclick="TutorialSystem.next()">${i18n.t('tuto_btn_start')}</button>
            `
        },
        // --- HOME FEATURES ---
        {
            id: 'search',
            target: '#search-toggle',
            position: 'bottom',
            message: () => `
                <h3>${i18n.t('tuto_search_title')}</h3>
                <p>${i18n.t('tuto_search_msg')}</p>
                <button class="btn-primary mt-10" style="font-size:0.8rem;" onclick="TutorialSystem.next()">${i18n.t('tuto_btn_next')}</button>
            `
        },
        {
            id: 'filter',
            target: '#filter-toggle',
            position: 'bottom',
            message: () => `
                <h3>${i18n.t('tuto_filter_title')}</h3>
                <p>${i18n.t('tuto_filter_msg')}</p>
                <button class="btn-primary mt-10" style="font-size:0.8rem;" onclick="TutorialSystem.next()">${i18n.t('tuto_btn_next')}</button>
            `
        },
        {
            id: 'tap-beer',
            target: '.beer-card:first-child',
            position: 'auto',
            noClick: true,
            message: () => `
                <h3>${i18n.t('tuto_tap_title')}</h3>
                <p>${i18n.t('tuto_tap_msg')}</p>
                <button class="btn-primary mt-10" style="font-size:0.8rem;" onclick="TutorialSystem.next()">${i18n.t('tuto_btn_next')}</button>
            `
        },
        {
            id: 'add-beer',
            target: '#fab-add',
            position: 'top',
            message: () => `
                <h3>${i18n.t('tuto_add_title')}</h3>
                <p>${i18n.t('tuto_add_msg')}</p>
                <button class="btn-primary mt-10" style="font-size:0.8rem;" onclick="TutorialSystem.next()">${i18n.t('tuto_btn_next')}</button>
            `
        },
        // --- STATS ---
        {
            id: 'go-stats',
            target: '[data-view="stats"]',
            position: 'top',
            message: () => `
                <h3>${i18n.t('tuto_stats_title')}</h3>
                <p>${i18n.t('tuto_stats_msg')}</p>
            `,
            waitFor: 'click'
        },
        {
            id: 'stats-map',
            target: '#beer-map-container',
            position: 'top',
            message: () => `
                <h3>${i18n.t('tuto_map_title')}</h3>
                <p>${i18n.t('tuto_map_msg')}</p>
                <button class="btn-primary mt-10" style="font-size:0.8rem;" onclick="TutorialSystem.next()">${i18n.t('tuto_btn_next')}</button>
            `
        },
        {
            id: 'stats-achievements',
            target: '#card-achievements',
            position: 'top',
            message: () => `
                <h3 style="color:var(--accent-gold);">${i18n.t('tuto_ach_title')}</h3>
                <p>${i18n.t('tuto_ach_msg')}</p>
                <button class="btn-primary mt-10" style="font-size:0.8rem;" onclick="TutorialSystem.next()">${i18n.t('tuto_btn_next')}</button>
            `
        },
        {
            id: 'stats-wrapped',
            target: '#btn-open-wrapped',
            position: 'top',
            message: () => `
                <h3 style="color:var(--accent-gold);">${i18n.t('wrapped_title')}</h3>
                <p>${i18n.t('tuto_wrapped_msg')}</p>
                <button class="btn-primary mt-10" style="font-size:0.8rem;" onclick="TutorialSystem.next()">${i18n.t('tuto_btn_next')}</button>
            `
        },
        // --- SETTINGS ---
        {
            id: 'go-settings',
            target: '[data-view="settings"]',
            position: 'top',
            message: () => `
                <h3>${i18n.t('tuto_settings_title')}</h3>
                <p>${i18n.t('tuto_settings_msg')}</p>
            `,
            waitFor: 'click'
        },
        {
            id: 'set-discovery',
            target: '#toggle-discovery',
            position: 'bottom',
            message: () => `
                <h3>${i18n.t('tuto_discovery_title')}</h3>
                <p>${i18n.t('tuto_discovery_msg')}</p>
                <button class="btn-primary mt-10" style="font-size:0.8rem;" onclick="TutorialSystem.next()">${i18n.t('tuto_btn_next')}</button>
            `
        },
        {
            id: 'set-rarity',
            target: '#check-reveal-rarity',
            position: 'bottom',
            message: () => `
                <h3>${i18n.t('tuto_rarity_title')}</h3>
                <p>${i18n.t('tuto_rarity_msg')}</p>
                <button class="btn-primary mt-10" style="font-size:0.8rem;" onclick="TutorialSystem.next()">${i18n.t('tuto_btn_next')}</button>
            `
        },
        {
            id: 'set-data',
            target: '#btn-manage-export',
            position: 'top',
            message: () => `
                <h3>${i18n.t('tuto_data_title')}</h3>
                <p>${i18n.t('tuto_data_msg')}</p>
                <button class="btn-primary mt-10" style="font-size:0.8rem;" onclick="TutorialSystem.next()">${i18n.t('tuto_btn_next')}</button>
            `
        },
        {
            id: 'noah-preset',
            target: '#btn-preset-noah',
            position: 'top',
            message: () => `
                <h3>${i18n.t('tuto_presets_title')}</h3>
                <p>${i18n.t('tuto_presets_msg')}</p>
                <button class="btn-primary mt-10" style="font-size:0.8rem;" onclick="TutorialSystem.next()">${i18n.t('tuto_btn_next')}</button>
            `
        },
        // --- NEW FEATURES ---
        {
            id: 'go-home-final',
            target: '[data-view="home"]',
            position: 'top',
            message: () => `
                <h3>${i18n.t('tuto_home_title')}</h3>
                <p>${i18n.t('tuto_home_msg')}</p>
            `,
            waitFor: 'click'
        },
        {
            id: 'view-toggle',
            target: '#view-toggle',
            position: 'bottom',
            message: () => `
                <h3>${i18n.t('tuto_view_title')}</h3>
                <p>${i18n.t('tuto_view_msg')}</p>
                <button class="btn-primary mt-10" style="font-size:0.8rem;" onclick="TutorialSystem.next()">${i18n.t('tuto_btn_next')}</button>
            `
        },
        {
            id: 'bac-badge',
            target: '.bac-speculative-badge',
            position: 'auto',
            message: () => `
                <h3>${i18n.t('tuto_bac_badge_title')}</h3>
                <p>${i18n.t('tuto_bac_badge_msg')}</p>
                <button class="btn-primary mt-10" style="font-size:0.8rem;" onclick="TutorialSystem.next()">${i18n.t('tuto_btn_next')}</button>
            `
        },
        {
            id: 'bac-config',
            target: null,
            message: () => `
                <div style="font-size:2rem; margin-bottom:10px;">🩸</div>
                <h3 style="color:var(--accent-gold); margin-bottom:10px;">${i18n.t('tuto_bac_config_title')}</h3>
                <p style="margin-bottom:12px; font-size:0.85rem;">${i18n.t('tuto_bac_config_msg')}</p>
                <div style="display:flex; gap:8px; margin-bottom:10px; text-align:left;">
                    <div style="flex:1;">
                        <label style="font-size:0.7rem; color:#888; display:block; margin-bottom:3px;">${i18n.t('settings_weight')} (kg)</label>
                        <input type="number" id="tuto-bac-weight" class="form-input" value="${Storage.getPreference('bac_weight', 70)}" min="30" max="200" style="padding:5px; font-size:0.85rem; width:100%;">
                    </div>
                    <div style="flex:1;">
                        <label style="font-size:0.7rem; color:#888; display:block; margin-bottom:3px;">${i18n.t('settings_gender')}</label>
                        <select id="tuto-bac-gender" class="form-select" style="padding:5px; font-size:0.85rem; width:100%;">
                            <option value="M" ${Storage.getPreference('bac_gender', 'M') === 'M' ? 'selected' : ''}>${i18n.t('settings_male')}</option>
                            <option value="F" ${Storage.getPreference('bac_gender', 'M') === 'F' ? 'selected' : ''}>${i18n.t('settings_female')}</option>
                            <option value="X" ${Storage.getPreference('bac_gender', 'M') === 'X' ? 'selected' : ''}>${i18n.t('settings_not_specified')}</option>
                        </select>
                    </div>
                </div>
                <div style="display:flex; gap:8px; margin-bottom:12px; text-align:left;">
                    <div style="flex:1;">
                        <label style="font-size:0.7rem; color:#888; display:block; margin-bottom:3px;">${i18n.t('tuto_bac_country_label')}</label>
                        <select id="tuto-bac-country" class="form-select" style="padding:5px; font-size:0.85rem; width:100%;">
                            <option value="BE" ${Storage.getPreference('bac_country', 'BE') === 'BE' ? 'selected' : ''}>🇧🇪 ${i18n.t('country_be')}</option>
                            <option value="FR" ${Storage.getPreference('bac_country', 'BE') === 'FR' ? 'selected' : ''}>🇫🇷 ${i18n.t('country_fr')}</option>
                            <option value="DE" ${Storage.getPreference('bac_country', 'BE') === 'DE' ? 'selected' : ''}>🇩🇪 ${i18n.t('country_de')}</option>
                            <option value="NL" ${Storage.getPreference('bac_country', 'BE') === 'NL' ? 'selected' : ''}>🇳🇱 ${i18n.t('country_nl')}</option>
                            <option value="IT" ${Storage.getPreference('bac_country', 'BE') === 'IT' ? 'selected' : ''}>🇮🇹 ${i18n.t('country_it')}</option>
                            <option value="US" ${Storage.getPreference('bac_country', 'BE') === 'US' ? 'selected' : ''}>🇺🇸 ${i18n.t('country_us')}</option>
                            <option value="CO" ${Storage.getPreference('bac_country', 'BE') === 'CO' ? 'selected' : ''}>🇨🇴 ${i18n.t('country_co')}</option>
                            <option value="CN" ${Storage.getPreference('bac_country', 'BE') === 'CN' ? 'selected' : ''}>🇨🇳 ${i18n.t('country_cn')}</option>
                            <option value="JP" ${Storage.getPreference('bac_country', 'BE') === 'JP' ? 'selected' : ''}>🇯🇵 ${i18n.t('country_jp')}</option>
                            <option value="KR" ${Storage.getPreference('bac_country', 'BE') === 'KR' ? 'selected' : ''}>🇰🇷 ${i18n.t('country_kr')}</option>
                        </select>
                    </div>
                    <div style="flex:1;">
                        <label style="font-size:0.7rem; color:#888; display:block; margin-bottom:3px;">${i18n.t('tuto_bac_vehicle_label')}</label>
                        <select id="tuto-bac-vehicle" class="form-select" style="padding:5px; font-size:0.85rem; width:100%;">
                            <option value="voiture" ${Storage.getPreference('bac_vehicle', 'voiture') === 'voiture' ? 'selected' : ''}>🚗 ${i18n.t('settings_bac_car')}</option>
                            <option value="moto" ${Storage.getPreference('bac_vehicle', 'voiture') === 'moto' ? 'selected' : ''}>🏍️ ${i18n.t('settings_bac_moto')}</option>
                            <option value="velo" ${Storage.getPreference('bac_vehicle', 'voiture') === 'velo' ? 'selected' : ''}>🚲 ${i18n.t('settings_bac_bike')}</option>
                            <option value="pieton" ${Storage.getPreference('bac_vehicle', 'voiture') === 'pieton' ? 'selected' : ''}>🚶 ${i18n.t('settings_bac_pedestrian')}</option>
                            <option value="gamer" ${Storage.getPreference('bac_vehicle', 'voiture') === 'gamer' ? 'selected' : ''}>🎮 ${i18n.t('settings_bac_gamer')}</option>
                            <option value="ne_conduit_pas" ${Storage.getPreference('bac_vehicle', 'voiture') === 'ne_conduit_pas' ? 'selected' : ''}>❌ ${i18n.t('settings_bac_none')}</option>
                        </select>
                    </div>
                </div>
                <button class="btn-primary" style="width:100%; margin-bottom:8px;" onclick="TutorialSystem.saveBac()">${i18n.t('tuto_btn_save')}</button>
                <div style="font-size:0.75rem; color:#888; text-decoration:underline; cursor:pointer;" onclick="TutorialSystem.skipBac()">${i18n.t('tuto_btn_skip_bac')}</div>
            `
        },
        {
            id: 'widget-info',
            target: null,
            message: () => `
                <div style="font-size:2rem; margin-bottom:10px;">📱</div>
                <h3 style="color:var(--accent-gold); margin-bottom:10px;">${i18n.t('tuto_widget_title')}</h3>
                <p>${i18n.t('tuto_widget_msg')}</p>
                <button class="btn-primary mt-10" style="font-size:0.8rem;" onclick="TutorialSystem.next()">${i18n.t('tuto_btn_next')}</button>
            `
        },
        {
            id: 'finale',
            target: null,
            message: () => `
                <div style="font-size:3rem; margin-bottom:10px;">🍻</div>
                <h3 style="color:var(--accent-gold);">${i18n.t('tuto_finale_title')}</h3>
                <p>${i18n.t('tuto_finale_msg')}</p>
                <button class="btn-primary mt-20" onclick="TutorialSystem.finish()">${i18n.t('tuto_btn_finish')}</button>
            `
        }
    ],
    currentStep: 0,
    panes: [], // Top, Bottom, Left, Right
    spotlight: null,
    tooltip: null,

    init() {
        if (this.panes.length > 0) return;

        // Create 4 panes for the "Hole" approach
        const createPane = () => {
            const el = document.createElement('div');
            el.className = 'tutorial-pane';
            el.style.cssText = 'position:fixed; background:rgba(0,0,0,0.8); z-index:9998; transition:all 0.3s;';
            document.body.appendChild(el);
            return el;
        };
        this.panes = [createPane(), createPane(), createPane(), createPane()];

        this.spotlight = document.createElement('div');
        this.spotlight.className = 'tutorial-spotlight';
        this.spotlight.style.cssText = `
            position: fixed; border-radius: 8px;
            box-shadow: 0 0 15px rgba(255,192,0,0.5), inset 0 0 0 2px var(--accent-gold);
            z-index: 9999; pointer-events: none;
            transition: all 0.3s; opacity: 0;
        `;

        this.tooltip = document.createElement('div');
        this.tooltip.className = 'tutorial-tooltip';
        this.tooltip.style.cssText = `
            position: fixed; background: #222; border: 1px solid var(--accent-gold);
            padding: 20px; border-radius: 12px; z-index: 10000;
            max-width: 280px; color: #eee; text-align: center;
            opacity: 0; transition: opacity 0.3s;
            box-shadow: 0 10px 40px rgba(0,0,0,0.8);
        `;

        document.body.appendChild(this.spotlight);
        document.body.appendChild(this.tooltip);

        // Resize/scroll handler (rAF-throttled, passive, no duplicate listeners on restart)
        if (this.boundUpdateObj) {
            window.removeEventListener('resize', this.boundUpdateObj);
            window.removeEventListener('scroll', this.boundUpdateObj, true);
        }
        let repositionPending = false;
        this.boundUpdateObj = () => {
            if (repositionPending) return;
            repositionPending = true;
            requestAnimationFrame(() => {
                repositionPending = false;
                this.updatePosition();
            });
        };
        window.addEventListener('resize', this.boundUpdateObj, { passive: true });
        window.addEventListener('scroll', this.boundUpdateObj, { capture: true, passive: true });
    },

    start() {
        this.init();
        this.currentStep = 0;
        this.showStep();
    },

    next() {
        this.currentStep++;
        if (this.currentStep >= this.steps.length) {
            this.finish();
        } else {
            this.showStep();
        }
    },

    saveBac() {
        const w = document.getElementById('tuto-bac-weight');
        const g = document.getElementById('tuto-bac-gender');
        const c = document.getElementById('tuto-bac-country');
        const v = document.getElementById('tuto-bac-vehicle');
        if (w) Storage.savePreference('bac_weight', parseInt(w.value) || 70);
        if (g) Storage.savePreference('bac_gender', g.value);
        if (c) Storage.savePreference('bac_country', c.value);
        if (v) Storage.savePreference('bac_vehicle', v.value);
        Storage.savePreference('bac_enabled', true);
        showToast(i18n.t('toast_bac_on'), 'success');
        this.next();
    },

    skipBac() {
        Storage.savePreference('bac_enabled', false);
        showToast(i18n.t('toast_bac_off'));
        this.next();
    },

    showStep() {
        const step = this.steps[this.currentStep];
        if (!step) return;

        this._currentEl = null;
        // Message can be a string or a function returning localized HTML
        this.tooltip.innerHTML = typeof step.message === 'function' ? step.message() : step.message;

        let targetEl = null;

        if (step.target) {
            const attemptFind = () => {
                targetEl = document.querySelector(step.target);
                if (targetEl) {
                    this.highlight(targetEl, step);
                } else {
                    // Retry briefly if dynamic content
                    setTimeout(() => {
                        targetEl = document.querySelector(step.target);
                        if (targetEl) this.highlight(targetEl, step);
                        else {
                            if (step.target !== '#card-achievements') // Ignore strict fail on stats
                                console.warn("Tutorial target not found:", step.target);
                        }
                    }, 500);
                }
            };

            // Special Logic for Switches/Checkboxes targeting parent
            if (step.id === 'set-discovery' || step.id === 'set-rarity') {
                setTimeout(() => {
                    const inp = document.querySelector(step.target);
                    if (inp && inp.parentElement) {
                        this.highlight(inp.parentElement, step);
                    } else {
                        attemptFind();
                    }
                }, 400); // Slightly longer wait for settings render
                return;
            }

            // Wait for lazy views
            if (step.id === 'noah-preset' || step.id === 'stats-map' || step.id === 'stats-achievements' || step.id === 'stats-wrapped') {
                setTimeout(attemptFind, 600);
            } else {
                attemptFind();
            }

        } else {
            this.highlight(null, step);
        }
    },

    highlight(el, step, repositionOnly = false) {
        this._currentEl = el;
        // Auto Scroll (never on reposition: it would re-trigger scroll events in a loop)
        if (el && !step.noScroll && !repositionOnly) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }

        // 1. Calculate Hole Dimensions
        let rect;
        if (el) {
            rect = el.getBoundingClientRect();
        } else {
            // Intro
            rect = { top: window.innerHeight / 2, left: window.innerWidth / 2, width: 0, height: 0, bottom: window.innerHeight / 2, right: window.innerWidth / 2 };
        }

        const pad = el ? 5 : 0;
        const top = Math.max(0, rect.top - pad);
        const left = Math.max(0, rect.left - pad);
        const width = rect.width + (pad * 2);
        const height = rect.height + (pad * 2);
        const right = left + width;
        const bottom = top + height;

        // 2. Position Panes
        const p = this.panes;
        p[0].style.top = '0'; p[0].style.left = '0'; p[0].style.width = '100vw'; p[0].style.height = top + 'px';
        p[1].style.top = bottom + 'px'; p[1].style.left = '0'; p[1].style.width = '100vw'; p[1].style.height = (window.innerHeight - bottom) + 'px';
        p[2].style.top = top + 'px'; p[2].style.left = '0'; p[2].style.width = left + 'px'; p[2].style.height = height + 'px';
        p[3].style.top = top + 'px'; p[3].style.left = right + 'px'; p[3].style.width = (window.innerWidth - right) + 'px'; p[3].style.height = height + 'px';

        // 3. Position Spotlight
        if (el) {
            this.spotlight.style.top = top + 'px';
            this.spotlight.style.left = left + 'px';
            this.spotlight.style.width = width + 'px';
            this.spotlight.style.height = height + 'px';
            this.spotlight.style.opacity = '1';

            // Activate anti-click barrier when the step proceeds via "Suivant" instead of clicking the target.
            this.spotlight.style.pointerEvents = step.waitFor === 'click' ? 'none' : 'auto';
        } else {
            this.spotlight.style.opacity = '0';
        }

        // 4. Position Tooltip
        if (this.currentHighlightId !== step.id) {
            const messageHtml = typeof step.message === 'function' ? step.message() : step.message;
            this.tooltip.innerHTML = messageHtml +
                `<div style="margin-top:10px; font-size:0.7rem; color:#888; text-decoration:underline; cursor:pointer;" onclick="TutorialSystem.finish()">${i18n.t('tuto_btn_skip')}</div>`;
        }
        this.tooltip.style.opacity = '1';

        requestAnimationFrame(() => {
            const ttW = this.tooltip.offsetWidth;
            const ttH = this.tooltip.offsetHeight;
            let ttTop, ttLeft;

            if (!el) {
                ttTop = (window.innerHeight - ttH) / 2;
                ttLeft = (window.innerWidth - ttW) / 2;
            } else {
                const fitsBottom = (bottom + ttH + 20) < window.innerHeight;
                let pos = step.position || 'auto';
                if (pos === 'auto') pos = fitsBottom ? 'bottom' : 'top';

                if (pos === 'top') {
                    ttTop = top - ttH - 15;
                } else if (pos === 'left') {
                    ttTop = top + (height / 2) - (ttH / 2);
                    ttLeft = left - ttW - 15;
                } else {
                    ttTop = bottom + 15;
                }

                if (pos !== 'left' && pos !== 'right') {
                    ttLeft = left + (width / 2) - (ttW / 2);
                }

                ttLeft = Math.max(10, Math.min(ttLeft, window.innerWidth - ttW - 10));

                if (ttTop < 10) ttTop = 10;
                if (ttTop + ttH > window.innerHeight) ttTop = window.innerHeight - ttH - 10;
            }

            this.tooltip.style.top = ttTop + 'px';
            this.tooltip.style.left = ttLeft + 'px';
        });

        // 5. Binding
        if (step.waitFor === 'click' && el && this.currentHighlightId !== step.id) {
            const oneTimeClick = (e) => {
                setTimeout(() => this.next(), 200);
            };
            el.addEventListener('click', oneTimeClick, { once: true });
        }

        this.currentHighlightId = step.id;
    },

    updatePosition() {
        if (!this.panes || !this.panes.length || this.currentStep >= this.steps.length) return;
        const step = this.steps[this.currentStep];
        if (!step) return;
        if (step.target && !(this._currentEl && this._currentEl.isConnected)) return;
        this.highlight(step.target ? this._currentEl : null, step, true);
    },

    finish() {
        Storage.savePreference('tutorial_completed', true);
        window.dispatchEvent(new Event('beerdex-action'));
        this.panes.forEach(p => p.style.opacity = '0');
        this.spotlight.style.opacity = '0';
        this.tooltip.style.opacity = '0';

        setTimeout(() => {
            this.panes.forEach(p => p.remove());
            this.panes = [];
            this.spotlight.remove();
            this.tooltip.remove();
            window.removeEventListener('resize', this.boundUpdateObj);
            window.removeEventListener('scroll', this.boundUpdateObj, true);
        }, 300);

        Storage.setRawItem('beerdex_welcome_seen_v3', 'true');
        showToast(i18n.t('toast_tuto_finished'));
    }
};



window.restartTutorial = () => TutorialSystem.start();
window.TutorialSystem = TutorialSystem;

export function showAchievementDetails(title, desc, icon, isUnlocked, rarity) {
    const wrapper = document.createElement('div');
    wrapper.className = 'modal-content text-center';

    let rarityHTML = '';
    if (rarity) {
        let rarityKey = '';
        let rarityColor = '#ccc';
        if (rarity === 'commun') { rarityColor = '#2ecc71'; rarityKey = 'rarity_commun'; }
        else if (rarity === 'rare') { rarityColor = '#3498db'; rarityKey = 'rarity_rare'; }
        else if (rarity === 'super_rare') { rarityColor = '#00bcd4'; rarityKey = 'rarity_super_rare'; }
        else if (rarity === 'epique') { rarityColor = '#9b59b6'; rarityKey = 'rarity_epique'; }
        else if (rarity === 'mythique') { rarityColor = '#e74c3c'; rarityKey = 'rarity_mythique'; }
        else if (rarity === 'legendaire') { rarityColor = '#f1c40f'; rarityKey = 'rarity_legendaire'; }
        else if (rarity === 'ultra_legendaire') { rarityColor = '#ff00cc'; rarityKey = 'rarity_ultra_legendaire'; }
        else if (rarity === 'fondateur') { rarityColor = '#FFD700'; rarityKey = 'rarity_fondateur'; }

        const rarityTranslated = i18n.t(rarityKey) || rarity;
        
        let specialClass = '';
        if (rarity === 'ultra_legendaire') specialClass = 'rarity-ultra_legendaire';
        if (rarity === 'fondateur') specialClass = 'rarity-fondateur';
        
        if (specialClass) {
            rarityHTML = `<div class="${specialClass}" style="display:inline-block; font-size:0.75rem; padding:4px 12px; border-radius:20px; margin-bottom:15px; text-transform:uppercase; border: none !important;">${rarityTranslated}</div>`;
        } else {
            rarityHTML = `<div style="display:inline-block; font-size:0.75rem; font-weight:800; color:${rarityColor}; background:rgba(255,255,255,0.05); padding:4px 12px; border-radius:20px; margin-bottom:15px; text-transform:uppercase; letter-spacing:1px; border:1px solid ${rarityColor}40;">${rarityTranslated}</div>`;
        }
    }

    const iconFilter = isUnlocked ? 'drop-shadow(0 4px 12px rgba(255,255,255,0.1))' : 'grayscale(100%) opacity(50%) drop-shadow(0 4px 12px rgba(255,255,255,0.05))';

    wrapper.innerHTML = `
        <div style="font-size:4rem; margin-bottom:20px; filter:${iconFilter};">${icon}</div>
        <h2 style="color:var(--accent-gold); margin-bottom:8px; font-family:'Russo One';">${title}</h2>
        ${rarityHTML}
        <p style="font-size:1.05rem; color:#ccc; margin-bottom:25px; line-height:1.5; padding:0 10px;">
            ${desc}
        </p>
        <button class="btn-primary" onclick="UI.closeModal()">${i18n.t('btn_close')}</button>
    `;

    openModal(wrapper);
}

// --- Beer Match (QR) ---

export function renderMatchModal(allBeersMap, initialCode = null) {
    const allBeers = (allBeersMap instanceof window.Map) ? allBeersMap : new window.Map(allBeersMap.map(b=>[b.id, b])); // ensure Map
    const currentPseudo = Storage.getPreference('beermatch_pseudo', '') || 'Anonyme';

    const wrapper = document.createElement('div');
    wrapper.innerHTML = `
        <div class="modal-content" style="width: min(95%, 500px); max-height: 88vh; padding: 20px; overflow-y: auto;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
                <div style="display:flex; align-items:center; gap:8px;">
                    <h2 style="margin:0; font-family:'Russo One'; color:var(--accent-gold); font-size:1.5rem;">🍻 Beer Party</h2>
                    <span style="font-size:0.65rem; background:color-mix(in srgb, var(--accent-gold) 15%, transparent); color:var(--accent-gold); border:1px solid color-mix(in srgb, var(--accent-gold) 35%, transparent); padding:2px 8px; border-radius:12px; font-weight:800; letter-spacing:0.8px;">P2P DIRECT</span>
                </div>
                <button type="button" class="close-btn" style="background:none; border:none; color:#fff; font-size:1.5rem; cursor:pointer;" aria-label="Fermer">&times;</button>
            </div>

            <div id="party-lobby">
                <div id="lobby-profile-bar" style="display:flex; justify-content:space-between; align-items:center; background:rgba(0,0,0,0.4); border:1px solid rgba(255,255,255,0.08); padding:8px 14px; border-radius:12px; margin-bottom:14px; flex-wrap:wrap; gap:8px;">
                    <div style="display:flex; align-items:center; gap:6px; font-size:0.82rem; color:#aaa;">
                        <span>👤 Pseudo :</span>
                        <strong id="lobby-pseudo-text" style="color:#fff; font-size:0.88rem;">${currentPseudo}</strong>
                    </div>
                    <div style="display:flex; gap:8px; align-items:center;">
                        <button type="button" id="btn-lobby-dice-pseudo" style="background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.12); color:#ddd; font-size:0.75rem; padding:4px 8px; border-radius:8px; cursor:pointer; display:flex; align-items:center; gap:4px;" title="Générer un animal aléatoire">🎲 Aléatoire</button>
                        <button type="button" id="btn-lobby-edit-pseudo" style="background:none; border:none; color:var(--accent-gold); font-size:0.8rem; font-weight:bold; cursor:pointer; text-decoration:underline;">✏️ Modifier</button>
                        <button type="button" id="btn-lobby-privacy" style="background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.12); color:#ddd; font-size:0.75rem; padding:4px 8px; border-radius:8px; cursor:pointer; display:flex; align-items:center; gap:4px;" title="Choisir ce que vous partagez">🛡️ Partage</button>
                    </div>
                </div>

                <div id="lobby-features-summary" style="display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-bottom:16px;">
                    <div style="background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.06); border-radius:10px; padding:8px 10px; font-size:0.75rem; color:#ccc; display:flex; align-items:center; gap:8px;">
                        <span style="font-size:1.1rem;">📊</span>
                        <span>Stats & volumes cumulés</span>
                    </div>
                    <div style="background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.06); border-radius:10px; padding:8px 10px; font-size:0.75rem; color:#ccc; display:flex; align-items:center; gap:8px;">
                        <span style="font-size:1.1rem;">🏆</span>
                        <span>Podiums en temps réel</span>
                    </div>
                    <div style="background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.06); border-radius:10px; padding:8px 10px; font-size:0.75rem; color:#ccc; display:flex; align-items:center; gap:8px;">
                        <span style="font-size:1.1rem;">🍻</span>
                        <span>Bières en commun</span>
                    </div>
                    <div style="background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.06); border-radius:10px; padding:8px 10px; font-size:0.75rem; color:#ccc; display:flex; align-items:center; gap:8px;">
                        <span style="font-size:1.1rem;">📦</span>
                        <span>Partage P2P direct</span>
                    </div>
                </div>

                <div style="display:flex; border-bottom:1px solid rgba(255,255,255,0.12); margin-bottom:16px;">
                    <button id="tab-join" style="flex:1; background:none; border:none; color:var(--accent-gold); padding:10px; border-bottom:2px solid var(--accent-gold); cursor:pointer; font-weight:800; font-size:0.9rem;">🍻 Rejoindre</button>
                    <button id="tab-host" style="flex:1; background:none; border:none; color:#888; padding:10px; cursor:pointer; font-weight:800; font-size:0.9rem;">👑 Créer une Salle</button>
                </div>
                
                <div id="view-join" style="display:block;">
                    <div style="background: rgba(255,255,255,0.03); padding: 15px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.05); margin-bottom: 15px;">
                        <label style="display:block; margin-bottom:10px; color:#ddd; font-size:0.9rem; font-weight:600;">Code de la salle</label>
                        <input type="text" id="join-code" placeholder="CODE A 6 LETTRES" class="form-input" style="font-size:1.2rem; text-align:center; text-transform:uppercase; margin-bottom:15px; background:rgba(0,0,0,0.3); border:1px solid #444; letter-spacing:3px; font-family:monospace;" maxlength="6">
                        <div style="display:flex; gap:10px;">
                            <button id="btn-join" class="btn-primary" style="flex:2; background: linear-gradient(135deg, var(--accent-gold), var(--accent-amber)); color:#000; font-weight:800; border:none; box-shadow: 0 4px 15px color-mix(in srgb, var(--accent-gold) 35%, transparent);">Rejoindre</button>
                            <button id="btn-scan" class="btn-primary" style="flex:1; background: #333; color:white; font-weight:bold; border:1px solid #555; display:flex; justify-content:center; align-items:center; gap:5px;">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-qr-code" viewBox="0 0 16 16">
                                  <path d="M2 2h2v2H2z"/>
                                  <path d="M6 0v6H0V0zM5 1H1v4h4zM4 12H2v2h2z"/>
                                  <path d="M6 10v6H0v-6zm-5 1v4h4v-4zm11-9h2v2h-2z"/>
                                  <path d="M10 0v6h6V0zm5 1v4h-4V1zM8 1V0h1v2H8v2H7V1zm0 5V4h1v2zM6 8V7h1V6h1v2h1V7h5v1h-4v1H7V8zm0 0v1H2V8H1v1H0V7h3v1zm10 1h-1V7h1zm-1 0h-1v2h2v-1h-1zm-4 0h2v1h-1v1h-1zm2 3v-1h-1v1h-1v1H9v1h3v-2zm0 0h3v1h-2v1h-1zm-4-1v1h1v-2H7v1z"/>
                                  <path d="M7 12h1v3h4v1H7zm9 2v2h-3v-1h2v-1z"/>
                                </svg> QR
                            </button>
                        </div>
                    </div>
                </div>

                <div id="view-scan" style="display:none; text-align:center;">
                    <div id="party-reader" style="border-radius:12px; overflow:hidden; border:2px solid var(--accent-gold); margin-bottom:15px; background:#111;"></div>
                    <button id="btn-cancel-scan" class="btn-primary" style="width:100%; background:#444; color:white; border:none;">Annuler</button>
                </div>
                
                <div id="view-host" style="display:none; text-align:center;">
                    <div style="background: rgba(255,255,255,0.03); padding: 20px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.05);">
                        <p style="color:#ccc; font-size:0.9rem; margin-bottom:20px; line-height:1.45;">Créez une salle instantanée et partagez le code ou le QR Code à vos amis pour démarrer la dégustation collective en direct !</p>
                        <button id="btn-host" class="btn-primary" style="background: linear-gradient(135deg, var(--accent-gold), var(--accent-amber)); color:black; width:100%; font-weight:800; border:none; box-shadow: 0 4px 15px color-mix(in srgb, var(--accent-gold) 35%, transparent); padding: 12px;">👑 Héberger une Beer Party</button>
                    </div>
                </div>
            </div>

            <div id="party-room" style="display:none; text-align:center;">
                <div style="background: color-mix(in srgb, var(--accent-gold) 6%, transparent); border: 1px solid color-mix(in srgb, var(--accent-gold) 25%, transparent); border-radius: 16px; padding: 20px; margin-bottom: 25px; text-align:center; box-shadow: inset 0 0 30px rgba(0,0,0,0.5), 0 10px 20px rgba(0,0,0,0.2); position:relative;">
                    <button id="btn-show-qr" style="position:absolute; top:15px; right:15px; background:none; border:none; font-size:1.5rem; cursor:pointer; color:var(--accent-gold); filter:drop-shadow(0 0 5px color-mix(in srgb, var(--accent-gold) 50%, transparent)); display:flex; justify-content:center; align-items:center; width:30px; height:30px;" title="Afficher QR">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" class="bi bi-qr-code" viewBox="0 0 16 16">
                          <path d="M2 2h2v2H2z"/>
                          <path d="M6 0v6H0V0zM5 1H1v4h4zM4 12H2v2h2z"/>
                          <path d="M6 10v6H0v-6zm-5 1v4h4v-4zm11-9h2v2h-2z"/>
                          <path d="M10 0v6h6V0zm5 1v4h-4V1zM8 1V0h1v2H8v2H7V1zm0 5V4h1v2zM6 8V7h1V6h1v2h1V7h5v1h-4v1H7V8zm0 0v1H2V8H1v1H0V7h3v1zm10 1h-1V7h1zm-1 0h-1v2h2v-1h-1zm-4 0h2v1h-1v1h-1zm2 3v-1h-1v1h-1v1H9v1h3v-2zm0 0h3v1h-2v1h-1zm-4-1v1h1v-2H7v1z"/>
                          <path d="M7 12h1v3h4v1H7zm9 2v2h-3v-1h2v-1z"/>
                        </svg>
                    </button>
                    <p style="margin: 0; color: rgba(255,255,255,0.5); font-size: 0.8rem; text-transform: uppercase; letter-spacing: 2px; font-weight:bold;">Code de la Salle (cliquer pour copier)</p>
                    
                    <div id="room-qr-container" style="display:none; background:#fff; padding:10px; border-radius:12px; margin: 15px auto; width: fit-content; box-shadow: 0 4px 15px rgba(0,0,0,0.5);"></div>
                    <h3 id="room-code-display" style="margin: 5px 0 15px; font-family: 'Courier New', monospace; font-size: 2.8rem; color: var(--accent-gold); letter-spacing: 8px; text-shadow: 0 0 20px color-mix(in srgb, var(--accent-gold) 50%, transparent); font-weight: 900; cursor:pointer; user-select:all;" title="Cliquer pour copier le code"></h3>
                    
                    <div style="display:inline-block; background: rgba(0,0,0,0.4); padding: 6px 12px; border-radius: 20px; border: 1px solid rgba(255,255,255,0.1);">
                        <span style="font-size:0.8rem; color:#aaa;">Connecté en tant que</span> <strong id="my-pseudo" style="color:#fff; font-size:0.85rem; margin-left:4px;"></strong>
                    </div>
                </div>
                
                <div id="members-list" style="background:rgba(0,0,0,0.2); border-radius:12px; padding:10px; text-align:left; margin-bottom:20px; max-height:250px; overflow-y:auto; border: 1px solid rgba(255,255,255,0.05); display:flex; flex-direction:column; gap:8px;">
                    <!-- Members inserted here -->
                </div>
                
                <div id="group-stats" style="display:none; text-align:left; border-top:1px solid rgba(255,255,255,0.1); padding-top:20px;">
                    <h4 style="color:var(--accent-gold); margin-bottom:15px; text-transform:uppercase; font-size:0.9rem; letter-spacing:1px; font-weight:800; display:flex; align-items:center; gap:8px;">
                        <span style="font-size:1.2rem;">📊</span> Statistiques du Groupe
                    </h4>
                    <div id="stats-content"></div>
                </div>

                <button id="btn-party-share-custom" class="form-input" style="background: linear-gradient(135deg, var(--accent-gold), var(--accent-amber)); color:#000; border:none; margin-top:10px; width:100%; padding:12px; border-radius:25px; font-weight:bold; cursor:pointer;">📦 Partager vos bières perso</button>

                <button id="btn-leave" class="form-input" style="background:rgba(68, 0, 0, 0.5); color:#ff6666; border:1px solid rgba(255, 102, 102, 0.3); margin-top:15px; width:100%; padding:12px; border-radius:25px; font-weight:bold; cursor:pointer; transition: background 0.3s;" onmouseover="this.style.background='rgba(68,0,0,0.8)'" onmouseout="this.style.background='rgba(68,0,0,0.5)'">Quitter la Party</button>
            </div>
        </div>
    `;

    const tabJoin = wrapper.querySelector('#tab-join');
    const tabHost = wrapper.querySelector('#tab-host');
    const viewJoin = wrapper.querySelector('#view-join');
    const viewHost = wrapper.querySelector('#view-host');
    const viewScan = wrapper.querySelector('#view-scan');
    const lobbyDiv = wrapper.querySelector('#party-lobby');
    const roomDiv = wrapper.querySelector('#party-room');
    
    let partyScanner = null;
    let isQrShowing = false;

    const stopPartyScanner = async () => {
        if (partyScanner) {
            try { await partyScanner.stop(); } catch(e){}
            partyScanner.clear();
            partyScanner = null;
        }
    };

    const switchTab = (tab) => {
        stopPartyScanner();
        if (tab === 'join') {
            tabJoin.style.color = 'var(--accent-gold)'; tabJoin.style.borderBottom = '2px solid var(--accent-gold)';
            tabHost.style.color = '#666'; tabHost.style.borderBottom = 'none';
            viewJoin.style.display = 'block'; viewHost.style.display = 'none'; viewScan.style.display = 'none';
        } else if (tab === 'scan') {
            viewJoin.style.display = 'none'; viewHost.style.display = 'none'; viewScan.style.display = 'block';
        } else {
            tabHost.style.color = 'var(--accent-gold)'; tabHost.style.borderBottom = '2px solid var(--accent-gold)';
            tabJoin.style.color = '#666'; tabJoin.style.borderBottom = 'none';
            viewJoin.style.display = 'none'; viewHost.style.display = 'block'; viewScan.style.display = 'none';
        }
    };
    tabJoin.onclick = () => switchTab('join');
    tabHost.onclick = () => switchTab('host');

    const btnLobbyEditPseudo = wrapper.querySelector('#btn-lobby-edit-pseudo');
    if (btnLobbyEditPseudo) {
        btnLobbyEditPseudo.onclick = async () => {
            const oldP = Storage.getPreference('beermatch_pseudo', '');
            const sampleP = Match && Match.getRandomPseudo ? Match.getRandomPseudo() : "Renard Houblonné";
            const newP = await showPromptModal("Votre pseudo pour la Beer Party :", {
                defaultValue: oldP,
                placeholder: `Ex: ${sampleP}`
            });
            if (newP !== null) {
                const trimmed = newP.trim();
                Storage.savePreference('beermatch_pseudo', trimmed);
                if (Match) {
                    if (Match.updateMyPseudo) Match.updateMyPseudo(trimmed);
                    else if (Match.myProfile) Match.myProfile.pseudo = trimmed || 'Anonyme';
                    if (Match.broadcastState) Match.broadcastState();
                }
                const lobbyPseudo = wrapper.querySelector('#lobby-pseudo-text');
                if (lobbyPseudo) lobbyPseudo.textContent = trimmed || 'Anonyme';
                const roomMyPseudo = wrapper.querySelector('#my-pseudo');
                if (roomMyPseudo) roomMyPseudo.textContent = trimmed || 'Anonyme';
                showToast(`Pseudo mis à jour : ${trimmed || 'Anonyme'}`);
            }
        };
    }

    const btnLobbyDicePseudo = wrapper.querySelector('#btn-lobby-dice-pseudo');
    if (btnLobbyDicePseudo) {
        btnLobbyDicePseudo.onclick = () => {
            const randomP = Match && Match.getRandomPseudo ? Match.getRandomPseudo() : 'Renard Houblonné';
            Storage.savePreference('beermatch_pseudo', randomP);
            if (Match) {
                if (Match.updateMyPseudo) Match.updateMyPseudo(randomP);
                else if (Match.myProfile) Match.myProfile.pseudo = randomP;
                if (Match.broadcastState) Match.broadcastState();
            }
            const lobbyPseudo = wrapper.querySelector('#lobby-pseudo-text');
            if (lobbyPseudo) lobbyPseudo.textContent = randomP;
            const roomMyPseudo = wrapper.querySelector('#my-pseudo');
            if (roomMyPseudo) roomMyPseudo.textContent = randomP;
            showToast(`Nouveau pseudo : ${randomP}`);
        };
    }

    const btnLobbyPrivacy = wrapper.querySelector('#btn-lobby-privacy');
    if (btnLobbyPrivacy) {
        btnLobbyPrivacy.onclick = () => {
            const privDialog = document.createElement('div');
            privDialog.className = 'modal-dialog';
            privDialog.style.maxWidth = '420px';
            privDialog.innerHTML = `
                <div class="dialog-icon">🛡️</div>
                <h3 style="color:var(--accent-gold); font-family:'Russo One'; margin-bottom:8px;">${i18n.t('settings_party_privacy_section')}</h3>
                <p style="color:#aaa; font-size:0.8rem; margin-bottom:12px;">${i18n.t('party_privacy_modal_desc') || 'Choisissez précisément ce que vous souhaitez diffuser aux autres membres dans la salle.'}</p>
                <div style="background:rgba(46,204,113,0.08); border:1px solid rgba(46,204,113,0.25); border-radius:8px; padding:8px 10px; font-size:0.75rem; color:#a3e635; margin-bottom:14px; text-align:left; line-height:1.35; display:flex; align-items:flex-start; gap:8px;">
                    <span style="font-size:0.95rem;">🔒</span>
                    <span>${i18n.t('party_privacy_p2p_notice')}</span>
                </div>
                <div style="display:flex; flex-direction:column; gap:10px; text-align:left; margin-bottom:20px;">
                    <label style="display:flex; justify-content:space-between; align-items:center; background:rgba(255,255,255,0.04); padding:10px 12px; border-radius:10px; cursor:pointer;">
                        <div>
                            <div style="font-size:0.85rem; color:#eee; font-weight:bold;">${i18n.t('settings_party_share_total') || 'Volumes & total bu'}</div>
                            <div style="font-size:0.75rem; color:#888;">${i18n.t('settings_party_share_total_desc') || 'Verres, litres et alcool pur pour le cumul du groupe.'}</div>
                        </div>
                        <input type="checkbox" id="modal-priv-total" class="toggle-switch" ${Storage.getPreference('beermatch_share_total', true) ? 'checked' : ''}>
                    </label>
                    <label style="display:flex; justify-content:space-between; align-items:center; background:rgba(255,255,255,0.04); padding:10px 12px; border-radius:10px; cursor:pointer;">
                        <div>
                            <div style="font-size:0.85rem; color:#eee; font-weight:bold;">${i18n.t('settings_party_share_catalog') || 'Bières en commun'}</div>
                            <div style="font-size:0.75rem; color:#888;">${i18n.t('settings_party_share_catalog_desc') || 'Comparer les bières goûtées pour vos affinités.'}</div>
                        </div>
                        <input type="checkbox" id="modal-priv-catalog" class="toggle-switch" ${Storage.getPreference('beermatch_share_catalog', true) ? 'checked' : ''}>
                    </label>
                    <label style="display:flex; justify-content:space-between; align-items:center; background:rgba(255,255,255,0.04); padding:10px 12px; border-radius:10px; cursor:pointer;">
                        <div>
                            <div style="font-size:0.85rem; color:#eee; font-weight:bold;">${i18n.t('settings_party_share_top') || 'Bières favorites'}</div>
                            <div style="font-size:0.75rem; color:#888;">${i18n.t('settings_party_share_top_desc') || 'Participer au top bière du groupe.'}</div>
                        </div>
                        <input type="checkbox" id="modal-priv-top" class="toggle-switch" ${Storage.getPreference('beermatch_share_top', true) ? 'checked' : ''}>
                    </label>
                    <label style="display:flex; justify-content:space-between; align-items:center; background:rgba(255,255,255,0.04); padding:10px 12px; border-radius:10px; cursor:pointer;">
                        <div>
                            <div style="font-size:0.85rem; color:#eee; font-weight:bold;">${i18n.t('settings_party_share_unique') || 'Bières uniques'}</div>
                            <div style="font-size:0.75rem; color:#888;">${i18n.t('settings_party_share_unique_desc') || 'Podium de l\'Explorateur.'}</div>
                        </div>
                        <input type="checkbox" id="modal-priv-unique" class="toggle-switch" ${Storage.getPreference('beermatch_share_unique', true) ? 'checked' : ''}>
                    </label>
                    <label style="display:flex; justify-content:space-between; align-items:center; background:rgba(255,255,255,0.04); padding:10px 12px; border-radius:10px; cursor:pointer;">
                        <div>
                            <div style="font-size:0.85rem; color:#eee; font-weight:bold;">${i18n.t('settings_party_share_achievements') || 'Trophées & badges'}</div>
                            <div style="font-size:0.75rem; color:#888;">${i18n.t('settings_party_share_achievements_desc') || 'Podium du Chasseur.'}</div>
                        </div>
                        <input type="checkbox" id="modal-priv-achievements" class="toggle-switch" ${Storage.getPreference('beermatch_share_achievements', true) ? 'checked' : ''}>
                    </label>
                </div>
                <button id="btn-priv-save" class="btn-primary" style="width:100%; padding:10px; font-weight:bold;">${i18n.t('party_privacy_modal_save') || i18n.t('btn_save') || 'Enregistrer'}</button>
            `;
            openModal(privDialog);
            privDialog.querySelector('#btn-priv-save').onclick = () => {
                Storage.savePreference('beermatch_share_total', privDialog.querySelector('#modal-priv-total').checked);
                Storage.savePreference('beermatch_share_catalog', privDialog.querySelector('#modal-priv-catalog').checked);
                Storage.savePreference('beermatch_share_top', privDialog.querySelector('#modal-priv-top').checked);
                Storage.savePreference('beermatch_share_unique', privDialog.querySelector('#modal-priv-unique').checked);
                Storage.savePreference('beermatch_share_achievements', privDialog.querySelector('#modal-priv-achievements').checked);
                if (Match) Match.myProfile = Match.generateLocalProfile(allBeers);
                if (Match && Match.broadcastState) Match.broadcastState();
                closeModal();
                showToast("Préférences de partage enregistrées");
            };
        };
    }



    wrapper.querySelector('#btn-scan').onclick = async () => {
        switchTab('scan');
        // html5-qrcode is lazy-loaded: fetch it only when the user wants to scan.
        try { await loadQrScanner(); } catch (e) { /* handled below */ }
        if (!window.Html5Qrcode) return showAlertModal("Scanner non disponible");
        partyScanner = new window.Html5Qrcode("party-reader");
        partyScanner.start({ facingMode: "environment" }, { fps: 10, qrbox: { width: 250, height: 250 } }, (text) => {
            stopPartyScanner();
            if (text.startsWith('BEERDEX:')) {
                const beerData = JSON.parse(text.replace('BEERDEX:', ''));
                if (window.UI && window.UI.renderSharedBeerModal) {
                    window.UI.renderSharedBeerModal(beerData, "Scan QR");
                }
            } else {
                const cleanCode = text.replace(/^(BEERDEX-PARTY:|PARTY:)/i, '').trim().toUpperCase();
                wrapper.querySelector('#join-code').value = cleanCode;
                switchTab('join');
                wrapper.querySelector('#btn-join').click(); // auto join
            }
        }).catch(err => {
            showAlertModal("Impossible d'accéder à la caméra");
            switchTab('join');
        });
    };
    
    wrapper.querySelector('#btn-cancel-scan').onclick = () => switchTab('join');

    wrapper.querySelector('#btn-show-qr').onclick = () => {
        const qrContainer = wrapper.querySelector('#room-qr-container');
        const codeDisplay = wrapper.querySelector('#room-code-display');
        isQrShowing = !isQrShowing;
        if (isQrShowing) {
            qrContainer.style.display = 'block';
            codeDisplay.style.display = 'none';
        } else {
            qrContainer.style.display = 'none';
            codeDisplay.style.display = 'block';
        }
    };

    const updateRoomUI = (state) => {
        const membersDiv = wrapper.querySelector('#members-list');
        membersDiv.innerHTML = '';
        
        let members = Match.members;
        if (state && state.members) {
            // Reconstruct map from object if necessary, or just use values
            if (state.members instanceof window.Map) {
                members = state.members;
            } else {
                members = new window.Map(Object.entries(state.members));
            }
        }
        
        wrapper.querySelector('#my-pseudo').textContent = Match.myProfile ? Match.myProfile.pseudo : 'Anonyme';
        
        let membersHtml = '';
        for (const [id, m] of members.entries()) {
            const volStr = m.totalLiters ? `${m.totalLiters.toFixed(1)} L` : '0 L';
            const alcStr = m.totalAlcoholLiters ? `(${m.totalAlcoholLiters.toFixed(2)} L alc. pur)` : '';
            const topBeer = m.topBeers && m.topBeers.length > 0 ? (allBeers.get ? allBeers.get(m.topBeerId) : allBeers.find(b=>b.id===m.topBeerId)) : null;
            const topBeerStr = topBeer ? `⭐ ${Utils.escapeHtml(topBeer.title)}` : '';
            
            membersHtml += `
            <div style="padding:10px; background:rgba(0,0,0,0.3); border-radius:8px; border:1px solid rgba(255,255,255,0.05); margin-bottom:5px;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:5px;">
                    <span style="font-weight:bold; color:#fff;">${Utils.escapeHtml(m.pseudo)} ${m.isHost ? '👑' : ''} ${m.me ? '<span style="color:#888; font-size:0.8rem;">(Vous)</span>' : ''}</span>
                    <span style="color:var(--accent-gold); font-weight:bold; font-size:0.9rem; background:rgba(255,215,0,0.1); padding:2px 8px; border-radius:12px;">${m.totalBeers || 0} bières</span>
                </div>
                <div style="display:flex; justify-content:space-between; font-size:0.75rem; color:#aaa;">
                    <span>💧 ${volStr} <span style="color:#d9534f;">${alcStr}</span></span>
                    <span style="color:#ffd700; max-width:50%; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${topBeerStr}</span>
                </div>
            </div>`;
        }
        membersDiv.innerHTML = membersHtml;
        
        // Show analytics
        const stats = Match.computeGroupAnalytics(allBeers);
        if (stats && members.size > 1) {
            wrapper.querySelector('#group-stats').style.display = 'block';
            
            let commonHtml = '';
            if (stats.commonBeers.length > 0) {
                const tags = stats.commonBeers.map(item => {
                    const opacity = item.count === item.total ? 1 : 0.6;
                    const border = item.count === item.total ? 'var(--accent-gold)' : '#666';
                    return `<span style="display:inline-block; margin:3px; padding:4px 8px; background:rgba(0,0,0,0.4); border:1px solid ${border}; border-radius:12px; font-size:0.75rem; color:#fff; opacity:${opacity};">
                        ${item.beer.title} <span style="color:var(--accent-gold); margin-left:4px;">${item.count}/${item.total}</span>
                    </span>`;
                }).join('');
                
                commonHtml = `<div style="margin-top:20px;">
                    <strong style="color:var(--accent-gold); font-size:0.85rem; text-transform:uppercase; letter-spacing:1px;">🍻 Bières en commun (${stats.commonBeers.length}) :</strong>
                    <div style="margin-top:8px; display:flex; flex-wrap:wrap;">${tags}</div>
                </div>`;
            } else {
                commonHtml = `<div style="margin-top:15px; font-size:0.85rem; color:#888; font-style:italic; padding:10px; background:rgba(255,255,255,0.02); border-radius:8px; text-align:center;">Aucune bière en commun.</div>`;
            }
            
            const groupVol = stats.totalGroupLiters ? `${stats.totalGroupLiters.toFixed(1)} L` : '0 L';
            const groupAlc = stats.totalGroupAlcoholLiters ? `${stats.totalGroupAlcoholLiters.toFixed(2)} L alc. pur` : '0 L alc.';
            const topGroupTitle = stats.topGroupBeer ? stats.topGroupBeer.title : '-';
            
            wrapper.querySelector('#stats-content').innerHTML = `
                <div style="display:flex; justify-content:space-between; margin-bottom:15px; background:rgba(0,0,0,0.4); padding:15px; border-radius:12px; border:1px solid rgba(255,215,0,0.1);">
                    <div style="text-align:center;">
                        <div style="font-size:1.4rem; font-weight:900; color:#fff;">${stats.totalGroupBeers}</div>
                        <div style="font-size:0.65rem; color:#aaa; text-transform:uppercase; letter-spacing:1px; margin-top:4px;">Total Bières</div>
                    </div>
                    <div style="text-align:center;">
                        <div style="font-size:1.4rem; font-weight:900; color:#4fc3f7;">${groupVol}</div>
                        <div style="font-size:0.65rem; color:#aaa; text-transform:uppercase; letter-spacing:1px; margin-top:4px;">Volume Bus</div>
                    </div>
                    <div style="text-align:center;">
                        <div style="font-size:1.4rem; font-weight:900; color:#ff6b6b;">${groupAlc}</div>
                        <div style="font-size:0.65rem; color:#aaa; text-transform:uppercase; letter-spacing:1px; margin-top:4px;">Alcool Pur</div>
                    </div>
                </div>
                
                <div style="background:rgba(255,215,0,0.05); padding:10px; border-radius:8px; border:1px solid rgba(255,215,0,0.2); margin-bottom:15px; text-align:center;">
                    <div style="font-size:0.7rem; color:var(--accent-gold); text-transform:uppercase; letter-spacing:1px; margin-bottom:4px;">⭐ Bière Préférée du Groupe</div>
                    <div style="font-size:1rem; font-weight:bold; color:#fff;">${topGroupTitle}</div>
                </div>
                
                <div style="font-size:0.85rem; color:#ccc; display:flex; flex-direction:column; gap:8px;">
                    <div style="background:rgba(0,0,0,0.2); padding:10px; border-radius:8px; border:1px solid rgba(255,255,255,0.05);">🏆 <b>Pilier de bar:</b> <span style="float:right; color:#fff; font-weight:bold;">${stats.podiums.pilier.name} (${stats.podiums.pilier.val})</span></div>
                    <div style="background:rgba(0,0,0,0.2); padding:10px; border-radius:8px; border:1px solid rgba(255,255,255,0.05);">🧭 <b>Explorateur:</b> <span style="float:right; color:#fff; font-weight:bold;">${stats.podiums.explorateur.name} (${stats.podiums.explorateur.val})</span></div>
                </div>
                ${commonHtml}
            `;
        } else {
             wrapper.querySelector('#group-stats').style.display = 'none';
        }
    };

    const enterRoom = (code) => {
        lobbyDiv.style.display = 'none';
        roomDiv.style.display = 'block';
        const codeDisplay = wrapper.querySelector('#room-code-display');
        codeDisplay.textContent = code;
        codeDisplay.onclick = () => {
            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(code).then(() => {
                    showToast(`Code ${code} copié dans le presse-papier !`);
                }).catch(() => {
                    showToast(`Code : ${code}`);
                });
            } else {
                showToast(`Code : ${code}`);
            }
        };
        
        // Generate QR Code
        const qrContainer = wrapper.querySelector('#room-qr-container');
        qrContainer.innerHTML = '';
        if (window.QRCode) {
            new window.QRCode(qrContainer, {
                text: `BEERDEX-PARTY:${code}`,
                width: 150,
                height: 150,
                colorDark: "#000000",
                colorLight: "#ffffff",
                correctLevel: window.QRCode.CorrectLevel.M
            });
        } else {
            qrContainer.innerHTML = '<span style="color:#000;">QR non dispo</span>';
        }
    };

    wrapper.querySelector('#btn-host').onclick = async () => {
        wrapper.querySelector('#btn-host').textContent = 'Création en cours...';
        try {
            const code = await Match.createParty(allBeers, handleGlobalPartyState);
            enterRoom(code);
            updateRoomUI();
            updateHeaderPartyUI();
        } catch (e) {
            showAlertModal('Erreur de connexion P2P: ' + e.message, { icon: '❌' });
            wrapper.querySelector('#btn-host').textContent = 'Héberger une Party';
        }
    };

    wrapper.querySelector('#btn-join').onclick = async () => {
        const code = wrapper.querySelector('#join-code').value.trim();
        if (code.length !== 6) return showAlertModal('Le code doit comporter 6 caractères.', { icon: '⚠️' });
        
        wrapper.querySelector('#btn-join').textContent = 'Connexion...';
        try {
            await Match.joinParty(code, allBeers, handleGlobalPartyState);
            enterRoom(code);
            updateRoomUI();
            updateHeaderPartyUI();
        } catch (e) {
            showAlertModal('Salle introuvable ou erreur de connexion.', { icon: '❌' });
            wrapper.querySelector('#btn-join').textContent = 'Rejoindre la Party';
        }
    };

    if (initialCode && initialCode.trim().length === 6) {
        const cleanCode = initialCode.trim().toUpperCase();
        const joinInput = wrapper.querySelector('#join-code');
        if (joinInput) joinInput.value = cleanCode;
        setTimeout(() => {
            const btnJoin = wrapper.querySelector('#btn-join');
            if (btnJoin) btnJoin.click();
        }, 120);
    }

    const closeRoom = async () => {
        const ok = await showConfirmModal("Voulez-vous vraiment quitter / fermer la Beer Party ?", {
            confirmText: "Quitter",
            cancelText: "Rester",
            danger: true
        });
        if (!ok) return;
        Match.leaveParty();
        updateHeaderPartyUI();
        lobbyDiv.style.display = 'block';
        roomDiv.style.display = 'none';
        wrapper.querySelector('#btn-host').textContent = 'Héberger une Party';
        wrapper.querySelector('#btn-join').textContent = 'Rejoindre la Party';
    };

    const btnPartyShare = wrapper.querySelector('#btn-party-share-custom');
    if (btnPartyShare) {
        btnPartyShare.onclick = () => {
            if (window.UI && window.UI.renderBulkShareModal) {
                window.UI.renderBulkShareModal();
            } else {
                showAlertModal("Fonction de partage non disponible.", { icon: '❌' });
            }
        };
    }

    wrapper.querySelector('#btn-leave').onclick = closeRoom;

    wrapper.querySelectorAll('.close-btn').forEach(btn => {
        btn.onclick = () => {
            window.__updatePartyRoomUI = null;
            closeModal();
        };
    });

    window.__updatePartyRoomUI = updateRoomUI;

    // Direct entry if party is already active
    if (Match && Match.roomCode) {
        enterRoom(Match.roomCode);
        updateRoomUI();
    }

    openModal(wrapper);
}

export function renderAdvancedShareModal(beer, userRating) {
    const wrapper = document.createElement('div');
    wrapper.className = 'modal-content';
    wrapper.innerHTML = `
        <h2 data-i18n="share_story_title">${i18n.t('share_story_title')}</h2>
        <p style="color:#888; font-size:0.85rem; margin-bottom:20px;" data-i18n="share_story_desc">
            ${i18n.t('share_story_desc')}
        </p>

        <div class="form-group">
            <label class="form-label" data-i18n="share_score_label">${i18n.t('share_score_label')}</label>
            <input type="number" id="share-score" class="form-input" value="${userRating.score || 0}" min="0" max="20" step="0.5">
        </div>

        <div class="form-group">
            <label class="form-label" data-i18n="share_comment_label">${i18n.t('share_comment_label')}</label>
            <textarea id="share-comment" class="form-textarea" rows="3">${userRating.comment || ''}</textarea>
        </div>

        <button id="btn-gen-link" class="btn-primary" style="margin-top:20px; background:var(--accent-gold); color:black;">
            ${i18n.t('share_btn_gen')}
        </button>
        <button id="btn-gen-tcg" class="btn-primary" style="margin-top:10px; border:1px solid var(--accent-gold); color:var(--accent-gold); background:transparent;">
            🃏 Carte TCG (Image PNG)
        </button>
    `;

    wrapper.querySelector('#btn-gen-link').onclick = () => {
        const score = wrapper.querySelector('#share-score').value;
        const comment = wrapper.querySelector('#share-comment').value;

        // Construct API Link
        const baseUrl = window.location.origin + window.location.pathname;
        const link = `${baseUrl}?action=share&id=${beer.id}&score=${score}&comment=${encodeURIComponent(comment)}&fallback=true`;

        renderShareLink(link);
    };

    wrapper.querySelector('#btn-gen-tcg').onclick = async () => {
        const btn = wrapper.querySelector('#btn-gen-tcg');
        const orig = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = i18n.t('reveal_creating');
        try {
            const score = parseFloat(wrapper.querySelector('#share-score').value);
            const comment = wrapper.querySelector('#share-comment').value;
            const customRating = {
                ...userRating,
                score: isNaN(score) ? userRating?.score : score,
                comment
            };
            const blob = await Share.generateTCGCard(beer, customRating);
            await Share.shareImage(blob, `${beer.title} — TCG`);
        } catch (err) {
            console.error(err);
            showToast(i18n.t('toast_share_error'));
        } finally {
            btn.disabled = false;
            btn.innerHTML = orig;
        }
    };

    openModal(wrapper);
}
export function renderDebugModal() {
    const modalContainer = getModalContainer();
    if (!modalContainer) return;
    const report = CrashLogger.generateReport();
    const device = CrashLogger.getDeviceInfo();
    const logs = CrashLogger.getLogs();

    const debugTitleText = i18n.t('debug_title') || 'Diagnostic & Debug';
    const debugSubtitleText = i18n.t('debug_subtitle') || 'Informations techniques pour le support';
    const debugDeviceText = i18n.t('debug_device_title') || 'Appareil';
    const debugErrorsText = i18n.t('debug_errors_title') || 'Erreurs récentes';
    const debugNoErrorsText = i18n.t('debug_no_errors') || 'Aucune erreur enregistrée.';
    const debugCopyText = i18n.t('debug_btn_copy') || 'Copier le rapport';
    const debugEmailText = i18n.t('debug_btn_email') || 'Envoyer par email';
    const debugClearText = i18n.t('debug_btn_clear') || 'Effacer les logs';
    const debugCloseText = i18n.t('btn_close') || 'Fermer';
    const debugDownloadText = i18n.t('btn_download') || 'Télécharger';

    modalContainer.innerHTML = `
        <div class="modal-overlay active" id="debug-overlay">
            <div class="modal-content" style="max-width: 500px; max-height: 85vh; overflow-y: auto; background: var(--bg-card); border: 1px solid rgba(255,255,255,0.1);">
                <div style="text-align: center; padding: 20px 20px 10px;">
                    <div style="font-size: 2rem; margin-bottom: 10px;">🛠️</div>
                    <h3 style="color: var(--accent-gold); font-family: 'Russo One', sans-serif; margin-bottom: 5px;">
                        ${debugTitleText}
                    </h3>
                    <p style="font-size: 0.75rem; color: #888;">
                        ${debugSubtitleText}
                    </p>
                </div>

                <!-- Device Info -->
                <div style="padding: 0 15px 10px;">
                    <h4 style="font-size: 0.8rem; color: var(--accent-gold); margin-bottom: 8px;">📱 ${debugDeviceText}</h4>
                    <div style="background: rgba(255,255,255,0.03); padding: 10px; border-radius: 8px; font-size: 0.75rem; color: #aaa; font-family: monospace; line-height: 1.6;">
                        <div><span style="color:#888;">Platform:</span> ${device.platform}</div>
                        <div><span style="color:#888;">Screen:</span> ${device.screenResolution} (${device.pixelRatio}x)</div>
                        <div><span style="color:#888;">Window:</span> ${device.windowSize}</div>
                        <div><span style="color:#888;">RAM:</span> ${device.deviceMemory}</div>
                        <div><span style="color:#888;">CPU:</span> ${device.hardwareConcurrency} cores</div>
                        <div><span style="color:#888;">Storage:</span> ${device.storageUsed}</div>
                        <div><span style="color:#888;">Online:</span> ${device.online ? '✅' : '❌'}</div>
                        <div><span style="color:#888;">Standalone:</span> ${device.standalone ? '✅' : '❌'}</div>
                        <div><span style="color:#888;">Capacitor:</span> ${device.capacitor ? '✅' : '❌'}</div>
                        <div style="word-break: break-all; margin-top: 5px;"><span style="color:#888;">UA:</span> ${device.userAgent}</div>
                    </div>
                </div>

                <!-- Error Logs -->
                <div style="padding: 0 15px 10px;">
                    <h4 style="font-size: 0.8rem; color: var(--accent-gold); margin-bottom: 8px;">🐛 ${debugErrorsText} (${logs.length})</h4>
                    <div style="background: rgba(255,255,255,0.03); padding: 10px; border-radius: 8px; max-height: 200px; overflow-y: auto; font-size: 0.7rem; color: #aaa; font-family: monospace; line-height: 1.5;">
                        ${logs.length === 0 
                            ? `<div style="text-align: center; color: #4CAF50; padding: 15px;">🎉 ${debugNoErrorsText}</div>`
                            : logs.slice(-10).reverse().map((log) => `
                                <div style="padding: 6px 0; border-bottom: 1px solid rgba(255,255,255,0.05); ${log.type === 'error' || log.type === 'promise_rejection' ? 'color: #ff6b6b;' : ''}">
                                    <div style="color: #666;">[${log.timestamp?.substring(11, 19) || '??'}] <span style="color: ${log.type === 'info' ? '#4CAF50' : log.type === 'console.error' ? '#ff9800' : '#ff6b6b'};">${log.type}</span></div>
                                    <div style="word-break: break-all;">${(log.message || '(empty)').substring(0, 200)}</div>
                                    ${log.source ? `<div style="color: #555;">${log.source}:${log.line}</div>` : ''}
                                </div>
                            `).join('')
                        }
                    </div>
                </div>

                <!-- Dev Settings -->
                <div style="padding: 0 15px 10px;">
                    <h4 style="font-size: 0.8rem; color: var(--accent-gold); margin-bottom: 8px;">⚙️ ${i18n.t('debug_dev_settings') || 'Developer Settings'}</h4>
                    <div style="display:flex; justify-content:space-between; align-items:center; background: rgba(255,255,255,0.03); padding: 10px; border-radius: 8px;">
                        <span style="font-size:0.8rem; color:#aaa;">${i18n.t('debug_toggle_dedup') || 'Deduplicator Background Worker'}</span>
                        <label class="switch" style="transform: scale(0.8);">
                            <input type="checkbox" class="toggle-switch" id="toggle-debug-dedup" ${Storage.getPreference('debug_deduplicator_enabled', false) ? 'checked' : ''}>
                            <span class="slider round"></span>
                        </label>
                    </div>
                </div>

                <!-- Action Buttons -->
                <div style="display: flex; flex-direction: column; gap: 8px; padding: 0 15px 20px;">
                    <button id="btn-debug-copy" class="btn-primary" style="background: var(--accent-gold); color: #000; font-weight: bold; margin: 0; width: 100%;">
                        📋 ${debugCopyText}
                    </button>
                    <button id="btn-debug-download" class="btn-primary" style="background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); margin: 0; width: 100%; color: #fff;">
                        📥 ${debugDownloadText}
                    </button>
                    <a id="btn-debug-email" href="${CrashLogger.getMailtoLink()}" class="btn-primary" style="display: block; text-align: center; background: #222; border: 1px solid var(--accent-gold); color: var(--accent-gold); margin: 0; width: 100%; text-decoration: none; box-sizing: border-box;">
                        ✉️ ${debugEmailText}
                    </a>
                    <button id="btn-debug-clear" class="btn-primary" style="background: rgba(255,0,0,0.1); color: #ff6b6b; border: 1px solid rgba(255,0,0,0.3); margin: 0; width: 100%; font-size: 0.8rem;">
                        🗑️ ${debugClearText}
                    </button>
                    <button id="btn-debug-close" class="btn-primary" style="background: #333; color: #aaa; margin: 0; width: 100%;">
                        ${debugCloseText}
                    </button>
                </div>
            </div>
        </div>
    `;

    modalContainer?.classList.remove('hidden');

    // Close overlay
    const overlay = document.getElementById('debug-overlay');
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
            modalContainer?.classList.add('hidden');
        }
    });

    document.getElementById('btn-debug-close').addEventListener('click', () => {
        modalContainer?.classList.add('hidden');
    });

    document.getElementById('toggle-debug-dedup').addEventListener('change', (e) => {
        Storage.savePreference('debug_deduplicator_enabled', e.target.checked);
        showToast(e.target.checked ? 'Deduplicator enabled (requires restart)' : 'Deduplicator disabled');
    });

    document.getElementById('btn-debug-copy').addEventListener('click', async () => {
        try {
            await navigator.clipboard.writeText(report);
            showToast(i18n.t('debug_copied') || 'Rapport copié !', 'success');
        } catch {
            // Fallback
            const ta = document.createElement('textarea');
            ta.value = report;
            document.body.appendChild(ta);
            ta.select();
            document.execCommand('copy');
            ta.remove();
            showToast(i18n.t('debug_copied') || 'Rapport copié !', 'success');
        }
    });

    document.getElementById('btn-debug-clear').addEventListener('click', () => {
        CrashLogger.clearLogs();
        showToast(i18n.t('debug_cleared') || 'Logs effacés', 'info');
        renderDebugModal(); // Re-render
    });

    document.getElementById('btn-debug-download').addEventListener('click', () => {
        try {
            const reportText = CrashLogger.generateReport();
            const blob = new Blob([reportText], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            const now = new Date();
            const timestamp = now.toISOString().replace(/[:.]/g, '-');
            a.download = "beerdex-debug-" + timestamp + ".txt";
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (err) {
            console.error('Failed to download log file:', err);
            showToast('Erreur lors du téléchargement');
        }
    });
}
export function renderBreweryView(breweryName, breweryBeers, container, activeFilters, onBack) {
    container.innerHTML = '';
    
    const wrapper = document.createElement('div');
    wrapper.className = 'brewery-page';
    
    const totalBeers = breweryBeers.length;
    let avgRating = 0, countRating = 0;
    const stylesCount = {};
    const aromaCount = {};
    let totalAbv = 0, countAbv = 0;
    let totalUserScore = 0, countUserScore = 0;
    let tastedCount = 0;
    
    breweryBeers.forEach(beer => {
        if (beer.community_rating) { avgRating += parseFloat(beer.community_rating); countRating++; }
        if (beer.type) { stylesCount[beer.type] = (stylesCount[beer.type] || 0) + 1; }
        if (beer.alcohol) {
            const abv = parseFloat(beer.alcohol.replace('%', '').replace(/\u00b0/g, '').replace(',', '.'));
            if (!isNaN(abv)) { totalAbv += abv; countAbv++; }
        }
        const ud = Storage.getBeerRating(beer.id);
        if (ud) {
            if (ud.aromas) ud.aromas.forEach(a => { aromaCount[a] = (aromaCount[a] || 0) + 1; });
            if (ud.score) { totalUserScore += parseFloat(ud.score); countUserScore++; }
            if (ud.count > 0) tastedCount++;
        }
    });
    
    const fAvgR = countRating > 0 ? (avgRating / countRating).toFixed(1) : null;
    const fAvgA = countAbv > 0 ? (totalAbv / countAbv).toFixed(1) : null;
    const fUserS = countUserScore > 0 ? (totalUserScore / countUserScore).toFixed(1) : null;
    const pPct = totalBeers > 0 ? Math.round((tastedCount / totalBeers) * 100) : 0;
    
    const sStyles = Object.entries(stylesCount).sort((a, b) => b[1] - a[1]);
    const sAromas = Object.entries(aromaCount).sort((a, b) => b[1] - a[1]).slice(0, 5);
    
    const sPills = sStyles.map(([s, c]) => '<span class="brewery-style-pill"><span class="brewery-pill-name">' + s + '</span><span class="brewery-pill-count">' + c + '</span></span>').join('');
    const aPills = sAromas.length > 0 ? sAromas.map(([a]) => '<span class="brewery-aroma-pill">' + (i18n ? (i18n.t('aroma_' + a) || a) : a) + '</span>').join('') : '';
    
    let starsH = '';
    if (fAvgR) {
        const v = parseFloat(fAvgR);
        for (let i = 1; i <= 5; i++) {
            if (i <= Math.floor(v)) starsH += '<span class="brewery-star filled">\u2605</span>';
            else if (i - v < 1 && i - v > 0) starsH += '<span class="brewery-star half">\u2605</span>';
            else starsH += '<span class="brewery-star">\u2605</span>';
        }
    }

    function getBreweryType(bName, bBeers) {
        // Prefer explicit production_volume from database
        const beerWithVol = bBeers.find(b => b.production_volume);
        if (beerWithVol && beerWithVol.production_volume) {
            const vol = beerWithVol.production_volume;
            const vLower = vol.toLowerCase();
            if (vLower === 'industrielle') return 'Brasserie Industrielle';
            if (vLower === 'r\u00e9gionale' || vLower === 'régionale') return 'Brasserie Régionale';
            if (vLower === 'artisanale') return 'Brasserie Artisanale';
            if (vLower === 'locale') return 'Brasserie Locale';
            return vol.charAt(0).toUpperCase() + vol.slice(1);
        }

        const nameL = bName.toLowerCase();
        if (nameL.includes('trappist')) return 'Brasserie Trappiste';
        if (nameL.includes('abbaye') || nameL.includes('abdij')) return "Brasserie d'Abbaye";
        if (nameL.includes('microbrasserie') || nameL.includes('micro-brasserie') || nameL.includes('nano')) return 'Microbrasserie';
        if (['inbev', 'heineken', 'alken-maes', 'carlsberg', 'kronenbourg', 'duvel moortgat', 'swinkels'].some(n => nameL.includes(n))) return 'Groupe Brassicole Industriel';
        for (const beer of bBeers) {
            const t = (beer.type || '').toLowerCase();
            const n = (beer.title || '').toLowerCase();
            if (t.includes('trappiste') || n.includes('trappist')) return 'Brasserie Trappiste';
            if (t.includes('abbaye') || t.includes('abdij') || n.includes('abbaye')) return "Brasserie d'Abbaye";
        }
        if (bBeers.length >= 30) return 'Grande Brasserie';
        return 'Brasserie Artisanale';
    }
    const breweryType = getBreweryType(breweryName, breweryBeers);

    let themeClass = '';
    let iconHTML = '<div class="brewery-hero-icon">\ud83c\udfed</div>';
    
    if (breweryName === 'Noah & Dorian' || breweryName === 'Noah \u0026 Dorian') {
        themeClass = 'theme-founders';
        iconHTML = '<div class="brewery-hero-icon founders-icon" style="background:transparent;"><img src="icons/logo-bnr.png" alt="Beerdex" style="width: 80px; height: 80px; object-fit: contain;" /></div>';
    } else if (breweryName === 'TROLOLOLO BREWING CO.') {
        themeClass = 'theme-trololo';
        iconHTML = '<div class="brewery-hero-icon trololo-icon" style="background:transparent; font-size: 60px;">🤡</div>';
    }

    wrapper.innerHTML = '<div class="brewery-hero">'
        + '<div class="brewery-hero-bg"></div>'
        + '<div class="brewery-hero-content">'
        + '<button id="btn-brewery-back" class="brewery-back-btn" aria-label="Retour"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg></button>'
        + '<div class="brewery-hero-text">'
        + iconHTML
        + '<h1 class="brewery-name">' + breweryName + '</h1>'
        + '<p class="brewery-subtitle" style="color:var(--accent-gold); font-weight:700; margin-bottom:2px; letter-spacing:0.5px;">' + breweryType + '</p>'
        + '<p class="brewery-subtitle">' + totalBeers + ' bi\u00e8re' + (totalBeers > 1 ? 's' : '') + ' r\u00e9f\u00e9renc\u00e9e' + (totalBeers > 1 ? 's' : '') + '</p>'
        + '</div></div></div>'
        + '<div class="brewery-stats-row">'
        + '<div class="brewery-stat-item"><div class="brewery-stat-value">' + (fAvgA || '-') + '<span class="brewery-stat-unit">' + (fAvgA ? '\u00b0' : '') + '</span></div><div class="brewery-stat-label">Alcool moy.</div></div>'
        + '<div class="brewery-stat-divider"></div>'
        + '<div class="brewery-stat-item"><div class="brewery-stat-value">' + (fAvgR || '-') + '<span class="brewery-stat-unit">' + (fAvgR ? '/5' : '') + '</span></div><div class="brewery-stat-label">Note communaut\u00e9</div>' + (starsH ? '<div class="brewery-stars-row">' + starsH + '</div>' : '') + '</div>'
        + '<div class="brewery-stat-divider"></div>'
        + '<div class="brewery-stat-item"><div class="brewery-stat-value">' + (fUserS || '-') + '<span class="brewery-stat-unit">' + (fUserS ? '/20' : '') + '</span></div><div class="brewery-stat-label">Votre note moy.</div></div>'
        + '</div>'
        + '<div class="brewery-progress-section"><div class="brewery-progress-header"><span class="brewery-progress-label">\ud83c\udfc6 Collection</span><span class="brewery-progress-pct">' + tastedCount + '/' + totalBeers + ' go\u00fbt\u00e9es (' + pPct + '%)</span></div><div class="brewery-progress-track"><div class="brewery-progress-fill" style="width: 0%"></div></div></div>'
        + (sStyles.length > 0 ? '<div class="brewery-section"><h3 class="brewery-section-title">\ud83c\udf3e Styles propos\u00e9s</h3><div class="brewery-pills-wrap">' + sPills + '</div></div>' : '')
        + (aPills ? '<div class="brewery-section"><h3 class="brewery-section-title">\ud83d\udc43 Ar\u00f4mes les plus fr\u00e9quents</h3><div class="brewery-pills-wrap">' + aPills + '</div></div>' : '')
        + '<div class="brewery-grid-header"><div class="brewery-grid-line"></div><span class="brewery-grid-title">\ud83c\udf7a Catalogue</span><div class="brewery-grid-line"></div></div>'
        + '<div id="brewery-beers-container" style="display: contents;"></div>';
        
    wrapper.className = 'brewery-page ' + themeClass;
    
    const backBtn = wrapper.querySelector('#btn-brewery-back');
    if (backBtn && onBack) backBtn.addEventListener('click', onBack);
    
    container.appendChild(wrapper);
    
    requestAnimationFrame(() => {
        const fill = wrapper.querySelector('.brewery-progress-fill');
        if (fill) requestAnimationFrame(() => { fill.style.width = pPct + '%'; });
    });
    
    const beersContainer = wrapper.querySelector('#brewery-beers-container');
    renderBeerList(breweryBeers, beersContainer, activeFilters, false, null, false);
}


window.Storage = Storage;
window.Match = Match;

export function updateHeaderPartyUI() {
    const widget = document.getElementById('header-party-widget');
    const codeEl = document.getElementById('header-party-code');
    const hasParty = !!(Match && Match.roomCode);
    if (document.body) {
        document.body.classList.toggle('has-active-party', hasParty);
    }
    if (!widget || !codeEl) return;
    
    if (hasParty) {
        codeEl.textContent = Match.roomCode;
        widget.style.display = 'inline-flex';
    } else {
        widget.style.display = 'none';
    }
}
window.UI.updateHeaderPartyUI = updateHeaderPartyUI;

export function renderPartyQRModal(code) {
    const partyCode = code || (Match && Match.roomCode);
    if (!partyCode) return;
    
    const wrapper = document.createElement('div');
    wrapper.className = 'modal-dialog';
    wrapper.style.maxWidth = '380px';
    
    wrapper.innerHTML = `
        <div class="dialog-icon">🍻</div>
        <h3 id="party-modal-code-title" style="cursor:pointer; display:inline-flex; align-items:center; justify-content:center; gap:8px;" title="Cliquer pour copier le code">Beer Party : ${partyCode} <span style="font-size:0.85rem; opacity:0.7;">📋</span></h3>
        <p style="color:#aaa; font-size:0.85rem; margin-bottom:15px;">
            Faites scanner ce QR Code à vos amis pour qu'ils rejoignent instantanément votre Beer Party !
        </p>
        
        <div id="header-party-qr-box" style="background:#fff; padding:12px; border-radius:16px; margin: 0 auto 15px auto; width: fit-content; box-shadow: 0 4px 20px rgba(0,0,0,0.6);"></div>
        
        <div style="display:flex; flex-direction:column; gap:10px;">
            <button id="btn-copy-party-code" class="btn-cancel" style="padding:12px; font-weight:600; display:flex; align-items:center; justify-content:center; gap:8px;">
                📋 Copier le code (${partyCode})
            </button>
            <button id="btn-open-party-match" class="btn-confirm" style="padding:12px;">
                👥 Voir les membres & stats
            </button>
            <button class="btn-cancel close-btn" style="padding:12px;">Fermer</button>
        </div>
    `;
    
    openModal(wrapper);
    
    const qrContainer = wrapper.querySelector('#header-party-qr-box');
    if (window.QRCode) {
        new window.QRCode(qrContainer, {
            text: `BEERDEX-PARTY:${partyCode}`,
            width: 200,
            height: 200,
            colorDark: "#000000",
            colorLight: "#ffffff",
            correctLevel: window.QRCode.CorrectLevel.M
        });
    }
    
    const copyPartyCode = () => {
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(partyCode).then(() => {
                showToast("Code copié dans le presse-papier !");
            }).catch(() => {
                showToast(`Code : ${partyCode}`);
            });
        } else {
            showToast(`Code : ${partyCode}`);
        }
    };

    wrapper.querySelector('#btn-copy-party-code').onclick = copyPartyCode;
    const titleCopy = wrapper.querySelector('#party-modal-code-title');
    if (titleCopy) titleCopy.onclick = copyPartyCode;
    
    wrapper.querySelector('#btn-open-party-match').onclick = () => {
        closeModal();
        renderMatchModal(window.allBeers || []);
    };
    
    wrapper.querySelector('.close-btn').onclick = () => closeModal();
}
window.UI.renderPartyQRModal = renderPartyQRModal;

export function initHeaderParty() {
    const partyBtn = document.getElementById('header-party-btn');
    if (partyBtn) {
        partyBtn.onclick = () => {
            renderPartyQRModal(Match ? Match.roomCode : null);
        };
    }
    
    const closeBtn = document.getElementById('header-party-close-btn');
    if (closeBtn) {
        closeBtn.onclick = async (e) => {
            e.stopPropagation();
            const confirmed = await showConfirmModal("Voulez-vous vraiment quitter / fermer la Beer Party ?", {
                title: "Fermer la Party",
                confirmText: "Quitter",
                cancelText: "Rester",
                danger: true
            });
            if (confirmed) {
                if (Match) Match.leaveParty();
                updateHeaderPartyUI();
                showToast("Beer Party terminée.");
                const roomDiv = document.getElementById('party-room');
                if (roomDiv) closeModal();
            }
        };
    }
    
    updateHeaderPartyUI();
}
window.UI.initHeaderParty = initHeaderParty;

export function handleGlobalPartyState(state) {
    if (!state) return;
    if (state.type === 'update') {
        if (window.__updatePartyRoomUI) {
            window.__updatePartyRoomUI(state);
        }
    } else if (state.type === 'share_custom_beer') {
        const myPseudo = Match && Match.myProfile ? Match.myProfile.pseudo : '';
        if (state.sender && state.sender !== myPseudo) {
            renderSharedBeerModal(state.beer, state.sender);
        }
    } else if (state.type === 'host_disconnected') {
        showAlertModal("L'hôte a quitté la Beer Party.", { icon: '🚪' });
        if (Match) Match.leaveParty();
        updateHeaderPartyUI();
        const roomDiv = document.getElementById('party-room');
        if (roomDiv) closeModal();
    } else if (state.type === 'leave') {
        updateHeaderPartyUI();
    }
}
window.UI.handleGlobalPartyState = handleGlobalPartyState;

export function renderBulkShareModal() {
    const customBeers = Storage.getCustomBeers();
    if (customBeers.length === 0) {
        return showAlertModal("Vous n'avez aucune bière personnalisée à partager.", { icon: 'ℹ️' });
    }

    const wrapper = document.createElement('div');
    wrapper.className = 'modal-dialog';
    wrapper.style.maxWidth = '440px';
    wrapper.style.maxHeight = '85vh';
    wrapper.style.padding = '24px 20px';
    wrapper.style.display = 'flex';
    wrapper.style.flexDirection = 'column';
    const inParty = Match && Match.roomCode;

    const listHtml = customBeers.map(b => `
        <label style="display:flex; align-items:center; justify-content:space-between; background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.06); padding:10px 12px; border-radius:10px; cursor:pointer; text-align:left;">
            <div style="margin-right:10px; min-width:0; flex:1;">
                <strong style="color:#fff; font-size:0.9rem; display:block; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${b.title}</strong>
                <span style="color:#aaa; font-size:0.75rem;">${b.brewery || 'Brasserie inconnue'} • ${b.alcohol || '?'}%</span>
            </div>
            <input type="checkbox" class="bulk-share-cb" value="${b.id}" style="width:18px; height:18px; accent-color:var(--accent-gold); cursor:pointer;" checked>
        </label>
    `).join('');

    wrapper.innerHTML = `
        <div style="display:flex; justify-content:flex-end; margin-top:-6px; margin-bottom:4px;">
            <button type="button" class="close-btn" style="background:none; border:none; color:var(--text-secondary); font-size:1.6rem; cursor:pointer; padding:2px 8px; line-height:1;">&times;</button>
        </div>
        <div class="dialog-icon" style="font-size:2.2rem; margin-bottom:8px;">📦</div>
        <h3 style="margin:0 0 8px 0; color:var(--accent-gold); font-size:1.3rem;">Partage Multiple</h3>
        <p style="color:#aaa; font-size:0.85rem; margin-bottom:15px;">Sélectionnez les bières personnalisées à envoyer.</p>
        
        <div style="flex:1; max-height:220px; overflow-y:auto; margin-bottom:15px; background:rgba(0,0,0,0.25); border:1px solid rgba(255,255,255,0.08); border-radius:12px; padding:10px; display:flex; flex-direction:column; gap:8px;">
            ${listHtml}
        </div>

        ${inParty ? `
            <button id="btn-share-bulk-party" class="btn-confirm" style="width:100%; margin-bottom:10px; padding:12px 18px; border-radius:25px; font-weight:700;">
                🚀 Partager dans la Beer Party (${Match.roomCode})
            </button>
        ` : `
            <button id="btn-create-bulk-host" class="btn-confirm" style="width:100%; margin-bottom:10px; padding:12px 18px; border-radius:25px; font-weight:700;">
                👑 Créer une Party et Partager (Hôte)
            </button>
            <button id="btn-join-bulk-opt" class="btn-cancel" style="width:100%; margin-bottom:10px; padding:11px 18px; border-radius:25px;">
                Rejoindre une Party existante
            </button>
        `}
        
        <div style="border-top:1px solid rgba(255,255,255,0.1); margin:10px 0 12px 0; padding-top:12px;">
            <div id="bulk-qr-container" style="background:#fff; padding:12px; border-radius:12px; margin: 0 auto 12px auto; width: fit-content; box-shadow: 0 4px 15px rgba(0,0,0,0.5); display:none;"></div>
            <button id="btn-generate-bulk-qr" class="btn-cancel" style="width:100%; border-color:var(--accent-gold); color:var(--accent-gold); padding:10px 18px; font-weight:600; border-radius:25px;">Générer un QR Code Multiple</button>
        </div>
        
        <button id="btn-close-bulk" class="btn-cancel close-btn" style="width:100%; padding:10px 18px; border-radius:25px;">Fermer</button>
    `;

    openModal(wrapper);
    
    wrapper.querySelectorAll('.close-btn').forEach(btn => btn.onclick = () => closeModal());
    
    const getSelectedBeers = () => {
        const cbs = Array.from(wrapper.querySelectorAll('.bulk-share-cb:checked'));
        const ids = cbs.map(cb => cb.value);
        return customBeers.filter(b => ids.includes(b.id));
    };

    const btnShareParty = wrapper.querySelector('#btn-share-bulk-party');
    if (btnShareParty) {
        btnShareParty.onclick = () => {
            const selected = getSelectedBeers();
            if (selected.length === 0) return showAlertModal("Veuillez sélectionner au moins une bière.");
            Match.shareCustomBeer(selected); 
            closeModal();
            showToast(`${selected.length} bière(s) envoyée(s) dans la Party !`);
        };
    }

    const btnCreateBulkHost = wrapper.querySelector('#btn-create-bulk-host');
    if (btnCreateBulkHost) {
        btnCreateBulkHost.onclick = async () => {
            const selected = getSelectedBeers();
            if (selected.length === 0) return showAlertModal("Veuillez sélectionner au moins une bière.");
            btnCreateBulkHost.textContent = "Création de la Party...";
            btnCreateBulkHost.disabled = true;
            try {
                const code = await Match.createParty(window.allBeers || [], handleGlobalPartyState);
                updateHeaderPartyUI();
                Match.shareCustomBeer(selected);
                closeModal();
                showToast(`Party ${code} créée ! ${selected.length} bière(s) partagée(s).`);
                if (window.UI && window.UI.renderPartyQRModal) {
                    window.UI.renderPartyQRModal(code);
                }
            } catch (err) {
                showAlertModal("Erreur de création : " + err.message, { icon: '❌' });
                btnCreateBulkHost.textContent = "👑 Créer une Party et Partager (Hôte)";
                btnCreateBulkHost.disabled = false;
            }
        };
    }

    const btnJoinBulkOpt = wrapper.querySelector('#btn-join-bulk-opt');
    if (btnJoinBulkOpt) {
        btnJoinBulkOpt.onclick = () => {
            closeModal();
            renderMatchModal(window.allBeers || []);
        };
    }
    
    wrapper.querySelector('#btn-generate-bulk-qr').onclick = () => {
        const selected = getSelectedBeers();
        if (selected.length === 0) return showAlertModal("Veuillez sélectionner au moins une bière.");
        
        const pruned = selected.map(b => ({
            id: b.id,
            title: b.title,
            brewery: b.brewery,
            type: b.type,
            alcohol: b.alcohol,
            volume: b.volume,
            description: b.description ? b.description.substring(0, 50) : ''
        }));
        
        const jsonStr = JSON.stringify(pruned);
        if (jsonStr.length > 2000) {
            return showAlertModal("Trop de bières sélectionnées pour un seul QR Code. Utilisez la Beer Party P2P.", { icon: '⚠️' });
        }
        
        const qrContainer = wrapper.querySelector('#bulk-qr-container');
        qrContainer.style.display = 'block';
        qrContainer.innerHTML = '';
        
        if (window.QRCode) {
            new window.QRCode(qrContainer, {
                text: 'BEERDEX:' + jsonStr,
                width: 220,
                height: 220,
                colorDark: "#000000",
                colorLight: "#ffffff",
                correctLevel: window.QRCode.CorrectLevel.L
            });
            wrapper.querySelector('#btn-generate-bulk-qr').style.display = 'none';
        } else {
            qrContainer.innerHTML = '<span style="color:#000;">QR non dispo</span>';
        }
    };
}
window.UI.renderBulkShareModal = renderBulkShareModal;

export function renderSharedBeerModal(beerData, sender) {
    if (!beerData) return;

    // Check if it's multiple beers
    if (Array.isArray(beerData)) {
        if (beerData.length === 0) return;
        const wrapper = document.createElement('div');
        wrapper.className = 'modal-dialog';
        wrapper.style.maxWidth = '420px';
        
        wrapper.innerHTML = `
            <div class="dialog-icon">🍻</div>
            <h3>${sender} a partagé ${beerData.length} bière(s) !</h3>
            <div style="max-height: 220px; overflow-y: auto; text-align: left; background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.08); padding: 8px; border-radius: 10px; margin-bottom: 20px; display:flex; flex-direction:column; gap:6px;">
                ${beerData.map(b => `
                    <div style="display:flex; align-items:center; gap:10px; background:rgba(255,255,255,0.03); padding:8px 10px; border-radius:8px;">
                        <span style="font-size:1.2rem;">🍺</span>
                        <div style="flex:1; min-width:0;">
                            <strong style="color:#fff; font-size:0.9rem; display:block; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${b.title}</strong>
                            <span style="font-size:0.75rem; color:#aaa;">${b.brewery || 'Brasserie inconnue'} • ${b.alcohol || '?'}%</span>
                        </div>
                    </div>
                `).join('')}
            </div>
            <div class="modal-dialog-actions">
                <button id="btn-accept-shared" class="btn-confirm">Ajouter au Catalogue</button>
                <button class="close-btn btn-cancel">Refuser</button>
            </div>
        `;
        
        wrapper.querySelector('#btn-accept-shared').onclick = () => {
            beerData.forEach(b => {
                if (!String(b.id).startsWith('CUSTOM_')) b.id = 'CUSTOM_' + b.id;
                Storage.saveCustomBeer(b);
            });
            if (window.addImportedCustomBeers) {
                window.addImportedCustomBeers(beerData);
            }
            closeModal();
            showToast(`${beerData.length} bière(s) importée(s) avec succès !`);
        };
        wrapper.querySelector('.close-btn').onclick = () => closeModal();
        openModal(wrapper);
        return;
    }

    // Single beer logic
    const wrapper = document.createElement('div');
    wrapper.className = 'modal-dialog';
    wrapper.style.maxWidth = '420px';
    const hasImg = beerData.image && beerData.image.startsWith('data:image');
    
    wrapper.innerHTML = `
        <div class="dialog-icon">🍻</div>
        <h3>${sender} a partagé une bière !</h3>
        <div style="background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; padding: 12px; margin-bottom: 20px; display:flex; align-items:center; gap:14px; text-align:left;">
            <div style="width: 54px; height: 54px; border-radius: 8px; overflow: hidden; flex-shrink:0; background:#000; border:1px solid rgba(255,255,255,0.1); display:flex; align-items:center; justify-content:center;">
                ${hasImg ? `<img src="${beerData.image}" style="width:100%; height:100%; object-fit:cover;">` : `<span style="font-size:24px;">🍺</span>`}
            </div>
            <div style="flex:1; min-width:0;">
                <strong style="font-size:1.05rem; color:#fff; display:block; margin-bottom:2px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${beerData.title}</strong>
                <span style="font-size:0.85rem; color:#aaa; display:block; margin-bottom:2px;">${beerData.brewery || 'Brasserie inconnue'}</span>
                <span style="font-size:0.8rem; color:var(--accent-gold); font-weight:600;">${beerData.type || 'Bière'} • ${beerData.alcohol || '?'}% ${beerData.volume ? '• ' + beerData.volume : ''}</span>
            </div>
        </div>
        <div class="modal-dialog-actions">
            <button id="btn-accept-shared" class="btn-confirm">Ajouter au Catalogue</button>
            <button class="close-btn btn-cancel">Refuser</button>
        </div>
    `;

    wrapper.querySelector('#btn-accept-shared').onclick = () => {
        if (!String(beerData.id).startsWith('CUSTOM_')) beerData.id = 'CUSTOM_' + beerData.id;
        Storage.saveCustomBeer(beerData);
        if (window.addImportedCustomBeers) {
            window.addImportedCustomBeers(beerData);
        }
        closeModal();
        showToast(`${beerData.title} importée avec succès !`);
    };
    
    wrapper.querySelector('.close-btn').onclick = () => closeModal();
    openModal(wrapper);
}
window.UI.renderSharedBeerModal = renderSharedBeerModal;

Object.assign(window.UI, {
    renderBeerDetail,
    renderAddBeerForm,
    renderStats,
    renderMatchModal,
    renderRequestBeerForm,
    renderDeduplicationWizard,
    renderDebugModal
});