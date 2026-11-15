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
                <span id="offline-badge" class="offline-badge">RUST NATIVE</span>
            </div>
            <div class="header-toolbar" style="display: flex; gap: 10px; align-items: center;">
                <button type="button" id="filter-toggle" class="icon-btn" aria-label="Filtres">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
                    </svg>
                </button>
                <button type="button" id="view-toggle" class="icon-btn" aria-label="Vue">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        {view_mode_icon}
                    </svg>
                </button>
                <div id="header-search-container" style="display:flex; align-items:center;">
                    <button type="button" id="search-toggle" class="icon-btn" aria-label="Recherche">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
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
