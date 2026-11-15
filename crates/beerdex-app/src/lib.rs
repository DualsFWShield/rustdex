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
        AppView::Home | AppView::Drunk => views::dex::render_dex_view(state),
        AppView::Stats => views::stats::render_stats_view(state),
        AppView::Settings => views::settings::render_settings_view(state),
        AppView::Beerpedia => {
            r#"<div class="beerpedia-container" style="text-align: center; padding: 40px;">
                <h2>📚 Beerpedia</h2>
                <p>L'encyclopédie interactive zythologique.</p>
            </div>"#
                .to_string()
        }
        AppView::Poster => {
            r#"<div class="poster-container" style="text-align: center; padding: 40px;">
                <h2>🖼️ Générateur de Posters</h2>
                <p>Exportation haute définition de votre collection.</p>
            </div>"#
                .to_string()
        }
    };

    let modal_html = if let Some(ref beer) = state.selected_beer {
        views::modal::render_beer_modal(beer, state)
    } else {
        String::new()
    };

    format!(
        r#"<div id="app">
            {header}
            <main id="main-content" class="scroll-container">
                {content}
            </main>
            {nav}
            {modal}
        </div>"#,
        header = header_html,
        content = view_content,
        nav = nav_html,
        modal = modal_html
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
