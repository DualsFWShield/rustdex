use crate::state::AppState;
use beerdex_core::achievements::UserAchievementStats;

/// Renders the complete, chronological consumption history view ("Bus").
pub fn render_history_view(state: &AppState) -> String {
    let ach_stats = UserAchievementStats::compute(&state.storage.ratings, &state.db.beers, None);

    let mut history_entries = Vec::new();

    for (beer_id, user_data) in &state.storage.ratings {
        if let Some(beer) = state.db.find_by_id(beer_id) {
            for entry in &user_data.history {
                history_entries.push((entry.date.clone(), entry.volume, beer, user_data.score));
            }
        }
    }

    // Sort descending by date
    history_entries.sort_by(|a, b| b.0.cmp(&a.0));

    let mut html = String::with_capacity(4000);
    html.push_str(r#"<div class="history-container" style="max-width: 800px; margin: 0 auto; padding: 16px; display: flex; flex-direction: column; gap: 16px;">"#);

    // Résumé du carnet de bord
    html.push_str(&format!(
        r#"<div class="history-summary-card" style="background: linear-gradient(135deg, rgba(255, 192, 0, 0.1), rgba(20, 20, 20, 0.95)); border: 1px solid var(--border-color); border-radius: 16px; padding: 16px 20px; display: flex; justify-content: space-between; align-items: center;">
            <div>
                <div style="font-size: 0.8rem; color: #aaa; text-transform: uppercase; font-weight: bold;">Carnet de Dégustation</div>
                <div style="font-size: 1.4rem; font-weight: 800; color: var(--accent-gold); font-family: Russo One, sans-serif;">{total_drinks} dégustations</div>
            </div>
            <div style="text-align: right;">
                <div style="font-size: 1.1rem; font-weight: 700; color: #fff;">{liters:.1} L</div>
                <div style="font-size: 0.75rem; color: #888;">{unique} bières uniques</div>
            </div>
        </div>"#,
        total_drinks = ach_stats.total_count,
        liters = ach_stats.total_liters,
        unique = ach_stats.unique_count
    ));

    if history_entries.is_empty() {
        html.push_str(
            r#"<div class="empty-state" style="text-align: center; padding: 60px 20px;">
                <div style="font-size: 3.5rem; margin-bottom: 12px;">🍻</div>
                <h3 style="color: #fff; margin-bottom: 6px;">Aucune dégustation enregistrée</h3>
                <p style="color: var(--text-secondary); font-size: 0.95rem; margin: 0;">Savourez votre première bière et ajoutez-la depuis le Dex pour débuter votre journal !</p>
            </div>"#,
        );
    } else {
        html.push_str(r#"<div class="history-list" style="display: flex; flex-direction: column; gap: 10px;">"#);

        for (date_str, volume, beer, score) in history_entries.iter().take(50) {
            let img = beer.image.as_deref().unwrap_or("images/beer/default.png");
            let score_badge = if let Some(sc) = score {
                format!(r#"<span class="badge" style="background: rgba(255,192,0,0.15); color: var(--accent-gold); font-weight: bold; padding: 2px 6px; border-radius: 4px; font-size: 0.75rem;">⭐ {:.1}/20</span>"#, sc)
            } else {
                String::new()
            };

            let formatted_date = if date_str.len() >= 10 {
                &date_str[0..10]
            } else {
                date_str
            };

            html.push_str(&format!(
                r#"<div class="beer-list-item" data-id="{id}" style="display:flex; align-items:center; gap:12px; background:var(--bg-card); border:1px solid var(--border-color); border-radius:12px; padding:12px 14px; cursor:pointer;">
                    <img src="{img}" onerror="this.src='images/beer/default.png'" alt="{title}" style="width:40px; height:55px; object-fit:contain;">
                    <div style="flex:1; min-width:0;">
                        <div style="font-weight:700; color:#fff; font-size:0.95rem; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">{title}</div>
                        <div style="font-size:0.75rem; color:#888;">{brewery} • {abv}° • {vol}ml</div>
                    </div>
                    <div style="display:flex; flex-direction:column; align-items:flex-end; gap:4px;">
                        {score_badge}
                        <span style="font-size:0.7rem; color:#666;">{formatted_date}</span>
                    </div>
                </div>"#,
                id = beer.resolved_id(),
                img = img,
                title = beer.title,
                brewery = beer.brewery,
                abv = beer.parsed_abv(),
                vol = volume,
                score_badge = score_badge,
                formatted_date = formatted_date
            ));
        }

        html.push_str("</div>");
    }

    html.push_str("</div>");
    html
}
