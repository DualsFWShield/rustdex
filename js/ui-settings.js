/**
 * ui-settings.js — Paramètres (accordéons one-at-a-time + recherche),
 * éditeur de grille de notation, presets, patchnotes & pages légales.
 */

import { i18n } from './i18n.js';
import { Analytics } from './analytics.js';
import * as Storage from './storage.js';
import { Feedback } from './feedback.js';
import * as BAC from './bac.js';
import * as Theme from './theme.js';
import {
    showToast,
    openModal,
    closeModal,
    showPromptModal,
    showConfirmModal
} from './ui-modals.js';

const CURRENT_VERSION = '5.3.0';
let _activeSettingsGroup = 'appearance';

const PRESET_TRISTAN = [
    { id: 'score', label: 'preset_global_score', type: 'number', min: 0, max: 20, step: 0.1 },
    { id: 'comment', label: 'preset_comment', type: 'textarea' },
    { id: 'apparence', label: 'preset_tristan_apparence', type: 'textarea' },
    { id: 'couleur', label: 'preset_tristan_couleur', type: 'range', min: 1, max: 10, step: 1 },
    { id: 'transparence', label: 'preset_tristan_transparence', type: 'range', min: 1, max: 10, step: 1 },
    { id: 'mousse', label: 'preset_tristan_mousse', type: 'range', min: 1, max: 10, step: 1 },
    { id: 'mousse_tenue', label: 'preset_tristan_mousse_tenue', type: 'range', min: 1, max: 10, step: 1 },
    { id: 'aromes_txt', label: 'preset_tristan_aromes', type: 'textarea' },
    { id: 'cafe', label: 'preset_tristan_cafe', type: 'range', min: 0, max: 10, step: 1 },
    { id: 'caramel', label: 'preset_tristan_caramel', type: 'range', min: 0, max: 10, step: 1 },
    { id: 'cereales', label: 'preset_tristan_cereales', type: 'range', min: 0, max: 10, step: 1 },
    { id: 'chocolat', label: 'preset_tristan_chocolat', type: 'range', min: 0, max: 10, step: 1 },
    { id: 'sucre', label: 'preset_tristan_sucre', type: 'range', min: 0, max: 10, step: 1 },
    { id: 'noisette', label: 'preset_tristan_noisette', type: 'range', min: 0, max: 10, step: 1 },
    { id: 'pain', label: 'preset_tristan_pain', type: 'range', min: 0, max: 10, step: 1 },
    { id: 'agrumes', label: 'preset_tristan_agrumes', type: 'range', min: 0, max: 10, step: 1 },
    { id: 'epices', label: 'preset_tristan_epices', type: 'range', min: 0, max: 10, step: 1 },
    { id: 'fleurs', label: 'preset_tristan_fleurs', type: 'range', min: 0, max: 10, step: 1 },
    { id: 'herbes', label: 'preset_tristan_herbes', type: 'range', min: 0, max: 10, step: 1 },
    { id: 'poivre', label: 'preset_tristan_poivre', type: 'range', min: 0, max: 10, step: 1 },
    { id: 'resine', label: 'preset_tristan_resine', type: 'range', min: 0, max: 10, step: 1 },
    { id: 'fruit', label: 'preset_tristan_fruit', type: 'range', min: 0, max: 10, step: 1 },
    { id: 'mais', label: 'preset_tristan_mais', type: 'range', min: 0, max: 10, step: 1 },
    { id: 'intensite', label: 'preset_tristan_intensite', type: 'range', min: 1, max: 10, step: 1 },
    { id: 'equilibre', label: 'preset_tristan_equilibre', type: 'range', min: 1, max: 10, step: 1 },
    { id: 'impression', label: 'preset_tristan_impression', type: 'range', min: 1, max: 10, step: 1 },
    { id: 'corps', label: 'preset_tristan_corps', type: 'range', min: 1, max: 10, step: 1 },
    { id: 'carbonation', label: 'preset_tristan_carbonation', type: 'range', min: 1, max: 10, step: 1 },
    { id: 'synthese', label: 'preset_tristan_synthese', type: 'textarea' },
    { id: 'duree', label: 'preset_tristan_duree', type: 'range', min: 1, max: 10, step: 1 },
    { id: 'intensite_globale', label: 'preset_tristan_intensite_globale', type: 'range', min: 1, max: 10, step: 1 },
    { id: 'ensemble_equilibre', label: 'preset_tristan_qualite', type: 'range', min: 1, max: 10, step: 1 }
];

const PRESET_NOAH = [
    { id: 'score', label: 'preset_global_score', type: 'number', min: 0, max: 20, step: 0.1 },
    { id: 'comment', label: 'preset_comment', type: 'textarea' },
    { id: 'robe', label: 'preset_noah_robe', type: 'textarea' },
    { id: 'mousse_aspect', label: 'preset_noah_mousse', type: 'textarea' },
    { id: 'nez_intensite', label: 'preset_noah_nez_intensite', type: 'range', min: 1, max: 10, step: 1 },
    { id: 'nez_notes', label: 'preset_noah_nez_notes', type: 'textarea' },
    { id: 'attaque', label: 'preset_noah_attaque', type: 'textarea' },
    { id: 'milieu_bouche', label: 'preset_noah_milieu', type: 'textarea' },
    { id: 'finale', label: 'preset_noah_finale', type: 'textarea' },
    { id: 'corpulence', label: 'preset_noah_corpulence', type: 'range', min: 1, max: 10, step: 1 },
    { id: 'petillance', label: 'preset_noah_petillance', type: 'range', min: 1, max: 10, step: 1 },
    { id: 'amertume', label: 'preset_noah_amertume', type: 'range', min: 1, max: 10, step: 1 },
    { id: 'accord_mets', label: 'preset_noah_accord', type: 'textarea' },
    { id: 'potentiel_garde', label: 'preset_noah_garde', type: 'textarea' },
    { id: 'verdict', label: 'preset_noah_verdict', type: 'textarea' }
];

function applyTristanPreset() {
    Storage.saveRatingTemplate(PRESET_TRISTAN);
    Storage.savePreference('activePreset', 'tristan');
}

function applyNoahPreset() {
    Storage.saveRatingTemplate(PRESET_NOAH);
    Storage.savePreference('activePreset', 'noah');
}

function renderTemplateEditor() {
    const wrapper = document.createElement('div');
    wrapper.className = 'modal-content';
    let template = Storage.getRatingTemplate();

    const refreshList = () => {
        const listHtml = template.map((field, index) => `
        <div style="background:rgba(0,0,0,0.3); padding:10px; margin-bottom:10px; border-radius:8px; display:flex; justify-content:space-between; align-items:center;">
                    <div style="display:flex; align-items:center; gap:10px; flex:1;">
                        <div style="display:flex; flex-direction:column; gap:2px;">
                            ${index > 0 ? `<button type="button" data-idx="${index}" class="icon-btn mv-up" style="font-size:0.8rem; padding:0;">⬆️</button>` : '<div style="height:15px; width:15px;"></div>'}
                            ${index < template.length - 1 ? `<button type="button" data-idx="${index}" class="icon-btn mv-down" style="font-size:0.8rem; padding:0;">⬇️</button>` : '<div style="height:15px; width:15px;"></div>'}
                        </div>
                        <div>
                            <strong>${i18n.t(field.label)}</strong> <span style="font-size:0.8rem; color:#888;">(${field.type})</span>
                        </div>
                    </div>
                    <div style="display:flex; gap:10px;">
                        <button type="button" data-idx="${index}" class="icon-btn edit-field">✏️</button>
                        ${field.id === 'score' || field.id === 'comment' ? '' : `<button type="button" data-idx="${index}" class="icon-btn delete-field" style="color:red;">🗑️</button>`}
                    </div>
                </div>
        `).join('');

        wrapper.querySelector('#field-list').innerHTML = listHtml;

        wrapper.querySelectorAll('.delete-field').forEach(btn => {
            btn.onclick = async (e) => {
                if (await showConfirmModal(i18n.t('modal_confirm_delete_field'))) {
                    template.splice(e.target.dataset.idx, 1);
                    refreshList();
                }
            };
        });

        wrapper.querySelectorAll('.mv-up').forEach(btn => {
            btn.onclick = (e) => {
                const idx = parseInt(e.target.dataset.idx, 10);
                if (idx > 0) {
                    [template[idx], template[idx - 1]] = [template[idx - 1], template[idx]];
                    refreshList();
                }
            };
        });

        wrapper.querySelectorAll('.mv-down').forEach(btn => {
            btn.onclick = (e) => {
                const idx = parseInt(e.target.dataset.idx, 10);
                if (idx < template.length - 1) {
                    [template[idx], template[idx + 1]] = [template[idx + 1], template[idx]];
                    refreshList();
                }
            };
        });

        wrapper.querySelectorAll('.edit-field').forEach(btn => {
            btn.onclick = async (e) => {
                const idx = parseInt(e.target.dataset.idx, 10);
                const field = template[idx];

                const newLabel = await showPromptModal(i18n.t('prompt_new_name'), field.label);
                if (newLabel !== null && newLabel.trim() !== '') {
                    field.label = newLabel.trim();
                    const newType = await showPromptModal(i18n.t('prompt_new_type'), field.type);
                    if (['range', 'checkbox', 'textarea', 'number'].includes(newType)) {
                        field.type = newType;
                        if (newType === 'range') { field.min = 0; field.max = 10; field.step = 1; }
                    }
                    refreshList();
                }
            };
        });
    };

    wrapper.innerHTML = `
        <h2>${i18n.t('settings_btn_configure_rating')}</h2>
                <div id="field-list" style="margin: 20px 0;"></div>

                <div style="border-top:1px solid #333; padding-top:20px;">
                    <h3>${i18n.t('settings_add_field')}</h3>
                    <div class="form-group">
                        <input type="text" id="new-label" class="form-input" placeholder="${i18n.t('settings_field_name')}">
                    </div>
                    <div class="form-group">
                        <select id="new-type" class="form-select">
                            <option value="range">${i18n.t('settings_type_range')}</option>
                            <option value="checkbox">${i18n.t('settings_type_checkbox')}</option>
                            <option value="textarea">${i18n.t('settings_type_textarea')}</option>
                        </select>
                    </div>
                    <button id="add-field" class="btn-primary" style="background:var(--bg-card); border:1px solid var(--accent-gold); color:var(--accent-gold);">+ ${i18n.t('settings_btn_add')}</button>
                </div>

                <button id="save-template" class="btn-primary" style="margin-top:20px;">${i18n.t('btn_save')}</button>
                <button id="reset-template" class="form-input" style="margin-top:10px; background:none; border:none; color:red;">${i18n.t('btn_reset_default')}</button>
    `;

    setTimeout(refreshList, 0);

    wrapper.querySelector('#add-field').onclick = () => {
        const label = wrapper.querySelector('#new-label').value;
        const type = wrapper.querySelector('#new-type').value;
        if (label) {
            const id = label.toLowerCase().replace(/[^a-z0-9]/g, '_');
            const field = { id, label, type };
            if (type === 'range') { field.min = 0; field.max = 10; field.step = 1; }
            template.push(field);
            refreshList();
            wrapper.querySelector('#new-label').value = '';
        }
    };

    wrapper.querySelector('#save-template').onclick = () => {
        Storage.saveRatingTemplate(template);
        Storage.savePreference('activePreset', 'custom');
        closeModal();
        showToast(i18n.t('toast_config_saved'));
    };

    wrapper.querySelector('#reset-template').onclick = async () => {
        if (await showConfirmModal(i18n.t('modal_confirm_default_fields'), { danger: false })) {
            Storage.resetRatingTemplate();
            closeModal();
            showToast(i18n.t('toast_reset_success'));
        }
    };

    openModal(wrapper);
}

function renderLegalPage(type) {
    const wrapper = document.createElement('div');
    wrapper.className = 'modal-dialog legal-dialog';
    wrapper.style.maxWidth = '520px';

    const title = i18n.t(`legal_${type}_title`);
    const content = i18n.t(`legal_${type}_content`);

    wrapper.innerHTML = `
        <div class="legal-header">
            <h2>${title}</h2>
            <div class="legal-title-underline"></div>
        </div>
        <div class="legal-body" style="text-align:left; font-size:0.86rem; line-height:1.55; color:#ccc; max-height:65vh; overflow-y:auto; padding:4px 2px;">
            <div>${content}</div>
        </div>
        <div class="legal-actions" style="margin-top:16px;">
            <button id="btn-close-legal" class="btn-outline">${i18n.t('btn_close') || 'Fermer'}</button>
        </div>
    `;

    wrapper.querySelector('#btn-close-legal').onclick = () => closeModal();
    openModal(wrapper);
}

export function checkPatchnotes() {
    const lastSeen = Storage.getRawItem('beerdex_last_seen_version');
    if (lastSeen !== CURRENT_VERSION) {
        const settingsNav = document.querySelector('.nav-item[data-view="settings"]');
        if (settingsNav && !settingsNav.querySelector('.notification-dot')) {
            const dot = document.createElement('span');
            dot.className = 'notification-dot';
            settingsNav.appendChild(dot);
        }
    }
}

export function markPatchnotesSeen() {
    Storage.setRawItem('beerdex_last_seen_version', CURRENT_VERSION);
    const dot = document.querySelector('.nav-item[data-view="settings"] .notification-dot');
    if (dot) dot.remove();
}

export function renderPatchnotesSection() {
    const lastSeen = Storage.getRawItem('beerdex_last_seen_version');
    const isNew = lastSeen !== CURRENT_VERSION;

    const versionList = i18n.t('patchnote_versions').split(',');

    let html = '';
    versionList.forEach(version => {
        const isCurrentNew = (version === CURRENT_VERSION && isNew);
        const date = i18n.t(`patchnote_${version}_date`);
        const title = i18n.t(`patchnote_${version}_title`);

        const items = [];
        let i = 1;
        while (true) {
            const itemKey = `patchnote_${version}_item_${i}`;
            const translated = i18n.t(itemKey);
            if (translated === itemKey) break;
            items.push(translated);
            i++;
        }

        html += `
            <div class="patchnote-section" id="patchnote-${version}" ${isCurrentNew ? 'data-new="true"' : ''}>
                <div class="version-badge">
                    ${isCurrentNew ? '🆕 ' : ''}v${version} — ${date}
                </div>
                <h4 style="color:var(--text-primary); margin-bottom:10px; font-size:0.95rem;">${title}</h4>
                ${items.map(item => {
                    const chars = Array.from(item.trim());
                    const isEmoji = chars[0] && chars[0].match(/[^a-zA-Z0-9\s]/);
                    const icon = isEmoji ? chars[0] : '✨';
                    const text = isEmoji ? chars.slice(1).join('').trim() : item.trim();
                    return `
                        <div class="patchnote-item">
                            <span class="pn-icon">${icon}</span>
                            <span>${text}</span>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
    });

    return html;
}

function _restoreSettingsConditionalVisibility(container) {
    if (!container) return;
    const bacEnabled = Storage.getPreference('bac_enabled', true);
    const bacGroup = container.querySelector('#bac-settings-group');
    if (bacGroup) bacGroup.style.display = bacEnabled ? 'block' : 'none';

    const hideWg = Storage.getPreference('bac_hide_weight_gender', false);
    const wgRow = container.querySelector('#bac-weight-gender-row');
    if (wgRow) wgRow.style.display = hideWg ? 'none' : 'flex';

    const partyEnabled = Storage.getPreference('feat_beermatch_enabled', true);
    container.querySelectorAll('.party-sub-row').forEach(r => {
        r.style.display = partyEnabled ? 'flex' : 'none';
    });
}

function _applyOneAtATimeAccordion(container, targetGroup) {
    if (!container) return;
    container.querySelectorAll('.settings-accordion').forEach(section => {
        const isOpen = targetGroup !== null && section.dataset.group === targetGroup;
        section.classList.toggle('is-open', isOpen);
        const header = section.querySelector('.settings-accordion-header');
        if (header) header.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    });
}

export function renderSettings(allBeers, userData, container, isDiscovery = false, discoveryCallback = null) {
    const perfMode = Storage.getPreference('perf_mode', 'auto');
    const isLowEndActive = document.body.classList.contains('perf-low-end');
    const detectedLow = typeof window.detectLowEndDevice === 'function' ? window.detectLowEndDevice() : false;
    const rustEnabled = Storage.getPreference('feat_rust_enabled', true);
    const rustAvail = Boolean(rustEnabled && window.BeerdexRust && window.BeerdexRust.isAvailable());
    const partyEnabled = Storage.getPreference('feat_beermatch_enabled', true);
    const bacEnabled = Storage.getPreference('bac_enabled', true);
    const currentPreset = Theme.getActivePreset();
    const currentColors = Theme.getActiveColors();
    const savedMapScope = Storage.getDefaultMapScope();

    const makeAccordion = (groupId, icon, title, subtitle, innerHtml) => {
        const isOpen = _activeSettingsGroup === groupId;
        return `
            <section class="settings-accordion ${isOpen ? 'is-open' : ''}" data-group="${groupId}">
                <button type="button" class="settings-accordion-header" aria-expanded="${isOpen ? 'true' : 'false'}" aria-controls="settings-panel-${groupId}">
                    <span class="settings-acc-icon" aria-hidden="true">${icon}</span>
                    <span class="settings-acc-meta">
                        <span class="settings-acc-title">${title}</span>
                        <span class="settings-acc-subtitle">${subtitle}</span>
                    </span>
                    <svg class="settings-acc-chevron" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                        <polyline points="6 9 12 15 18 9"></polyline>
                    </svg>
                </button>
                <div class="settings-accordion-body" id="settings-panel-${groupId}">
                    <div class="settings-accordion-inner">
                        ${innerHtml}
                    </div>
                </div>
            </section>
        `;
    };

    const appearanceHtml = `
        <div class="setting-row" data-keywords="langue language english français francais">
            <div class="setting-info">
                <span class="setting-title" data-i18n="settings_language">Langue</span>
                <span class="setting-desc" data-i18n="settings_language_desc">Choisir la langue d'affichage</span>
            </div>
            <div class="setting-action">
                <select id="select-language" class="form-select">
                    <option value="fr" ${Storage.getPreference('app_language', 'fr') === 'fr' ? 'selected' : ''}>Français</option>
                    <option value="en" ${Storage.getPreference('app_language', 'fr') === 'en' ? 'selected' : ''}>English</option>
                </select>
            </div>
        </div>

        <div class="setting-row setting-row--stack" data-keywords="thème theme couleurs color preset custom palette dark gold cyberpunk forest ocean sunset">
            <div class="setting-info">
                <span class="setting-title">${i18n.t('settings_theme_preset') || 'Thème & Couleurs'}</span>
                <span class="setting-desc" data-i18n="settings_theme_desc">Personnalisez l'apparence de l'application</span>
            </div>
            <div id="theme-presets-grid" class="theme-presets-grid">
                ${Object.entries(Theme.THEME_PRESETS).map(([key, preset]) => {
                    const isActive = currentPreset === key;
                    return `<button type="button" class="theme-preset-btn ${isActive ? 'is-active' : ''}" data-preset="${key}">
                        <span class="theme-preset-swatch" style="background:${preset.colors['--accent-gold']};"></span>
                        <span class="theme-preset-emoji">${preset.emoji}</span>
                        <span>${preset.name}</span>
                    </button>`;
                }).join('')}
                <button type="button" class="theme-preset-btn ${currentPreset === 'custom' ? 'is-active' : ''}" data-preset="custom">
                    <span class="theme-preset-swatch" style="background:conic-gradient(#ff00cc,#ffc000,#00bcd4,#ff00cc);"></span>
                    <span class="theme-preset-emoji">✏️</span>
                    <span>Custom</span>
                </button>
            </div>

            <div id="theme-custom-colors" class="theme-custom-colors" style="display:${currentPreset === 'custom' ? 'block' : 'none'};">
                <strong class="theme-custom-title">${i18n.t('settings_theme_colors') || 'Couleurs personnalisées'}</strong>
                <div class="theme-custom-grid">
                    ${Theme.THEME_VARS.map(v => `
                        <label class="theme-color-chip">
                            <input type="color" class="theme-color-input" data-var="${v.key}" value="${currentColors[v.key] || v.default}">
                            <span>${i18n.t(v.label) || v.key.replace('--', '')}</span>
                        </label>
                    `).join('')}
                </div>
            </div>

            <div class="settings-btn-row">
                <button type="button" id="btn-theme-export" class="setting-btn">📤 ${i18n.t('settings_theme_export') || 'Exporter'}</button>
                <button type="button" id="btn-theme-import" class="setting-btn">📥 ${i18n.t('settings_theme_import') || 'Importer'}</button>
                <button type="button" id="btn-theme-reset" class="setting-btn danger">↩️ ${i18n.t('theme_btn_reset') || 'Reset'}</button>
            </div>
        </div>

        <div class="setting-row" data-keywords="police font écriture ecriture text outfit inter roboto">
            <div class="setting-info">
                <span class="setting-title">${i18n.t('settings_font_title') || "Police d'écriture"}</span>
                <span class="setting-desc" data-i18n="settings_font_desc">Choisissez la police d'écriture de l'application</span>
            </div>
            <div class="setting-action">
                <select id="select-font-family" class="form-select">
                    ${Object.keys(Theme.FONTS).map(fontKey => `<option value="${fontKey}" ${Theme.getActiveFont() === fontKey ? 'selected' : ''}>${Theme.FONTS[fontKey].label}</option>`).join('')}
                </select>
            </div>
        </div>

        <div class="setting-row" data-keywords="musée musee museum 3d expo rideau">
            <div class="setting-info">
                <span class="setting-title" data-i18n="settings_museum_title">${i18n.t('settings_museum_title')}</span>
                <span class="setting-desc" data-i18n="settings_museum_desc">${i18n.t('settings_museum_desc')}</span>
            </div>
            <div class="setting-action">
                <label class="switch">
                    <input type="checkbox" class="toggle-switch" id="toggle-museum" ${Storage.getPreference('museumThemeEnabled', false) ? 'checked' : ''}>
                    <span class="slider round"></span>
                </label>
            </div>
        </div>
    `;

    const perfHtml = `
        <div class="setting-row" data-keywords="performance lag fps fluidité fluidite low-end batterie economiseur animation blur">
            <div class="setting-info">
                <span class="setting-title">${i18n.t('settings_perf_mode_title') || 'Mode Performance (Low-End)'}</span>
                <span class="setting-desc" id="settings-perf-status">
                    ${isLowEndActive
                        ? '⚡ Mode fluide actif : effets de flou, animations infinies et surcharges GPU réduits.'
                        : '✨ Effets visuels complets actifs.'}
                    ${perfMode === 'auto' ? ` (Auto : ${detectedLow ? 'appareil modeste détecté' : 'appareil standard/rapide'})` : ''}
                </span>
            </div>
            <div class="setting-action">
                <select id="select-perf-mode" class="form-select">
                    <option value="auto" ${perfMode === 'auto' ? 'selected' : ''}>Auto</option>
                    <option value="low" ${perfMode === 'low' ? 'selected' : ''}>Activé (Fluide)</option>
                    <option value="high" ${perfMode === 'high' ? 'selected' : ''}>Désactivé (FX Max)</option>
                </select>
            </div>
        </div>

        <div class="setting-row" data-keywords="animations une seule fois once rareté rarete perf">
            <div class="setting-info">
                <span class="setting-title">${i18n.t('settings_anim_once_title')}</span>
                <span class="setting-desc" data-i18n="settings_anim_once_desc">L'animation de rareté ne joue que la première fois</span>
            </div>
            <div class="setting-action">
                <label class="switch">
                    <input type="checkbox" class="toggle-switch" id="check-anim-once" ${Storage.getPreference('anim_only_once', false) ? 'checked' : ''}>
                    <span class="slider round"></span>
                </label>
            </div>
        </div>

        <div class="setting-row" data-keywords="rust wasm webassembly performance moteur core acceleration">
            <div class="setting-info">
                <span class="setting-title"><img src="icons/rust.png" alt="Rust" style="width:18px; height:18px; vertical-align:middle; margin-right:6px;"> Moteur Haute Performance Rust</span>
                <span class="setting-desc" id="settings-rust-status">Moteur de calcul natif WebAssembly (v${CURRENT_VERSION}) : ${rustAvail ? '⚡ Actif (Accélération matérielle)' : (rustEnabled ? 'Prêt / Fallback JS' : 'Inactif (Mode JavaScript)')}</span>
            </div>
            <div class="setting-action">
                <input type="checkbox" id="toggle-feat-rust" class="toggle-switch" ${rustEnabled ? 'checked' : ''}>
            </div>
        </div>
    `;

    const experienceHtml = `
        <div class="setting-row" data-keywords="découverte decouverte discovery exploration pokedex">
            <div class="setting-info">
                <span class="setting-title" data-i18n="settings_discovery_title">${i18n.t('settings_discovery_title')}</span>
                <span class="setting-desc" data-i18n="settings_discovery_desc">${i18n.t('settings_discovery_desc')}</span>
            </div>
            <div class="setting-action">
                <label class="switch">
                    <input type="checkbox" class="toggle-switch" id="toggle-discovery" ${isDiscovery ? 'checked' : ''}>
                    <span class="slider round"></span>
                </label>
            </div>
        </div>

        <div class="setting-row" data-keywords="rareté rarete spoil reveal rarity">
            <div class="setting-info">
                <span class="setting-title">${i18n.t('settings_reveal_rarity_title')}</span>
                <span class="setting-desc" data-i18n="settings_reveal_rarity_desc">Cache la rareté des bières non goûtées</span>
            </div>
            <div class="setting-action">
                <label class="switch">
                    <input type="checkbox" class="toggle-switch" id="check-reveal-rarity" ${Storage.getPreference('revealRarity', false) ? 'checked' : ''}>
                    <span class="slider round"></span>
                </label>
            </div>
        </div>

        <div class="setting-row setting-row--stack" data-keywords="cartes stats overlay volume compteur count card brewbrother">
            <div class="setting-info">
                <span class="setting-title" style="color:var(--accent-gold);">${i18n.t('settings_card_stats_title')}</span>
            </div>
            <div class="setting-sublist">
                <div class="setting-subitem">
                    <div>
                        <span class="setting-title">${i18n.t('settings_card_stats_count_title')}</span>
                        <span class="setting-desc">${i18n.t('settings_card_stats_count_desc')}</span>
                    </div>
                    <label class="switch">
                        <input type="checkbox" class="toggle-switch" id="toggle-card-stat-count" ${Storage.getPreference('card_stat_count', false) ? 'checked' : ''}>
                        <span class="slider round"></span>
                    </label>
                </div>
                <div class="setting-subitem">
                    <div>
                        <span class="setting-title">${i18n.t('settings_card_stats_volume_title')}</span>
                        <span class="setting-desc">${i18n.t('settings_card_stats_volume_desc')}</span>
                    </div>
                    <label class="switch">
                        <input type="checkbox" class="toggle-switch" id="toggle-card-stat-volume" ${Storage.getPreference('card_stat_volume', false) ? 'checked' : ''}>
                        <span class="slider round"></span>
                    </label>
                </div>
                <div class="setting-subitem">
                    <div>
                        <span class="setting-title">${i18n.t('settings_card_bb_pct_title') || 'Match BrewBrother (%)'}</span>
                        <span class="setting-desc">${i18n.t('settings_card_bb_pct_desc') || 'Afficher le pourcentage de match sur la carte'}</span>
                    </div>
                    <label class="switch">
                        <input type="checkbox" class="toggle-switch" id="toggle-card-brewbrother" ${Storage.getPreference('card_brewbrother_pct', false) ? 'checked' : ''}>
                        <span class="slider round"></span>
                    </label>
                </div>
            </div>
        </div>

        <div class="setting-row setting-row--stack" data-keywords="grille notation rating note template critère critere preset tristan noah">
            <div class="setting-info">
                <span class="setting-title" data-i18n="settings_rating_grid_title">${i18n.t('settings_rating_grid_title') || 'Grille de notation'}</span>
                <span class="setting-desc" data-i18n="settings_rating_grid_desc">${i18n.t('settings_rating_grid_desc') || 'Personnalisez les critères de notation de vos bières.'}</span>
            </div>
            <button type="button" id="btn-template" class="setting-btn">
                ${i18n.t('settings_btn_configure_rating')}
            </button>
            <div class="settings-btn-row">
                <button type="button" id="btn-preset-default" class="setting-btn ${Storage.getPreference('activePreset') === 'default' ? 'primary' : ''}">${i18n.t('preset_default')}</button>
                <button type="button" id="btn-preset-tristan" class="setting-btn ${Storage.getPreference('activePreset') === 'tristan' ? 'primary' : ''}">${i18n.t('preset_tristan')}</button>
                <button type="button" id="btn-preset-noah" class="setting-btn ${Storage.getPreference('activePreset') === 'noah' ? 'primary' : ''}">${i18n.t('preset_noah')}</button>
            </div>
        </div>

        <div class="setting-row" data-keywords="son audio sound effets">
            <div class="setting-info">
                <span class="setting-title" data-i18n="settings_sound_title">${i18n.t('settings_sound_title')}</span>
                <span class="setting-desc" data-i18n="settings_sound_desc">${i18n.t('settings_sound_desc')}</span>
            </div>
            <div class="setting-action">
                <label class="switch">
                    <input type="checkbox" class="toggle-switch" id="toggle-sound" ${Storage.getPreference('soundEnabled', true) ? 'checked' : ''}>
                    <span class="slider round"></span>
                </label>
            </div>
        </div>

        <div class="setting-row" data-keywords="haptique vibrations retour haptics">
            <div class="setting-info">
                <span class="setting-title" data-i18n="settings_haptics_title">${i18n.t('settings_haptics_title')}</span>
                <span class="setting-desc" data-i18n="settings_haptics_desc">${i18n.t('settings_haptics_desc')}</span>
            </div>
            <div class="setting-action">
                <label class="switch">
                    <input type="checkbox" class="toggle-switch" id="toggle-haptics" ${Storage.getPreference('hapticsEnabled', true) ? 'checked' : ''}>
                    <span class="slider round"></span>
                </label>
            </div>
        </div>
    `;

    const bacHtml = `
        <div class="setting-row" data-keywords="bac alcoolémie alcoolemie sang blood alcohol calcul">
            <div class="setting-info">
                <span class="setting-title" data-i18n="settings_bac_enable_title">${i18n.t('settings_bac_enable_title')}</span>
                <span class="setting-desc" data-i18n="settings_bac_enable_desc">${i18n.t('settings_bac_enable_desc')}</span>
            </div>
            <div class="setting-action">
                <label class="switch">
                    <input type="checkbox" class="toggle-switch" id="toggle-bac-enabled" ${bacEnabled ? 'checked' : ''}>
                    <span class="slider round"></span>
                </label>
            </div>
        </div>

        <div id="bac-settings-group" class="settings-subgroup" style="display:${bacEnabled ? 'block' : 'none'};">
            <div class="setting-row setting-row--split" id="bac-weight-gender-row" style="display:${Storage.getPreference('bac_hide_weight_gender', false) ? 'none' : 'flex'};" data-keywords="poids genre weight gender bac sexe">
                <div class="setting-split-col">
                    <span class="setting-desc" data-i18n="settings_weight_label">${i18n.t('settings_weight_label')}</span>
                    <input type="number" id="input-bac-weight" class="form-input" value="${Storage.getPreference('bac_weight', '')}" placeholder="ex: 70" min="30" max="200">
                </div>
                <div class="setting-split-col">
                    <span class="setting-desc" data-i18n="settings_gender_label">${i18n.t('settings_gender_label')}</span>
                    <select id="select-bac-gender" class="form-select">
                        <option value="" ${!Storage.getPreference('bac_gender', null) ? 'selected' : ''}>${i18n.t('settings_gender_none')}</option>
                        <option value="M" ${Storage.getPreference('bac_gender', null) === 'M' ? 'selected' : ''}>${i18n.t('gender_male')}</option>
                        <option value="F" ${Storage.getPreference('bac_gender', null) === 'F' ? 'selected' : ''}>${i18n.t('gender_female')}</option>
                        <option value="X" ${Storage.getPreference('bac_gender', null) === 'X' ? 'selected' : ''}>${i18n.t('gender_other')}</option>
                    </select>
                </div>
            </div>

            <div class="setting-row" data-keywords="cacher poids genre hide weight gender bac confidentialite">
                <div class="setting-info">
                    <span class="setting-title">${i18n.t('settings_bac_hide_wg_title')}</span>
                </div>
                <div class="setting-action">
                    <label class="switch">
                        <input type="checkbox" class="toggle-switch" id="toggle-bac-hide-wg" ${Storage.getPreference('bac_hide_weight_gender', false) ? 'checked' : ''}>
                        <span class="slider round"></span>
                    </label>
                </div>
            </div>

            <div class="setting-row" data-keywords="pays rules bac law limite conduite">
                <div class="setting-info">
                    <span class="setting-title">${i18n.t('settings_bac_country')}</span>
                    <span class="setting-desc">${i18n.t('settings_bac_country_desc')}</span>
                </div>
                <div class="setting-action">
                    <select id="select-bac-country" class="form-select">
                        <option value="BE" ${Storage.getPreference('bac_country', 'BE') === 'BE' ? 'selected' : ''}>🇧🇪 BE</option>
                        <option value="FR" ${Storage.getPreference('bac_country', 'BE') === 'FR' ? 'selected' : ''}>🇫🇷 FR</option>
                        <option value="DE" ${Storage.getPreference('bac_country', 'BE') === 'DE' ? 'selected' : ''}>🇩🇪 DE</option>
                        <option value="NL" ${Storage.getPreference('bac_country', 'BE') === 'NL' ? 'selected' : ''}>🇳🇱 NL</option>
                        <option value="IT" ${Storage.getPreference('bac_country', 'BE') === 'IT' ? 'selected' : ''}>🇮🇹 IT</option>
                        <option value="CO" ${Storage.getPreference('bac_country', 'BE') === 'CO' ? 'selected' : ''}>🇨🇴 CO</option>
                        <option value="US" ${Storage.getPreference('bac_country', 'BE') === 'US' ? 'selected' : ''}>🇺🇸 US</option>
                        <option value="CN" ${Storage.getPreference('bac_country', 'BE') === 'CN' ? 'selected' : ''}>🇨🇳 CN</option>
                        <option value="JP" ${Storage.getPreference('bac_country', 'BE') === 'JP' ? 'selected' : ''}>🇯🇵 JP</option>
                        <option value="KR" ${Storage.getPreference('bac_country', 'BE') === 'KR' ? 'selected' : ''}>🇰🇷 KR</option>
                    </select>
                </div>
            </div>

            <div class="setting-row setting-row--split" data-keywords="durée duree véhicule vehicule duration vehicle bac conduite velo moto voiture">
                <div class="setting-split-col">
                    <span class="setting-desc">${i18n.t('settings_bac_duration')}</span>
                    <select id="select-bac-duration" class="form-select">
                        <option value="0" ${Storage.getPreference('bac_drink_duration', '0') === '0' ? 'selected' : ''}>${i18n.t('settings_bac_instant')}</option>
                        <option value="15" ${Storage.getPreference('bac_drink_duration', '0') === '15' ? 'selected' : ''}>15 min</option>
                        <option value="30" ${Storage.getPreference('bac_drink_duration', '0') === '30' ? 'selected' : ''}>30 min</option>
                        <option value="45" ${Storage.getPreference('bac_drink_duration', '0') === '45' ? 'selected' : ''}>45 min</option>
                        <option value="60" ${Storage.getPreference('bac_drink_duration', '0') === '60' ? 'selected' : ''}>1h</option>
                    </select>
                </div>
                <div class="setting-split-col">
                    <span class="setting-desc">${i18n.t('settings_bac_vehicle')}</span>
                    <select id="select-bac-vehicle" class="form-select">
                        <option value="voiture" ${Storage.getPreference('bac_vehicle', 'voiture') === 'voiture' ? 'selected' : ''}>🚗</option>
                        <option value="moto" ${Storage.getPreference('bac_vehicle', 'voiture') === 'moto' ? 'selected' : ''}>🏍️</option>
                        <option value="velo" ${Storage.getPreference('bac_vehicle', 'voiture') === 'velo' ? 'selected' : ''}>🚲</option>
                        <option value="pieton" ${Storage.getPreference('bac_vehicle', 'voiture') === 'pieton' ? 'selected' : ''}>🚶</option>
                        <option value="gamer" ${Storage.getPreference('bac_vehicle', 'voiture') === 'gamer' ? 'selected' : ''}>🎮</option>
                        <option value="ne_conduit_pas" ${Storage.getPreference('bac_vehicle', 'voiture') === 'ne_conduit_pas' ? 'selected' : ''}>🚫</option>
                    </select>
                </div>
            </div>

            <div class="setting-row setting-row--stack" data-keywords="manuel home accueil widget bac show manual">
                <div class="setting-sublist">
                    <div class="setting-subitem">
                        <div>
                            <span class="setting-title">${i18n.t('settings_show_home_title')}</span>
                            <span class="setting-desc" data-i18n="settings_show_home_desc">Permet d'ajouter un widget sur votre écran d'accueil</span>
                        </div>
                        <label class="switch">
                            <input type="checkbox" class="toggle-switch" id="toggle-bac-home" ${Storage.getPreference('bac_show_home', true) ? 'checked' : ''}>
                            <span class="slider round"></span>
                        </label>
                    </div>
                    <div class="setting-subitem">
                        <div>
                            <span class="setting-title">${i18n.t('settings_manual_only_title')}</span>
                            <span class="setting-desc" data-i18n="settings_manual_only_desc">Seules les bières ajoutées manuellement impactent l'alcoolémie</span>
                        </div>
                        <label class="switch">
                            <input type="checkbox" class="toggle-switch" id="toggle-bac-manual" ${Storage.getPreference('bac_manual_only', false) ? 'checked' : ''}>
                            <span class="slider round"></span>
                        </label>
                    </div>
                </div>
            </div>

            <div class="setting-row setting-row--stack" data-keywords="historique calendrier série serie history calendar streak bac show">
                <div class="setting-sublist">
                    <div class="setting-subitem">
                        <div>
                            <span class="setting-title">${i18n.t('settings_bac_show_history')}</span>
                            <span class="setting-desc" data-i18n="settings_bac_show_history_desc">Affiche vos récentes dégustations</span>
                        </div>
                        <label class="switch">
                            <input type="checkbox" class="toggle-switch" id="toggle-show-history" ${Storage.getPreference('bac_show_history', true) ? 'checked' : ''}>
                            <span class="slider round"></span>
                        </label>
                    </div>
                    <div class="setting-subitem">
                        <div>
                            <span class="setting-title">${i18n.t('settings_bac_show_calendar')}</span>
                            <span class="setting-desc" data-i18n="settings_bac_show_calendar_desc">Affiche vos jours de consommation en calendrier</span>
                        </div>
                        <label class="switch">
                            <input type="checkbox" class="toggle-switch" id="toggle-show-calendar" ${Storage.getPreference('bac_show_calendar', true) ? 'checked' : ''}>
                            <span class="slider round"></span>
                        </label>
                    </div>
                    <div class="setting-subitem">
                        <div>
                            <span class="setting-title">${i18n.t('settings_bac_show_streak')}</span>
                            <span class="setting-desc" data-i18n="settings_bac_show_streak_desc">Affiche le suivi de série quotidienne</span>
                        </div>
                        <label class="switch">
                            <input type="checkbox" class="toggle-switch" id="toggle-show-streak" ${Storage.getPreference('bac_show_streak', true) ? 'checked' : ''}>
                            <span class="slider round"></span>
                        </label>
                    </div>
                </div>
            </div>
        </div>
    `;

    const modulesHtml = `
        <div class="setting-row" data-keywords="carte map localisation region">
            <div class="setting-info">
                <span class="setting-title">${i18n.t('settings_toggle_map') || 'Afficher la carte (Map)'}</span>
                <span class="setting-desc" data-i18n="settings_map_desc">Affiche une carte interactive de vos dégustations</span>
            </div>
            <div class="setting-action">
                <label class="switch">
                    <input type="checkbox" class="toggle-switch" id="toggle-feat-map" ${Storage.getPreference('feat_map_enabled', true) ? 'checked' : ''}>
                    <span class="slider round"></span>
                </label>
            </div>
        </div>

        <div class="setting-row" data-keywords="carte défaut defaut pays default map country">
            <div class="setting-info">
                <span class="setting-title">${i18n.t('settings_map_default')}</span>
                <span class="setting-desc">${i18n.t('settings_map_default_desc')}</span>
            </div>
            <div class="setting-action">
                <select id="select-default-map" class="form-select">
                    <option value="" ${!savedMapScope ? 'selected' : ''}>${i18n.t('settings_map_auto')}</option>
                    <option value="be" ${savedMapScope === 'be' ? 'selected' : ''}>🇧🇪 ${i18n.t('country_be')}</option>
                    <option value="fr" ${savedMapScope === 'fr' ? 'selected' : ''}>🇫🇷 ${i18n.t('country_fr')}</option>
                    <option value="de" ${savedMapScope === 'de' ? 'selected' : ''}>🇩🇪 ${i18n.t('country_de')}</option>
                    <option value="nl" ${savedMapScope === 'nl' ? 'selected' : ''}>🇳🇱 ${i18n.t('country_nl')}</option>
                    <option value="us" ${savedMapScope === 'us' ? 'selected' : ''}>🇺🇸 ${i18n.t('country_us')}</option>
                    <option value="co" ${savedMapScope === 'co' ? 'selected' : ''}>🇨🇴 ${i18n.t('country_co')}</option>
                    <option value="kr" ${savedMapScope === 'kr' ? 'selected' : ''}>🇰🇷 ${i18n.t('country_kr')}</option>
                    <option value="jp" ${savedMapScope === 'jp' ? 'selected' : ''}>🇯🇵 ${i18n.t('country_jp')}</option>
                    <option value="cn" ${savedMapScope === 'cn' ? 'selected' : ''}>🇨🇳 ${i18n.t('country_cn')}</option>
                    <option value="eu" ${savedMapScope === 'eu' ? 'selected' : ''}>🇪🇺 ${i18n.t('map_scope_eu')}</option>
                    <option value="wo" ${savedMapScope === 'wo' ? 'selected' : ''}>🌍 ${i18n.t('map_scope_wo')}</option>
                </select>
            </div>
        </div>

        <div class="setting-row" data-keywords="brewbrother recommendation recommandations ia ai gout">
            <div class="setting-info">
                <span class="setting-title">${i18n.t('settings_toggle_brewbrother') || 'Activer BrewBrother'}</span>
                <span class="setting-desc">${i18n.t('settings_brewbrother_desc') || 'Assistant IA de recommandations et profil de goût'}</span>
            </div>
            <div class="setting-action">
                <label class="switch">
                    <input type="checkbox" class="toggle-switch" id="toggle-feat-brewbrother" ${Storage.getPreference('feat_brewbrother_enabled', true) ? 'checked' : ''}>
                    <span class="slider round"></span>
                </label>
            </div>
        </div>

        <div class="setting-row" data-keywords="brewbrother tone ton ia recommandation style">
            <div class="setting-info">
                <span class="setting-title" data-i18n="settings_bb_tone_title">${i18n.t('settings_bb_tone_title') || 'Ton BrewBrother'}</span>
                <span class="setting-desc" data-i18n="settings_bb_tone_desc">${i18n.t('settings_bb_tone_desc') || 'Choisissez le style des descriptions'}</span>
            </div>
            <div class="setting-action">
                <select id="select-bb-tone" class="form-select">
                    <option value="brewbrother" ${Storage.getPreference('brewbrother_tone', 'brewbrother') === 'brewbrother' ? 'selected' : ''}>${i18n.t('settings_bb_tone_default') || 'BrewBrother'}</option>
                    <option value="friend" ${Storage.getPreference('brewbrother_tone', 'brewbrother') === 'friend' ? 'selected' : ''}>${i18n.t('settings_bb_tone_friend') || 'Ami'}</option>
                    <option value="neutral" ${Storage.getPreference('brewbrother_tone', 'brewbrother') === 'neutral' ? 'selected' : ''}>${i18n.t('settings_bb_tone_neutral') || 'Neutre'}</option>
                </select>
            </div>
        </div>

        <div class="setting-row" data-keywords="beer party dégustation salon direct p2p beermatch">
            <div class="setting-info">
                <span class="setting-title">${i18n.t('settings_toggle_beermatch') || 'Beer Party'}</span>
                <span class="setting-desc" data-i18n="settings_beermatch_desc">${i18n.t('settings_beermatch_desc') || 'Salons de dégustation en direct, statistiques collectives et partage P2P'}</span>
            </div>
            <div class="setting-action">
                <label class="switch">
                    <input type="checkbox" class="toggle-switch" id="toggle-feat-beermatch" ${partyEnabled ? 'checked' : ''}>
                    <span class="slider round"></span>
                </label>
            </div>
        </div>

        <div class="setting-row party-sub-row" style="display:${partyEnabled ? 'flex' : 'none'};" id="party-pseudo-row" data-keywords="party pseudo nom animal">
            <div class="setting-info">
                <span class="setting-title">Pseudo Party</span>
                <span class="setting-desc">Votre nom affiché dans la salle.</span>
            </div>
            <div class="setting-action" style="gap:6px;">
                <input type="text" id="input-party-pseudo" class="form-input" placeholder="Anonyme" value="${Storage.getPreference('beermatch_pseudo', '')}" style="width:120px; font-size:0.8rem; text-align:right; padding:8px;">
                <button type="button" id="btn-settings-dice-pseudo" class="beerparty-pseudo-edit-btn" title="Générer un animal aléatoire">🎲</button>
            </div>
        </div>

        <div class="setting-row party-sub-row" style="display:${partyEnabled ? 'flex' : 'none'};" id="party-privacy-total-row" data-keywords="party partager volumes total">
            <div class="setting-info">
                <span class="setting-title">${i18n.t('settings_party_share_total') || 'Partager volumes & total bu'}</span>
                <span class="setting-desc" data-i18n="settings_party_share_total_desc">${i18n.t('settings_party_share_total_desc') || 'Partager vos verres, litres et alcool pur pour le cumul du groupe.'}</span>
            </div>
            <div class="setting-action">
                <label class="switch">
                    <input type="checkbox" class="toggle-switch" id="toggle-party-share-total" ${Storage.getPreference('beermatch_share_total', true) ? 'checked' : ''}>
                    <span class="slider round"></span>
                </label>
            </div>
        </div>

        <div class="setting-row party-sub-row" style="display:${partyEnabled ? 'flex' : 'none'};" id="party-privacy-catalog-row" data-keywords="party partager bières commun">
            <div class="setting-info">
                <span class="setting-title">${i18n.t('settings_party_share_catalog') || 'Partager bières en commun'}</span>
                <span class="setting-desc" data-i18n="settings_party_share_catalog_desc">${i18n.t('settings_party_share_catalog_desc') || 'Comparer vos bières goûtées pour découvrir vos affinités.'}</span>
            </div>
            <div class="setting-action">
                <label class="switch">
                    <input type="checkbox" class="toggle-switch" id="toggle-party-share-catalog" ${Storage.getPreference('beermatch_share_catalog', true) ? 'checked' : ''}>
                    <span class="slider round"></span>
                </label>
            </div>
        </div>

        <div class="setting-row party-sub-row" style="display:${partyEnabled ? 'flex' : 'none'};" id="party-privacy-top-row" data-keywords="party partager favorites">
            <div class="setting-info">
                <span class="setting-title">${i18n.t('settings_party_share_top') || 'Partager bières favorites'}</span>
                <span class="setting-desc" data-i18n="settings_party_share_top_desc">${i18n.t('settings_party_share_top_desc') || 'Afficher votre bière préférée et participer à la bière reine du groupe.'}</span>
            </div>
            <div class="setting-action">
                <label class="switch">
                    <input type="checkbox" class="toggle-switch" id="toggle-party-share-top" ${Storage.getPreference('beermatch_share_top', true) ? 'checked' : ''}>
                    <span class="slider round"></span>
                </label>
            </div>
        </div>

        <div class="setting-row party-sub-row" style="display:${partyEnabled ? 'flex' : 'none'};" id="party-privacy-unique-row" data-keywords="party partager uniques explorateur">
            <div class="setting-info">
                <span class="setting-title">${i18n.t('settings_party_share_unique') || 'Partager bières uniques'}</span>
                <span class="setting-desc" data-i18n="settings_party_share_unique_desc">${i18n.t('settings_party_share_unique_desc') || 'Diffuser votre total de bières différentes (podium Explorateur).'}</span>
            </div>
            <div class="setting-action">
                <label class="switch">
                    <input type="checkbox" class="toggle-switch" id="toggle-party-share-unique" ${Storage.getPreference('beermatch_share_unique', true) ? 'checked' : ''}>
                    <span class="slider round"></span>
                </label>
            </div>
        </div>

        <div class="setting-row party-sub-row" style="display:${partyEnabled ? 'flex' : 'none'};" id="party-privacy-achievements-row" data-keywords="party partager trophées trophees badges">
            <div class="setting-info">
                <span class="setting-title">${i18n.t('settings_party_share_achievements') || 'Partager trophées & badges'}</span>
                <span class="setting-desc" data-i18n="settings_party_share_achievements_desc">${i18n.t('settings_party_share_achievements_desc') || 'Diffuser vos succès débloqués (podium Chasseur).'}</span>
            </div>
            <div class="setting-action">
                <label class="switch">
                    <input type="checkbox" class="toggle-switch" id="toggle-party-share-achievements" ${Storage.getPreference('beermatch_share_achievements', true) ? 'checked' : ''}>
                    <span class="slider round"></span>
                </label>
            </div>
        </div>

        <div class="setting-row" data-keywords="wrapped bilan spotify annee">
            <div class="setting-info">
                <span class="setting-title">${i18n.t('settings_toggle_wrapped') || 'Beerdex Wrapped'}</span>
                <span class="setting-desc" data-i18n="settings_wrapped_desc">Générez un bilan visuel annuel de vos dégustations</span>
            </div>
            <div class="setting-action">
                <label class="switch">
                    <input type="checkbox" class="toggle-switch" id="toggle-feat-wrapped" ${Storage.getPreference('feat_wrapped_enabled', true) ? 'checked' : ''}>
                    <span class="slider round"></span>
                </label>
            </div>
        </div>

        <div class="setting-row" data-keywords="équivalences equivalences alcool verres">
            <div class="setting-info">
                <span class="setting-title">${i18n.t('settings_toggle_equivalences') || 'Équivalences alcool'}</span>
                <span class="setting-desc" data-i18n="settings_equivalences_desc">Affiche l'équivalent en verres standards (vin, shots)</span>
            </div>
            <div class="setting-action">
                <label class="switch">
                    <input type="checkbox" class="toggle-switch" id="toggle-feat-equivalences" ${Storage.getPreference('feat_equivalences_enabled', true) ? 'checked' : ''}>
                    <span class="slider round"></span>
                </label>
            </div>
        </div>

        <div class="setting-row" data-keywords="rappels reminders notif doublons non notees">
            <div class="setting-info">
                <span class="setting-title">${i18n.t('settings_toggle_reminders') || 'Rappels (Notation & Duplications)'}</span>
                <span class="setting-desc" data-i18n="settings_reminders_desc">Notifications pour les bières non notées ou les doublons</span>
            </div>
            <div class="setting-action">
                <label class="switch">
                    <input type="checkbox" class="toggle-switch" id="toggle-feat-reminders" ${Storage.getPreference('feat_reminders_enabled', true) ? 'checked' : ''}>
                    <span class="slider round"></span>
                </label>
            </div>
        </div>
    `;

    const defaultStatsOrder = ['progression', 'equivalences', 'bac', 'streak', 'history', 'calendar', 'achievements', 'map', 'brewbrother'];
    let currentStatsOrder = Storage.getPreference('stats_order', defaultStatsOrder);
    if (currentStatsOrder.includes('donut')) {
        currentStatsOrder = [...defaultStatsOrder];
    } else {
        currentStatsOrder = [...currentStatsOrder];
        defaultStatsOrder.forEach(k => { if (!currentStatsOrder.includes(k)) currentStatsOrder.push(k); });
        currentStatsOrder = currentStatsOrder.filter(k => defaultStatsOrder.includes(k));
    }
    Storage.savePreference('stats_order', currentStatsOrder);

    const buildStatsOrderItemsHtml = (order) => {
        const labels = {
            'progression': i18n.t('stats_block_progression') || 'Progression',
            'bac': i18n.t('stats_block_bac') || "Taux d'alcool (BAC)",
            'streak': i18n.t('stats_block_streak') || 'Série (Streak)',
            'equivalences': i18n.t('stats_block_equivalences') || 'Équivalences',
            'history': i18n.t('stats_block_history') || 'Historique des consos',
            'calendar': i18n.t('stats_block_calendar') || 'Calendrier de dégustation',
            'achievements': i18n.t('stats_block_achievements') || 'Succès et Badges',
            'map': i18n.t('stats_block_map') || 'Carte de Dégustation',
            'brewbrother': i18n.t('stats_block_brewbrother') || 'Profil BrewBrother'
        };
        return order.map((key, index) => `
            <div class="stats-order-item" data-key="${key}">
                <span>${labels[key] || key}</span>
                <div class="stats-order-actions">
                    <button type="button" class="btn-stat-move-up setting-btn" data-index="${index}" ${index === 0 ? 'disabled' : ''}>↑</button>
                    <button type="button" class="btn-stat-move-down setting-btn" data-index="${index}" ${index === order.length - 1 ? 'disabled' : ''}>↓</button>
                </div>
            </div>
        `).join('');
    };

    const statsOrderHtml = `
        <div class="setting-row setting-row--stack" data-keywords="ordre tri stats order sort position">
            <div class="setting-info">
                <span class="setting-title">${i18n.t('settings_group_stats_order') || 'Ordre des Statistiques'}</span>
                <span class="setting-desc" data-i18n="settings_group_stats_order_desc">Personnalisez l'ordre d'affichage des blocs sur la page Stats</span>
            </div>
            <div id="stats-order-list" class="stats-order-list">
                ${buildStatsOrderItemsHtml(currentStatsOrder)}
            </div>
        </div>
    `;

    const dataHtml = `
        <div class="setting-row setting-row--stack" data-keywords="exporter importer données donnees json export import data save sauvegarde partage ota">
            <div class="setting-info">
                <span class="setting-title">${i18n.t('settings_group_data') || 'Gestion des données'}</span>
                <span class="setting-desc">${i18n.t('settings_data_desc')}</span>
            </div>
            <div class="settings-btn-row">
                <button type="button" id="btn-manage-export" class="setting-btn primary">📤 ${i18n.t('export_btn_submit')}</button>
                <button type="button" id="btn-manage-import" class="setting-btn">📥 ${i18n.t('import_title')}</button>
            </div>
            <button type="button" id="btn-manage-bulk-share" class="setting-btn accent-soft">📦 Partage Multiple (Bières perso)</button>
        </div>

        <div class="setting-row" data-keywords="nettoyer doublons deduplicate clean thanos">
            <div class="setting-info">
                <span class="setting-title">${i18n.t('settings_btn_dedup') || 'Nettoyer les doublons'}</span>
                <span class="setting-desc" data-i18n="settings_dedup_desc">Fusionner vos bières personnalisées avec les bières officielles</span>
            </div>
            <div class="setting-action">
                <button type="button" id="btn-deduplicate-db" class="setting-btn">🧹 ${i18n.t('btn_clean') || 'Nettoyer'}</button>
            </div>
        </div>

        <div class="setting-row" data-keywords="demander ajouter bière biere request beer">
            <div class="setting-info">
                <span class="setting-title">${i18n.t('request_beer_btn') || 'Demander une Bière'}</span>
                <span class="setting-desc" data-i18n="settings_request_beer_desc">Soumettre une bière manquante pour ajout à la base</span>
            </div>
            <div class="setting-action">
                <button type="button" id="btn-request-beer" class="setting-btn primary">🍺 ${i18n.t('btn_request') || 'Demander'}</button>
            </div>
        </div>

        <div class="setting-row" data-keywords="mise à jour mise a jour update actualiser version cache">
            <div class="setting-info">
                <span class="setting-title">${i18n.t('settings_check_update') || 'Vérifier les mises à jour'}</span>
                <span class="setting-desc" data-i18n="settings_check_update_desc">Forcer la recherche de la dernière version de l'application</span>
            </div>
            <div class="setting-action">
                <button type="button" id="btn-check-update" class="setting-btn">🔄 ${i18n.t('btn_refresh') || 'Actualiser'}</button>
            </div>
        </div>

        <div class="setting-row" data-keywords="tutoriel guide aide tutorial tuto">
            <div class="setting-info">
                <span class="setting-title">${i18n.t('settings_restart_tuto') || 'Refaire le tutoriel'}</span>
                <span class="setting-desc" data-i18n="settings_restart_tuto_desc">Relancer le guide de démarrage interactif</span>
            </div>
            <div class="setting-action">
                <button type="button" id="btn-restart-tuto" class="setting-btn">🎓 ${i18n.t('btn_launch') || 'Lancer'}</button>
            </div>
        </div>

        <div class="setting-row" data-keywords="diagnostic debug log admin développeur developpeur console">
            <div class="setting-info">
                <span class="setting-title" data-i18n="debug_dev_settings">${i18n.t('debug_dev_settings') || 'Diagnostic & Debug'}</span>
                <span class="setting-desc" data-i18n="settings_debug_desc">Outils avancés pour la réparation et le test</span>
            </div>
            <div class="setting-action">
                <button type="button" id="btn-open-debug" class="setting-btn">⚙️ ${i18n.t('btn_open') || 'Ouvrir'}</button>
            </div>
        </div>

        <div class="setting-row" data-keywords="test qa lab suite qualité qualite vérification verification">
            <div class="setting-info">
                <span class="setting-title">🧪 QA Lab — Suite de Tests</span>
                <span class="setting-desc">Lancer la batterie de tests automatisés pour vérifier l'intégrité de l'app</span>
            </div>
            <div class="setting-action">
                <button type="button" id="btn-open-qalab" class="setting-btn">🧪 Ouvrir</button>
            </div>
        </div>

        <div class="setting-row setting-row--stack setting-row--danger" data-keywords="réinitialiser reinitialiser supprimer reset clear effacer delete danger">
            <div class="setting-info">
                <span class="setting-title" style="color:#ff6b6b;">${i18n.t('settings_danger_zone')}</span>
                <span class="setting-desc" data-i18n="settings_danger_desc">${i18n.t('settings_danger_desc') || 'Suppression définitive des données'}</span>
            </div>
            <div class="settings-danger-grid">
                <button type="button" id="btn-reset-ratings" class="setting-btn">${i18n.t('settings_reset_ratings')}</button>
                <button type="button" id="btn-reset-custom" class="setting-btn">${i18n.t('settings_reset_custom')}</button>
                <button type="button" id="btn-reset-history" class="setting-btn">${i18n.t('settings_reset_history')}</button>
                <button type="button" id="btn-reset-fav" class="setting-btn">${i18n.t('settings_reset_favs')}</button>
            </div>
            <button type="button" id="btn-reset-app" class="setting-btn danger">🔥 ${i18n.t('settings_reset_app')}</button>
        </div>
    `;

    const aboutHtml = `
        <div class="setting-row setting-row--stack" data-keywords="nouveautés nouveautes patchnotes patch notes changelog version">
            <div class="setting-info">
                <span class="setting-title" data-i18n="settings_whats_new">${i18n.t('settings_whats_new')}</span>
            </div>
            <div class="settings-patchnotes-wrap">
                ${renderPatchnotesSection()}
            </div>
        </div>

        <div class="setting-row setting-row--stack" data-keywords="crédits credits fondateurs equipe equipe author noah dorian tristan maxance">
            <div class="setting-info">
                <span class="setting-title" data-i18n="settings_credits">${i18n.t('settings_credits')}</span>
            </div>
            <div class="settings-credits-card">
                <div>
                    <div class="settings-credit-label" data-i18n="settings_founders">${i18n.t('settings_founders')}</div>
                    <div class="settings-credit-names">Dorian Storms, Noah Bruijninckx, Tristan Storms & Maxance Veulemans</div>
                </div>
                <div>
                    <div class="settings-credit-label" data-i18n="settings_design_code">${i18n.t('settings_design_code')}</div>
                    <div class="settings-credit-names">Noah Bruijninckx</div>
                </div>
                <div class="settings-version-pill">Beerdex v${CURRENT_VERSION} &copy; 2026</div>
            </div>
        </div>

        <div class="setting-row setting-row--stack" data-keywords="légal legal cgu tos confidentialité confidentialite privacy copyright">
            <div class="setting-info">
                <span class="setting-title" data-i18n="settings_legal_section">${i18n.t('settings_legal_section')}</span>
            </div>
            <div class="settings-legal-list">
                <button type="button" id="btn-legal-tos" class="setting-btn settings-legal-btn">📄 ${i18n.t('legal_tos_title')}</button>
                <button type="button" id="btn-legal-privacy" class="setting-btn settings-legal-btn">🛡️ ${i18n.t('legal_privacy_title')}</button>
                <button type="button" id="btn-legal-copyright" class="setting-btn settings-legal-btn">⚖️ ${i18n.t('legal_copyright_title')}</button>
            </div>
        </div>
    `;

    container.innerHTML = `
        <div id="settings-container" class="settings-container">
            <div class="settings-header">
                <h2 class="settings-main-title" data-i18n="settings_main_title">Paramètres & Données</h2>
                <p class="settings-main-subtitle">Une seule catégorie ouverte à la fois, ou recherchez un réglage instantanément.</p>
            </div>

            <div class="settings-search-box">
                <svg class="settings-search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                    <circle cx="11" cy="11" r="8"></circle>
                    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                </svg>
                <input type="search" id="settings-search-input" placeholder="Rechercher un paramètre (ex: alcool, thème, lag, backup...)" autocomplete="off" aria-label="Rechercher un paramètre">
                <button type="button" id="settings-search-clear" class="settings-search-clear hidden" aria-label="Effacer la recherche">&times;</button>
            </div>
            <div id="settings-search-count" class="settings-search-count hidden"></div>

            <div class="settings-accordions-list">
                ${makeAccordion('appearance', '🎨', i18n.t('settings_group_theme_appearance') || 'Apparence & Thème', 'Langue, palettes, police, mode musée', appearanceHtml)}
                ${makeAccordion('performance', '⚡', 'Performance & Fluidité', 'Mode low-end, animations, moteur Rust', perfHtml)}
                ${makeAccordion('experience', '🍺', 'Expérience & Cartes', 'Découverte, rareté, grille de notation, sons', experienceHtml)}
                ${makeAccordion('bac', '🩸', 'Alcoolémie (BAC) & Sécurité', 'Profil, pays, véhicule, calendrier & séries', bacHtml)}
                ${makeAccordion('modules', '🧩', i18n.t('settings_group_features_immersion') || 'Modules & Social', 'Carte, BrewBrother, Beer Party, Wrapped', modulesHtml)}
                ${makeAccordion('stats_order', '📊', i18n.t('settings_group_stats_order') || 'Ordre des Statistiques', 'Réorganiser les blocs de la page Stats', statsOrderHtml)}
                ${makeAccordion('data', '💾', i18n.t('settings_group_data_backup') || 'Données, Outils & Danger', 'Import/Export, doublons, debug, réinitialisation', dataHtml)}
                ${makeAccordion('about', 'ℹ️', 'Nouveautés, Crédits & Légal', `Patchnotes v${CURRENT_VERSION}, équipe, mentions légales`, aboutHtml)}
            </div>

            <div id="settings-search-empty" class="settings-search-empty hidden">
                <div style="font-size:2rem; margin-bottom:8px;">🔍</div>
                <div>Aucun paramètre trouvé pour cette recherche.</div>
            </div>
        </div>
    `;

    container.querySelectorAll('.settings-accordion-header').forEach(header => {
        header.addEventListener('click', () => {
            const section = header.closest('.settings-accordion');
            if (!section) return;
            const groupId = section.dataset.group;
            const willOpen = !section.classList.contains('is-open');
            _activeSettingsGroup = willOpen ? groupId : null;
            _applyOneAtATimeAccordion(container, _activeSettingsGroup);

            if (willOpen) {
                requestAnimationFrame(() => {
                    header.scrollIntoView({
                        behavior: document.body.classList.contains('perf-low-end') ? 'auto' : 'smooth',
                        block: 'nearest'
                    });
                });
            }
        });
    });

    const settingsSearchInput = container.querySelector('#settings-search-input');
    const settingsSearchClear = container.querySelector('#settings-search-clear');
    if (settingsSearchInput) {
        settingsSearchInput.addEventListener('input', (e) => {
            filterSettings(e.target.value);
        });
    }
    if (settingsSearchClear) {
        settingsSearchClear.addEventListener('click', () => {
            if (settingsSearchInput) {
                settingsSearchInput.value = '';
                settingsSearchInput.focus();
            }
            filterSettings('');
        });
    }

    const selectPerfMode = container.querySelector('#select-perf-mode');
    if (selectPerfMode) {
        selectPerfMode.addEventListener('change', (e) => {
            const mode = e.target.value;
            Storage.savePreference('perf_mode', mode);
            const isLow = typeof window.applyPerformanceMode === 'function' ? window.applyPerformanceMode() : false;
            const statusEl = container.querySelector('#settings-perf-status');
            if (statusEl) {
                statusEl.textContent = isLow
                    ? '⚡ Mode fluide actif : effets de flou, animations infinies et surcharges GPU réduits.'
                    : '✨ Effets visuels complets actifs.';
            }
            showToast(isLow ? 'Mode Performance activé (60 FPS)' : 'Effets visuels complets activés');
        });
    }

    const syncThemeButtonsUI = () => {
        const activePreset = Theme.getActivePreset();
        const activeColors = Theme.getActiveColors();
        container.querySelectorAll('.theme-preset-btn').forEach(b => {
            b.classList.toggle('is-active', b.dataset.preset === activePreset);
        });
        const customDiv = container.querySelector('#theme-custom-colors');
        if (customDiv) customDiv.style.display = activePreset === 'custom' ? 'block' : 'none';
        container.querySelectorAll('.theme-color-input').forEach(inp => {
            const k = inp.dataset.var;
            if (activeColors[k]) inp.value = activeColors[k];
        });
    };

    container.querySelectorAll('.theme-preset-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const preset = btn.dataset.preset;
            if (preset === 'custom') {
                Storage.savePreference('theme_preset', 'custom');
                Theme.applyColors(Theme.getActiveColors());
            } else {
                Theme.applyPreset(preset);
            }
            syncThemeButtonsUI();
            showToast(i18n.t('toast_theme_applied') || 'Thème appliqué !', 'success');
        });
    });

    container.querySelectorAll('.theme-color-input').forEach(input => {
        input.addEventListener('input', (e) => {
            Theme.setCustomColor(e.target.dataset.var, e.target.value);
            container.querySelectorAll('.theme-preset-btn').forEach(b => {
                b.classList.toggle('is-active', b.dataset.preset === 'custom');
            });
        });
    });

    const btnThemeExport = container.querySelector('#btn-theme-export');
    if (btnThemeExport) {
        btnThemeExport.addEventListener('click', async () => {
            const code = Theme.exportTheme();
            try {
                await navigator.clipboard.writeText(code);
                Storage.savePreference('theme_shared', true);
                window.dispatchEvent(new Event('beerdex-action'));
                showToast(i18n.t('toast_theme_exported') || 'Code thème copié dans le presse-papiers !', 'success');
            } catch {
                await window.UI?.showPromptModal?.(i18n.t('toast_theme_export_manual') || 'Copiez ce code :', code);
            }
        });
    }

    const btnThemeImport = container.querySelector('#btn-theme-import');
    if (btnThemeImport) {
        btnThemeImport.addEventListener('click', async () => {
            const code = await window.UI?.showPromptModal?.(i18n.t('settings_theme_import_prompt') || 'Collez le code du thème (THEME_...) :', '', { placeholder: 'THEME_...' });
            if (code) {
                const result = Theme.importTheme(code.trim());
                if (result.success) {
                    syncThemeButtonsUI();
                    showToast(result.message, 'success');
                } else {
                    showToast(result.message, 'error');
                }
            }
        });
    }

    const btnThemeReset = container.querySelector('#btn-theme-reset');
    if (btnThemeReset) {
        btnThemeReset.addEventListener('click', () => {
            Theme.resetTheme();
            syncThemeButtonsUI();
            const fontSel = container.querySelector('#select-font-family');
            if (fontSel) fontSel.value = Theme.getActiveFont();
            showToast(i18n.t('toast_theme_reset') || 'Thème réinitialisé', 'info');
        });
    }

    const fontSelect = container.querySelector('#select-font-family');
    if (fontSelect) {
        fontSelect.addEventListener('change', (e) => {
            Theme.applyFont(e.target.value);
            showToast("Police d'écriture mise à jour");
        });
    }

    const btnDebug = container.querySelector('#btn-open-debug');
    if (btnDebug) {
        btnDebug.addEventListener('click', () => window.UI?.renderDebugModal?.());
    }

    const btnQALab = container.querySelector('#btn-open-qalab');
    if (btnQALab) {
        btnQALab.addEventListener('click', () => window.open('tests/index.html', '_blank'));
    }

    const mapSelect = container.querySelector('#select-default-map');
    if (mapSelect) {
        mapSelect.onchange = (e) => {
            Storage.setDefaultMapScope(e.target.value);
            showToast(i18n.t('toast_map_updated'));
        };
    }

    const bbToneSelect = container.querySelector('#select-bb-tone');
    if (bbToneSelect) {
        bbToneSelect.onchange = (e) => {
            Storage.savePreference('brewbrother_tone', e.target.value);
            showToast(i18n.t('toast_settings_saved') || 'Paramètre sauvegardé');
        };
    }

    const toggles = [
        { id: '#toggle-feat-map', key: 'feat_map_enabled' },
        { id: '#toggle-feat-reminders', key: 'feat_reminders_enabled' },
        { id: '#toggle-feat-equivalences', key: 'feat_equivalences_enabled' },
        { id: '#toggle-feat-beermatch', key: 'feat_beermatch_enabled' },
        { id: '#toggle-party-share-total', key: 'beermatch_share_total' },
        { id: '#toggle-party-share-catalog', key: 'beermatch_share_catalog' },
        { id: '#toggle-party-share-top', key: 'beermatch_share_top' },
        { id: '#toggle-party-share-unique', key: 'beermatch_share_unique' },
        { id: '#toggle-party-share-achievements', key: 'beermatch_share_achievements' },
        { id: '#toggle-feat-wrapped', key: 'feat_wrapped_enabled' },
        { id: '#toggle-feat-rust', key: 'feat_rust_enabled' }
    ];

    toggles.forEach(t => {
        const el = container.querySelector(t.id);
        if (el) {
            el.addEventListener('change', (e) => {
                Storage.savePreference(t.key, e.target.checked);
                if (t.key === 'feat_rust_enabled') {
                    const isChecked = e.target.checked;
                    const statusEl = container.querySelector('#settings-rust-status');
                    if (statusEl) {
                        statusEl.textContent = isChecked ? `Moteur de calcul natif WebAssembly (v${CURRENT_VERSION}) : ⚡ Actif (Accélération matérielle)` : `Moteur de calcul natif WebAssembly (v${CURRENT_VERSION}) : Inactif (Mode JavaScript)`;
                    }
                    const indicator = document.getElementById('rust-wasm-indicator');
                    if (indicator) indicator.style.display = isChecked ? 'inline-block' : 'none';
                    if (isChecked && window.initRustCore) window.initRustCore().catch(() => {});
                }
                if (t.key === 'feat_beermatch_enabled') {
                    container.querySelectorAll('.party-sub-row').forEach(r => { r.style.display = e.target.checked ? 'flex' : 'none'; });
                }
            });
        }
    });

    const inputPartyPseudo = container.querySelector('#input-party-pseudo');
    if (inputPartyPseudo) {
        inputPartyPseudo.addEventListener('input', (e) => {
            const trimmed = e.target.value.trim();
            Storage.savePreference('beermatch_pseudo', trimmed);
            if (window.Match) {
                if (window.Match.updateMyPseudo) window.Match.updateMyPseudo(trimmed);
                else if (window.Match.myProfile) window.Match.myProfile.pseudo = trimmed || 'Anonyme';
                if (window.Match.broadcastState) window.Match.broadcastState();
            }
        });
    }

    const btnSettingsDice = container.querySelector('#btn-settings-dice-pseudo');
    if (btnSettingsDice) {
        btnSettingsDice.addEventListener('click', () => {
            const randomP = window.Match && window.Match.getRandomPseudo ? window.Match.getRandomPseudo() : 'Renard Houblonné';
            Storage.savePreference('beermatch_pseudo', randomP);
            if (inputPartyPseudo) inputPartyPseudo.value = randomP;
            if (window.Match) {
                if (window.Match.updateMyPseudo) window.Match.updateMyPseudo(randomP);
                else if (window.Match.myProfile) window.Match.myProfile.pseudo = randomP;
                if (window.Match.broadcastState) window.Match.broadcastState();
            }
            showToast(`Nouveau pseudo : ${randomP}`);
        });
    }

    container.querySelector('#btn-template').onclick = () => renderTemplateEditor();

    const syncPresetButtons = (active) => {
        container.querySelector('#btn-preset-default')?.classList.toggle('primary', active === 'default');
        container.querySelector('#btn-preset-tristan')?.classList.toggle('primary', active === 'tristan');
        container.querySelector('#btn-preset-noah')?.classList.toggle('primary', active === 'noah');
    };

    container.querySelector('#btn-preset-default').onclick = async () => {
        if (await showConfirmModal(i18n.t('modal_confirm_std_preset'), { danger: false })) {
            Storage.resetRatingTemplate();
            Storage.savePreference('activePreset', 'default');
            syncPresetButtons('default');
            showToast(i18n.t('toast_preset_std_applied'));
        }
    };

    container.querySelector('#btn-preset-tristan').onclick = async () => {
        if (await showConfirmModal(i18n.t('modal_confirm_tristan_preset'), { danger: false })) {
            applyTristanPreset();
            syncPresetButtons('tristan');
            showToast(i18n.t('toast_preset_tristan_applied'));
        }
    };

    container.querySelector('#btn-preset-noah').onclick = async () => {
        if (await showConfirmModal(i18n.t('modal_confirm_noah_preset'), { danger: false })) {
            applyNoahPreset();
            syncPresetButtons('noah');
            showToast(i18n.t('toast_preset_noah_applied'));
        }
    };

    if (discoveryCallback) {
        container.querySelector('#toggle-discovery').onchange = (e) => discoveryCallback(e.target.checked);
    }

    const bindStatsOrderHandlers = () => {
        const listEl = container.querySelector('#stats-order-list');
        if (!listEl) return;
        listEl.querySelectorAll('.btn-stat-move-up').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const idx = parseInt(e.currentTarget.dataset.index, 10);
                const order = [...Storage.getPreference('stats_order', defaultStatsOrder)];
                if (idx > 0) {
                    [order[idx], order[idx - 1]] = [order[idx - 1], order[idx]];
                    Storage.savePreference('stats_order', order);
                    listEl.innerHTML = buildStatsOrderItemsHtml(order);
                    bindStatsOrderHandlers();
                }
            });
        });
        listEl.querySelectorAll('.btn-stat-move-down').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const idx = parseInt(e.currentTarget.dataset.index, 10);
                const order = [...Storage.getPreference('stats_order', defaultStatsOrder)];
                if (idx < order.length - 1) {
                    [order[idx], order[idx + 1]] = [order[idx + 1], order[idx]];
                    Storage.savePreference('stats_order', order);
                    listEl.innerHTML = buildStatsOrderItemsHtml(order);
                    bindStatsOrderHandlers();
                }
            });
        });
    };
    bindStatsOrderHandlers();

    const toggleMuseum = container.querySelector('#toggle-museum');
    if (toggleMuseum) {
        toggleMuseum.onchange = (e) => {
            const enabled = e.target.checked;
            Storage.savePreference('museumThemeEnabled', enabled);
            window.dispatchEvent(new Event('beerdex-action'));
            if (window.applyTheme) {
                window.__curtainPlayed = false;
                window.applyTheme();
            } else {
                const museumLink = document.getElementById('css-museum');
                if (museumLink) museumLink.disabled = !enabled;
                document.body.classList.toggle('theme-museum', enabled);
            }
            showToast(enabled ? i18n.t('toast_museum_on') : i18n.t('toast_museum_off'));
        };
    }

    container.querySelector('#toggle-sound').onchange = (e) => {
        Storage.savePreference('soundEnabled', e.target.checked);
        Feedback.reloadSettings();
        if (e.target.checked) Feedback.playSuccess();
    };

    container.querySelector('#toggle-haptics').onchange = (e) => {
        Storage.savePreference('hapticsEnabled', e.target.checked);
        Feedback.reloadSettings();
        if (e.target.checked) Feedback.impactMedium();
    };

    const checkRarity = container.querySelector('#check-reveal-rarity');
    if (checkRarity) checkRarity.onchange = (e) => { Storage.savePreference('revealRarity', e.target.checked); showToast(i18n.t('toast_preference_saved')); };

    const checkAnimOnce = container.querySelector('#check-anim-once');
    if (checkAnimOnce) checkAnimOnce.onchange = (e) => { Storage.savePreference('anim_only_once', e.target.checked); showToast(i18n.t('toast_preference_saved')); };

    const toggleCardStatCount = container.querySelector('#toggle-card-stat-count');
    if (toggleCardStatCount) toggleCardStatCount.onchange = (e) => { Storage.savePreference('card_stat_count', e.target.checked); showToast(i18n.t('toast_preference_saved')); };

    const toggleCardStatVolume = container.querySelector('#toggle-card-stat-volume');
    if (toggleCardStatVolume) toggleCardStatVolume.onchange = (e) => { Storage.savePreference('card_stat_volume', e.target.checked); showToast(i18n.t('toast_preference_saved')); };

    const toggleCardBrewBrother = container.querySelector('#toggle-card-brewbrother');
    if (toggleCardBrewBrother) toggleCardBrewBrother.onchange = async (e) => {
        Storage.savePreference('card_brewbrother_pct', e.target.checked);
        if (e.target.checked && Storage.getPreference('feat_brewbrother_enabled', true) && window.Recommendation) {
            try { await window.Recommendation.getUserTasteProfile(allBeers); } catch {}
        }
        showToast(i18n.t('toast_preference_saved'));
    };

    const toggleFeatBrewBrother = container.querySelector('#toggle-feat-brewbrother');
    if (toggleFeatBrewBrother) toggleFeatBrewBrother.onchange = async (e) => {
        Storage.savePreference('feat_brewbrother_enabled', e.target.checked);
        if (e.target.checked && window.Recommendation) {
            window.Recommendation.init(allBeers);
            if (Storage.getPreference('card_brewbrother_pct', false)) {
                try { await window.Recommendation.getUserTasteProfile(allBeers); } catch {}
            }
        }
        showToast(i18n.t('toast_preference_saved'));
    };

    const toggleBac = container.querySelector('#toggle-bac-enabled');
    if (toggleBac) {
        toggleBac.onchange = (e) => {
            const enabled = e.target.checked;
            Storage.savePreference('bac_enabled', enabled);
            BAC.invalidateBACCache();
            const group = container.querySelector('#bac-settings-group');
            if (group) group.style.display = enabled ? 'block' : 'none';
            showToast(enabled ? i18n.t('toast_bac_on') : i18n.t('toast_bac_off'));
        };
    }

    const inputWeight = container.querySelector('#input-bac-weight');
    if (inputWeight) inputWeight.onchange = (e) => { let val = parseInt(e.target.value, 10); if (isNaN(val) || val < 30) val = 30; Storage.savePreference('bac_weight', val); BAC.invalidateBACCache(); };

    const selectGender = container.querySelector('#select-bac-gender');
    if (selectGender) selectGender.onchange = (e) => { Storage.savePreference('bac_gender', e.target.value); BAC.invalidateBACCache(); };

    const toggleBacHome = container.querySelector('#toggle-bac-home');
    if (toggleBacHome) toggleBacHome.onchange = (e) => { Storage.savePreference('bac_show_home', e.target.checked); };

    const toggleBacHideWg = container.querySelector('#toggle-bac-hide-wg');
    if (toggleBacHideWg) {
        toggleBacHideWg.onchange = (e) => {
            const hide = e.target.checked;
            Storage.savePreference('bac_hide_weight_gender', hide);
            const row = container.querySelector('#bac-weight-gender-row');
            if (row) row.style.display = hide ? 'none' : 'flex';
        };
    }

    const toggleBacManual = container.querySelector('#toggle-bac-manual');
    if (toggleBacManual) toggleBacManual.onchange = (e) => { Storage.savePreference('bac_manual_only', e.target.checked); };

    const selectBacDuration = container.querySelector('#select-bac-duration');
    if (selectBacDuration) selectBacDuration.onchange = (e) => { Storage.savePreference('bac_drink_duration', e.target.value); BAC.invalidateBACCache(); showToast(i18n.t('toast_bac_duration_updated')); };

    const selectBacVehicle = container.querySelector('#select-bac-vehicle');
    if (selectBacVehicle) selectBacVehicle.onchange = (e) => { Storage.savePreference('bac_vehicle', e.target.value); showToast(i18n.t('toast_bac_vehicle_updated')); };

    const selectBacCountry = container.querySelector('#select-bac-country');
    if (selectBacCountry) selectBacCountry.onchange = (e) => { Storage.savePreference('bac_country', e.target.value); showToast(i18n.t('toast_bac_rule_updated')); };

    const toggleHistory = container.querySelector('#toggle-show-history');
    if (toggleHistory) toggleHistory.onchange = (e) => { Storage.savePreference('bac_show_history', e.target.checked); showToast(i18n.t('toast_preference_saved')); };
    const toggleCalendar = container.querySelector('#toggle-show-calendar');
    if (toggleCalendar) toggleCalendar.onchange = (e) => { Storage.savePreference('bac_show_calendar', e.target.checked); showToast(i18n.t('toast_preference_saved')); };
    const toggleStreak = container.querySelector('#toggle-show-streak');
    if (toggleStreak) toggleStreak.onchange = (e) => { Storage.savePreference('bac_show_streak', e.target.checked); showToast(i18n.t('toast_preference_saved')); };

    container.querySelector('#btn-legal-tos').onclick = () => renderLegalPage('tos');
    container.querySelector('#btn-legal-privacy').onclick = () => renderLegalPage('privacy');
    container.querySelector('#btn-legal-copyright').onclick = () => renderLegalPage('copyright');

    const selectLanguage = container.querySelector('#select-language');
    if (selectLanguage) {
        selectLanguage.onchange = async (e) => {
            await i18n.setLanguage(e.target.value);
            showToast(i18n.t('toast_lang_updated'));
            renderSettings(allBeers, userData, container, isDiscovery, discoveryCallback);
        };
    }

    const patchnoteEl = container.querySelector('.patchnote-section[data-new="true"]');
    if (patchnoteEl) {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    markPatchnotesSeen();
                    observer.disconnect();
                }
            });
        }, { threshold: 0.3 });
        observer.observe(patchnoteEl);
    }

    container.querySelector('#btn-manage-import').onclick = () => window.UI?.renderImportModal?.();
    container.querySelector('#btn-manage-export').onclick = () => window.UI?.renderExportModal?.();
    const btnBulkShare = container.querySelector('#btn-manage-bulk-share');
    if (btnBulkShare) btnBulkShare.onclick = () => window.UI?.renderBulkShareModal?.();

    container.querySelector('#btn-check-update').onclick = async () => {
        if ('serviceWorker' in navigator) {
            showToast(i18n.t('toast_forcing_update'), 'info');
            try {
                const registrations = await navigator.serviceWorker.getRegistrations();
                for (const registration of registrations) await registration.unregister();
                const cacheKeys = await caches.keys();
                await Promise.all(cacheKeys.map(key => caches.delete(key)));
                showToast(i18n.t('toast_caches_cleared'), 'success');
                setTimeout(() => window.location.reload(true), 1500);
            } catch (e) {
                console.error('Update failed', e);
                showToast(i18n.t('toast_update_error', { err: e.message }));
            }
        } else {
            showToast(i18n.t('toast_sw_unsupported'));
        }
    };

    container.querySelector('#btn-restart-tuto').onclick = () => {
        const homeBtn = document.querySelector('.nav-item[data-view="home"]');
        if (homeBtn) homeBtn.click();
        setTimeout(() => window.TutorialSystem?.start?.(), 500);
    };

    container.querySelector('#btn-request-beer').onclick = () => window.UI?.renderRequestBeerForm?.(allBeers);
    container.querySelector('#btn-deduplicate-db').onclick = () => window.UI?.renderDeduplicationWizard?.(allBeers);

    const confirmReset = async (msg, action) => {
        if (await showConfirmModal(msg)) {
            action();
            Analytics.track('data_reset', { action: action.name || 'unknown' });
            showToast(i18n.t('toast_data_clear_success'));
            setTimeout(() => location.reload(), 1000);
        }
    };

    const btnResetRatings = container.querySelector('#btn-reset-ratings');
    if (btnResetRatings) btnResetRatings.onclick = () => confirmReset(i18n.t('modal_confirm_delete_ratings'), Storage.resetRatingsOnly);

    const btnResetCustom = container.querySelector('#btn-reset-custom');
    if (btnResetCustom) btnResetCustom.onclick = () => confirmReset(i18n.t('modal_confirm_delete_custom'), Storage.resetCustomBeersOnly);

    const btnResetHistory = container.querySelector('#btn-reset-history');
    if (btnResetHistory) btnResetHistory.onclick = () => confirmReset(i18n.t('modal_confirm_delete_history'), Storage.resetConsumptionHistoryOnly);

    const btnResetFav = container.querySelector('#btn-reset-fav');
    if (btnResetFav) btnResetFav.onclick = () => confirmReset(i18n.t('modal_confirm_delete_favs'), Storage.resetFavoritesOnly);

    container.querySelector('#btn-reset-app').onclick = async () => {
        if (await showConfirmModal(i18n.t('modal_confirm_reset_app'))) {
            if (await showConfirmModal(i18n.t('modal_confirm_reset_app_final'), { confirmText: i18n.t('btn_reset') })) {
                Storage.resetAllData();
                location.reload();
            }
        }
    };

    i18n.translateDOM(container);
}

export function filterSettings(query) {
    const container = document.getElementById('settings-container');
    if (!container) return;

    const rawQuery = query || '';
    const norm = (s) => (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
    const q = norm(rawQuery);

    const inputEl = container.querySelector('#settings-search-input');
    if (inputEl && inputEl.value !== rawQuery) inputEl.value = rawQuery;
    const clearBtn = container.querySelector('#settings-search-clear');
    if (clearBtn) clearBtn.classList.toggle('hidden', q.length === 0);
    const countEl = container.querySelector('#settings-search-count');
    const emptyEl = container.querySelector('#settings-search-empty');

    const accordions = container.querySelectorAll('.settings-accordion');

    if (!q) {
        accordions.forEach(acc => {
            acc.style.display = '';
            acc.querySelectorAll('.setting-row').forEach(row => { row.style.display = ''; });
            const header = acc.querySelector('.settings-accordion-header');
            const isOpen = _activeSettingsGroup !== null && acc.dataset.group === _activeSettingsGroup;
            acc.classList.toggle('is-open', isOpen);
            if (header) header.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
        });
        _restoreSettingsConditionalVisibility(container);
        if (countEl) countEl.classList.add('hidden');
        if (emptyEl) emptyEl.classList.add('hidden');
        return;
    }

    let totalMatches = 0;
    accordions.forEach(acc => {
        let groupMatches = 0;
        const headerText = norm(acc.querySelector('.settings-accordion-header')?.textContent);
        const rows = acc.querySelectorAll('.setting-row');
        const bacSub = acc.querySelector('#bac-settings-group');
        let bacSubMatches = 0;

        rows.forEach(row => {
            const keywords = norm(row.dataset.keywords);
            const text = norm(row.textContent);
            const matched = keywords.includes(q) || text.includes(q) || headerText.includes(q);
            row.style.display = matched ? '' : 'none';
            if (matched) {
                groupMatches++;
                totalMatches++;
                if (bacSub && bacSub.contains(row)) bacSubMatches++;
            }
        });

        if (bacSub) {
            bacSub.style.display = bacSubMatches > 0 ? 'block' : 'none';
        }

        const hasMatch = groupMatches > 0;
        acc.style.display = hasMatch ? '' : 'none';
        acc.classList.toggle('is-open', hasMatch);
        const header = acc.querySelector('.settings-accordion-header');
        if (header) header.setAttribute('aria-expanded', hasMatch ? 'true' : 'false');
    });

    if (countEl) {
        countEl.textContent = totalMatches > 0
            ? `${totalMatches} réglage${totalMatches > 1 ? 's' : ''} trouvé${totalMatches > 1 ? 's' : ''}`
            : '';
        countEl.classList.toggle('hidden', totalMatches === 0);
    }
    if (emptyEl) emptyEl.classList.toggle('hidden', totalMatches > 0);
}
