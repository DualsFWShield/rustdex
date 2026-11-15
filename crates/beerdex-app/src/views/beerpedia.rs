use crate::state::AppState;

/// Renders the complete, interactive Beerpedia encyclopedia matching beerdex.be.
pub fn render_beerpedia_view(state: &AppState) -> String {
    let lang = state.i18n.current_language();

    format!(
        r#"<div style="position:relative; width:100%; height:calc(100vh - 70px); overflow:hidden;">
            <div id="beerpedia-loader" style="
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 15px;
                z-index: 5;
            ">
                <div class="spinner" style="width: 50px; height: 50px;"></div>
                <span style="color: var(--text-secondary); font-size: 0.9rem;">Chargement de Beerpedia...</span>
            </div>
            <iframe id="beerpedia-frame" src="https://beerpedia.beerdex.be?lang={lang}" style="
                    width: 100%;
                    height: 100%;
                    border: none;
                    display: block;
                    background: #0d0d0d;
                    position: relative;
                    z-index: 10;
                    opacity: 0;
                    transition: opacity 0.3s ease;
                " title="Beerpedia - L'encyclopédie de la bière" allow="fullscreen" onload="this.style.opacity='1'; document.getElementById('beerpedia-loader')?.remove();"></iframe>
        </div>"#,
        lang = lang
    )
}
