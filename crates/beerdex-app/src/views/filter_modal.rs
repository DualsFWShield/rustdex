use crate::state::AppState;

/// Renders the complete, interactive Filter & Sorting Modal for Beerdex.
pub fn render_filter_modal(state: &AppState) -> String {
    let styles = [
        "Blonde",
        "Brune",
        "Triple",
        "IPA",
        "Stout",
        "Trappiste",
        "Fruitée",
        "Lambic",
        "Gueuze",
        "Saison",
        "Blanche",
        "Ambrée",
    ];
    let rarities = [
        ("base", "Base"),
        ("commun", "Commun"),
        ("rare", "Rare"),
        ("super_rare", "Super Rare"),
        ("epique", "Épique"),
        ("mythique", "Mythique"),
        ("legendaire", "Légendaire"),
        ("ultra_legendaire", "Ultra Légendaire"),
    ];

    format!(
        r#"<div class="modal-overlay active" id="filter-modal-overlay">
            <div class="modal-card" style="max-width: 480px; width: 100%;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
                    <h3 style="color:var(--accent-gold); margin:0; font-family:Russo One, sans-serif;">🔍 Filtres & Tri</h3>
                    <button class="modal-close" id="filter-modal-close-btn">&times;</button>
                </div>

                <div style="display:flex; flex-direction:column; gap:16px;">
                    <!-- Pays / Catalogue -->
                    <div>
                        <label class="settings-label" style="margin-bottom:6px;">🌍 Pays / Catalogue</label>
                        <select id="filter-country-select" class="form-select">
                            <option value="">Tous les pays</option>
                            <option value="be">🇧🇪 Belgique</option>
                            <option value="fr">🇫🇷 France</option>
                            <option value="de">🇩🇪 Allemagne</option>
                            <option value="nl">🇳🇱 Pays-Bas</option>
                            <option value="us">🇺🇸 États-Unis</option>
                        </select>
                    </div>

                    <!-- Style de bière -->
                    <div>
                        <label class="settings-label" style="margin-bottom:6px;">🍺 Style de Bière</label>
                        <div style="display:flex; flex-wrap:wrap; gap:6px;">
                            {style_pills}
                        </div>
                    </div>

                    <!-- Rareté TCG -->
                    <div>
                        <label class="settings-label" style="margin-bottom:6px;">✨ Rareté</label>
                        <div style="display:flex; flex-wrap:wrap; gap:6px;">
                            {rarity_pills}
                        </div>
                    </div>

                    <!-- Filtres Rapides -->
                    <div>
                        <label class="settings-label" style="margin-bottom:6px;">⚡ Statut</label>
                        <div style="display:flex; flex-direction:column; gap:8px;">
                            <label style="display:flex; justify-content:space-between; align-items:center; font-size:0.85rem; color:#ccc;">
                                <span>❤️ Favoris uniquement</span>
                                <input type="checkbox" class="toggle-switch" id="filter-fav-only" {chk_fav}>
                            </label>
                            <label style="display:flex; justify-content:space-between; align-items:center; font-size:0.85rem; color:#ccc;">
                                <span>🍺 Bues uniquement</span>
                                <input type="checkbox" class="toggle-switch" id="filter-drunk-only" {chk_drunk}>
                            </label>
                        </div>
                    </div>

                    <!-- Actions -->
                    <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-top:10px;">
                        <button id="btn-filter-reset" class="btn-secondary">Réinitialiser</button>
                        <button id="btn-filter-apply" class="btn-primary">Appliquer les filtres</button>
                    </div>
                </div>
            </div>
        </div>"#,
        style_pills = {
            let mut s = String::new();
            for style in styles {
                let is_sel = state.filters.style.as_deref() == Some(style);
                let cls = if is_sel { "btn-vol active" } else { "btn-vol" };
                s.push_str(&format!(r#"<button class="{cls}" data-filter-style="{style}" style="padding:4px 8px; font-size:0.75rem;">{style}</button>"#));
            }
            s
        },
        rarity_pills = {
            let mut s = String::new();
            for (key, label) in rarities {
                let is_sel = state.filters.rarity.as_deref() == Some(key);
                let cls = if is_sel { "btn-vol active" } else { "btn-vol" };
                s.push_str(&format!(r#"<button class="{cls}" data-filter-rarity="{key}" style="padding:4px 8px; font-size:0.75rem;">{label}</button>"#));
            }
            s
        },
        chk_fav = if state.filters.only_favorites {
            "checked"
        } else {
            ""
        },
        chk_drunk = if state.filters.only_consumed {
            "checked"
        } else {
            ""
        }
    )
}
