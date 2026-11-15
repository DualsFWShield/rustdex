use crate::state::AppState;
use beerdex_core::achievements::{AchievementEngine, UserAchievementStats};

/// Renders the complete, comprehensive Statistics, Donut Chart & Gamification HUD.
pub fn render_stats_view(state: &AppState) -> String {
    let bac = state.current_bac();
    let gamer_stats = state.current_gamer_stats();

    let ach_stats = UserAchievementStats::compute(&state.storage.ratings, &state.db.beers, None);
    let all_achievements = AchievementEngine::all_definitions();

    let unlocked_count = all_achievements
        .iter()
        .filter(|a| AchievementEngine::is_unlocked(a.id, &ach_stats))
        .count();

    let total_beers = state.db.beers.len();
    let unique_drunk = ach_stats.unique_count as usize;
    let total_drunk_count = ach_stats.total_count;
    let dex_percentage = if total_beers > 0 {
        ((unique_drunk as f64 / total_beers as f64) * 100.0).round() as u32
    } else {
        0
    };

    let total_liters = ach_stats.total_liters;
    let pure_alcohol_liters = total_liters * 0.065; // Moyenne indicative 6.5°
    let standard_glasses = (total_liters * 1000.0 / 250.0).round() as u32;
    let kegs = (total_liters / 50.0).floor() as u32;
    let bathtubs = (total_liters / 150.0).floor() as u32;

    // Calcul de l'évolution du rang TCG / Valorant selon le % de succès
    let ach_percentage = if !all_achievements.is_empty() {
        (unlocked_count as f64 / all_achievements.len() as f64) * 100.0
    } else {
        0.0
    };

    let (rank_name, rank_stroke, rank_glow) = if ach_percentage >= 100.0 {
        (
            "RADIANT ZYTHOLOGUE",
            "#ff00ff",
            "0 0 30px rgba(255, 0, 255, 0.8)",
        )
    } else if ach_percentage >= 80.0 {
        ("DIAMANT", "#00ffff", "0 0 25px rgba(0, 255, 255, 0.6)")
    } else if ach_percentage >= 60.0 {
        ("OR ÉLITE", "#ffd700", "0 0 20px rgba(255, 215, 0, 0.5)")
    } else if ach_percentage >= 40.0 {
        (
            "ARGENT EXPERT",
            "#c0c0c0",
            "0 0 15px rgba(192, 192, 192, 0.4)",
        )
    } else if ach_percentage >= 20.0 {
        (
            "BRONZE AMATEUR",
            "#cd7f32",
            "0 0 12px rgba(205, 127, 50, 0.4)",
        )
    } else {
        (
            "NOVICE EXPLORATEUR",
            "#888888",
            "0 0 8px rgba(0, 0, 0, 0.3)",
        )
    };

    let mut html = String::with_capacity(8000);
    html.push_str(r#"<div class="stats-container">"#);

    // 1. Donut Chart Progression & Rang
    html.push_str(&format!(
        r##"<div class="stats-card progression-hero-card" style="text-align: center; padding: 24px;">
            <h2 class="stats-section-title" style="justify-content: center;">🏆 Progression de la Collection</h2>
            
            <div style="width: 170px; height: 170px; margin: 15px auto; position: relative; border-radius: 50%; box-shadow: {rank_glow};">
                <svg viewBox="0 0 36 36" style="width: 100%; height: 100%; transform: rotate(-90deg);">
                    <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#222" stroke-width="3" stroke-dasharray="100, 100" />
                    <path stroke-dasharray="{dex_pct}, 100" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="{rank_stroke}" stroke-width="3" style="transition: stroke-dasharray 1s ease-out;" />
                </svg>
                <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); text-align: center;">
                    <div style="font-size: 2rem; font-weight: 800; color: #fff;">{dex_pct}%</div>
                    <div style="font-size: 0.7rem; color: #aaa; text-transform: uppercase;">Complété</div>
                </div>
            </div>

            <div style="font-size: 1.1rem; font-weight: 700; color: {rank_stroke}; margin-bottom: 15px; letter-spacing: 1px;">
                {rank_name}
            </div>

            <!-- Grille des métriques clés -->
            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-top: 20px;">
                <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); padding: 12px 6px; border-radius: 12px;">
                    <div style="font-size: 1.3rem; font-weight: 700; color: var(--accent-gold);">{unique_drunk}</div>
                    <div style="font-size: 0.7rem; color: #888;">Bières uniques</div>
                </div>
                <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); padding: 12px 6px; border-radius: 12px;">
                    <div style="font-size: 1.3rem; font-weight: 700; color: #fff;">{total_drunk_count}</div>
                    <div style="font-size: 0.7rem; color: #888;">Total bues</div>
                </div>
                <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); padding: 12px 6px; border-radius: 12px;">
                    <div style="font-size: 1.3rem; font-weight: 700; color: #2ecc71;">{total_beers}</div>
                    <div style="font-size: 0.7rem; color: #888;">Dans le Dex</div>
                </div>
            </div>
        </div>"##,
        rank_glow = rank_glow,
        rank_stroke = rank_stroke,
        dex_pct = dex_percentage,
        rank_name = rank_name,
        unique_drunk = unique_drunk,
        total_drunk_count = total_drunk_count,
        total_beers = total_beers
    ));

    // 2. BAC & Drive Status Section
    let drive_status = if bac <= 0.05 {
        ("✅ Conduite autorisée", "#2ecc71")
    } else if bac < 0.5 {
        ("⚠️ Vigilance recommandée", "#f1c40f")
    } else {
        ("🚫 Conduite strictement interdite", "#e74c3c")
    };

    html.push_str(&format!(
        r#"<div class="stats-card bac-stats-panel">
            <h2 class="stats-section-title">📊 {title_bac}</h2>
            <div class="bac-display-hero">
                <div>
                    <div class="bac-value" style="color: {color};">{bac:.2} <span class="unit">g/L</span></div>
                    <div style="font-size: 0.8rem; color: {drive_color}; font-weight: 600; margin-top: 4px;">{drive_text}</div>
                </div>
                <div class="bac-rank-badge" style="background: {color}22; color: {color}; border: 1px solid {color};">
                    {rank_title}
                </div>
            </div>
        </div>"#,
        title_bac = state.i18n.t_or("nav_stats", "Alcoolémie & Aptitude"),
        color = gamer_stats.rank_color,
        bac = bac,
        drive_color = drive_status.1,
        drive_text = drive_status.0,
        rank_title = state.i18n.t_or(gamer_stats.rank_key, "Novice")
    ));

    // 3. Gamer Mode HUD
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
                <div><span>Setup : </span><strong>{setup}</strong></div>
                <div><span>Résolution : </span><strong>{res}</strong></div>
            </div>
        </div>"#,
        ping = gamer_stats.ping,
        fps = gamer_stats.fps,
        aim = gamer_stats.aim_assist,
        fov = gamer_stats.fov,
        setup = state.i18n.t_or(gamer_stats.setup_key, "Standard"),
        res = state.i18n.t_or(gamer_stats.resolution_key, "Full HD")
    ));

    // 4. Volume & Équivalences Ludiques
    html.push_str(&format!(
        r#"<div class="stats-card volume-card">
            <h2 class="stats-section-title">🍺 Volume Consommé & Équivalences</h2>
            <div class="volume-equivalences">
                <div class="volume-stat">
                    <span class="vol-icon">💧</span>
                    <span class="vol-number">{liters:.1} L</span>
                    <span class="vol-label">Volume total</span>
                </div>
                <div class="volume-stat">
                    <span class="vol-icon">🧪</span>
                    <span class="vol-number">{pure_alc:.2} L</span>
                    <span class="vol-label">Alcool pur</span>
                </div>
                <div class="volume-stat">
                    <span class="vol-icon">🥂</span>
                    <span class="vol-number">{std_glasses}</span>
                    <span class="vol-label">Verres standards</span>
                </div>
            </div>
            <div class="volume-equivalences" style="margin-top: 10px;">
                <div class="volume-stat">
                    <span class="vol-icon">🛢️</span>
                    <span class="vol-number">{kegs}</span>
                    <span class="vol-label">Fûts (50L)</span>
                </div>
                <div class="volume-stat">
                    <span class="vol-icon">🛁</span>
                    <span class="vol-number">{bathtubs}</span>
                    <span class="vol-label">Baignoires (150L)</span>
                </div>
                <div class="volume-stat">
                    <span class="vol-icon">🏊</span>
                    <span class="vol-number">{pools:.4}</span>
                    <span class="vol-label">Piscine Olympique</span>
                </div>
            </div>
        </div>"#,
        liters = total_liters,
        pure_alc = pure_alcohol_liters,
        std_glasses = standard_glasses,
        kegs = kegs,
        bathtubs = bathtubs,
        pools = total_liters / 2_500_000.0
    ));

    // 5. Succès & Trophées complets
    html.push_str(&format!(
        r#"<div class="stats-card achievements-card">
            <div class="achievements-header">
                <h2 class="stats-section-title">🏆 Succès & Trophées</h2>
                <span class="badge badge-gold" style="background: var(--accent-gold); color: #000; padding: 4px 10px; border-radius: 12px; font-weight: bold; font-size: 0.8rem;">{unlocked} / {total}</span>
            </div>
            <div class="achievements-grid">"#,
        unlocked = unlocked_count,
        total = all_achievements.len()
    ));

    for ach in &all_achievements {
        let is_unlocked = AchievementEngine::is_unlocked(ach.id, &ach_stats);
        let status_class = if is_unlocked { "unlocked" } else { "locked" };
        let title = state.i18n.t_or(ach.title_key, ach.id);
        let desc = state.i18n.t_or(ach.desc_key, "");

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

    html.push_str("</div></div></div>");
    html
}
