import init, {
    wasm_init,
    beerdex_switch_view,
    beerdex_toggle_view_mode,
    beerdex_search,
    beerdex_log_drink,
    beerdex_toggle_favorite,
    beerdex_open_beer_modal,
    beerdex_close_modal,
    beerdex_get_current_bac
} from '../wasm/beerdex_app.js';

let isWasmInitialized = false;

export async function bootstrapBeerdexRust() {
    try {
        console.log('[Beerdex Rust] Initializing WebAssembly Core...');
        await init('./wasm/beerdex_app_bg.wasm');
        wasm_init();
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

        // Search bar toggle
        if (event.target.closest('#search-toggle')) {
            const searchBar = document.getElementById('search-bar');
            if (searchBar) {
                searchBar.classList.toggle('hidden');
                if (!searchBar.classList.contains('hidden')) {
                    const input = document.getElementById('search-input');
                    if (input) input.focus();
                }
            }
            return;
        }

        if (event.target.closest('#search-close')) {
            const searchBar = document.getElementById('search-bar');
            if (searchBar) searchBar.classList.add('hidden');
            beerdex_search('');
            return;
        }

        // Favorite Toggle
        const favBtn = event.target.closest('[data-fav-id]');
        if (favBtn) {
            event.stopPropagation();
            const id = favBtn.getAttribute('data-fav-id');
            const isFav = beerdex_toggle_favorite(id);
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
        const mainDrinkBtn = event.target.closest('.btn-drink-main');
        if (mainDrinkBtn) {
            const id = mainDrinkBtn.getAttribute('data-id');
            const activeVolBtn = document.querySelector('.btn-vol.active');
            const volStr = activeVolBtn ? activeVolBtn.getAttribute('data-vol') : '33cl';
            const volMl = volStr === '25cl' ? 250 : volStr === '50cl' ? 500 : 330;
            beerdex_log_drink(id, volMl);
            if (navigator.vibrate) navigator.vibrate([60, 40, 60]);
            beerdex_close_modal();
            return;
        }

        // Volume Selector inside modal
        const volBtn = event.target.closest('.btn-vol');
        if (volBtn) {
            document.querySelectorAll('.btn-vol').forEach(b => b.classList.remove('active'));
            volBtn.classList.add('active');
            return;
        }

        // Beer card click -> Open Detail Modal
        const beerCard = event.target.closest('.beer-card[data-id], .beer-list-item[data-id]');
        if (beerCard && !event.target.closest('button')) {
            const id = beerCard.getAttribute('data-id');
            beerdex_open_beer_modal(id);
            return;
        }

        // Modal close
        if (event.target.closest('#modal-close-btn') || event.target.id === 'beer-detail-modal') {
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
    });
}

// Auto-bootstrap on DOM ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootstrapBeerdexRust);
} else {
    bootstrapBeerdexRust();
}
