use crate::state::AppState;
use beerdex_core::models::Beer;
use beerdex_core::rarity::calculate_rarity;

pub fn render_beer_modal(beer: &Beer, state: &AppState) -> String {
    let id = beer.resolved_id();
    let user_data = state.storage.get_user_data(&id);
    let count = user_data.map(|d| d.count).unwrap_or(0);
    let is_drunk = count > 0;
    let score = user_data.and_then(|d| d.score);
    let score_str = score.map(|s| format!("{:.1}", s)).unwrap_or_default();
    let comment = user_data.and_then(|d| d.comment.as_deref()).unwrap_or("");
    let is_fav = state.storage.is_favorite(&id);
    let fav_icon = if is_fav { "⭐" } else { "🤍" };

    let rarity = calculate_rarity(beer);
    let reveal_rarity = is_drunk
        || state
            .storage
            .preferences
            .get("revealRarity")
            .and_then(|v| v.as_bool())
            .unwrap_or(false);

    let (rarity_class, rarity_badge_html) = if reveal_rarity && rarity.rarity != "base" {
        (
            format!("modal-rarity-{}", rarity.rarity),
            format!(
                r#"<span class="rarity-badge rarity-{}" style="text-transform:uppercase; font-size:0.75rem; font-weight:bold; padding:3px 10px; border-radius:12px;">{}</span>"#,
                rarity.rarity,
                rarity.rarity.to_uppercase()
            ),
        )
    } else if !reveal_rarity && !is_drunk {
        (
            "modal-rarity-base".to_string(),
            r#"<span class="rarity-badge rarity-hidden" style="text-transform:uppercase; font-size:0.75rem; font-weight:bold; padding:3px 10px; border-radius:12px; background:#444; color:#aaa;">???</span>"#.to_string(),
        )
    } else {
        (
            "modal-rarity-base".to_string(),
            format!(
                r#"<span class="rarity-badge rarity-{}" style="text-transform:uppercase; font-size:0.75rem; font-weight:bold; padding:3px 10px; border-radius:12px;">{}</span>"#,
                rarity.rarity,
                rarity.rarity.to_uppercase()
            ),
        )
    };

    let abv = beer.parsed_abv();
    let vol_ml = beer.parsed_volume_ml();
    let pure_alcohol_g = (vol_ml as f64) * (abv / 100.0) * 0.8;
    let vol_alcohol_ml = (vol_ml as f64) * (abv / 100.0);
    let kcal = (pure_alcohol_g * 7.0 + (vol_ml as f64 * 0.03 * 4.0)).round() as u32;
    let bac_impact = pure_alcohol_g / 49.0;
    let (drive_status, bac_color, drive_icon) = if bac_impact < 0.5 {
        ("OK pour conduire", "#4CAF50", "✅")
    } else {
        ("Ne pas conduire", "#e74c3c", "🚫")
    };

    let img_src = beer
        .image
        .as_deref()
        .filter(|s| !s.trim().is_empty())
        .unwrap_or("images/beer/default.png");

    let vol_str = beer.formatted_volume();

    let production = beer.production_volume.as_deref().unwrap_or("Régionale");
    let distribution = beer
        .distribution
        .as_deref()
        .unwrap_or("Cavistes généralistes");
    let barrel = if beer.barrel_aged.unwrap_or(false) {
        "Oui"
    } else {
        "Non"
    };
    let community = beer
        .community_rating
        .as_ref()
        .map(|r| {
            if let Some(f) = r.as_f64() {
                format!("{:.1}", f)
            } else if let Some(s) = r.as_str() {
                s.to_string()
            } else {
                "3.5".to_string()
            }
        })
        .unwrap_or_else(|| "3.5".to_string());
    let ingredients = beer.ingredients.as_deref().unwrap_or("Standard");

    format!(
        r##"<div id="modal-container" class="modal-overlay active" style="display:flex !important; position:fixed; inset:0; z-index:10000; justify-content:center; align-items:center; background:rgba(0,0,0,0.85); overflow-y:auto; padding:20px 10px;">
            <div class="modal-content {rarity_class}" style="background:var(--bg-card, #141414); border:1px solid var(--border-color, #2d2d2d); border-radius:16px; padding:20px; max-width:550px; width:100%; position:relative; box-shadow:0 10px 40px rgba(0,0,0,0.8); margin:auto;">
                
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px;">
                    <button type="button" id="btn-toggle-fav" data-fav-id="{id}" style="background:none; border:none; font-size:1.8rem; cursor:pointer;" title="Favori">
                        {fav_icon}
                    </button>
                    <div style="display:flex; align-items:center; gap:10px;">
                        <button type="button" id="btn-close-modal" class="modal-close" style="background:none; border:none; color:#fff; font-size:2rem; cursor:pointer; line-height:1;" aria-label="Fermer">×</button>
                    </div>
                </div>

                <div style="text-align: center; margin-bottom: 20px;">
                    <img src="{img}" onerror="if(this.src.includes('images/beer/FUT.jpg')) return; this.src='images/beer/FUT.jpg';" alt="{title}" style="height: 150px; max-width: 120px; object-fit: contain; filter: drop-shadow(0 0 10px rgba(255,255,255,0.1)); margin-bottom: 10px;">
                    <h2 style="margin-top: 10px; color: var(--accent-gold); font-family: Russo One, sans-serif; font-size: 1.3rem;">{title}</h2>
                    <p style="color: #888; font-size: 0.95rem; margin: 4px 0;"><a href="#" class="brewery-link" data-brewery="{brewery}" style="color: inherit; text-decoration: underline;">{brewery}</a> - {style}</p>
                    <div style="display: flex; justify-content: center; gap: 15px; margin-top: 5px; font-size: 0.85rem; color: #aaa;">
                        <span>{abv}°</span>
                        <span>{vol_str}</span>
                    </div>
                    <div id="rarity-badge-container" style="margin-top:10px; display:flex; justify-content:center; gap:5px; flex-wrap:wrap;">
                        {rarity_badge_html}
                    </div>
                </div>

                <!-- Consommation -->
                <div style="background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.06); padding: 15px; border-radius: 12px; margin-bottom: 20px; text-align: center;">
                    <h3 style="margin-bottom:10px; font-size:1rem; color:#fff;">Consommation</h3>
                    <div style="font-size:2rem; font-weight:bold; color:var(--accent-gold); margin-bottom:10px; font-family: Russo One, sans-serif;">
                        <span id="consumption-count">{count}</span> <span style="font-size:1rem; color:#888; font-family: sans-serif; font-weight:normal;">fois</span>
                    </div>

                    <div class="form-group" style="margin-bottom: 15px;">
                        <label class="form-label" style="margin-bottom:8px; display:block; font-size:0.85rem; color:#aaa;">Volume bu</label>
                        <div class="vol-preset-grid" style="display: flex; flex-wrap: wrap; gap: 8px; justify-content: center; margin-bottom: 10px;">
                            <button type="button" class="vol-btn" data-vol="15cl" style="background: var(--bg-dark, #0a0a0a); border: 1px solid #444; color: #fff; padding: 6px 10px; border-radius: 8px; cursor: pointer; font-size: 0.9rem; flex: 1 1 28%;">15 cl</button>
                            <button type="button" class="vol-btn" data-vol="25cl" style="background: var(--bg-dark, #0a0a0a); border: 1px solid #444; color: #fff; padding: 6px 10px; border-radius: 8px; cursor: pointer; font-size: 0.9rem; flex: 1 1 28%;">25 cl</button>
                            <button type="button" class="vol-btn" data-vol="33cl" style="background: var(--bg-dark, #0a0a0a); border: 1px solid #444; color: #fff; padding: 6px 10px; border-radius: 8px; cursor: pointer; font-size: 0.9rem; flex: 1 1 28%;">33 cl</button>
                            <button type="button" class="vol-btn active" data-vol="50cl" style="background: var(--accent-gold); border: 1px solid var(--accent-gold); color: #000; font-weight: bold; padding: 6px 10px; border-radius: 8px; cursor: pointer; font-size: 0.9rem; flex: 1 1 28%;">50 cl</button>
                            <button type="button" class="vol-btn" data-vol="75cl" style="background: var(--bg-dark, #0a0a0a); border: 1px solid #444; color: #fff; padding: 6px 10px; border-radius: 8px; cursor: pointer; font-size: 0.9rem; flex: 1 1 28%;">75 cl</button>
                            <button type="button" class="vol-btn" data-vol="150cl" style="background: var(--bg-dark, #0a0a0a); border: 1px solid #444; color: #fff; padding: 6px 10px; border-radius: 8px; cursor: pointer; font-size: 0.9rem; flex: 1 1 28%;">150 cl</button>
                        </div>
                    </div>

                    <div style="display:flex; gap:10px; justify-content:center;">
                        <button type="button" id="btn-drink" data-id="{id}" class="setting-btn" style="flex:1; background:var(--success, #2ecc71); color:#fff; border:none; padding:12px; font-weight:bold; border-radius:8px; cursor:pointer; font-size:1rem;">+ Boire</button>
                        <button type="button" id="btn-undrink" data-id="{id}" class="setting-btn" style="flex:1; background:rgba(255,255,255,0.06); border:1px solid #444; color:#aaa; padding:12px; border-radius:8px; cursor:pointer; font-size:1rem;">- Annuler</button>
                    </div>
                    <p style="font-size:0.75rem; color:#666; margin-top:10px;">Ajoute une consommation à l'historique.</p>
                </div>

                <!-- BrewBrother Note -->
                <div id="brewbrother-match-container">
                    <div class="stat-card" style="margin-bottom:15px; background:linear-gradient(135deg, rgba(30,30,30,0.8), rgba(15,15,15,0.9)); border:1px solid var(--accent-gold); padding:15px; text-align:left; border-radius:12px;">
                        <h4 style="margin-bottom:10px; color:var(--accent-gold); display:flex; justify-content:space-between; align-items:center;">
                            <span>🤖 Note BrewBrother</span>
                            <span style="font-size:1.2rem; font-weight:bold;">12.5/20</span>
                        </h4>
                        <div style="font-size:0.9rem; color:#ddd;">
                            Affinité estimée à <strong style="color:var(--accent-gold);">62%</strong>.
                            <div style="margin-top:10px; padding:12px; background:rgba(0,0,0,0.4); border-left:3px solid var(--accent-gold); border-radius:4px; font-style:italic; line-height:1.4; color:#ddd;">
                                "Une bière de caractère aux arômes équilibrés qui saura enrichir votre palais et votre collection zythologique."
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Info & Stats Grid -->
                <div class="info-panel" style="background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.06); padding: 15px; border-radius: 12px; margin-bottom: 20px;">
                    <h4 style="color:var(--accent-gold); margin-bottom:12px; font-size:0.95rem;">📊 Infos &amp; Stats</h4>
                    <div class="info-stats-grid" style="display:grid; grid-template-columns: repeat(2, 1fr); gap:8px;">
                        <div class="info-stat-card" style="background:rgba(255,255,255,0.03); padding:10px; border-radius:8px; text-align:center;">
                            <span class="stat-icon" style="font-size:1.1rem; display:block;">🧪</span>
                            <span class="stat-value" style="font-weight:bold; color:#fff; font-size:0.95rem;">{pure_alc:.1}g</span>
                            <span class="stat-label" style="display:block; font-size:0.7rem; color:#888;">Alcool pur</span>
                        </div>
                        <div class="info-stat-card" style="background:rgba(255,255,255,0.03); padding:10px; border-radius:8px; text-align:center;">
                            <span class="stat-icon" style="font-size:1.1rem; display:block;">💧</span>
                            <span class="stat-value" style="font-weight:bold; color:#fff; font-size:0.95rem;">{vol_alc:.1}ml</span>
                            <span class="stat-label" style="display:block; font-size:0.7rem; color:#888;">Vol. alcool</span>
                        </div>
                        <div class="info-stat-card" style="background:rgba(255,255,255,0.03); padding:10px; border-radius:8px; text-align:center;">
                            <span class="stat-icon" style="font-size:1.1rem; display:block;">🔥</span>
                            <span class="stat-value" style="font-weight:bold; color:#fff; font-size:0.95rem;">{kcal}</span>
                            <span class="stat-label" style="display:block; font-size:0.7rem; color:#888;">kcal estimées</span>
                        </div>
                        <div class="info-stat-card" style="background:rgba(255,255,255,0.03); padding:10px; border-radius:8px; text-align:center;">
                            <span class="stat-icon" style="font-size:1.1rem; display:block;">🍺</span>
                            <span class="stat-value" style="font-weight:bold; color:#fff; font-size:0.95rem;">{abv}°</span>
                            <span class="stat-label" style="display:block; font-size:0.7rem; color:#888;">Degré</span>
                        </div>
                        <div class="info-stat-card info-stat-wide" style="grid-column: 1 / -1; background:rgba(255,255,255,0.03); padding:10px; border-radius:8px; text-align:center; border:1px solid {bac_color}44;">
                            <span class="stat-icon" style="font-size:1.1rem; display:block;">{drive_icon}</span>
                            <span class="stat-value" style="font-weight:bold; color:{bac_color}; font-size:0.95rem;">+{bac_impact:.2} g/l</span>
                            <span class="stat-label" style="display:block; font-size:0.7rem; color:{bac_color};">{drive_status}</span>
                        </div>
                    </div>

                    <div style="margin-top:12px; padding-top:12px; border-top:1px solid rgba(255,255,255,0.06);">
                        <div class="info-stats-grid" style="display:grid; grid-template-columns: repeat(2, 1fr); gap:8px;">
                            <div class="info-stat-card" style="background:rgba(255,255,255,0.03); padding:10px; border-radius:8px; text-align:center;">
                                <span class="stat-icon" style="font-size:1.1rem; display:block;">🏭</span>
                                <span class="stat-value" style="font-size:0.9rem; color:#fff; font-weight:bold;">{production}</span>
                                <span class="stat-label" style="display:block; font-size:0.7rem; color:#888;">Production</span>
                            </div>
                            <div class="info-stat-card" style="background:rgba(255,255,255,0.03); padding:10px; border-radius:8px; text-align:center;">
                                <span class="stat-icon" style="font-size:1.1rem; display:block;">🚚</span>
                                <span class="stat-value" style="font-size:0.9rem; color:#fff; font-weight:bold;">{distribution}</span>
                                <span class="stat-label" style="display:block; font-size:0.7rem; color:#888;">Distribution</span>
                            </div>
                            <div class="info-stat-card" style="background:rgba(255,255,255,0.03); padding:10px; border-radius:8px; text-align:center;">
                                <span class="stat-icon" style="font-size:1.1rem; display:block;">🪵</span>
                                <span class="stat-value" style="font-size:0.9rem; color:#fff; font-weight:bold;">{barrel}</span>
                                <span class="stat-label" style="display:block; font-size:0.7rem; color:#888;">Vieillie en fût</span>
                            </div>
                            <div class="info-stat-card" style="background:rgba(255,255,255,0.03); padding:10px; border-radius:8px; text-align:center;">
                                <span class="stat-icon" style="font-size:1.1rem; display:block;">⭐</span>
                                <span class="stat-value" style="font-size:0.9rem; color:#fff; font-weight:bold;">{community}/5</span>
                                <span class="stat-label" style="display:block; font-size:0.7rem; color:#888;">Communauté</span>
                            </div>
                            <div class="info-stat-card info-stat-wide" style="grid-column: 1 / -1; display:flex; flex-direction:row; align-items:center; gap:10px; padding:10px; background:rgba(255,255,255,0.03); border-radius:8px; justify-content: flex-start;">
                                <span class="stat-icon" style="margin:0; font-size:1.2rem;">🌿</span>
                                <div style="text-align:left;">
                                    <span class="stat-label" style="display:block; margin:0; text-align:left; font-size:0.7rem; color:#888;">Ingrédients</span>
                                    <span class="stat-value" style="font-size:0.85rem; line-height:1.2; color:#fff; display:block; margin-top:2px;">{ingredients}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Note & Dégustation -->
                <details style="background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.06); padding: 12px; border-radius: 12px; margin-bottom: 10px;" open>
                    <summary style="font-weight:bold; cursor:pointer; color:var(--accent-gold); outline:none;">📝 Note de dégustation</summary>
                    <div style="margin-top:12px;">
                        <div style="margin-bottom:10px;">
                            <label style="display:block; font-size:0.85rem; color:#aaa; margin-bottom:4px;">Note sur 20 :</label>
                            <input type="number" min="0" max="20" step="0.5" value="{score_str}" placeholder="ex: 16.5" class="form-input" id="input-beer-score" style="width:100%; padding:8px 12px; border-radius:8px; background:rgba(0,0,0,0.4); border:1px solid #444; color:#fff; font-size:1rem; box-sizing:border-box;">
                        </div>
                        <div style="margin-bottom:12px;">
                            <label style="display:block; font-size:0.85rem; color:#aaa; margin-bottom:4px;">Commentaires de dégustation :</label>
                            <textarea placeholder="Arômes, saveurs, amertume, impression..." class="form-textarea" id="input-beer-comment" rows="3" style="width:100%; padding:8px 12px; border-radius:8px; background:rgba(0,0,0,0.4); border:1px solid #444; color:#fff; font-size:0.9rem; box-sizing:border-box;">{comment}</textarea>
                        </div>
                        <button type="button" class="btn-save-rating setting-btn primary" data-id="{id}" style="width:100%; background:var(--accent-gold); color:#000; border:none; padding:10px; border-radius:8px; font-weight:bold; cursor:pointer;">💾 Enregistrer la note</button>
                    </div>
                </details>

            </div>
        </div>"##,
        rarity_class = rarity_class,
        rarity_badge_html = rarity_badge_html,
        id = id,
        fav_icon = fav_icon,
        img = img_src,
        title = beer.title,
        brewery = beer.brewery,
        style = beer.beer_type,
        abv = abv,
        vol_str = vol_str,
        count = count,
        pure_alc = pure_alcohol_g,
        vol_alc = vol_alcohol_ml,
        kcal = kcal,
        bac_impact = bac_impact,
        drive_status = drive_status,
        drive_icon = drive_icon,
        bac_color = bac_color,
        production = production,
        distribution = distribution,
        barrel = barrel,
        community = community,
        ingredients = ingredients,
        score_str = score_str,
        comment = comment
    )
}
