pub mod confetti;
pub mod state;
pub mod styles;
pub mod tilt;
pub mod views;
pub mod wasm;

use state::{AppState, AppView};

/// Renders the complete, self-contained HTML representation of the application shell.
pub fn render_app_shell(state: &AppState) -> String {
    let header_html = views::header::render_header(state);
    let nav_html = views::navbar::render_navbar(state);

    let view_content = match state.view {
        AppView::Home => views::dex::render_dex_view(state),
        AppView::Drunk => views::history::render_history_view(state),
        AppView::Stats => views::stats::render_stats_view(state),
        AppView::Beerpedia => views::beerpedia::render_beerpedia_view(state),
        AppView::Settings => views::settings::render_settings_view(state),
        AppView::Poster => views::poster::render_poster_view(state),
    };

    let modal_html = if let Some(ref beer) = state.selected_beer {
        views::modal::render_beer_modal(beer, state)
    } else {
        String::new()
    };

    let filter_modal_html = if state.show_filter_modal {
        views::filter_modal::render_filter_modal(state)
    } else {
        String::new()
    };

    let search_bar_class = if state.search_active || !state.search_query.is_empty() {
        "search-bar"
    } else {
        "search-bar hidden"
    };

    format!(
        r#"{header}
        <div id="search-bar" class="{search_bar_class}">
            <input type="text" id="search-input" value="{search_query}" placeholder="Rechercher une bière..." autocomplete="off">
            <button type="button" id="search-close" class="icon-btn" aria-label="Fermer la recherche">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
            </button>
        </div>
        <main id="main-content" class="scroll-container">
            {content}
        </main>
        {nav}
        {modal}
        {filter_modal}"#,
        header = header_html,
        search_bar_class = search_bar_class,
        search_query = state.search_query,
        content = view_content,
        nav = nav_html,
        modal = modal_html,
        filter_modal = filter_modal_html
    )
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_app_state_and_shell_rendering() {
        let mut app =
            AppState::new().expect("AppState should initialize cleanly with embedded catalogs");
        assert!(app.db.beers.len() > 1000);

        // Test rendering home view
        let home_html = render_app_shell(&app);
        assert!(home_html.contains("Beerdex"));
        assert!(home_html.contains("beer-grid"));

        // Test logging drink and updating state
        let beer_id = app.db.beers[0].resolved_id();
        app.log_drink(&beer_id, 330);

        assert_eq!(app.storage.get_user_data(&beer_id).unwrap().count, 1);

        // Switch to Stats view
        app.view = AppView::Stats;
        let stats_html = render_app_shell(&app);
        assert!(stats_html.contains("Gamer Stats IRL"));
        assert!(stats_html.contains("Volume Consommé"));
    }
}
