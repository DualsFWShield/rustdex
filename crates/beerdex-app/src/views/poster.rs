use crate::state::AppState;

/// Renders the complete, interactive Poster Generator view.
pub fn render_poster_view(state: &AppState) -> String {
    let consumed_count = state
        .db
        .beers
        .iter()
        .filter(|b| {
            state
                .storage
                .get_user_data(&b.resolved_id())
                .map(|d| d.count > 0)
                .unwrap_or(false)
        })
        .count();

    format!(
        r#"<div class="poster-container" style="max-width: 800px; margin: 0 auto; padding: 16px; display: flex; flex-direction: column; gap: 20px;">
            <div class="poster-hero" style="text-align: center; padding: 24px 16px; background: linear-gradient(135deg, rgba(255, 192, 0, 0.12), rgba(20, 20, 20, 0.95)); border-radius: 16px; border: 1px solid var(--border-color);">
                <div style="font-size: 2.5rem; margin-bottom: 8px;">🖼️</div>
                <h2 style="font-family: Russo One, sans-serif; color: var(--accent-gold); font-size: 1.5rem; margin-bottom: 6px;">Générateur de Poster HD</h2>
                <p style="color: var(--text-secondary); font-size: 0.9rem; margin: 0;">Exportez votre collection complète sous forme d'affiche murale haute résolution</p>
            </div>

            <!-- Configuration de l'Affiche -->
            <div class="poster-settings-card" style="background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 16px; padding: 20px; display: flex; flex-direction: column; gap: 16px;">
                <h3 style="color: var(--accent-gold); font-size: 1.15rem; margin: 0;">⚙️ Options d'Exportation</h3>

                <div class="settings-row" style="display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <strong style="color: #fff; font-size: 0.9rem; display: block;">Disposition & Ambiance</strong>
                        <span style="font-size: 0.75rem; color: #888;">Style graphique du poster</span>
                    </div>
                    <select id="select-poster-theme" class="form-select" style="max-width: 180px;">
                        <option value="classic">Grille Ultime Sombre</option>
                        <option value="museum">Exposition Musée Doré</option>
                        <option value="minimal">Minimaliste Arty</option>
                    </select>
                </div>

                <div class="settings-row" style="display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <strong style="color: #fff; font-size: 0.9rem; display: block;">Sélection des Bières</strong>
                        <span style="font-size: 0.75rem; color: #888;">Éléments inclus sur l'affiche</span>
                    </div>
                    <select id="select-poster-filter" class="form-select" style="max-width: 180px;">
                        <option value="consumed">Bières dégustées ({consumed_count})</option>
                        <option value="all">Dex complet ({total_count})</option>
                        <option value="favorites">Favoris uniquement</option>
                    </select>
                </div>

                <div class="settings-row" style="display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <strong style="color: #fff; font-size: 0.9rem; display: block;">Résolution du rendu</strong>
                        <span style="font-size: 0.75rem; color: #888;">Qualité pour tirage papier ou écran</span>
                    </div>
                    <select id="select-poster-res" class="form-select" style="max-width: 180px;">
                        <option value="1080">Full HD (1080p)</option>
                        <option value="2160" selected>Ultra HD 4K (2160p)</option>
                        <option value="print">Impression A2 (300 DPI)</option>
                    </select>
                </div>

                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 10px;">
                    <button id="btn-export-poster-png" class="btn-primary" style="padding: 12px; font-weight: bold;">📥 Télécharger Image PNG</button>
                    <button id="btn-open-poster-preview" class="btn-secondary" style="padding: 12px; font-weight: 600;">👁️ Aperçu Plein Écran</button>
                </div>
            </div>

            <!-- Aperçu Mini du Poster -->
            <div class="poster-preview-card" style="background: #0d0d0d; border: 2px dashed #333; border-radius: 16px; padding: 30px; text-align: center;">
                <div style="font-size: 1.1rem; color: #fff; font-weight: bold; margin-bottom: 8px;">BEERDEX COLLECTION</div>
                <div style="font-size: 0.8rem; color: var(--accent-gold); margin-bottom: 20px;">{consumed_count} BIÈRES SAVOURÉES SUR {total_count}</div>
                <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(45px, 1fr)); gap: 6px; max-height: 250px; overflow: hidden; opacity: 0.8;">
                    {preview_items}
                </div>
            </div>
        </div>"#,
        consumed_count = consumed_count,
        total_count = state.db.beers.len(),
        preview_items = {
            let mut items = String::new();
            for beer in state.db.beers.iter().take(40) {
                let img = beer.image.as_deref().unwrap_or("images/beer/default.png");
                items.push_str(&format!(
                    r#"<div style="background:#1c1c1c; border-radius:6px; padding:4px; height:60px; display:flex; align-items:center; justify-content:center;">
                        <img src="{img}" onerror="this.src='images/beer/default.png'" style="max-height:50px; max-width:35px; object-fit:contain;">
                    </div>"#
                ));
            }
            items
        }
    )
}
