use crate::state::AppState;
use beerdex_core::achievements::{AchievementEngine, UserAchievementStats};

pub fn render_stats_view(state: &AppState) -> String {
    let bac = state.current_bac();
    let gamer_stats = state.current_gamer_stats();

    let ach_stats = UserAchievementStats::compute(&state.storage.ratings, &state.db.beers, None);
    let all_achievements = AchievementEngine::all_definitions();

    let unlocked_count = all_achievements
        .iter()
        .filter(|a| AchievementEngine::is_unlocked(a.id, &ach_stats))
        .count();

    let total_liters = ach_stats.total_liters;
    let bathtubs = (total_liters / 150.0).floor() as u32;
    let kegs = (total_liters / 50.0).floor() as u32;

    let mut html = String::with_capacity(4000);

    // 1. BAC & Drive Status Section
    html.push_str(&format!(
        r#"<div class="stats-card bac-stats-panel">
            <h2 class="stats-section-title">📊 {title_bac}</h2>
            <div class="bac-display-hero">
                <div class="bac-value" style="color: {color};">{bac:.2} <span class="unit">g/L</span></div>
                <div class="bac-rank-badge" style="background: {color}22; color: {color}; border: 1px solid {color};">
                    {rank_title}
                </div>
            </div>
        </div>"#,
        title_bac = state.i18n.t("nav_stats"),
        color = gamer_stats.rank_color,
        bac = bac,
        rank_title = state.i18n.t(gamer_stats.rank_key)
    ));

    // 2. Gamer Mode HUD
    html.push_str(&format!(
        r#"<div class="stats-card gamer-hud-card">
            <h2 class="stats-section-title">🎮 Gamer Stats IRL</h2>
            <div class="gamer-grid">
                <div class="gamer-stat">
                    <span class="gamer-stat-label">PING</span>
                    <span class="gamer-stat-val">{ping} ms</span>
                </div>
                <div class="gamer-stat">
                    <span class="gamer-stat-label">FPS</span>
                    <span class="gamer-stat-val">{fps}</span>
                </div>
                <div class="gamer-stat">
                    <span class="gamer-stat-label">AIM ASSIST</span>
                    <span class="gamer-stat-val">{aim}%</span>
                </div>
                <div class="gamer-stat">
                    <span class="gamer-stat-label">FOV</span>
                    <span class="gamer-stat-val">{fov}°</span>
                </div>
            </div>
            <div class="gamer-setup-row">
                <div><span>Setup: </span><strong>{setup}</strong></div>
                <div><span>Résolution: </span><strong>{res}</strong></div>
            </div>
        </div>"#,
        ping = gamer_stats.ping,
        fps = gamer_stats.fps,
        aim = gamer_stats.aim_assist,
        fov = gamer_stats.fov,
        setup = state.i18n.t(gamer_stats.setup_key),
        res = state.i18n.t(gamer_stats.resolution_key)
    ));

    // 3. Volume Equivalences
    html.push_str(&format!(
        r#"<div class="stats-card volume-card">
            <h2 class="stats-section-title">🍺 Volume Consommé</h2>
            <div class="volume-equivalences">
                <div class="volume-stat">
                    <span class="vol-icon">💧</span>
                    <span class="vol-number">{liters:.1} L</span>
                    <span class="vol-label">Total bu</span>
                </div>
                <div class="volume-stat">
                    <span class="vol-icon">🛢️</span>
                    <span class="vol-number">{kegs}</span>
                    <span class="vol-label">Fûts</span>
                </div>
                <div class="volume-stat">
                    <span class="vol-icon">🛁</span>
                    <span class="vol-number">{bathtubs}</span>
                    <span class="vol-label">Baignoires</span>
                </div>
            </div>
        </div>"#,
        liters = total_liters,
        kegs = kegs,
        bathtubs = bathtubs
    ));

    // 4. Achievements Section
    html.push_str(&format!(
        r#"<div class="stats-card achievements-card">
            <div class="achievements-header">
                <h2 class="stats-section-title">🏆 Succès & Trophées</h2>
                <span class="badge badge-gold">{unlocked} / {total}</span>
            </div>
            <div class="achievements-grid">"#,
        unlocked = unlocked_count,
        total = all_achievements.len()
    ));

    for ach in &all_achievements {
        let is_unlocked = AchievementEngine::is_unlocked(ach.id, &ach_stats);
        let status_class = if is_unlocked { "unlocked" } else { "locked" };
        let title = state.i18n.t(ach.title_key);
        let desc = state.i18n.t(ach.desc_key);

        html.push_str(&format!(
            r#"<div class="achievement-badge {status_class}">
                <div class="ach-icon">{icon}</div>
                <div class="ach-info">
                    <div class="ach-title">{title}</div>
                    <div class="ach-desc">{desc}</div>
                </div>
            </div>"#,
            status_class = status_class,
            icon = ach.icon,
            title = title,
            desc = desc
        ));
    }

    html.push_str("</div></div>");
    html
}
