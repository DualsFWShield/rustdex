use crate::state::{AppState, AppView};

pub fn render_navbar(state: &AppState) -> String {
    let active_home = if state.view == AppView::Home {
        "active"
    } else {
        ""
    };
    let active_drunk = if state.view == AppView::Drunk {
        "active"
    } else {
        ""
    };
    let active_stats = if state.view == AppView::Stats {
        "active"
    } else {
        ""
    };
    let active_beerpedia = if state.view == AppView::Beerpedia {
        "active"
    } else {
        ""
    };
    let active_settings = if state.view == AppView::Settings {
        "active"
    } else {
        ""
    };

    let t_home = state.i18n.t("nav_home");
    let t_history = state.i18n.t("nav_history");
    let t_stats = state.i18n.t("nav_stats");
    let t_beerpedia = state.i18n.t("nav_beerpedia");
    let t_settings = state.i18n.t("nav_settings");

    format!(
        r#"<nav class="bottom-nav">
            <button type="button" class="nav-item {active_home}" data-view="home">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
                <span>{t_home}</span>
            </button>
            <button type="button" class="nav-item {active_drunk}" data-view="drunk">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 21.5C16.9706 21.5 21 17.2467 21 12C21 6.75329 16.9706 2.5 12 2.5C7.02944 2.5 3 6.75329 3 12C3 17.2467 7.02944 21.5 12 21.5Z" /><path d="M9 12L11 14L15 10" /></svg>
                <span>{t_history}</span>
            </button>
            <button type="button" class="nav-item {active_stats}" data-view="stats">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>
                <span>{t_stats}</span>
            </button>
            <button type="button" class="nav-item {active_beerpedia}" data-view="beerpedia">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>
                <span>{t_beerpedia}</span>
            </button>
            <button type="button" class="nav-item {active_settings}" data-view="settings">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
                <span>{t_settings}</span>
            </button>
        </nav>"#
    )
}
