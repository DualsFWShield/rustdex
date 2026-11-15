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
        r##"<div class="modal-content {rarity_class}" style="background:var(--bg-card, #141414); border:1px solid var(--border-color, #2d2d2d); border-radius:16px; padding:20px; max-width:550px; width:100%; position:relative; box-shadow:0 10px 40px rgba(0,0,0,0.8); margin:auto;">
                
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px;">
                    <button type="button" id="btn-toggle-fav" data-fav-id="{id}" style="background:none; border:none; font-size:1.8rem; cursor:pointer;" title="Favori">
                        {fav_icon}
                    </button>
                    <div style="display:flex; align-items:center; gap:10px;">
                        <button type="button" id="btn-close-modal" class="modal-close" style="background:none; border:none; color:#fff; font-size:2rem; cursor:pointer; line-height:1;" aria-label="Fermer">×</button>
                    </div>
                </div>

                <div style="text-align: center; margin-bottom: 20px;">
                    <img src="{img}" onerror="if(this.src.includes('images/beer/FUT.jpg')) return; this.src='images/beer/FUT.jpg';" onload="removeImageBackground(this)" alt="{title}" style="height: 150px; max-width: 120px; object-fit: contain; filter: drop-shadow(0 0 10px rgba(255,255,255,0.1)); margin-bottom: 10px;">
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

/// Renders the complete "Ajouter une bière" modal matching 100% of beerdex.be.
pub fn render_add_beer_modal() -> String {
    r##"<div class="modal-content" style="max-height: 85vh; overflow-y: auto; width: min(92%, 500px); padding: 20px; background: var(--bg-card); border-radius: 16px; border: 1px solid rgba(255,255,255,0.1);">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px;">
            <h2 style="margin:0; font-family:'Russo One', sans-serif; color:var(--accent-gold);">Ajouter une bière</h2>
            <button id="btn-close-modal" class="modal-close" style="background:none; border:none; color:#fff; font-size:1.8rem; cursor:pointer;">&times;</button>
        </div>
        <form id="add-beer-form" style="display:flex; flex-direction:column; gap:12px;">
            <div class="form-group">
                <label class="form-label" style="font-size:0.85rem; color:#aaa; margin-bottom:4px; display:block;">Nom de la bière</label>
                <input type="text" class="form-input" id="add-beer-title" name="title" required style="width:100%; padding:10px; border-radius:8px; background:rgba(0,0,0,0.4); color:#fff; border:1px solid rgba(255,255,255,0.1);">
            </div>

            <div class="form-group">
                <label class="form-label" style="font-size:0.85rem; color:#aaa; margin-bottom:4px; display:block;">Brasserie</label>
                <input type="text" class="form-input" id="add-beer-brewery" name="brewery" required style="width:100%; padding:10px; border-radius:8px; background:rgba(0,0,0,0.4); color:#fff; border:1px solid rgba(255,255,255,0.1);">
            </div>

            <div class="form-group">
                <label class="form-label" style="font-size:0.85rem; color:#aaa; margin-bottom:4px; display:block;">Province / Région</label>
                <select class="form-select" id="add-beer-province" name="province" style="width:100%; padding:10px; border-radius:8px; background:rgba(0,0,0,0.4); color:#fff; border:1px solid rgba(255,255,255,0.1);">
                    <option value="">-- Non spécifié --</option>
                    <optgroup label="🇧🇪 Belgique">
                        <option value="ANT">Antwerpen</option>
                        <option value="LIM">Limburg</option>
                        <option value="VBR">Vlaams-Brabant</option>
                        <option value="BRU">Bruxelles</option>
                        <option value="WBR">Brabant Wallon</option>
                        <option value="HAI">Hainaut</option>
                        <option value="NAM">Namur</option>
                        <option value="LIE">Liège</option>
                        <option value="LUX">Luxembourg</option>
                        <option value="WVL">West-Vlaanderen</option>
                        <option value="OVL">Oost-Vlaanderen</option>
                    </optgroup>
                    <optgroup label="🇫🇷 France">
                        <option value="FRHDF">Hauts-de-France</option>
                        <option value="FRGES">Grand Est</option>
                        <option value="FRPAC">Provence-Alpes-Côte d'Azur</option>
                        <option value="FRARA">Auvergne-Rhône-Alpes</option>
                        <option value="FRIDF">Île-de-France</option>
                    </optgroup>
                    <optgroup label="🌍 Autres">
                        <option value="OTHER">Autre pays</option>
                    </optgroup>
                </select>
            </div>

            <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
                <div class="form-group">
                    <label class="form-label" style="font-size:0.85rem; color:#aaa; margin-bottom:4px; display:block;">Type (Blonde, Brune...)</label>
                    <input type="text" class="form-input" id="add-beer-type" name="type" placeholder="Ex: Triple" style="width:100%; padding:10px; border-radius:8px; background:rgba(0,0,0,0.4); color:#fff; border:1px solid rgba(255,255,255,0.1);">
                </div>
                <div class="form-group">
                    <label class="form-label" style="font-size:0.85rem; color:#aaa; margin-bottom:4px; display:block;">Alcool (ex: 8.5°)</label>
                    <input type="text" class="form-input" id="add-beer-alcohol" name="alcohol" placeholder="8.5" style="width:100%; padding:10px; border-radius:8px; background:rgba(0,0,0,0.4); color:#fff; border:1px solid rgba(255,255,255,0.1);">
                </div>
            </div>

            <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
                <div class="form-group">
                    <label class="form-label" style="font-size:0.85rem; color:#aaa; margin-bottom:4px; display:block;">Volume (ex: 33cl)</label>
                    <input type="text" class="form-input" id="add-beer-volume" name="volume" placeholder="33cl" style="width:100%; padding:10px; border-radius:8px; background:rgba(0,0,0,0.4); color:#fff; border:1px solid rgba(255,255,255,0.1);">
                </div>
                <div class="form-group">
                    <label class="form-label" style="font-size:0.85rem; color:#aaa; margin-bottom:4px; display:block;">Rareté</label>
                    <select class="form-select" id="add-beer-rarity" name="rarity" style="width:100%; padding:10px; border-radius:8px; background:rgba(0,0,0,0.4); color:#fff; border:1px solid rgba(255,255,255,0.1);">
                        <option value="">-- Auto --</option>
                        <option value="base">Base (Gris)</option>
                        <option value="commun">Commun (Vert)</option>
                        <option value="rare">Rare (Bleu)</option>
                        <option value="super_rare">Super Rare (Cyan)</option>
                        <option value="epique">Épique (Violet)</option>
                        <option value="mythique">Mythique (Rouge)</option>
                        <option value="legendaire">Légendaire (Orange)</option>
                        <option value="ultra_legendaire">Ultra Légendaire (Gradient)</option>
                    </select>
                </div>
            </div>

            <div class="form-group">
                <label class="form-label" style="font-size:0.85rem; color:#aaa; margin-bottom:4px; display:block;">Distribution</label>
                <select class="form-select" id="add-beer-distribution" name="distribution" style="width:100%; padding:10px; border-radius:8px; background:rgba(0,0,0,0.4); color:#fff; border:1px solid rgba(255,255,255,0.1);">
                    <option value="1">Partout (1 pt)</option>
                    <option value="2">Supermarché (2 pts)</option>
                    <option value="3">Cavistes (3 pts)</option>
                    <option value="4">Cavistes spécialisés (4 pts)</option>
                    <option value="5">À la brasserie (5 pts)</option>
                </select>
            </div>

            <div class="form-group">
                <label class="form-label" style="font-size:0.85rem; color:#aaa; margin-bottom:4px; display:block;">Disponibilité</label>
                <select class="form-select" id="add-beer-availability" name="availability" style="width:100%; padding:10px; border-radius:8px; background:rgba(0,0,0,0.4); color:#fff; border:1px solid rgba(255,255,255,0.1);">
                    <option value="1">Permanente (1 pt)</option>
                    <option value="2">Saisonnière (2 pts)</option>
                    <option value="3">Édition limitée (3 pts)</option>
                    <option value="4">Batch unique (4 pts)</option>
                    <option value="5">Unique à vie (5 pts)</option>
                </select>
            </div>

            <div class="form-group" style="display:flex; align-items:center; gap:10px;">
                <input type="checkbox" name="barrel_aged" id="add-beer-barrel-aged" style="width:20px; height:20px; accent-color:var(--accent-gold);">
                <label for="add-beer-barrel-aged" style="font-size:0.9rem; margin:0; cursor:pointer;">Vieillie en fût (Barrel Aged)</label>
            </div>

            <div class="form-group">
                <label class="form-label" style="font-size:0.85rem; color:#aaa; margin-bottom:4px; display:block;">Ingrédients / Notes</label>
                <input type="text" class="form-input" id="add-beer-ingredients" name="ingredients" placeholder="Ex: Coriandre, Cerise..." style="width:100%; padding:10px; border-radius:8px; background:rgba(0,0,0,0.4); color:#fff; border:1px solid rgba(255,255,255,0.1);">
            </div>

            <button type="submit" id="btn-submit-add-beer" class="btn-primary" style="margin-top:10px; padding:12px; font-size:1rem; font-weight:bold;">Ajouter</button>
        </form>
    </div>"##.to_string()
}

/// Renders the complete Universal QR/Barcode scanner modal.
pub fn render_universal_scan_modal() -> String {
    r##"<div class="modal-content" style="width: min(92%, 420px); padding: 22px; text-align: center; background: rgba(20, 20, 20, 0.95); backdrop-filter: blur(15px); border: 1px solid rgba(255, 215, 0, 0.25); border-radius: 20px; box-shadow: rgba(0, 0, 0, 0.8) 0px 10px 40px;">
        <h2 style="color:var(--accent-gold); margin-bottom:8px; font-family:'Russo One'; font-size:1.35rem; display:flex; align-items:center; justify-content:center; gap:8px;">
            <span>📷</span> Scanner Universel
        </h2>
        <p style="color:#aaa; font-size:0.82rem; margin-bottom:14px; line-height:1.4;">
            Scannez un QR code (Beer Party, DraftSync, Bière perso) ou tapez un code de salon ci-dessous.
        </p>
        <div id="universal-reader" style="width: 100%; max-width: 280px; margin: 0px auto 15px; border-radius: 12px; overflow: hidden; background: rgb(0, 0, 0); border: 2px solid rgba(255, 215, 0, 0.3); aspect-ratio: 1 / 1; position: relative; display:flex; align-items:center; justify-content:center;">
            <span style="font-size:3rem; opacity:0.5;">📷</span>
        </div>

        <div style="background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; padding: 12px 14px; margin-bottom: 15px; text-align: left;">
            <div style="font-size:0.8rem; color:#ddd; font-weight:700; margin-bottom:8px;">
                <span>⌨️ Entrer un code de salon (6 lettres)</span>
            </div>
            <div style="margin-bottom:10px;">
                <input type="text" id="universal-manual-code" placeholder="EX: A1B2C3" maxlength="15" style="width:100%; box-sizing:border-box; text-align:center; font-family:monospace; font-size:1.2rem; font-weight:bold; letter-spacing:3px; text-transform:uppercase; background:rgba(0,0,0,0.6); border:1px solid rgba(255,215,0,0.4); border-radius:10px; color:#fff; padding:10px;">
            </div>
            <div style="display:flex; gap:8px;">
                <button type="button" id="btn-uni-join-party" class="btn-primary" style="flex:1; padding:10px 8px; font-size:0.82rem; background:linear-gradient(135deg, var(--accent-gold), var(--accent-amber)); color:#000; font-weight:bold; border:none; border-radius:10px; cursor:pointer;">
                    🍻 Beer Party
                </button>
                <button type="button" id="btn-uni-join-draftsync" class="btn-primary" style="flex:1; padding:10px 8px; font-size:0.82rem; background:linear-gradient(135deg, #3b82f6, #1d4ed8); color:#fff; font-weight:bold; border:none; border-radius:10px; cursor:pointer;">
                    📡 DraftSync
                </button>
            </div>
        </div>

        <button id="btn-close-scanner" class="btn-cancel" style="width:100%; padding:10px; border-radius:20px; font-weight:bold; cursor:pointer; background:rgba(255,255,255,0.1); border:none; color:#fff;">Fermer</button>
    </div>"##.to_string()
}

/// Renders the achievement detail modal.
pub fn render_achievement_modal(ach_id: &str, state: &AppState) -> String {
    let ach_stats = beerdex_core::achievements::UserAchievementStats::compute(
        &state.storage.ratings,
        &state.db.beers,
        None,
    );
    let all = beerdex_core::achievements::AchievementEngine::all_definitions();
    let ach = all.iter().find(|a| a.id == ach_id);

    if let Some(a) = ach {
        let is_unlocked =
            beerdex_core::achievements::AchievementEngine::is_unlocked(a.id, &ach_stats);
        let title = state.i18n.t_or(a.title_key, a.id);
        let desc = state.i18n.t_or(a.desc_key, a.desc_key);
        let icon = a.icon;
        let rarity = a.rarity;

        let icon_style = if is_unlocked {
            "font-size:4rem; margin-bottom:20px; filter:drop-shadow(0 0 15px rgba(255,193,7,0.4));"
        } else {
            "font-size:4rem; margin-bottom:20px; filter:grayscale(100%) opacity(50%) drop-shadow(0 4px 12px rgba(255,255,255,0.05));"
        };

        let badge_style = match rarity {
            "legendaire" | "ultra_legendaire" => "color:#f39c12; border:1px solid #f39c1240;",
            "epique" | "mythique" => "color:#9b59b6; border:1px solid #9b59b640;",
            "super_rare" | "rare" => "color:#3498db; border:1px solid #3498db40;",
            _ => "color:#2ecc71; border:1px solid #2ecc7140;",
        };

        format!(
            r##"<div class="modal-content text-center" style="width:min(90%, 420px); padding:25px; background:var(--bg-card); border-radius:16px; border:1px solid rgba(255,255,255,0.1);">
                <div style="{icon_style}">{icon}</div>
                <h2 style="color:var(--accent-gold); margin-bottom:8px; font-family:'Russo One', sans-serif;">{title}</h2>
                <div style="display:inline-block; font-size:0.75rem; font-weight:800; background:rgba(255,255,255,0.05); padding:4px 12px; border-radius:20px; margin-bottom:15px; text-transform:uppercase; letter-spacing:1px; {badge_style}">{rarity}</div>
                <p style="font-size:1.05rem; color:#ccc; margin-bottom:25px; line-height:1.5; padding:0 10px;">
                    {desc}
                </p>
                <button class="btn-primary" id="btn-close-modal" style="width:100%; padding:10px; font-weight:bold;">Fermer</button>
            </div>"##,
            icon_style = icon_style,
            icon = icon,
            title = title,
            badge_style = badge_style,
            rarity = rarity,
            desc = desc
        )
    } else {
        String::new()
    }
}

/// Renders the rating configuration template modal.
pub fn render_notation_template_modal(_state: &AppState) -> String {
    r##"<div class="modal-content" style="max-height: 85vh; overflow-y: auto; width: min(92%, 480px); padding: 20px; background: var(--bg-card); border-radius: 16px; border: 1px solid rgba(255,255,255,0.1);">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px;">
            <h2 style="margin:0; font-family:'Russo One', sans-serif; color:var(--accent-gold);">Configuration Notation</h2>
            <button id="btn-close-modal" class="modal-close" style="background:none; border:none; color:#fff; font-size:1.8rem; cursor:pointer;">&times;</button>
        </div>
        <div id="field-list" style="margin: 20px 0; display:flex; flex-direction:column; gap:8px;">
            <div style="display:flex; justify-content:space-between; align-items:center; padding:10px 14px; background:rgba(255,255,255,0.05); border-radius:8px;">
                <span>Goût (Curseur 0-10)</span>
                <span style="color:#aaa; font-size:0.8rem;">Défaut</span>
            </div>
            <div style="display:flex; justify-content:space-between; align-items:center; padding:10px 14px; background:rgba(255,255,255,0.05); border-radius:8px;">
                <span>Amertume (Curseur 0-10)</span>
                <span style="color:#aaa; font-size:0.8rem;">Défaut</span>
            </div>
            <div style="display:flex; justify-content:space-between; align-items:center; padding:10px 14px; background:rgba(255,255,255,0.05); border-radius:8px;">
                <span>Packaging / Canette (Case à cocher)</span>
                <span style="color:#aaa; font-size:0.8rem;">Défaut</span>
            </div>
        </div>

        <div style="border-top:1px solid #333; padding-top:20px;">
            <h3 style="font-size:1rem; margin-bottom:12px;">Ajouter un critère</h3>
            <div class="form-group" style="margin-bottom:10px;">
                <input type="text" id="new-label" class="form-input" placeholder="Nom (ex: Arôme, Mousse...)" style="width:100%; padding:10px; border-radius:8px; background:rgba(0,0,0,0.4); color:#fff; border:1px solid rgba(255,255,255,0.1);">
            </div>
            <div class="form-group" style="margin-bottom:12px;">
                <select id="new-type" class="form-select" style="width:100%; padding:10px; border-radius:8px; background:rgba(0,0,0,0.4); color:#fff; border:1px solid rgba(255,255,255,0.1);">
                    <option value="range">Curseur (0-10)</option>
                    <option value="checkbox">Case à cocher (Oui/Non)</option>
                    <option value="textarea">Texte long</option>
                </select>
            </div>
            <button id="add-field" class="btn-primary" style="background:var(--bg-card); border:1px solid var(--accent-gold); color:var(--accent-gold); width:100%; padding:10px; font-weight:bold;">+ Ajouter le critère</button>
        </div>

        <button id="save-template" class="btn-primary" style="margin-top:20px; width:100%; padding:12px; font-weight:bold;">Sauvegarder</button>
        <button id="reset-template" class="form-input" style="margin-top:10px; background:none; border:none; color:#e74c3c; width:100%; cursor:pointer; font-size:0.9rem;">Réinitialiser par défaut</button>
    </div>"##.to_string()
}
