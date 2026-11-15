use crate::state::{AppState, ViewMode};

pub fn render_header(state: &AppState) -> String {
    let view_mode_icon = match state.view_mode {
        ViewMode::Grid => {
            r#"<rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect>"#
        }
        ViewMode::List => {
            r#"<line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line>"#
        }
    };

    format!(
        r#"<header class="app-header">
            <div class="logo">
                <img src="icons/logo-bnr.png" width="32" height="32" alt="Beerdex Logo">
                <h1>Beerdex</h1>
                <div id="header-party-widget" class="header-party-widget" style="display: none;">
                    <button type="button" id="header-party-btn" class="header-party-pill" title="Afficher le QR Code de la Party">
                        <span class="party-pulse-dot"></span>
                        <span class="party-code" id="header-party-code">------</span>
                        <svg class="party-qr-icon" width="13" height="13" viewBox="0 0 16 16" fill="currentColor">
                            <path d="M2 2h2v2H2z"/><path d="M6 0v6H0V0zM5 1H1v4h4zM4 12H2v2h2z"/><path d="M6 10v6H0v-6zm-5 1v4h4v-4zm11-9h2v2h-2z"/><path d="M10 0v6h6V0zm5 1v4h-4V1zM8 1V0h1v2H8v2H7V1zm0 5V4h1v2zM6 8V7h1V6h1v2h1V7h5v1h-4v1H7V8zm0 0v1H2V8H1v1H0V7h3v1zm10 1h-1V7h1zm-1 0h-1v2h2v-1h-1zm-4 0h2v1h-1v1h-1zm2 3v-1h-1v1h-1v1H9v1h3v-2zm0 0h3v1h-2v1h-1zm-4-1v1h1v-2H7v1z"/><path d="M7 12h1v3h4v1H7zm9 2v2h-3v-1h2v-1z"/>
                        </svg>
                    </button>
                    <button type="button" id="header-party-close-btn" class="header-party-close" title="Arrêter / Quitter la Party" aria-label="Fermer la Party">&times;</button>
                </div>
                <span id="offline-badge" class="offline-badge" data-i18n="status_offline">Hors ligne</span>
            </div>
            <div class="header-toolbar" style="display: flex; gap: 10px; align-items: center;">
                <button type="button" id="filter-toggle" class="icon-btn" aria-label="Ouvrir les filtres" data-i18n-label="aria_open_filters">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                        <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
                    </svg>
                </button>
                <button type="button" id="view-toggle" class="icon-btn" aria-label="Changer la vue" title="Vue Carte / Liste" data-i18n-label="aria_change_view">
                    <svg id="view-toggle-icon" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                        {view_mode_icon}
                    </svg>
                </button>
                <button type="button" id="btn-add-header" class="icon-btn" aria-label="Ajouter manuellement" data-i18n-label="aria_add_manual">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <line x1="12" y1="5" x2="12" y2="19"></line>
                        <line x1="5" y1="12" x2="19" y2="12"></line>
                    </svg>
                </button>
                <div id="header-search-container" style="display:flex; align-items:center; transition: all 0.3s;">
                    <button type="button" id="search-toggle" class="icon-btn" aria-label="Ouvrir la recherche" data-i18n-label="aria_open_search">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                            <circle cx="11" cy="11" r="8"></circle>
                            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                        </svg>
                    </button>
                </div>
            </div>
        </header>"#,
        view_mode_icon = view_mode_icon
    )
}
