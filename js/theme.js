/**
 * theme.js — Theme Engine for Beerdex.
 * 
 * Manages custom CSS variable overrides, presets, and import/export.
 * All theme data is stored in localStorage under 'beerdex_pref_theme_custom'.
 */

import * as Storage from './storage.js';
import * as LiquidGlass from './liquid-glass.js';

// ============================== //
// Customizable CSS Variables     //
// ============================== //

/**
 * The list of CSS variables that users can customize.
 * Each has a key (matching the CSS var name), a label, and a group.
 */
export const THEME_VARS = [
    // Background
    { key: '--bg-dark', label: 'theme_var_bg_dark', group: 'background', default: '#0a0a0a' },
    { key: '--bg-card', label: 'theme_var_bg_card', group: 'background', default: '#141414' },
    { key: '--bg-card-hover', label: 'theme_var_bg_card_hover', group: 'background', default: '#1f1f1f' },

    // Text
    { key: '--text-primary', label: 'theme_var_text_primary', group: 'text', default: '#ffffff' },
    { key: '--text-secondary', label: 'theme_var_text_secondary', group: 'text', default: '#a0a0a0' },

    // Accent
    { key: '--accent-gold', label: 'theme_var_accent_gold', group: 'accent', default: '#FFC000' },
    { key: '--accent-amber', label: 'theme_var_accent_amber', group: 'accent', default: '#FF9900' },
    { key: '--accent-foam', label: 'theme_var_accent_foam', group: 'accent', default: '#F0F0F0' },

    // Borders & misc
    { key: '--border-color', label: 'theme_var_border', group: 'misc', default: '#2d2d2d' },
    { key: '--success', label: 'theme_var_success', group: 'misc', default: '#2ecc71' },
    { key: '--danger', label: 'theme_var_danger', group: 'misc', default: '#e74c3c' },
];

// ============================== //
// Fonts                          //
// ============================== //

export const FONTS = {
    'default': { label: 'Outfit (Défaut)', css: '"Outfit", sans-serif', url: 'https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;700&display=swap' },
    'system': { label: 'Police Système', css: 'system-ui, -apple-system, sans-serif' },
    'inter': { label: 'Inter', css: '"Inter", sans-serif', url: 'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;700&display=swap' },
    'roboto': { label: 'Roboto', css: '"Roboto", sans-serif', url: 'https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700&display=swap' },
    'poppins': { label: 'Poppins', css: '"Poppins", sans-serif', url: 'https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;700&display=swap' },
    'space_grotesk': { label: 'Space Grotesk', css: '"Space Grotesk", sans-serif', url: 'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;700&display=swap' },
    'montserrat': { label: 'Montserrat', css: '"Montserrat", sans-serif', url: 'https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;700&display=swap' },
    'jetbrains': { label: 'JetBrains Mono', css: '"JetBrains Mono", monospace', url: 'https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;700&display=swap' },
    'dotgothic': { label: 'Doto / Inter / JetBrains (Nothing OS)', css: '"NType 82", "Inter", sans-serif', url: 'https://fonts.googleapis.com/css2?family=Doto:wght@500;700;900&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;700&display=swap' }
};

export const GRID_DENSITIES = {
    compact: { label: 'Compact (plus de cartes)', minWidth: '145px', gap: '10px' },
    normal: { label: 'Standard', minWidth: '175px', gap: '14px' },
    comfortable: { label: 'Confort (grandes cartes)', minWidth: '220px', gap: '18px' }
};

export const FONT_SCALES = {
    sm: { label: 'Petite (92%)', size: '92%' },
    md: { label: 'Normale (100%)', size: '100%' },
    lg: { label: 'Grande (110%)', size: '110%' }
};

export const CARD_RADII = {
    sharp: { label: 'Carré (8px)', radius: '8px' },
    default: { label: 'Standard (16px)', radius: '16px' },
    round: { label: 'Arrondi (24px)', radius: '24px' }
};

export const CARD_STYLES = ['default', 'glass', 'nothing', 'flat', 'neon'];

export const GLASS_QUALITIES = {
    full: { label: 'Complet (Réfraction SVG)' },
    light: { label: 'Allégé (Performance)' }
};

// ============================== //
// Presets                        //
// ============================== //

export const THEME_PRESETS = {
    default: {
        name: 'Dark Gold',
        emoji: '🍺',
        colors: {
            '--bg-dark': '#0a0a0a',
            '--bg-card': '#141414',
            '--bg-card-hover': '#1f1f1f',
            '--text-primary': '#ffffff',
            '--text-secondary': '#a0a0a0',
            '--accent-gold': '#FFC000',
            '--accent-amber': '#FF9900',
            '--accent-foam': '#F0F0F0',
            '--border-color': '#2d2d2d',
            '--success': '#2ecc71',
            '--danger': '#e74c3c',
        }
    },
    cyberpunk: {
        name: 'Cyberpunk Neon',
        emoji: '🌃',
        colors: {
            '--bg-dark': '#0a0014',
            '--bg-card': '#140028',
            '--bg-card-hover': '#1e003c',
            '--text-primary': '#e0d0ff',
            '--text-secondary': '#8070a0',
            '--accent-gold': '#ff00ff',
            '--accent-amber': '#aa00ff',
            '--accent-foam': '#00ffff',
            '--border-color': '#3d1a5c',
            '--success': '#00ff88',
            '--danger': '#ff0044',
        }
    },
    forest: {
        name: 'Forest',
        emoji: '🌲',
        colors: {
            '--bg-dark': '#0a110a',
            '--bg-card': '#111c11',
            '--bg-card-hover': '#1a2e1a',
            '--text-primary': '#d4e8d4',
            '--text-secondary': '#7fa07f',
            '--accent-gold': '#8bc34a',
            '--accent-amber': '#4caf50',
            '--accent-foam': '#c8e6c9',
            '--border-color': '#2d3d2d',
            '--success': '#66bb6a',
            '--danger': '#ef5350',
        }
    },
    blood: {
        name: 'Blood Red',
        emoji: '🩸',
        colors: {
            '--bg-dark': '#0a0000',
            '--bg-card': '#1a0505',
            '--bg-card-hover': '#2a0a0a',
            '--text-primary': '#ffcccc',
            '--text-secondary': '#a07070',
            '--accent-gold': '#ff3333',
            '--accent-amber': '#cc0000',
            '--accent-foam': '#ffaaaa',
            '--border-color': '#3d1a1a',
            '--success': '#4caf50',
            '--danger': '#ff0000',
        }
    },
    ocean: {
        name: 'Deep Ocean',
        emoji: '🌊',
        colors: {
            '--bg-dark': '#020b14',
            '--bg-card': '#081828',
            '--bg-card-hover': '#0e2440',
            '--text-primary': '#cce5ff',
            '--text-secondary': '#6699cc',
            '--accent-gold': '#00bcd4',
            '--accent-amber': '#0097a7',
            '--accent-foam': '#b2ebf2',
            '--border-color': '#1a3a5c',
            '--success': '#26a69a',
            '--danger': '#ef5350',
        }
    },
    sunset: {
        name: 'Sunset',
        emoji: '🌅',
        colors: {
            '--bg-dark': '#120808',
            '--bg-card': '#1e0e0a',
            '--bg-card-hover': '#2d1810',
            '--text-primary': '#ffe0cc',
            '--text-secondary': '#b08060',
            '--accent-gold': '#ff6b35',
            '--accent-amber': '#e64a19',
            '--accent-foam': '#ffccbc',
            '--border-color': '#3d2219',
            '--success': '#66bb6a',
            '--danger': '#d32f2f',
        }
    },
    oled: {
        name: 'OLED Pitch Black',
        emoji: '🖤',
        colors: {
            '--bg-dark': '#000000',
            '--bg-card': '#0a0a0a',
            '--bg-card-hover': '#141414',
            '--text-primary': '#ffffff',
            '--text-secondary': '#94949c',
            '--accent-gold': '#FFC000',
            '--accent-amber': '#FF9900',
            '--accent-foam': '#F4F4F5',
            '--border-color': '#1e1e22',
            '--success': '#2ecc71',
            '--danger': '#e74c3c',
        }
    },
    light: {
        name: 'Mousse Claire',
        emoji: '☀️',
        scheme: 'light',
        colors: {
            '--bg-dark': '#f5f2eb',
            '--bg-card': '#ffffff',
            '--bg-card-hover': '#ebe5d8',
            '--text-primary': '#1c1917',
            '--text-secondary': '#57534e',
            '--accent-gold': '#d97706',
            '--accent-amber': '#b45309',
            '--accent-foam': '#78350f',
            '--border-color': '#ddd5c5',
            '--success': '#16a34a',
            '--danger': '#dc2626',
        }
    },
    trappist: {
        name: 'Abbaye Trappiste',
        emoji: '⛪',
        colors: {
            '--bg-dark': '#120d0a',
            '--bg-card': '#1d1510',
            '--bg-card-hover': '#2a1e16',
            '--text-primary': '#f7ede2',
            '--text-secondary': '#b8a089',
            '--accent-gold': '#d4a843',
            '--accent-amber': '#b8860b',
            '--accent-foam': '#faebd7',
            '--border-color': '#3a2a1e',
            '--success': '#4caf50',
            '--danger': '#e05252',
        }
    },
    ipa: {
        name: 'Houblon IPA',
        emoji: '🌿',
        colors: {
            '--bg-dark': '#09120c',
            '--bg-card': '#122016',
            '--bg-card-hover': '#1a2f20',
            '--text-primary': '#ecfdf5',
            '--text-secondary': '#86a791',
            '--accent-gold': '#a3e635',
            '--accent-amber': '#65a30d',
            '--accent-foam': '#d9f99d',
            '--border-color': '#233d2b',
            '--success': '#22c55e',
            '--danger': '#ef4444',
        }
    },
    nord: {
        name: 'Nordic Frost',
        emoji: '❄️',
        colors: {
            '--bg-dark': '#2e3440',
            '--bg-card': '#3b4252',
            '--bg-card-hover': '#434c5e',
            '--text-primary': '#eceff4',
            '--text-secondary': '#d8dee9',
            '--accent-gold': '#88c0d0',
            '--accent-amber': '#81a1c1',
            '--accent-foam': '#e5e9f0',
            '--border-color': '#4c566a',
            '--success': '#a3be8c',
            '--danger': '#bf616a',
        }
    },
    stout: {
        name: 'Imperial Stout',
        emoji: '☕',
        colors: {
            '--bg-dark': '#0e0907',
            '--bg-card': '#1a120e',
            '--bg-card-hover': '#281b15',
            '--text-primary': '#f5ebe0',
            '--text-secondary': '#a89080',
            '--accent-gold': '#e09f3e',
            '--accent-amber': '#9e2a2b',
            '--accent-foam': '#fff3b0',
            '--border-color': '#38251d',
            '--success': '#52b788',
            '--danger': '#e63946',
        }
    },
    nothing: {
        name: 'Nothing OS',
        emoji: '●',
        colors: {
            '--bg-dark': '#000000',
            '--bg-card': '#0d0d0d',
            '--bg-card-hover': '#242424',
            '--text-primary': '#ffffff',
            '--text-secondary': '#999999',
            '--accent-gold': '#ff3030',
            '--accent-amber': '#ffffff',
            '--accent-foam': '#ffffff',
            '--border-color': '#2e2e2e',
            '--success': '#ffffff',
            '--danger': '#ff3030',
        }
    }
};

// ============================== //
// Core Functions                 //
// ============================== //

/**
 * Get the currently saved custom theme colors.
 * Returns null if using a preset (no custom overrides).
 */
export function getCustomTheme() {
    return Storage.getPreference('theme_custom', null);
}

/**
 * Get the active preset name.
 */
export function getActivePreset() {
    return Storage.getPreference('theme_preset', 'default');
}

function _isLightColor(hex) {
    if (!hex || typeof hex !== 'string') return false;
    let h = hex.trim().replace('#', '');
    if (h.length === 3) h = h.split('').map(c => c + c).join('');
    if (h.length !== 6) return false;
    const r = parseInt(h.slice(0, 2), 16) / 255;
    const g = parseInt(h.slice(2, 4), 16) / 255;
    const b = parseInt(h.slice(4, 6), 16) / 255;
    const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    return lum > 0.55;
}

/**
 * Apply a theme preset by name.
 */
export function applyPreset(presetName) {
    const preset = THEME_PRESETS[presetName];
    if (!preset) {
        console.warn(`[Theme] Unknown preset: ${presetName}`);
        return;
    }

    // Do not clear custom overrides when switching to a preset, so the user can go back to "Custom"
    Storage.savePreference('theme_preset', presetName);
    applyColors(preset.colors, preset.scheme);
}

/**
 * Apply custom color overrides.
 * @param {Object} colors — { '--bg-dark': '#123456', ... }
 * @param {string} [scheme] — optional 'light' | 'dark'
 */
export function applyColors(colors, scheme = null) {
    const root = document.documentElement;
    Object.entries(colors).forEach(([varName, value]) => {
        if (value) {
            root.style.setProperty(varName, value);
        }
    });

    const isLight = scheme === 'light' || (!scheme && _isLightColor(colors['--bg-dark']));
    root.dataset.colorScheme = isLight ? 'light' : 'dark';

    // Update meta theme-color for the mobile status bar
    const accentGold = colors['--accent-gold'];
    if (accentGold) {
        document.querySelector('meta[name="theme-color"]')?.setAttribute('content', accentGold);
    }

    if (document.body?.classList.contains('card-style-glass') && !document.body.classList.contains('perf-low-end')) {
        LiquidGlass.refreshLiquidGlass();
    }
}

/**
 * Save a single color override.
 */
export function setCustomColor(varName, value) {
    let custom = getCustomTheme() || {};
    custom[varName] = value;
    Storage.savePreference('theme_custom', custom);
    Storage.savePreference('theme_preset', 'custom');
    document.documentElement.style.setProperty(varName, value);
    if (varName === '--bg-dark') {
        document.documentElement.dataset.colorScheme = _isLightColor(value) ? 'light' : 'dark';
    }
}

/**
 * Get the currently active colors (preset + custom overrides merged).
 */
export function getActiveColors() {
    const presetName = getActivePreset();
    const preset = THEME_PRESETS[presetName] || THEME_PRESETS.default;
    const custom = getCustomTheme();

    if (custom && presetName === 'custom') {
        // Merge: start from default, overlay custom
        return { ...THEME_PRESETS.default.colors, ...custom };
    }

    return { ...preset.colors };
}

/**
 * Reset to default theme and customizations.
 */
export function resetTheme() {
    Storage.savePreference('theme_custom', null);
    Storage.savePreference('theme_preset', 'default');
    Storage.savePreference('theme_font', 'default');
    Storage.savePreference('pref_grid_density', 'normal');
    Storage.savePreference('pref_font_scale', 'md');
    Storage.savePreference('pref_card_radius', 'default');
    Storage.savePreference('pref_card_style', 'default');
    Storage.savePreference('pref_glass_quality', 'full');
    Storage.savePreference('pref_reduced_motion', false);
    applyColors(THEME_PRESETS.default.colors, 'dark');
    applyAllCustomizations();
}

// ============================== //
// Layout & Visual Customizations //
// ============================== //

export function applyGridDensity(densityKey = Storage.getPreference('pref_grid_density', 'normal')) {
    const cfg = GRID_DENSITIES[densityKey] || GRID_DENSITIES.normal;
    Storage.savePreference('pref_grid_density', GRID_DENSITIES[densityKey] ? densityKey : 'normal');
    const root = document.documentElement;
    root.style.setProperty('--grid-card-min', cfg.minWidth);
    root.style.setProperty('--grid-gap', cfg.gap);
}

export function applyFontScale(scaleKey = Storage.getPreference('pref_font_scale', 'md')) {
    const cfg = FONT_SCALES[scaleKey] || FONT_SCALES.md;
    Storage.savePreference('pref_font_scale', FONT_SCALES[scaleKey] ? scaleKey : 'md');
    document.documentElement.style.fontSize = cfg.size;
}

export function applyCardRadius(radiusKey = Storage.getPreference('pref_card_radius', 'default')) {
    const cfg = CARD_RADII[radiusKey] || CARD_RADII.default;
    Storage.savePreference('pref_card_radius', CARD_RADII[radiusKey] ? radiusKey : 'default');
    document.documentElement.style.setProperty('--card-radius', cfg.radius);
    if (document.body?.classList.contains('card-style-glass') && !document.body.classList.contains('perf-low-end')) {
        LiquidGlass.refreshLiquidGlass();
    }
}

export function applyGlassQuality(qualityKey = Storage.getPreference('pref_glass_quality', 'full')) {
    const valid = GLASS_QUALITIES[qualityKey] ? qualityKey : 'full';
    Storage.savePreference('pref_glass_quality', valid);
    LiquidGlass.setLiquidGlassQuality(valid);
}

function _ensureStylesheetLink(id, href) {
    if (typeof document === 'undefined' || !document.head || document.getElementById(id)) return;
    const link = document.createElement('link');
    link.id = id;
    link.rel = 'stylesheet';
    link.href = href;
    document.head.appendChild(link);
}

export function applyCardStyle(styleKey = Storage.getPreference('pref_card_style', 'default')) {
    const valid = CARD_STYLES.includes(styleKey) ? styleKey : 'default';
    Storage.savePreference('pref_card_style', valid);
    if (document.body) {
        CARD_STYLES.forEach(s => document.body.classList.remove(`card-style-${s}`));
        if (valid !== 'default') document.body.classList.add(`card-style-${valid}`);
        if (valid === 'nothing') {
            _ensureStylesheetLink('font-style-nothing', FONTS.dotgothic.url);
        }
        if (valid === 'glass' && !document.body.classList.contains('perf-low-end')) {
            LiquidGlass.enableLiquidGlass(Storage.getPreference('pref_glass_quality', 'full'));
        } else {
            LiquidGlass.disableLiquidGlass();
        }
    }
}

export function applyReducedMotion(enabled = Storage.getPreference('pref_reduced_motion', false)) {
    const val = Boolean(enabled);
    Storage.savePreference('pref_reduced_motion', val);
    if (document.body) {
        document.body.classList.toggle('reduced-motion', val);
    }
}

export function applyNavCustomization() {
    if (!document.body) return;
    const navStyle = Storage.getPreference('pref_nav_style', 'floating');
    document.body.classList.toggle('nav-style-docked', navStyle === 'docked');

    const hideBeerpedia = Storage.getPreference('pref_hide_beerpedia', false);
    const hideBus = Storage.getPreference('pref_hide_bus', false);
    const isDiscovery = Storage.getPreference('discoveryMode', false);

    const bpTab = document.querySelector('.nav-item[data-view="beerpedia"]');
    if (bpTab) bpTab.style.display = hideBeerpedia ? 'none' : 'flex';

    const busTab = document.querySelector('.nav-item[data-view="drunk"]');
    if (busTab) busTab.style.display = (hideBus || isDiscovery) ? 'none' : 'flex';
}

export function applyAllCustomizations() {
    applyFont(getActiveFont());
    applyGridDensity();
    applyFontScale();
    applyCardRadius();
    applyGlassQuality();
    applyCardStyle();
    applyReducedMotion();
    applyNavCustomization();
}

// ============================== //
// Font Functions                 //
// ============================== //

export function getActiveFont() {
    return Storage.getPreference('theme_font', 'default');
}

export function applyFont(fontKey) {
    const font = FONTS[fontKey] || FONTS['default'];
    Storage.savePreference('theme_font', fontKey);

    // Inject Google Fonts link if URL exists and not already injected
    if (font.url) {
        _ensureStylesheetLink(`font-${fontKey}`, font.url);
    }

    // Apply CSS variable
    if (font.css) {
        document.documentElement.style.setProperty('--font-family-primary', font.css);
    } else {
        document.documentElement.style.removeProperty('--font-family-primary');
    }
}

// ============================== //
// Import / Export                //
// ============================== //

/**
 * Export the current theme as a shareable Base64 code.
 * Format: THEME_<base64 JSON>
 */
export function exportTheme() {
    const data = {
        preset: getActivePreset(),
        colors: getActiveColors(),
        font: getActiveFont(),
        fontScale: Storage.getPreference('pref_font_scale', 'md'),
        radius: Storage.getPreference('pref_card_radius', 'default'),
        cardStyle: Storage.getPreference('pref_card_style', 'default'),
        glassQuality: Storage.getPreference('pref_glass_quality', 'full'),
        gridDensity: Storage.getPreference('pref_grid_density', 'normal'),
        exportDate: new Date().toISOString()
    };

    const json = JSON.stringify(data);
    const b64 = btoa(unescape(encodeURIComponent(json)));
    return `THEME_${b64}`;
}

/**
 * Import a theme from a Base64 code string.
 * @param {string} code — e.g. "THEME_eyJwcmVzZXQ..."
 * @returns {{ success: boolean, message: string }}
 */
export function importTheme(code) {
    try {
        if (!code || !code.startsWith('THEME_')) {
            return { success: false, message: 'Code invalide. Le code doit commencer par THEME_' };
        }

        const b64 = code.replace('THEME_', '');
        const json = decodeURIComponent(escape(atob(b64)));
        const data = JSON.parse(json);

        if (!data.colors || typeof data.colors !== 'object') {
            return { success: false, message: 'Format de thème invalide.' };
        }

        // Save as custom
        Storage.savePreference('theme_custom', data.colors);
        Storage.savePreference('theme_preset', 'custom');
        applyColors(data.colors);

        if (data.font && FONTS[data.font]) applyFont(data.font);
        if (data.fontScale && FONT_SCALES[data.fontScale]) applyFontScale(data.fontScale);
        if (data.radius && CARD_RADII[data.radius]) applyCardRadius(data.radius);
        if (data.glassQuality && GLASS_QUALITIES[data.glassQuality]) applyGlassQuality(data.glassQuality);
        if (data.cardStyle && CARD_STYLES.includes(data.cardStyle)) applyCardStyle(data.cardStyle);
        if (data.gridDensity && GRID_DENSITIES[data.gridDensity]) applyGridDensity(data.gridDensity);

        return { success: true, message: 'Thème importé avec succès !' };
    } catch (e) {
        console.error('[Theme] Import error:', e);
        return { success: false, message: `Erreur d'import: ${e.message}` };
    }
}

// ============================== //
// Init — Apply saved theme       //
// ============================== //

export function init() {
    const presetName = getActivePreset();
    const custom = getCustomTheme();

    if (custom && presetName === 'custom') {
        // Apply custom overrides on top of default
        applyColors({ ...THEME_PRESETS.default.colors, ...custom });
    } else {
        const preset = THEME_PRESETS[presetName];
        if (preset) {
            applyColors(preset.colors, preset.scheme);
        } else {
            Storage.savePreference('theme_preset', 'default');
            applyColors(THEME_PRESETS.default.colors, THEME_PRESETS.default.scheme);
        }
    }

    applyAllCustomizations();
}
