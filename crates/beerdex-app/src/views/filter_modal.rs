use crate::state::AppState;

/// Renders the complete, interactive 4-Tab Filter & Sorting Modal matching 100% of beerdex.be.
pub fn render_filter_modal(state: &AppState) -> String {
    let types = [
        ("Blonde", "🍺 Blonde"),
        ("Brune", "🍫 Brune"),
        ("Ambrée", "🍯 Ambrée"),
        ("Blanche", "🌾 Blanche"),
        ("Triple", "⚡ Triple"),
        ("Double", "✌️ Double"),
        ("Quadruple", "👑 Quadruple"),
        ("IPA", "🌿 IPA"),
        ("Stout / Porter", "☕ Stout / Porter"),
        ("Fruitée", "🍒 Fruitée"),
        ("Sour / Gueuze", "🍋 Sour / Gueuze"),
        ("Saison", "🧑‍🌾 Saison"),
        ("Pils / Lager", "🧊 Pils / Lager"),
        ("Sans Alcool", "🚫 Sans Alcool"),
        ("Noël / Saisonnière", "🎄 Noël / Saisonnière"),
        ("Spéciale / Autre", "✨ Spéciale / Autre"),
    ];

    let rarities = [
        ("base", "Base", "var(--rarity-base, #888)"),
        ("commun", "Commun", "var(--rarity-commun, #2ecc71)"),
        ("rare", "Rare", "var(--rarity-rare, #3498db)"),
        (
            "super_rare",
            "Super Rare",
            "var(--rarity-super_rare, #00d2d3)",
        ),
        ("epique", "Épique", "var(--rarity-epique, #9b59b6)"),
        ("mythique", "Mythique", "var(--rarity-mythique, #e74c3c)"),
        (
            "legendaire",
            "Légendaire",
            "var(--rarity-legendaire, #f39c12)",
        ),
        (
            "ultra_legendaire",
            "Ultra Légendaire",
            "var(--rarity-ultra_legendaire, #ff00ff)",
        ),
        ("fondateur", "Fondateur", "var(--rarity-fondateur, #ffd700)"),
    ];

    let mut types_html = String::with_capacity(2000);
    for (val, label) in types {
        let is_sel = state.filters.style.as_deref() == Some(val);
        let checked_attr = if is_sel { "checked" } else { "" };
        let active_bg = if is_sel {
            "background: rgba(255, 192, 0, 0.2); border-color: var(--accent-gold);"
        } else {
            "background: rgba(255, 255, 255, 0.05); border-color: rgba(255, 255, 255, 0.1);"
        };
        types_html.push_str(&format!(
            r##"<label class="filter-chip-label" style="display:flex; align-items:center; gap:6px; padding:7px 12px; border-radius:18px; cursor:pointer; border:1px solid; transition:all 0.2s; {active_bg}">
                <input type="checkbox" class="cb-type" value="{val}" data-filter-style="{val}" {checked_attr} style="display:none;">
                <span style="font-size:0.85rem; color:#fff; font-weight:normal;">{label}</span>
            </label>"##,
            active_bg = active_bg,
            val = val,
            checked_attr = checked_attr,
            label = label
        ));
    }

    let mut rarities_html = String::with_capacity(2000);
    for (val, label, color) in rarities {
        let is_sel = state.filters.rarity.as_deref() == Some(val);
        let checked_attr = if is_sel { "checked" } else { "" };
        let active_border = if is_sel {
            format!(
                "border: 2px solid {}; box-shadow: 0 0 10px {}44;",
                color, color
            )
        } else {
            format!("border: 1px solid {};", color)
        };
        rarities_html.push_str(&format!(
            r##"<label class="filter-chip-label" style="display:flex; align-items:center; gap:6px; background:rgba(255,255,255,0.05); padding:6px 12px; border-radius:15px; cursor:pointer; transition:all 0.2s; {active_border}">
                <input type="checkbox" class="cb-rarity" value="{val}" data-filter-rarity="{val}" {checked_attr} style="display:none;">
                <span style="font-size:0.8rem; text-transform:capitalize; color:#fff; font-weight:normal;">{label}</span>
            </label>"##,
            active_border = active_border,
            val = val,
            checked_attr = checked_attr,
            label = label
        ));
    }

    let chk_fav = if state.filters.only_favorites {
        "checked"
    } else {
        ""
    };
    let chk_drunk = if state.filters.only_consumed {
        "checked"
    } else {
        ""
    };

    format!(
        r##"<div class="modal-content filter-modal" style="padding: 0px; display: flex; flex-direction: column; max-height: 85vh; overflow: hidden; width: min(94%, 520px); margin: 0 auto; background: var(--bg-card); border-radius: 16px; border: 1px solid rgba(255,255,255,0.1);">
            <!-- HEADER -->
            <div style="background:var(--bg-card); padding:15px 20px; border-bottom:1px solid rgba(255,255,255,0.1); border-radius:16px 16px 0 0; display:flex; justify-content:space-between; align-items:center; flex-shrink:0;">
                <h2 style="margin:0; font-size:1.4rem; font-family:'Russo One', sans-serif;">Filtres &amp; Tris</h2>
                <button type="button" id="btn-filter-reset" style="background:none; border:none; color:var(--accent-gold); font-size:0.9rem; cursor:pointer; font-weight:bold;">Réinitialiser</button>
            </div>

            <!-- TABS -->
            <div class="filter-tabs" style="display:flex; overflow-x:auto; gap:8px; padding:12px 20px; scrollbar-width:none; flex-shrink:0; align-items:center; background:rgba(0,0,0,0.2);">
                <button type="button" class="ftab active" data-tab="tab-gen" style="background:var(--accent-gold); color:#000; border:none; padding:8px 14px; border-radius:20px; font-weight:bold; cursor:pointer; white-space:nowrap; display:flex; align-items:center; gap:6px;">
                    <span>Général</span>
                </button>
                <button type="button" class="ftab" data-tab="tab-tri" style="background:#333; color:#fff; border:none; padding:8px 14px; border-radius:20px; font-weight:bold; cursor:pointer; white-space:nowrap; display:flex; align-items:center; gap:6px;">
                    <span>Tri &amp; Notes</span>
                </button>
                <button type="button" class="ftab" data-tab="tab-attr" style="background:#333; color:#fff; border:none; padding:8px 14px; border-radius:20px; font-weight:bold; cursor:pointer; white-space:nowrap; display:flex; align-items:center; gap:6px;">
                    <span>Attributs</span>
                </button>
                <button type="button" class="ftab" data-tab="tab-rec" style="background:#333; color:#fff; border:none; padding:8px 14px; border-radius:20px; font-weight:bold; cursor:pointer; white-space:nowrap; display:flex; align-items:center; gap:6px;">
                    <span>🤖 Recommandations</span>
                </button>
            </div>

            <!-- SCROLLING FORM -->
            <form id="filter-form" style="padding:15px 20px 20px 20px; overflow-y:auto; flex-grow:1; display:flex; flex-direction:column; gap:20px;">
                
                <!-- TAB: GENERAL -->
                <div id="tab-gen" class="tab-pane">
                    <!-- Type de bière -->
                    <div class="stat-card mb-20" style="margin-bottom:15px; background:rgba(255,255,255,0.03); padding:12px; border-radius:10px;">
                        <h4 style="margin-bottom:10px; display:flex; justify-content:space-between; align-items:center; font-size:0.95rem;">
                            Type de bière 
                            <span style="font-size:0.75rem; color:#888; font-weight:normal;">(Sélection rapide)</span>
                        </h4>
                        <div style="display:flex; flex-wrap:wrap; gap:8px;">
                            {types_html}
                        </div>
                    </div>

                    <!-- Rareté -->
                    <div class="stat-card mb-20" style="margin-bottom:15px; background:rgba(255,255,255,0.03); padding:12px; border-radius:10px;">
                        <h4 style="margin-bottom:10px; font-size:0.95rem;">Rareté</h4>
                        <div style="display:flex; flex-wrap:wrap; gap:8px;">
                            {rarities_html}
                        </div>
                    </div>

                    <!-- Pays -->
                    <div class="form-group stat-card mb-20" style="margin-bottom:15px; background:rgba(255,255,255,0.03); padding:12px; border-radius:10px;">
                        <h4 style="margin-bottom:10px; font-size:0.95rem;">Pays</h4>
                        <select id="filter-country-select" class="form-select" style="width:100%; padding:10px; border-radius:8px; background:rgba(0,0,0,0.4); color:#fff; border:1px solid rgba(255,255,255,0.1);">
                            <option value="">Tous les pays</option>
                            <option value="BE">🇧🇪 Belgique</option>
                            <option value="FR">🇫🇷 France</option>
                            <option value="DE">🇩🇪 Allemagne</option>
                            <option value="NL">🇳🇱 Pays-Bas</option>
                            <option value="US">🇺🇸 États-Unis</option>
                            <option value="CO">🇨🇴 Colombie</option>
                            <option value="JP">🇯🇵 Japon</option>
                            <option value="KR">🇰🇷 Corée du Sud</option>
                            <option value="CN">🇨🇳 Chine</option>
                        </select>
                    </div>

                    <!-- Statut Rapide -->
                    <div class="form-group stat-card mb-20" style="background:rgba(255,255,255,0.03); padding:12px; border-radius:10px; display:flex; flex-direction:column; gap:10px;">
                        <label style="display:flex; justify-content:space-between; align-items:center; cursor:pointer;">
                            <span style="font-size:0.9rem; color:#fff;">⭐ Favoris Uniquement</span>
                            <input type="checkbox" id="filter-fav-only" class="toggle-switch" {chk_fav}>
                        </label>
                        <label style="display:flex; justify-content:space-between; align-items:center; cursor:pointer;">
                            <span style="font-size:0.9rem; color:#fff;">🍺 Bues Uniquement</span>
                            <input type="checkbox" id="filter-drunk-only" class="toggle-switch" {chk_drunk}>
                        </label>
                    </div>
                </div>

                <!-- TAB: TRI ET NOTES -->
                <div id="tab-tri" class="tab-pane" style="display:none;">
                    <div class="stat-card mb-20" style="margin-bottom:15px; background:rgba(255,255,255,0.03); padding:12px; border-radius:10px;">
                        <h4 style="margin-bottom:10px; font-size:0.95rem;">Trier par</h4>
                        <div style="display:flex; gap:10px;">
                            <select id="filter-sort-by" class="form-select" style="flex:2; padding:10px; border-radius:8px; background:rgba(0,0,0,0.4); color:#fff; border:1px solid rgba(255,255,255,0.1);">
                                <option value="default" selected>Défaut (Favoris > Nom)</option>
                                <option value="name">Nom de la bière (A-Z)</option>
                                <option value="brewbrother">Match BrewBrother</option>
                                <option value="brewery">Brasserie</option>
                                <option value="alcohol">Degré Alcool (%)</option>
                                <option value="volume">Volume</option>
                                <option value="rarity">Rareté</option>
                                <option value="my_rating">Ma note personnelle</option>
                                <option value="community_rating">Note Communauté</option>
                            </select>
                            <select id="filter-sort-order" class="form-select" style="flex:1; padding:10px; border-radius:8px; background:rgba(0,0,0,0.4); color:#fff; border:1px solid rgba(255,255,255,0.1);">
                                <option value="asc">⬆️ Croissant</option>
                                <option value="desc">⬇️ Décroissant</option>
                            </select>
                        </div>
                    </div>

                    <div class="stat-card mb-20" style="background:rgba(255,255,255,0.03); padding:12px; border-radius:10px;">
                        <h4 style="margin-bottom:10px; font-size:0.95rem;">Notes Minimales</h4>
                        <div class="form-group" style="margin-bottom:15px;">
                            <label class="form-label" style="display:flex; justify-content:space-between; font-size:0.85rem; color:#aaa;">Note Perso <span><span id="rate-val">0</span>/20</span></label>
                            <input type="range" class="form-input" min="0" max="20" step="1" value="0" oninput="document.getElementById('rate-val').innerText = this.value" style="padding:0; height:30px; width:100%;">
                        </div>
                        <div class="form-group">
                            <label class="form-label" style="display:flex; justify-content:space-between; font-size:0.85rem; color:#aaa;">Note Communauté <span><span id="comm-rate-val">0</span>/5</span></label>
                            <input type="range" class="form-input" min="0" max="5" step="0.1" value="0" oninput="document.getElementById('comm-rate-val').innerText = this.value" style="padding:0; height:30px; width:100%;">
                        </div>
                    </div>
                </div>

                <!-- TAB: ATTRIBUTS -->
                <div id="tab-attr" class="tab-pane" style="display:none;">
                    <div class="stat-card mb-20" style="margin-bottom:15px; background:rgba(255,255,255,0.03); padding:12px; border-radius:10px;">
                        <h4 style="margin-bottom:10px; font-size:0.95rem;">Alcool &amp; Volume</h4>
                        <div class="form-group" style="margin-bottom:15px;">
                            <label class="form-label" style="display:flex; justify-content:space-between; font-size:0.85rem; color:#aaa;">Alcool Maximum <span><span id="alc-display-max">15</span>%</span></label>
                            <input type="range" class="form-input" min="0" max="15" step="0.5" value="15" oninput="document.getElementById('alc-display-max').innerText = this.value" style="padding:0; height:30px; width:100%;">
                        </div>
                        <div class="form-group">
                            <label class="form-label" style="display:block; margin-bottom:6px; font-size:0.85rem; color:#aaa;">Volume Préféré</label>
                            <div style="display:flex; gap:6px; flex-wrap:wrap;">
                                <button type="button" class="btn-vol active" style="padding:4px 10px; font-size:0.8rem;">Tous</button>
                                <button type="button" class="btn-vol" style="padding:4px 10px; font-size:0.8rem;">25cl</button>
                                <button type="button" class="btn-vol" style="padding:4px 10px; font-size:0.8rem;">33cl</button>
                                <button type="button" class="btn-vol" style="padding:4px 10px; font-size:0.8rem;">50cl</button>
                                <button type="button" class="btn-vol" style="padding:4px 10px; font-size:0.8rem;">75cl</button>
                            </div>
                        </div>
                    </div>

                    <div class="stat-card mb-20" style="background:rgba(255,255,255,0.03); padding:12px; border-radius:10px;">
                        <h4 style="margin-bottom:10px; font-size:0.95rem;">Production</h4>
                        <div class="form-group">
                            <label class="form-label" style="display:block; margin-bottom:6px; font-size:0.85rem; color:#aaa;">Ingrédients clés</label>
                            <input type="text" class="form-input" placeholder="Ex: Coriandre, Cerise, Café..." style="width:100%; padding:10px; border-radius:8px; background:rgba(0,0,0,0.4); color:#fff; border:1px solid rgba(255,255,255,0.1);">
                        </div>
                    </div>
                </div>

                <!-- TAB: RECOMMANDATIONS -->
                <div id="tab-rec" class="tab-pane" style="display:none;">
                    <div class="stat-card mb-20" style="background:linear-gradient(135deg, rgba(35,30,15,0.85), rgba(15,15,15,0.95)); border:2px solid rgba(255,192,0,0.3); border-radius:12px; padding:16px;">
                        <h4 style="margin:0 0 10px 0; color:var(--accent-gold); display:flex; align-items:center; gap:8px; font-size:1.1rem; font-family:'Russo One', sans-serif;">
                            🤖 BrewBrother AI
                        </h4>
                        <p style="font-size:0.85rem; color:#bbb; margin-bottom:15px; line-height:1.4;">
                            Générez les 20 meilleures recommandations basées sur votre profil de goût et votre historique.
                        </p>
                        <label style="display:flex; justify-content:space-between; align-items:center; background:rgba(255,255,255,0.08); border:1px solid rgba(255,255,255,0.15); padding:12px 14px; border-radius:10px; cursor:pointer;">
                            <div>
                                <div style="font-size:0.95rem; font-weight:bold; color:var(--accent-gold);">Activer les Recommandations</div>
                                <div style="font-size:0.75rem; color:#aaa;">Filtre le catalogue sur votre Top 20</div>
                            </div>
                            <input type="checkbox" id="toggle-filter-brewbrother" class="toggle-switch">
                        </label>
                    </div>
                </div>

            </form>

            <!-- FOOTER -->
            <div style="background:var(--bg-card); padding:15px 20px; border-top:1px solid rgba(255,255,255,0.1); border-radius:0 0 16px 16px; flex-shrink:0;">
                <button type="button" id="btn-filter-apply" class="btn-primary" style="margin:0; width:100%; font-size:1.1rem; box-shadow:0 -5px 20px rgba(0,0,0,0.5);">Appliquer les filtres</button>
            </div>
        </div>"##,
        types_html = types_html,
        rarities_html = rarities_html,
        chk_fav = chk_fav,
        chk_drunk = chk_drunk
    )
}
