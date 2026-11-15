use crate::state::{AppState, ViewMode};
use beerdex_core::rarity::calculate_rarity;

pub fn render_dex_view(state: &AppState) -> String {
    let beers = state.get_filtered_beers();
    let is_list = state.view_mode == ViewMode::List;
    let container_class = if is_list {
        "beer-grid view-list"
    } else {
        "beer-grid"
    };

    let mut html = String::with_capacity(beers.len() * 400 + 100);

    // BAC Home Widget (Always displayed on Dex home, matching beerdex.be)
    let bac = state.current_bac();
    let (status_text, color) = if bac < 0.2 {
        ("Sobre", "#4CAF50")
    } else if bac < 0.5 {
        ("Euphorie", "#8BC34A")
    } else if bac < 0.8 {
        ("Légère ivresse", "#FF9800")
    } else {
        ("Ébriété", "#F44336")
    };
    let expired_air = bac / 2.0;

    html.push_str(&format!(
        r#"<div class="bac-widget-home" style="background: linear-gradient(135deg, var(--bg-card), var(--bg-card-hover)); border-left: 5px solid {color}; padding: 15px; border-radius: 12px; margin: 0 0 20px 0; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 8px 16px rgba(0,0,0,0.5); border: 1px solid var(--border-color); border-left: 5px solid {color};">
            <div>
                <div style="font-size: 0.7rem; color: #aaa; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 5px; font-weight: bold;">ALCOOLÉMIE SPÉCULATIVE</div>
                <div style="font-size: 1.1rem; font-weight: 700; color: {color}; text-shadow: 0 0 10px {color}44;">
                    {status} <span style="font-size: 0.9rem; color: #fff; font-weight: normal; margin-left: 5px;">({bac:.2} g/l)</span>
                </div>
                <div style="font-size: 0.75rem; color: #888; margin-top: 5px;">
                    Air expiré: <span style="color: {color}; font-weight: bold;">{expired_air:.2}</span> mg/l
                </div>
            </div>
            <div style="background: {color}22; width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 1px solid {color}44;">
                <span style="font-size: 1.2rem;">🩸</span>
            </div>
        </div>"#,
        color = color,
        status = status_text,
        bac = bac,
        expired_air = expired_air
    ));

    html.push_str(&format!(r#"<div class="{}">"#, container_class));

    if beers.is_empty() {
        if state.view == crate::state::AppView::Drunk {
            html.push_str(
                r#"<div style="text-align:center; padding: 50px 20px; color: #888; grid-column: 1/-1;">
                    <div style="font-size: 3rem; margin-bottom: 20px;">🕵️‍♂️</div>
                    <h3 style="color:#fff; font-family: Outfit, sans-serif;">Mode Découverte</h3>
                    <p style="margin-top: 10px; color:#aaa;">Votre collection est vide.</p>
                    <p style="font-size: 0.8rem; margin-top: 5px; color:#666;">Utilisez la recherche 🔍 pour trouver et ajouter des bières.</p>
                </div>"#,
            );
        } else {
            html.push_str(
                r#"<div class="empty-state" style="grid-column: 1/-1; text-align: center; padding: 60px 20px;">
                    <div style="font-size: 3rem; margin-bottom: 12px;">🍺</div>
                    <p style="color: var(--text-secondary); font-size: 1.1rem; font-weight: 500;">Aucune bière trouvée.</p>
                </div>"#,
            );
        }
    } else {
        for (index, beer) in beers.iter().take(48).enumerate() {
            let id = beer.resolved_id();
            let user_data = state.storage.get_user_data(&id);
            let count = user_data.map(|d| d.count).unwrap_or(0);
            let is_drunk = count > 0;
            let is_fav = state.storage.is_favorite(&id);
            let rarity_res = calculate_rarity(beer);

            let img_src = beer
                .image
                .as_deref()
                .filter(|s| !s.trim().is_empty())
                .unwrap_or("images/beer/default.png");

            let fav_star = if is_fav {
                r#"<span class="card-fav-star" style="font-size:1.15rem; filter:drop-shadow(0 2px 4px rgba(0,0,0,0.5)); line-height:1;">⭐</span>"#
            } else {
                ""
            };

            let trappist_badge = if beer.is_trappist() {
                r#"<span class="card-trappist-badge" title="Authentic Trappist Product"><span class="trappist-logo-icon"></span></span>"#
            } else {
                ""
            };

            let check_svg = r#"<svg class="check-icon" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"></polyline></svg>"#;

            let abv_val = beer.parsed_abv();
            let vol_ml = beer.parsed_volume_ml();
            let pure_alcohol_g = (vol_ml as f64) * (abv_val / 100.0) * 0.8;
            let bac_impact = pure_alcohol_g / 49.0;
            let vol_str = beer.formatted_volume();

            let (drive_icon, drive_color, time_str) = if bac_impact < 0.5 {
                ("✅", "#4CAF50", String::new())
            } else {
                let hours = (bac_impact - 0.5) / 0.15;
                let h = hours.floor() as u32;
                let m = ((hours - (h as f64)) * 60.0).round() as u32;
                (
                    "🚫",
                    "#e74c3c",
                    format!(r#"<span class="bac-time"> · {}h{:02}</span>"#, h, m),
                )
            };

            let drunk_class = if is_drunk { "drunk" } else { "" };
            let reveal_rarity = is_drunk
                || state
                    .storage
                    .preferences
                    .get("revealRarity")
                    .and_then(|v| v.as_bool())
                    .unwrap_or(false);

            let (rarity_class, border_style) = if reveal_rarity && rarity_res.rarity != "base" {
                (
                    format!("card-rarity-{}", rarity_res.rarity),
                    "border-color: transparent;",
                )
            } else {
                (String::new(), "border-color: var(--border-color);")
            };

            let tilt_attr = if is_drunk { "data-tilt" } else { "" };
            let loading_attr = if index < 10 { "eager" } else { "lazy" };

            html.push_str(&format!(
                r#"<div class="beer-card {drunk_class} {rarity_class}" data-id="{id}" style="{border_style}" {tilt_attr}>
                    <div class="card-badges-right" style="position:absolute; top:6px; right:6px; z-index:3; display:flex; align-items:center; gap:6px;">
                        {fav_star}
                        {trappist_badge}
                        {check_svg}
                    </div>
                    <div class="beer-image-container" style="width:100%; height:120px; display:flex; justify-content:center; align-items:center;">
                        <img src="{img_src}" alt="{title}" class="beer-image" loading="{loading_attr}" onerror="if(this.src.includes('images/beer/FUT.jpg')) return; this.src='images/beer/FUT.jpg';">
                    </div>
                    <div class="beer-info">
                        <h3 class="beer-title">{title}</h3>
                        <p class="beer-brewery">{brewery}</p>
                        <div class="beer-card-stats-row" style="display:flex; gap:5px; justify-content:center; margin-top:5px; color:#aaa; flex-wrap:wrap;">
                            <span style="background:rgba(255,255,255,0.1); padding:2px 6px; border-radius:4px; font-size:0.7rem;">{abv}°</span>
                            <span style="background:rgba(255,255,255,0.1); padding:2px 6px; border-radius:4px; font-size:0.7rem;">{vol_str}</span>
                            <span style="background:rgba(255,255,255,0.1); padding:2px 6px; border-radius:4px; font-size:0.7rem;">{style}</span>
                        </div>
                        <div class="beer-card-bac-row" style="display:flex; justify-content:center; margin-top:8px;">
                            <div class="bac-speculative-badge" style="color:{drive_color}; border-color:{drive_color}33; display:inline-flex;">
                                <span class="bac-icon">{drive_icon}</span>
                                <span>+{bac_impact:.2}</span>{time_str}
                            </div>
                        </div>
                    </div>
                </div>"#,
                drunk_class = drunk_class,
                rarity_class = rarity_class,
                id = id,
                border_style = border_style,
                tilt_attr = tilt_attr,
                fav_star = fav_star,
                trappist_badge = trappist_badge,
                check_svg = check_svg,
                img_src = img_src,
                title = beer.title,
                loading_attr = loading_attr,
                brewery = beer.brewery,
                abv = abv_val,
                vol_str = vol_str,
                style = beer.beer_type,
                drive_color = drive_color,
                drive_icon = drive_icon,
                bac_impact = bac_impact,
                time_str = time_str
            ));
        }
    }

    html.push_str("</div>");
    html
}
