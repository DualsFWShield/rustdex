use crate::state::AppState;

/// Renders the complete, comprehensive Settings & Preferences view matching 100% of the original Beerdex capabilities.
pub fn render_settings_view(state: &AppState) -> String {
    let t_title = state
        .i18n
        .t_or("settings_main_title", "Paramètres & Données");
    let current_lang = state.i18n.current_language();

    // Group 1: Interface & Apparence
    let grp1_title = state.i18n.t_or(
        "settings_group_theme_appearance",
        "🎨 Interface & Apparence",
    );
    let lbl_lang = state.i18n.t_or("settings_language", "Langue");
    let desc_lang = state
        .i18n
        .t_or("settings_language_desc", "Choisir la langue d'affichage");

    let active_fr = if current_lang == "fr" { "selected" } else { "" };
    let active_en = if current_lang == "en" { "selected" } else { "" };

    let pref_theme = state
        .storage
        .preferences
        .get("theme")
        .and_then(|v| v.as_str())
        .unwrap_or("classic");

    let is_discovery = state
        .storage
        .preferences
        .get("discovery_mode")
        .and_then(|v| v.as_bool())
        .unwrap_or(false);

    let is_museum = state
        .storage
        .preferences
        .get("museumThemeEnabled")
        .and_then(|v| v.as_bool())
        .unwrap_or(false);

    // Group 2: Fonctionnalités & Immersion
    let grp2_title = state.i18n.t_or(
        "settings_group_features_immersion",
        "⚙️ Fonctionnalités & Immersion",
    );
    let feat_map = state
        .storage
        .preferences
        .get("feat_map_enabled")
        .and_then(|v| v.as_bool())
        .unwrap_or(true);
    let feat_bb = state
        .storage
        .preferences
        .get("feat_brewbrother_enabled")
        .and_then(|v| v.as_bool())
        .unwrap_or(true);
    let feat_reminders = state
        .storage
        .preferences
        .get("feat_reminders_enabled")
        .and_then(|v| v.as_bool())
        .unwrap_or(true);
    let feat_equiv = state
        .storage
        .preferences
        .get("feat_equivalences_enabled")
        .and_then(|v| v.as_bool())
        .unwrap_or(true);
    let feat_party = state
        .storage
        .preferences
        .get("feat_beermatch_enabled")
        .and_then(|v| v.as_bool())
        .unwrap_or(true);
    let feat_wrapped = state
        .storage
        .preferences
        .get("feat_wrapped_enabled")
        .and_then(|v| v.as_bool())
        .unwrap_or(true);
    let sound_enabled = state
        .storage
        .preferences
        .get("soundEnabled")
        .and_then(|v| v.as_bool())
        .unwrap_or(true);
    let haptics_enabled = state
        .storage
        .preferences
        .get("hapticsEnabled")
        .and_then(|v| v.as_bool())
        .unwrap_or(true);

    // Group 3: Suivi & Statistiques
    let grp3_title = state
        .i18n
        .t_or("settings_group_stats_tracking", "📊 Suivi & Statistiques");
    let bac_enabled = state
        .storage
        .preferences
        .get("bac_enabled")
        .and_then(|v| v.as_bool())
        .unwrap_or(true);
    let bac_weight = state
        .storage
        .preferences
        .get("bac_weight")
        .and_then(|v| v.as_u64())
        .unwrap_or(70);
    let bac_gender = state
        .storage
        .preferences
        .get("bac_gender")
        .and_then(|v| v.as_str())
        .unwrap_or("M");
    let reveal_rarity = state
        .storage
        .preferences
        .get("revealRarity")
        .and_then(|v| v.as_bool())
        .unwrap_or(false);
    let anim_once = state
        .storage
        .preferences
        .get("anim_only_once")
        .and_then(|v| v.as_bool())
        .unwrap_or(false);
    let card_count = state
        .storage
        .preferences
        .get("card_stat_count")
        .and_then(|v| v.as_bool())
        .unwrap_or(false);
    let card_volume = state
        .storage
        .preferences
        .get("card_stat_volume")
        .and_then(|v| v.as_bool())
        .unwrap_or(false);
    let card_bb_pct = state
        .storage
        .preferences
        .get("card_brewbrother_pct")
        .and_then(|v| v.as_bool())
        .unwrap_or(false);

    // Group 4: Données & Sauvegarde
    let grp4_title = state
        .i18n
        .t_or("settings_group_data_backup", "💾 Données & Sauvegarde");

    // Group 5: Système & Support
    let grp5_title = state
        .i18n
        .t_or("settings_group_system_support", "🛠️ Système & Support");

    format!(
        r#"<div class="settings-container">
            <h2 class="settings-title">⚙️ {t_title}</h2>

            <!-- 1. Interface & Apparence -->
            <div class="settings-group" data-group="interface">
                <h4 class="settings-group-header">{grp1_title}</h4>

                <!-- Langue -->
                <div class="settings-row">
                    <div class="setting-info">
                        <span class="setting-title">{lbl_lang}</span>
                        <span class="setting-desc">{desc_lang}</span>
                    </div>
                    <div class="setting-action">
                        <select id="select-language" class="form-select">
                            <option value="fr" {active_fr}>🇫🇷 Français</option>
                            <option value="en" {active_en}>🇬🇧 English</option>
                        </select>
                    </div>
                </div>

                <!-- Thèmes Prédéfinis -->
                <div class="settings-row" style="flex-direction: column; align-items: stretch;">
                    <div class="setting-info" style="margin-bottom: 8px;">
                        <span class="setting-title">Thème & Couleurs</span>
                        <span class="setting-desc">Personnalisez l'ambiance visuelle du Beerdex</span>
                    </div>
                    <div class="theme-presets-grid" style="display:grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap:8px;">
                        <button class="theme-preset-btn {theme_classic}" data-theme="classic">🍺 Sombre & Or</button>
                        <button class="theme-preset-btn {theme_amber}" data-theme="amber">🔥 Ambre Intense</button>
                        <button class="theme-preset-btn {theme_cyber}" data-theme="cyberpunk">⚡ Cyberpunk</button>
                        <button class="theme-preset-btn {theme_forest}" data-theme="forest">🌲 Houblon & Forêt</button>
                    </div>
                </div>

                <!-- Police d'écriture -->
                <div class="settings-row">
                    <div class="setting-info">
                        <span class="setting-title">Police d'écriture</span>
                        <span class="setting-desc">Typographie principale de l'application</span>
                    </div>
                    <div class="setting-action">
                        <select id="select-font-family" class="form-select">
                            <option value="Outfit">Outfit (Moderne & Épurée)</option>
                            <option value="Russo One">Russo One (Gamer & Robuste)</option>
                            <option value="Playfair Display">Playfair (Prestige & Brasserie)</option>
                        </select>
                    </div>
                </div>

                <!-- Mode Découverte -->
                <div class="settings-row">
                    <div class="setting-info">
                        <span class="setting-title">Mode Découverte</span>
                        <span class="setting-desc">Affiche des anecdotes et faits historiques zythologiques</span>
                    </div>
                    <div class="setting-action">
                        <input type="checkbox" class="toggle-switch" id="toggle-discovery" {chk_discovery}>
                    </div>
                </div>

                <!-- Mode Musée -->
                <div class="settings-row">
                    <div class="setting-info">
                        <span class="setting-title">Mode Musée (Expérience 3D)</span>
                        <span class="setting-desc">Rideaux d'ouverture dorés et présentoirs prestige</span>
                    </div>
                    <div class="setting-action">
                        <input type="checkbox" class="toggle-switch" id="toggle-museum" {chk_museum}>
                    </div>
                </div>

                <!-- Presets de notation -->
                <div class="settings-row" style="flex-direction: column; align-items: stretch;">
                    <div class="setting-info" style="margin-bottom: 8px;">
                        <span class="setting-title">Grille de notation des bières</span>
                        <span class="setting-desc">Barème de dégustation personnalisé</span>
                    </div>
                    <div style="display:flex; gap:8px;">
                        <button id="btn-preset-default" class="setting-btn primary" style="flex:1;">Standard (/20)</button>
                        <button id="btn-preset-tristan" class="setting-btn" style="flex:1;">Preset Tristan</button>
                        <button id="btn-preset-noah" class="setting-btn" style="flex:1;">Preset Noah</button>
                    </div>
                </div>
            </div>

            <!-- 2. Fonctionnalités & Immersion -->
            <div class="settings-group" data-group="features">
                <h4 class="settings-group-header">{grp2_title}</h4>

                <div class="settings-row">
                    <div class="setting-info">
                        <span class="setting-title">Afficher la carte (Map)</span>
                        <span class="setting-desc">Cartographie interactive mondiale de vos bières dégustées</span>
                    </div>
                    <div class="setting-action">
                        <input type="checkbox" class="toggle-switch" id="toggle-feat-map" {chk_map}>
                    </div>
                </div>

                <div class="settings-row">
                    <div class="setting-info">
                        <span class="setting-title">Assistant IA BrewBrother</span>
                        <span class="setting-desc">Suggestions intelligentes et calcul d'affinités aromatiques</span>
                    </div>
                    <div class="setting-action">
                        <input type="checkbox" class="toggle-switch" id="toggle-feat-brewbrother" {chk_bb}>
                    </div>
                </div>

                <div class="settings-row">
                    <div class="setting-info">
                        <span class="setting-title">Carte par défaut</span>
                        <span class="setting-desc">Région prioritaire pour la navigation géographique</span>
                    </div>
                    <div class="setting-action">
                        <select id="select-default-map" class="form-select">
                            <option value="auto">🌍 Détection automatique</option>
                            <option value="be">🇧🇪 Belgique</option>
                            <option value="fr">🇫🇷 France</option>
                            <option value="de">🇩🇪 Allemagne</option>
                            <option value="nl">🇳🇱 Pays-Bas</option>
                            <option value="us">🇺🇸 États-Unis</option>
                        </select>
                    </div>
                </div>

                <div class="settings-row">
                    <div class="setting-info">
                        <span class="setting-title">Rappels & Notifications</span>
                        <span class="setting-desc">Signalement des bières non notées ou consommations doublons</span>
                    </div>
                    <div class="setting-action">
                        <input type="checkbox" class="toggle-switch" id="toggle-feat-reminders" {chk_reminders}>
                    </div>
                </div>

                <div class="settings-row">
                    <div class="setting-info">
                        <span class="setting-title">Équivalences alcool</span>
                        <span class="setting-desc">Conversion en verres standards (vin, shots, baignoires)</span>
                    </div>
                    <div class="setting-action">
                        <input type="checkbox" class="toggle-switch" id="toggle-feat-equivalences" {chk_equiv}>
                    </div>
                </div>

                <!-- Beer Party & P2P -->
                <div class="settings-row">
                    <div class="setting-info">
                        <span class="setting-title">Beer Party (Peer-to-Peer Chiffré)</span>
                        <span class="setting-desc">Salons de dégustation en direct sans aucun serveur tiers</span>
                    </div>
                    <div class="setting-action">
                        <input type="checkbox" class="toggle-switch" id="toggle-feat-beermatch" {chk_party}>
                    </div>
                </div>

                <div class="settings-row" style="background: rgba(255, 192, 0, 0.04); border-left: 3px solid var(--accent-gold);">
                    <div class="setting-info">
                        <span class="setting-title">Pseudo Beer Party</span>
                        <span class="setting-desc">Votre nom affiché lors des sessions de groupe</span>
                    </div>
                    <div class="setting-action" style="display:flex; gap:6px;">
                        <input type="text" id="input-party-pseudo" class="settings-input" placeholder="ZythoMaster" style="width:130px; text-align:right;">
                        <button type="button" id="btn-random-pseudo" class="setting-btn" title="Générer un pseudo aléatoire">🎲</button>
                    </div>
                </div>

                <div class="settings-row">
                    <div class="setting-info">
                        <span class="setting-title">Beerdex Wrapped</span>
                        <span class="setting-desc">Bilan annuel immersif et visualisations de votre collection</span>
                    </div>
                    <div class="setting-action">
                        <input type="checkbox" class="toggle-switch" id="toggle-feat-wrapped" {chk_wrapped}>
                    </div>
                </div>

                <div class="settings-row">
                    <div class="setting-info">
                        <span class="setting-title">Effets sonores</span>
                        <span class="setting-desc">Sons de décapsulage et tintements lors des interactions</span>
                    </div>
                    <div class="setting-action">
                        <input type="checkbox" class="toggle-switch" id="toggle-sound" {chk_sound}>
                    </div>
                </div>

                <div class="settings-row">
                    <div class="setting-info">
                        <span class="setting-title">Vibrations haptiques</span>
                        <span class="setting-desc">Retours tactiles lors de l'ajout de dégustations</span>
                    </div>
                    <div class="setting-action">
                        <input type="checkbox" class="toggle-switch" id="toggle-haptics" {chk_haptics}>
                    </div>
                </div>
            </div>

            <!-- 3. Suivi & Statistiques -->
            <div class="settings-group" data-group="stats">
                <h4 class="settings-group-header">{grp3_title}</h4>

                <div class="settings-row">
                    <div class="setting-info">
                        <span class="setting-title">Calculateur d'Alcoolémie (BAC)</span>
                        <span class="setting-desc">Simulation physiologique selon la formule de Widmark</span>
                    </div>
                    <div class="setting-action">
                        <input type="checkbox" class="toggle-switch" id="toggle-bac-enabled" {chk_bac}>
                    </div>
                </div>

                <div class="settings-row">
                    <div class="setting-info">
                        <span class="setting-title">Profil Physique</span>
                        <span class="setting-desc">Poids corporel et métabolisme pour le calcul</span>
                    </div>
                    <div class="setting-action" style="display:flex; gap:8px;">
                        <input type="number" id="input-bac-weight" class="settings-input" value="{bac_weight}" min="30" max="250" style="width:75px;" title="Poids en kg">
                        <select id="select-bac-gender" class="form-select" style="width:100px;">
                            <option value="M" {sel_m}>Homme</option>
                            <option value="F" {sel_f}>Femme</option>
                            <option value="X" {sel_x}>Autre</option>
                        </select>
                    </div>
                </div>

                <div class="settings-row">
                    <div class="setting-info">
                        <span class="setting-title">Réglementation & Conduite</span>
                        <span class="setting-desc">Seuil légal d'alcoolémie pour la reprise du volant</span>
                    </div>
                    <div class="setting-action">
                        <select id="select-bac-country" class="form-select">
                            <option value="BE" selected>🇧🇪 Belgique (0.5 g/L)</option>
                            <option value="FR">🇫🇷 France (0.5 g/L)</option>
                            <option value="DE">🇩🇪 Allemagne (0.5 g/L)</option>
                            <option value="NL">🇳🇱 Pays-Bas (0.5 g/L)</option>
                            <option value="US">🇺🇸 États-Unis (0.8 g/L)</option>
                        </select>
                    </div>
                </div>

                <div class="settings-row">
                    <div class="setting-info">
                        <span class="setting-title">Cacher la rareté non découverte (Anti-Spoil)</span>
                        <span class="setting-desc">Garder la surprise jusqu'à la première dégustation</span>
                    </div>
                    <div class="setting-action">
                        <input type="checkbox" class="toggle-switch" id="check-reveal-rarity" {chk_reveal}>
                    </div>
                </div>

                <div class="settings-row">
                    <div class="setting-info">
                        <span class="setting-title">Animation de rareté une seule fois</span>
                        <span class="setting-desc">Évite la répétition des effets sur les cartes récurrentes</span>
                    </div>
                    <div class="setting-action">
                        <input type="checkbox" class="toggle-switch" id="check-anim-once" {chk_anim_once}>
                    </div>
                </div>

                <div class="settings-row" style="flex-direction:column; align-items:stretch;">
                    <div class="setting-info" style="margin-bottom:8px;">
                        <span class="setting-title">Badges affichés sur les cartes</span>
                        <span class="setting-desc">Informations rapides visibles dans la grille</span>
                    </div>
                    <div style="display:flex; flex-direction:column; gap:6px;">
                        <label style="display:flex; justify-content:space-between; align-items:center; font-size:0.85rem; color:#ccc;">
                            <span>Afficher le nombre de dégustations (x3)</span>
                            <input type="checkbox" class="toggle-switch" id="toggle-card-stat-count" {chk_card_count}>
                        </label>
                        <label style="display:flex; justify-content:space-between; align-items:center; font-size:0.85rem; color:#ccc;">
                            <span>Afficher le volume total consommé</span>
                            <input type="checkbox" class="toggle-switch" id="toggle-card-stat-volume" {chk_card_volume}>
                        </label>
                        <label style="display:flex; justify-content:space-between; align-items:center; font-size:0.85rem; color:#ccc;">
                            <span>Afficher le % de recommandation BrewBrother</span>
                            <input type="checkbox" class="toggle-switch" id="toggle-card-brewbrother" {chk_card_bb_pct}>
                        </label>
                    </div>
                </div>
            </div>

            <!-- 4. Données & Sauvegarde -->
            <div class="settings-group" data-group="data">
                <h4 class="settings-group-header">{grp4_title}</h4>

                <div class="settings-row" style="flex-direction:column; align-items:stretch;">
                    <div class="setting-info" style="margin-bottom:10px;">
                        <span class="setting-title">Gestion de vos données</span>
                        <span class="setting-desc">Vos notes, dégustations et favoris sont chiffrés localement</span>
                    </div>
                    <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
                        <button id="btn-manage-export" class="btn-primary">💾 Exporter Sauvegarde (JSON)</button>
                        <button id="btn-manage-import" class="btn-secondary">📥 Importer Sauvegarde</button>
                    </div>
                </div>

                <div class="settings-row" style="flex-direction:column; align-items:stretch;">
                    <div class="setting-info" style="margin-bottom:10px;">
                        <span class="setting-title" style="color:#ff5252;">Zone de Danger</span>
                        <span class="setting-desc">Opérations de suppression irréversibles</span>
                    </div>
                    <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-bottom:10px;">
                        <button id="btn-reset-ratings" class="btn-danger">Effacer les notes</button>
                        <button id="btn-reset-history" class="btn-danger">Effacer l'historique</button>
                        <button id="btn-reset-fav" class="btn-danger">Effacer les favoris</button>
                        <button id="btn-reset-custom" class="btn-danger">Effacer bières perso</button>
                    </div>
                    <button id="btn-reset-app" class="btn-danger" style="background:#b71c1c; color:#fff; font-weight:bold;">🔥 Tout Réinitialiser à Zéro</button>
                </div>
            </div>

            <!-- 5. Système, Support & Crédits -->
            <div class="settings-group" data-group="system">
                <h4 class="settings-group-header">{grp5_title}</h4>

                <div class="settings-row">
                    <div class="setting-info">
                        <span class="setting-title">Vérifier les mises à jour</span>
                        <span class="setting-desc">Version installée : Beerdex Native v5.1.0</span>
                    </div>
                    <div class="setting-action">
                        <button id="btn-check-update" class="setting-btn">🔄 Vérifier</button>
                    </div>
                </div>

                <div class="settings-row">
                    <div class="setting-info">
                        <span class="setting-title">Nettoyeur de doublons (Deduplicator Thanos)</span>
                        <span class="setting-desc">Fusion intelligente des variantes et bières créées</span>
                    </div>
                    <div class="setting-action">
                        <button id="btn-deduplicate-db" class="setting-btn">🧹 Optimiser</button>
                    </div>
                </div>

                <div class="settings-row">
                    <div class="setting-info">
                        <span class="setting-title">Diagnostic & Intégrité</span>
                        <span class="setting-desc">Journal des tests, mémoire et statut WebAssembly</span>
                    </div>
                    <div class="setting-action">
                        <button id="btn-open-debug" class="setting-btn">⚙️ Diagnostic</button>
                    </div>
                </div>

                <div class="settings-row" style="flex-direction:column; align-items:center; text-align:center; padding-top:20px; border-top:1px solid #2d2d2d;">
                    <div style="font-size:0.8rem; color:var(--accent-gold); font-weight:bold; letter-spacing:1px; margin-bottom:4px;">FONDATEURS & AUTEURS</div>
                    <div style="font-size:0.9rem; color:#fff; margin-bottom:12px;">Dorian Storms, Noah Bruijninckx, Tristan Storms & Maxance Veulemans</div>
                    <div style="font-size:0.75rem; color:#888;">Design & Code natif : <strong>Noah Bruijninckx</strong></div>
                    <div style="font-size:0.75rem; color:#666; margin-top:8px;">Beerdex Pure Rust Native & WebAssembly &copy; 2026</div>
                </div>
            </div>
        </div>"#,
        t_title = t_title,
        grp1_title = grp1_title,
        lbl_lang = lbl_lang,
        desc_lang = desc_lang,
        active_fr = active_fr,
        active_en = active_en,
        theme_classic = if pref_theme == "classic" {
            "active"
        } else {
            ""
        },
        theme_amber = if pref_theme == "amber" { "active" } else { "" },
        theme_cyber = if pref_theme == "cyberpunk" {
            "active"
        } else {
            ""
        },
        theme_forest = if pref_theme == "forest" { "active" } else { "" },
        chk_discovery = if is_discovery { "checked" } else { "" },
        chk_museum = if is_museum { "checked" } else { "" },
        grp2_title = grp2_title,
        chk_map = if feat_map { "checked" } else { "" },
        chk_bb = if feat_bb { "checked" } else { "" },
        chk_reminders = if feat_reminders { "checked" } else { "" },
        chk_equiv = if feat_equiv { "checked" } else { "" },
        chk_party = if feat_party { "checked" } else { "" },
        chk_wrapped = if feat_wrapped { "checked" } else { "" },
        chk_sound = if sound_enabled { "checked" } else { "" },
        chk_haptics = if haptics_enabled { "checked" } else { "" },
        grp3_title = grp3_title,
        chk_bac = if bac_enabled { "checked" } else { "" },
        bac_weight = bac_weight,
        sel_m = if bac_gender == "M" { "selected" } else { "" },
        sel_f = if bac_gender == "F" { "selected" } else { "" },
        sel_x = if bac_gender == "X" { "selected" } else { "" },
        chk_reveal = if reveal_rarity { "checked" } else { "" },
        chk_anim_once = if anim_once { "checked" } else { "" },
        chk_card_count = if card_count { "checked" } else { "" },
        chk_card_volume = if card_volume { "checked" } else { "" },
        chk_card_bb_pct = if card_bb_pct { "checked" } else { "" },
        grp4_title = grp4_title,
        grp5_title = grp5_title
    )
}
