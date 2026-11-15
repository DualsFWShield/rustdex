use crate::state::AppState;

/// Renders the complete, interactive Beerpedia encyclopedia and tasting guide.
pub fn render_beerpedia_view(state: &AppState) -> String {
    let t_title = state.i18n.t_or("nav_beerpedia", "Beerpedia");

    format!(
        r#"<div class="beerpedia-container" style="max-width: 800px; margin: 0 auto; padding: 16px; display: flex; flex-direction: column; gap: 20px;">
            <div class="beerpedia-hero" style="text-align: center; padding: 24px 16px; background: linear-gradient(135deg, rgba(255, 192, 0, 0.1), rgba(20, 20, 20, 0.9)); border-radius: 16px; border: 1px solid var(--border-color);">
                <div style="font-size: 2.5rem; margin-bottom: 8px;">📚</div>
                <h2 style="font-family: Russo One, sans-serif; color: var(--accent-gold); font-size: 1.5rem; margin-bottom: 6px;">{t_title}</h2>
                <p style="color: var(--text-secondary); font-size: 0.9rem; margin: 0;">L'encyclopédie universelle zythologique & guide de dégustation</p>
            </div>

            <!-- 1. Guide des Grands Styles -->
            <div class="beerpedia-section" style="background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 16px; padding: 20px;">
                <h3 style="color: var(--accent-gold); font-size: 1.15rem; margin-bottom: 16px; display: flex; align-items: center; gap: 8px;">
                    🍺 Les Grands Styles de Bières
                </h3>
                
                <div class="style-cards-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 12px;">
                    <div class="style-card" style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); padding: 14px; border-radius: 12px;">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                            <strong style="color: #fff; font-size: 0.95rem;">Trappiste</strong>
                            <span class="badge" style="background: rgba(255, 192, 0, 0.2); color: var(--accent-gold); font-size: 0.7rem; padding: 2px 6px; border-radius: 4px;">Prestige</span>
                        </div>
                        <p style="font-size: 0.8rem; color: #aaa; line-height: 1.4; margin-bottom: 8px;">Brassée sous le contrôle direct de moines cisterciens au sein d'une abbaye. Fermentation haute, rondeur maltée et arômes de fruits confits.</p>
                        <div style="font-size: 0.75rem; color: #777;">🌡️ Service : 10 - 14°C • 🍷 Verre : Calice</div>
                    </div>

                    <div class="style-card" style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); padding: 14px; border-radius: 12px;">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                            <strong style="color: #fff; font-size: 0.95rem;">IPA (India Pale Ale)</strong>
                            <span class="badge" style="background: rgba(46, 204, 113, 0.2); color: #2ecc71; font-size: 0.7rem; padding: 2px 6px; border-radius: 4px;">Houblonné</span>
                        </div>
                        <p style="font-size: 0.8rem; color: #aaa; line-height: 1.4; margin-bottom: 8px;">Née pour supporter les voyages coloniaux par bateau grâce à une forte dose de houblons. Explosion d'arômes d'agrumes, fruits tropicaux et amertume nette.</p>
                        <div style="font-size: 0.75rem; color: #777;">🌡️ Service : 7 - 10°C • 🍷 Verre : Teku ou Tulip</div>
                    </div>

                    <div class="style-card" style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); padding: 14px; border-radius: 12px;">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                            <strong style="color: #fff; font-size: 0.95rem;">Stout & Porter</strong>
                            <span class="badge" style="background: rgba(155, 89, 182, 0.2); color: #9b59b6; font-size: 0.7rem; padding: 2px 6px; border-radius: 4px;">Torréfié</span>
                        </div>
                        <p style="font-size: 0.8rem; color: #aaa; line-height: 1.4; margin-bottom: 8px;">Bière noire brassée à partir de malts hautement torréfiés. Notes dominantes de café expresso, cacao noir, vanille et texture soyeuse.</p>
                        <div style="font-size: 0.75rem; color: #777;">🌡️ Service : 11 - 15°C • 🍷 Verre : Pinte anglaise</div>
                    </div>

                    <div class="style-card" style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); padding: 14px; border-radius: 12px;">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                            <strong style="color: #fff; font-size: 0.95rem;">Lambic & Gueuze</strong>
                            <span class="badge" style="background: rgba(231, 76, 60, 0.2); color: #e74c3c; font-size: 0.7rem; padding: 2px 6px; border-radius: 4px;">Spontané</span>
                        </div>
                        <p style="font-size: 0.8rem; color: #aaa; line-height: 1.4; margin-bottom: 8px;">Spécialité exclusive de la vallée de la Senne (Bruxelles). Fermentation spontanée par les levures sauvages locales (Brettanomyces) et vieillissement en foudres de chêne.</p>
                        <div style="font-size: 0.75rem; color: #777;">🌡️ Service : 8 - 12°C • 🍷 Verre : Ballon à côtes</div>
                    </div>
                </div>
            </div>

            <!-- 2. Roue des Saveurs & Arômes -->
            <div class="beerpedia-section" style="background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 16px; padding: 20px;">
                <h3 style="color: var(--accent-gold); font-size: 1.15rem; margin-bottom: 16px; display: flex; align-items: center; gap: 8px;">
                    🎡 Roue des Saveurs & Profils Aromatiques
                </h3>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 10px;">
                    <div style="background: rgba(255, 192, 0, 0.08); border: 1px solid var(--accent-gold); padding: 12px; border-radius: 10px; text-align: center;">
                        <div style="font-size: 1.5rem;">🌾</div>
                        <strong style="color: #fff; font-size: 0.85rem; display: block; margin: 4px 0;">Malts & Céréales</strong>
                        <span style="font-size: 0.7rem; color: #aaa;">Biscuit, pain grillé, caramel, mélasse</span>
                    </div>
                    <div style="background: rgba(46, 204, 113, 0.08); border: 1px solid #2ecc71; padding: 12px; border-radius: 10px; text-align: center;">
                        <div style="font-size: 1.5rem;">🌿</div>
                        <strong style="color: #fff; font-size: 0.85rem; display: block; margin: 4px 0;">Houblons & Résines</strong>
                        <span style="font-size: 0.7rem; color: #aaa;">Pin, pamplemousse, herbe fraîche, mangue</span>
                    </div>
                    <div style="background: rgba(155, 89, 182, 0.08); border: 1px solid #9b59b6; padding: 12px; border-radius: 10px; text-align: center;">
                        <div style="font-size: 1.5rem;">🍌</div>
                        <strong style="color: #fff; font-size: 0.85rem; display: block; margin: 4px 0;">Levures & Esters</strong>
                        <span style="font-size: 0.7rem; color: #aaa;">Banane mûre, clou de girofle, poivre</span>
                    </div>
                    <div style="background: rgba(231, 76, 60, 0.08); border: 1px solid #e74c3c; padding: 12px; border-radius: 10px; text-align: center;">
                        <div style="font-size: 1.5rem;">🍒</div>
                        <strong style="color: #fff; font-size: 0.85rem; display: block; margin: 4px 0;">Acidité & Fruits</strong>
                        <span style="font-size: 0.7rem; color: #aaa;">Cerise griotte, pomme verte, vinaigre balsamique</span>
                    </div>
                </div>
            </div>

            <!-- 3. Protocole de Dégustation en 3 Étapes -->
            <div class="beerpedia-section" style="background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 16px; padding: 20px;">
                <h3 style="color: var(--accent-gold); font-size: 1.15rem; margin-bottom: 16px;">
                    👁️ Protocole d'Analyse Sensorielle
                </h3>
                <div style="display: flex; flex-direction: column; gap: 12px;">
                    <div style="display: flex; gap: 14px; align-items: flex-start;">
                        <div style="background: var(--accent-gold); color: #000; font-weight: bold; width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">1</div>
                        <div>
                            <strong style="color: #fff; font-size: 0.9rem;">L'Examen Visuel</strong>
                            <p style="font-size: 0.8rem; color: #aaa; margin: 2px 0 0 0;">Observez la limpidité, la robe (de paille pâle à noir ébène) et la tenue de la mousse (persistance, densité, bulles fines).</p>
                        </div>
                    </div>
                    <div style="display: flex; gap: 14px; align-items: flex-start;">
                        <div style="background: var(--accent-gold); color: #000; font-weight: bold; width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">2</div>
                        <div>
                            <strong style="color: #fff; font-size: 0.9rem;">L'Examen Olfactif (Nez)</strong>
                            <p style="font-size: 0.8rem; color: #aaa; margin: 2px 0 0 0;">Premier nez immobile, puis agitez doucement le verre pour libérer les esters volatils et identifier les arômes tertiaires.</p>
                        </div>
                    </div>
                    <div style="display: flex; gap: 14px; align-items: flex-start;">
                        <div style="background: var(--accent-gold); color: #000; font-weight: bold; width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">3</div>
                        <div>
                            <strong style="color: #fff; font-size: 0.9rem;">L'Examen Gustatif (Bouche & Rétro-olfaction)</strong>
                            <p style="font-size: 0.8rem; color: #aaa; margin: 2px 0 0 0;">Prenez une gorgée complète : évaluez l'attaque (sucrée, amère, acide), le corps en milieu de bouche et la longueur en finale.</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>"#
    )
}
