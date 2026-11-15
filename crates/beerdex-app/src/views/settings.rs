use crate::state::AppState;

pub fn render_settings_view(state: &AppState) -> String {
    format!(
        r#"<div class="settings-container">
            <h2 class="settings-title">⚙️ {title_settings}</h2>

            <!-- Language Section -->
            <div class="settings-group">
                <label class="settings-label">{lbl_lang}</label>
                <div class="settings-btn-group">
                    <button class="btn-toggle active" data-lang="fr">Français</button>
                    <button class="btn-toggle" data-lang="en">English</button>
                </div>
            </div>

            <!-- BAC Settings -->
            <div class="settings-group">
                <label class="settings-label">Profil Alcoolémie (BAC)</label>
                <div class="settings-row">
                    <span>Poids (kg)</span>
                    <input type="number" class="settings-input" value="70" min="40" max="200">
                </div>
                <div class="settings-row">
                    <span>Genre</span>
                    <select class="settings-select">
                        <option value="M">Homme</option>
                        <option value="F">Femme</option>
                        <option value="X">Autre</option>
                    </select>
                </div>
            </div>

            <!-- Backup & Export -->
            <div class="settings-group">
                <label class="settings-label">Sauvegarde & Restauration</label>
                <div class="settings-actions">
                    <button id="btn-export-backup" class="btn-primary">💾 Exporter Sauvegarde (JSON)</button>
                    <button id="btn-import-backup" class="btn-secondary">📥 Importer Sauvegarde</button>
                </div>
            </div>

            <!-- Danger Zone -->
            <div class="settings-group danger-zone">
                <label class="settings-label" style="color: #ff5252;">Zone de Danger</label>
                <div class="settings-actions">
                    <button id="btn-reset-ratings" class="btn-danger">Effacer les notes uniquement</button>
                    <button id="btn-reset-history" class="btn-danger">Effacer l'historique de consommation</button>
                    <button id="btn-reset-all" class="btn-danger" style="background: #b71c1c;">Tout Réinitialiser</button>
                </div>
            </div>
        </div>"#,
        title_settings = state.i18n.t("nav_settings"),
        lbl_lang = state.i18n.t("pref_language")
    )
}
