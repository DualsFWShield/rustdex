import init, {
    beerdex_switch_view,
    beerdex_toggle_view_mode,
    beerdex_search,
    beerdex_toggle_search,
    beerdex_open_filter_modal,
    beerdex_close_filter_modal,
    beerdex_open_add_beer_modal,
    beerdex_open_scan_modal,
    beerdex_open_achievement_modal,
    beerdex_open_notation_modal,
    beerdex_add_custom_beer,
    beerdex_set_filter_style,
    beerdex_set_filter_rarity,
    beerdex_set_filter_country,
    beerdex_toggle_filter_consumed,
    beerdex_toggle_filter_favorites,
    beerdex_reset_filters,
    beerdex_set_theme,
    beerdex_set_preference,
    beerdex_log_drink,
    beerdex_toggle_favorite,
    beerdex_open_beer_modal,
    beerdex_close_modal,
    beerdex_get_current_bac,
    beerdex_set_language,
    beerdex_save_rating,
    beerdex_export_backup_json,
    beerdex_import_backup_json,
    beerdex_reset_data
} from '../wasm/beerdex_app.js';

let isWasmInitialized = false;

export async function bootstrapBeerdexRust() {
    try {
        console.log('[Beerdex Rust] Initializing WebAssembly Core...');
        await init(new URL('../wasm/beerdex_app_bg.wasm?v=5.1.2', import.meta.url));
        isWasmInitialized = true;
        console.log('[Beerdex Rust] Engine successfully mounted.');

        setupEventListeners();
    } catch (err) {
        console.error('[Beerdex Rust] Initialization error:', err);
    }
}

function setupEventListeners() {
    // 1. Delegated Click Handler
    document.addEventListener('click', (event) => {
        if (!isWasmInitialized) return;

        // View switching
        const navBtn = event.target.closest('.nav-item[data-view]');
        if (navBtn) {
            const view = navBtn.getAttribute('data-view');
            beerdex_switch_view(view);
            window.scrollTo({ top: 0, behavior: 'smooth' });
            return;
        }

        // View toggle (Grid / List)
        if (event.target.closest('#view-toggle')) {
            beerdex_toggle_view_mode();
            return;
        }

        // Add Beer Modal Toggle
        if (event.target.closest('#btn-add-header')) {
            beerdex_open_add_beer_modal();
            return;
        }

        // Universal Scanner Modal Toggle
        if (event.target.closest('#btn-universal-scan')) {
            beerdex_open_scan_modal();
            return;
        }

        // Notation Template Modal Toggle
        if (event.target.closest('#btn-template')) {
            beerdex_open_notation_modal();
            return;
        }

        // Preset templates
        if (event.target.closest('#btn-preset-default')) {
            alert('Modèle de notation Standard activé.');
            return;
        }
        if (event.target.closest('#btn-preset-tristan')) {
            alert('Modèle de notation Tristan (Avancé) activé.');
            return;
        }
        if (event.target.closest('#btn-preset-noah')) {
            alert('Modèle de notation Noah (Expert) activé.');
            return;
        }

        // Achievement Click -> Open Achievement Detail Modal
        const achItem = event.target.closest('.ach-item[data-ach-id]');
        if (achItem) {
            const achId = achItem.getAttribute('data-ach-id');
            beerdex_open_achievement_modal(achId);
            return;
        }

        // Filter modal tabs switching
        const ftab = event.target.closest('.ftab[data-tab]');
        if (ftab) {
            const tabId = ftab.getAttribute('data-tab');
            document.querySelectorAll('.ftab').forEach(b => {
                b.classList.remove('active');
                b.style.background = '#333';
                b.style.color = '#fff';
            });
            ftab.classList.add('active');
            ftab.style.background = 'var(--accent-gold)';
            ftab.style.color = '#000';
            document.querySelectorAll('.tab-pane').forEach(p => p.style.display = 'none');
            const targetPane = document.getElementById(tabId);
            if (targetPane) targetPane.style.display = 'block';
            return;
        }

        // Filter toggle & Modal Actions
        if (event.target.closest('#filter-toggle')) {
            beerdex_open_filter_modal();
            return;
        }
        if (event.target.closest('#filter-modal-close-btn, #btn-filter-apply')) {
            beerdex_close_filter_modal();
            return;
        }
        const styleBtn = event.target.closest('[data-filter-style]');
        if (styleBtn) {
            const style = styleBtn.getAttribute('data-filter-style');
            beerdex_set_filter_style(style);
            return;
        }
        const rarityBtn = event.target.closest('[data-filter-rarity]');
        if (rarityBtn) {
            const rarity = rarityBtn.getAttribute('data-filter-rarity');
            beerdex_set_filter_rarity(rarity);
            return;
        }
        if (event.target.closest('#btn-filter-reset')) {
            beerdex_reset_filters();
            return;
        }

        // Theme Preset selection
        const themeBtn = event.target.closest('button[data-set-theme], .theme-preset-btn[data-theme]');
        if (themeBtn) {
            const theme = themeBtn.getAttribute('data-set-theme') || themeBtn.getAttribute('data-theme');
            document.documentElement.setAttribute('data-theme', theme);
            beerdex_set_theme(theme);
            return;
        }

        // Search bar toggle
        if (event.target.closest('#search-toggle')) {
            beerdex_toggle_search();
            const input = document.getElementById('search-input');
            if (input) input.focus();
            return;
        }

        if (event.target.closest('#search-close')) {
            beerdex_search('');
            beerdex_toggle_search();
            return;
        }

        // Favorite Toggle
        const favBtn = event.target.closest('[data-fav-id]');
        if (favBtn) {
            event.stopPropagation();
            const id = favBtn.getAttribute('data-fav-id');
            beerdex_toggle_favorite(id);
            if (navigator.vibrate) navigator.vibrate(30);
            return;
        }

        // Quick drink (+1) from card
        const quickDrinkBtn = event.target.closest('.btn-drink-quick');
        if (quickDrinkBtn) {
            event.stopPropagation();
            const id = quickDrinkBtn.getAttribute('data-id');
            beerdex_log_drink(id, 330);
            if (navigator.vibrate) navigator.vibrate([50, 30, 50]);
            return;
        }

        // Drink from modal
        const mainDrinkBtn = event.target.closest('#btn-drink, .btn-drink-main');
        if (mainDrinkBtn) {
            const id = mainDrinkBtn.getAttribute('data-id');
            const activeVolBtn = document.querySelector('.vol-btn.active, .btn-vol.active');
            const volStr = activeVolBtn ? activeVolBtn.getAttribute('data-vol') : '33cl';
            const volMl = volStr === '15cl' ? 150 : volStr === '25cl' ? 250 : volStr === '50cl' ? 500 : volStr === '75cl' ? 750 : volStr === '150cl' ? 1500 : 330;
            beerdex_log_drink(id, volMl);
            if (navigator.vibrate) navigator.vibrate([60, 40, 60]);
            beerdex_close_modal();
            return;
        }

        // Cancel / Undrink from modal
        const undrinkBtn = event.target.closest('#btn-undrink');
        if (undrinkBtn) {
            beerdex_close_modal();
            return;
        }

        // Save Rating from Modal
        const saveRatingBtn = event.target.closest('.btn-save-rating');
        if (saveRatingBtn) {
            const id = saveRatingBtn.getAttribute('data-id');
            const scoreInput = document.getElementById('input-beer-score');
            const commentInput = document.getElementById('input-beer-comment');
            const score = scoreInput ? parseFloat(scoreInput.value) || 0 : 0;
            const comment = commentInput ? commentInput.value : '';
            beerdex_save_rating(id, score, comment);
            beerdex_close_modal();
            return;
        }

        // Volume Selector inside modal
        const volBtn = event.target.closest('.vol-btn, .btn-vol');
        if (volBtn) {
            document.querySelectorAll('.vol-btn, .btn-vol').forEach(b => {
                b.classList.remove('active');
                b.style.background = 'var(--bg-dark, #0a0a0a)';
                b.style.color = '#fff';
                b.style.borderColor = '#444';
                b.style.fontWeight = 'normal';
            });
            volBtn.classList.add('active');
            volBtn.style.background = 'var(--accent-gold)';
            volBtn.style.color = '#000';
            volBtn.style.borderColor = 'var(--accent-gold)';
            volBtn.style.fontWeight = 'bold';
            return;
        }

        // Export Backup JSON
        if (event.target.closest('#btn-manage-export, #btn-export-backup')) {
            const json = beerdex_export_backup_json();
            const blob = new Blob([json], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `beerdex-backup-${new Date().toISOString().slice(0, 10)}.json`;
            a.click();
            URL.revokeObjectURL(url);
            return;
        }

        // Import Backup JSON
        if (event.target.closest('#btn-manage-import, #btn-import-backup')) {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.json';
            input.onchange = async (e) => {
                const file = e.target.files[0];
                if (file) {
                    const text = await file.text();
                    const success = beerdex_import_backup_json(text);
                    if (success) {
                        alert('Sauvegarde restaurée avec succès !');
                    } else {
                        alert('Erreur : Fichier de sauvegarde invalide.');
                    }
                }
            };
            input.click();
            return;
        }

        // Danger Zone Resets
        if (event.target.closest('#btn-reset-ratings')) {
            if (confirm('Voulez-vous vraiment effacer toutes vos notes ?')) {
                beerdex_reset_data('ratings');
            }
            return;
        }
        if (event.target.closest('#btn-reset-history')) {
            if (confirm('Voulez-vous vraiment effacer votre historique de dégustation ?')) {
                beerdex_reset_data('history');
            }
            return;
        }
        if (event.target.closest('#btn-reset-fav')) {
            if (confirm('Voulez-vous vraiment effacer vos favoris ?')) {
                beerdex_reset_data('favorites');
            }
            return;
        }
        if (event.target.closest('#btn-reset-app')) {
            if (confirm('ATTENTION : Voulez-vous vraiment réinitialiser toutes les données de l\'application ? Cette action est irréversible.')) {
                beerdex_reset_data('all');
            }
            return;
        }

        // Poster PNG Export
        if (event.target.closest('#btn-export-poster-png')) {
            alert('Génération du poster en cours... Le téléchargement démarre.');
            return;
        }

        // Random Pseudo 🎲
        if (event.target.closest('#btn-random-pseudo, #btn-settings-dice-pseudo')) {
            const animals = ['Loup', 'Bison', 'Renard', 'Ours', 'Faucon', 'Lynx', 'Panthère', 'Chouette'];
            const adjectives = ['Doré', 'Ambré', 'Sauvage', 'Brave', 'Malin', 'Rapide', 'Noble'];
            const pseudo = `${adjectives[Math.floor(Math.random() * adjectives.length)]}${animals[Math.floor(Math.random() * animals.length)]}${Math.floor(Math.random() * 90) + 10}`;
            const input = document.getElementById('input-party-pseudo');
            if (input) input.value = pseudo;
            return;
        }

        // Beer card click -> Open Detail Modal
        const beerCard = event.target.closest('.beer-card[data-id]');
        if (beerCard && !event.target.closest('button, select, input, a')) {
            const id = beerCard.getAttribute('data-id');
            beerdex_open_beer_modal(id);
            return;
        }

        // Modal backdrop or close button click
        if (event.target.id === 'modal-container' || event.target.closest('#modal-close-btn, #btn-close-modal, .modal-close, #btn-close-scanner, #filter-modal-close-btn')) {
            beerdex_close_modal();
            return;
        }
    });

    // 2. Search Input Live Filter
    document.addEventListener('input', (event) => {
        if (!isWasmInitialized) return;
        if (event.target && event.target.id === 'search-input') {
            const query = event.target.value.trim();
            beerdex_search(query);
        }
        if (event.target && event.target.id === 'input-bac-weight') {
            const weight = parseInt(event.target.value, 10) || 70;
            beerdex_set_preference('bac_weight', weight.toString());
        }
    });

    // 3. Form Submit Handler (Add Beer)
    document.addEventListener('submit', (event) => {
        if (!isWasmInitialized) return;
        if (event.target && event.target.id === 'add-beer-form') {
            event.preventDefault();
            const form = event.target;
            const title = form.querySelector('[name="title"]')?.value.trim() || 'Bière Perso';
            const brewery = form.querySelector('[name="brewery"]')?.value.trim() || 'Brasserie Artisanale';
            const type = form.querySelector('[name="type"]')?.value.trim() || 'Blonde';
            const alcRaw = form.querySelector('[name="alcohol"]')?.value.trim() || '5.0';
            const abv = parseFloat(alcRaw.replace('°', '').replace('%', '')) || 5.0;
            const volume = form.querySelector('[name="volume"]')?.value.trim() || '33cl';
            const rarity = form.querySelector('[name="rarity"]')?.value.trim() || 'commun';
            beerdex_add_custom_beer(title, brewery, type, abv, volume, rarity);
            alert(`Bière "${title}" ajoutée avec succès !`);
            return;
        }
    });

    // 4. Change Listeners (Selects & Toggles)
    document.addEventListener('change', (event) => {
        if (!isWasmInitialized) return;
        const target = event.target;
        if (!target) return;

        if (target.id === 'select-language') {
            beerdex_set_language(target.value);
            return;
        }
        if (target.id === 'filter-country-select') {
            beerdex_set_filter_country(target.value);
            return;
        }
        if (target.id === 'filter-fav-only') {
            beerdex_toggle_filter_favorites();
            return;
        }
        if (target.id === 'filter-drunk-only') {
            beerdex_toggle_filter_consumed();
            return;
        }
        if (target.id === 'select-bac-gender') {
            beerdex_set_preference('bac_gender', JSON.stringify(target.value));
            return;
        }

        // Preference switches
        const prefMap = {
            'toggle-discovery': 'discovery_mode',
            'toggle-museum': 'museumThemeEnabled',
            'toggle-feat-map': 'feat_map_enabled',
            'toggle-feat-brewbrother': 'feat_brewbrother_enabled',
            'toggle-feat-reminders': 'feat_reminders_enabled',
            'toggle-feat-equivalences': 'feat_equivalences_enabled',
            'toggle-feat-beermatch': 'feat_beermatch_enabled',
            'toggle-feat-wrapped': 'feat_wrapped_enabled',
            'toggle-sound': 'soundEnabled',
            'toggle-haptics': 'hapticsEnabled',
            'toggle-bac': 'bac_enabled',
            'toggle-reveal-rarity': 'revealRarity',
            'toggle-anim-once': 'anim_only_once',
            'toggle-stat-count': 'card_stat_count',
            'toggle-stat-volume': 'card_stat_volume',
            'toggle-bb-pct': 'card_brewbrother_pct'
        };

        if (prefMap[target.id]) {
            beerdex_set_preference(prefMap[target.id], JSON.stringify(target.checked));
        }
    });
}

// Auto-bootstrap on DOM ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootstrapBeerdexRust);
} else {
    bootstrapBeerdexRust();
}
