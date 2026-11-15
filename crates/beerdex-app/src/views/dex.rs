use crate::state::{AppState, ViewMode};
use beerdex_core::rarity::calculate_rarity;

pub fn render_dex_view(state: &AppState) -> String {
    let beers = state.get_filtered_beers();
    let is_list = state.view_mode == ViewMode::List;
    let container_class = if is_list { "beer-list" } else { "beer-grid" };

    let mut html = String::with_capacity(beers.len() * 400 + 100);

    // BAC Home Widget
    let bac = state.current_bac();
    if bac > 0.05 {
        let gamer_stats = state.current_gamer_stats();
        let bac_str = format!("{:.2}", bac);
        html.push_str(&format!(
            r#"<div class="bac-widget-home" style="background: linear-gradient(135deg, var(--bg-card), var(--bg-card-hover)); border-left: 5px solid {color}; padding: 15px; border-radius: 12px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center; border: 1px solid var(--border-color);">
                <div>
                    <div style="font-size: 0.75rem; color: #aaa; text-transform: uppercase; font-weight: bold;">{title}</div>
                    <div style="font-size: 1.1rem; font-weight: 700; color: {color};">{bac_val} g/L <span style="font-size: 0.85rem; color: #bbb;">({rank})</span></div>
                </div>
                <div style="font-size: 1.3rem;">🍺</div>
            </div>"#,
            color = gamer_stats.rank_color,
            title = state.i18n.t("bac_speculative_title"),
            bac_val = bac_str,
            rank = state.i18n.t(gamer_stats.rank_key)
        ));
    }

    html.push_str(&format!(r#"<div class="{}">"#, container_class));

    if beers.is_empty() {
        html.push_str(&format!(
            r#"<div class="empty-state" style="grid-column: 1/-1; text-align: center; padding: 40px;">
                <p style="color: var(--text-secondary); font-size: 1.1rem;">{}</p>
            </div>"#,
            state.i18n.t("no_beers_found")
        ));
    } else {
        for beer in beers.iter().take(100) {
            let id = beer.resolved_id();
            let user_data = state.storage.get_user_data(&id);
            let count = user_data.map(|d| d.count).unwrap_or(0);
            let is_fav = state.storage.is_favorite(&id);
            let rarity_res = calculate_rarity(beer);

            let img_src = beer
                .image
                .as_deref()
                .filter(|s| !s.trim().is_empty())
                .unwrap_or("images/beer/default.png");

            let fav_class = if is_fav {
                "favorite active"
            } else {
                "favorite"
            };
            let fav_icon = if is_fav { "❤️" } else { "🤍" };

            let count_badge = if count > 0 {
                format!(r#"<span class="drunk-badge">x{}</span>"#, count)
            } else {
                format!(
                    r#"<button class="btn-drink-quick" data-id="{}">{}</button>"#,
                    id,
                    state.i18n.t("btn_drink_quick")
                )
            };

            if is_list {
                html.push_str(&format!(
                    r#"<div class="beer-list-item" data-id="{id}">
                        <img src="{img_src}" onerror="this.src='images/beer/default.png'" alt="{title}" class="list-thumb">
                        <div class="list-info">
                            <div class="list-title">{title}</div>
                            <div class="list-brewery">{brewery} • {abv}°</div>
                        </div>
                        <div class="list-actions">
                            <button class="{fav_class}" data-fav-id="{id}">{fav_icon}</button>
                            {count_badge}
                        </div>
                    </div>"#,
                    id = id,
                    img_src = img_src,
                    title = beer.title,
                    brewery = beer.brewery,
                    abv = beer.parsed_abv(),
                    fav_class = fav_class,
                    fav_icon = fav_icon,
                    count_badge = count_badge
                ));
            } else {
                html.push_str(&format!(
                    r#"<div class="beer-card" data-id="{id}" data-rarity="{rarity}" data-tilt>
                        <div class="card-badges">
                            <span class="badge badge-style">{style}</span>
                            <span class="badge badge-abv">{abv}°</span>
                            <button class="{fav_class}" data-fav-id="{id}">{fav_icon}</button>
                        </div>
                        <div class="card-img-wrap">
                            <img src="{img_src}" onerror="this.src='images/beer/default.png'" alt="{title}" class="beer-img" loading="lazy">
                        </div>
                        <div class="card-body">
                            <h3 class="beer-title">{title}</h3>
                            <p class="beer-brewery">{brewery}</p>
                        </div>
                        <div class="card-footer">
                            <span class="rarity-tag rarity-{rarity}">{rarity_label}</span>
                            {count_badge}
                        </div>
                    </div>"#,
                    id = id,
                    rarity = rarity_res.rarity,
                    style = beer.beer_type,
                    abv = beer.parsed_abv(),
                    fav_class = fav_class,
                    fav_icon = fav_icon,
                    img_src = img_src,
                    title = beer.title,
                    brewery = beer.brewery,
                    rarity_label = rarity_res.rarity.to_uppercase(),
                    count_badge = count_badge
                ));
            }
        }
    }

    html.push_str("</div>");
    html
}
