//! Native Rust CSS Engine & Embedded Stylesheets for Beerdex.
//! Eliminates external CSS file dependencies by packaging styles directly into memory.

pub const STYLE_CORE: &str = include_str!("../../../style.css");
pub const STYLE_MUSEUM: &str = include_str!("../../../style-museum.css");
pub const STYLE_WRAPPED: &str = include_str!("../../../css/wrapped.css");
pub const STYLE_ANIMATE: &str = include_str!("../../../css/vendor/animate.min.css");

pub const STYLE_NATIVE_COMPONENTS: &str = r#"
/* === Rust Native Components & UI Styles === */
.beer-grid {
    display: grid !important;
    grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)) !important;
    gap: 12px !important;
    width: 100% !important;
    padding: 12px !important;
    box-sizing: border-box !important;
}
@media (min-width: 600px) {
    .beer-grid {
        grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)) !important;
        gap: 16px !important;
    }
}
@media (min-width: 1024px) {
    .beer-grid {
        grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)) !important;
        gap: 20px !important;
        padding: 20px 40px !important;
    }
}
.beer-card {
    background: var(--bg-card, #141414) !important;
    border: 1px solid var(--border-color, #2d2d2d) !important;
    border-radius: 16px !important;
    padding: 14px 10px 12px 10px !important;
    display: flex !important;
    flex-direction: column !important;
    align-items: center !important;
    justify-content: space-between !important;
    text-align: center !important;
    box-sizing: border-box !important;
    position: relative !important;
    transition: transform 0.2s, box-shadow 0.2s !important;
    overflow: hidden !important;
    min-height: 270px !important;
}
.beer-card:hover {
    transform: translateY(-4px) !important;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4) !important;
}
.beer-card.drunk {
    border-color: var(--accent-gold, #ffc107) !important;
    background: linear-gradient(145deg, var(--bg-card, #141414), #1a1a10) !important;
}
.beer-image-container {
    width: 100% !important;
    height: 120px !important;
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    margin: 6px 0 !important;
}
.beer-image {
    max-height: 115px !important;
    max-width: 90px !important;
    width: auto !important;
    height: auto !important;
    object-fit: contain !important;
    filter: drop-shadow(0 4px 6px rgba(0,0,0,0.5)) !important;
    transition: transform 0.2s ease !important;
}
.beer-card:hover .beer-image {
    transform: scale(1.06) !important;
}
.beer-info {
    width: 100% !important;
    display: flex !important;
    flex-direction: column !important;
    align-items: center !important;
    gap: 4px !important;
}
.beer-title {
    font-size: 0.9rem !important;
    font-weight: 700 !important;
    line-height: 1.2 !important;
    margin: 0 !important;
    color: var(--text-primary, #fff) !important;
    display: -webkit-box !important;
    -webkit-line-clamp: 2 !important;
    -webkit-box-orient: vertical !important;
    overflow: hidden !important;
}
.beer-brewery {
    font-size: 0.75rem !important;
    color: var(--text-secondary, #a0a0a0) !important;
    text-transform: uppercase !important;
    letter-spacing: 0.5px !important;
    margin: 0 !important;
    white-space: nowrap !important;
    overflow: hidden !important;
    text-overflow: ellipsis !important;
    max-width: 100% !important;
}
.beer-card-stats-row {
    display: flex !important;
    gap: 6px !important;
    justify-content: center !important;
    align-items: center !important;
    margin-top: 4px !important;
}
.badge-pill {
    background: rgba(255, 255, 255, 0.08) !important;
    color: #ccc !important;
    font-size: 0.7rem !important;
    padding: 2px 6px !important;
    border-radius: 6px !important;
    font-weight: 500 !important;
}
.card-footer {
    width: 100% !important;
    display: flex !important;
    align-items: center !important;
    justify-content: space-between !important;
    margin-top: 10px !important;
    padding-top: 8px !important;
    border-top: 1px solid rgba(255, 255, 255, 0.05) !important;
}
.btn-drink-quick {
    background: rgba(255, 192, 0, 0.15) !important;
    color: var(--accent-gold, #ffc107) !important;
    border: 1px solid rgba(255, 192, 0, 0.4) !important;
    border-radius: 8px !important;
    padding: 3px 8px !important;
    font-size: 0.75rem !important;
    font-weight: 600 !important;
    cursor: pointer !important;
    transition: all 0.2s ease !important;
}
.btn-drink-quick:hover {
    background: var(--accent-gold, #ffc107) !important;
    color: #000 !important;
}
.drunk-badge {
    background: rgba(46, 204, 113, 0.2) !important;
    color: #2ecc71 !important;
    border: 1px solid #2ecc71 !important;
    border-radius: 8px !important;
    padding: 2px 7px !important;
    font-size: 0.75rem !important;
    font-weight: 700 !important;
}
.card-badges-right {
    position: absolute !important;
    top: 8px !important;
    right: 8px !important;
    z-index: 3 !important;
    display: flex !important;
    align-items: center !important;
    gap: 6px !important;
}

/* Stats View */
.stats-container {
    max-width: 800px !important;
    margin: 0 auto !important;
    padding: 16px !important;
    display: flex !important;
    flex-direction: column !important;
    gap: 20px !important;
}
.stats-card {
    background: var(--bg-card, #141414) !important;
    border: 1px solid var(--border-color, #2d2d2d) !important;
    border-radius: 16px !important;
    padding: 20px !important;
    box-shadow: 0 4px 16px rgba(0,0,0,0.3) !important;
}
.stats-section-title {
    font-size: 1.1rem !important;
    font-weight: 700 !important;
    color: var(--accent-gold, #ffc107) !important;
    margin: 0 0 16px 0 !important;
    display: flex !important;
    align-items: center !important;
    gap: 8px !important;
}
.bac-display-hero {
    display: flex !important;
    align-items: center !important;
    justify-content: space-between !important;
    padding: 14px 18px !important;
    background: rgba(255, 255, 255, 0.03) !important;
    border-radius: 12px !important;
}
.bac-value {
    font-size: 2rem !important;
    font-weight: 800 !important;
}
.bac-value .unit {
    font-size: 0.9rem !important;
    font-weight: 400 !important;
    color: #aaa !important;
}
.bac-rank-badge {
    padding: 6px 14px !important;
    border-radius: 20px !important;
    font-weight: 700 !important;
    font-size: 0.85rem !important;
    text-transform: uppercase !important;
}
.gamer-grid {
    display: grid !important;
    grid-template-columns: repeat(4, 1fr) !important;
    gap: 12px !important;
    margin-bottom: 16px !important;
}
.gamer-stat {
    background: rgba(255, 255, 255, 0.03) !important;
    border: 1px solid rgba(255, 255, 255, 0.06) !important;
    border-radius: 10px !important;
    padding: 12px 8px !important;
    text-align: center !important;
    display: flex !important;
    flex-direction: column !important;
    gap: 4px !important;
}
.gamer-stat-label {
    font-size: 0.65rem !important;
    font-weight: 700 !important;
    color: #888 !important;
    letter-spacing: 1px !important;
}
.gamer-stat-val {
    font-size: 1.15rem !important;
    font-weight: 700 !important;
    color: #00e5ff !important;
}
.gamer-setup-row {
    display: flex !important;
    justify-content: space-between !important;
    font-size: 0.8rem !important;
    color: #999 !important;
    padding: 8px 12px !important;
    background: rgba(0, 0, 0, 0.2) !important;
    border-radius: 8px !important;
}
.volume-equivalences {
    display: grid !important;
    grid-template-columns: repeat(3, 1fr) !important;
    gap: 12px !important;
}
.volume-stat {
    background: rgba(255, 255, 255, 0.03) !important;
    border: 1px solid rgba(255, 255, 255, 0.06) !important;
    border-radius: 12px !important;
    padding: 16px 10px !important;
    display: flex !important;
    flex-direction: column !important;
    align-items: center !important;
    text-align: center !important;
    gap: 4px !important;
}
.volume-stat .vol-icon {
    font-size: 1.8rem !important;
}
.volume-stat .vol-number {
    font-size: 1.2rem !important;
    font-weight: 700 !important;
    color: #fff !important;
}
.volume-stat .vol-label {
    font-size: 0.75rem !important;
    color: #888 !important;
}
.achievements-header {
    display: flex !important;
    justify-content: space-between !important;
    align-items: center !important;
    margin-bottom: 16px !important;
}
.achievements-grid {
    display: grid !important;
    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)) !important;
    gap: 10px !important;
    max-height: 450px !important;
    overflow-y: auto !important;
    padding-right: 4px !important;
}
.achievement-badge {
    background: rgba(255, 255, 255, 0.03) !important;
    border: 1px solid rgba(255, 255, 255, 0.06) !important;
    border-radius: 10px !important;
    padding: 10px 12px !important;
    display: flex !important;
    align-items: center !important;
    gap: 12px !important;
    transition: all 0.2s ease !important;
}
.achievement-badge.locked {
    opacity: 0.45 !important;
    filter: grayscale(0.8) !important;
}
.achievement-badge.unlocked {
    border-color: rgba(255, 192, 0, 0.35) !important;
    background: rgba(255, 192, 0, 0.04) !important;
}
.ach-icon {
    font-size: 1.5rem !important;
    line-height: 1 !important;
}
.ach-info {
    flex: 1 !important;
    min-width: 0 !important;
}
.ach-title {
    font-size: 0.85rem !important;
    font-weight: 700 !important;
    color: #fff !important;
    white-space: nowrap !important;
    overflow: hidden !important;
    text-overflow: ellipsis !important;
}
.ach-desc {
    font-size: 0.72rem !important;
    color: #aaa !important;
    line-height: 1.3 !important;
}

/* Settings View */
.settings-container {
    max-width: 650px !important;
    margin: 0 auto !important;
    padding: 16px !important;
    display: flex !important;
    flex-direction: column !important;
    gap: 20px !important;
}
.settings-title {
    font-size: 1.3rem !important;
    color: var(--accent-gold, #ffc107) !important;
    margin: 0 !important;
}
.settings-group {
    background: var(--bg-card, #141414) !important;
    border: 1px solid var(--border-color, #2d2d2d) !important;
    border-radius: 16px !important;
    padding: 20px !important;
    display: flex !important;
    flex-direction: column !important;
    gap: 14px !important;
    box-shadow: 0 4px 16px rgba(0,0,0,0.3) !important;
}
.settings-label {
    font-size: 0.95rem !important;
    font-weight: 700 !important;
    color: #fff !important;
    display: block !important;
}
.settings-row {
    display: flex !important;
    justify-content: space-between !important;
    align-items: center !important;
    gap: 12px !important;
    font-size: 0.9rem !important;
    color: #ccc !important;
}
.settings-btn-group {
    display: flex !important;
    gap: 10px !important;
}
.settings-btn-group .btn-toggle {
    flex: 1 !important;
    padding: 10px !important;
    border-radius: 10px !important;
    border: 1px solid var(--border-color, #2d2d2d) !important;
    background: rgba(255, 255, 255, 0.04) !important;
    color: #aaa !important;
    font-weight: 600 !important;
    cursor: pointer !important;
    transition: all 0.2s ease !important;
}
.settings-btn-group .btn-toggle.active {
    background: var(--accent-gold, #ffc107) !important;
    color: #000 !important;
    border-color: var(--accent-gold, #ffc107) !important;
}
.settings-input, .settings-select {
    padding: 8px 12px !important;
    background: #222 !important;
    border: 1px solid #3d3d3d !important;
    border-radius: 8px !important;
    color: #fff !important;
    font-size: 0.9rem !important;
}
.settings-actions {
    display: flex !important;
    flex-direction: column !important;
    gap: 10px !important;
}
.btn-primary {
    background: var(--accent-gold, #ffc107) !important;
    color: #000 !important;
    border: none !important;
    border-radius: 10px !important;
    padding: 12px 16px !important;
    font-weight: 700 !important;
    font-size: 0.95rem !important;
    cursor: pointer !important;
    transition: opacity 0.2s ease !important;
    text-align: center !important;
}
.btn-secondary {
    background: rgba(255, 255, 255, 0.08) !important;
    color: #fff !important;
    border: 1px solid rgba(255, 255, 255, 0.15) !important;
    border-radius: 10px !important;
    padding: 12px 16px !important;
    font-weight: 600 !important;
    font-size: 0.95rem !important;
    cursor: pointer !important;
    text-align: center !important;
}
.btn-danger {
    background: rgba(231, 76, 60, 0.15) !important;
    color: #ff5252 !important;
    border: 1px solid #ff5252 !important;
    border-radius: 10px !important;
    padding: 10px 14px !important;
    font-weight: 600 !important;
    font-size: 0.85rem !important;
    cursor: pointer !important;
    transition: all 0.2s ease !important;
    text-align: center !important;
}
.btn-danger:hover {
    background: #ff5252 !important;
    color: #fff !important;
}

/* Modal View */
.modal-overlay {
    position: fixed !important;
    top: 0 !important;
    left: 0 !important;
    right: 0 !important;
    bottom: 0 !important;
    background: rgba(0, 0, 0, 0.85) !important;
    backdrop-filter: blur(8px) !important;
    z-index: 2000 !important;
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    padding: 16px !important;
}
.modal-card {
    background: #181818 !important;
    border: 1px solid var(--border-color, #333) !important;
    border-radius: 20px !important;
    padding: 24px !important;
    max-width: 500px !important;
    width: 100% !important;
    position: relative !important;
    max-height: 90vh !important;
    overflow-y: auto !important;
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.7) !important;
}
.modal-close {
    position: absolute !important;
    top: 14px !important;
    right: 14px !important;
    background: rgba(255, 255, 255, 0.1) !important;
    border: none !important;
    color: #fff !important;
    font-size: 1.5rem !important;
    width: 32px !important;
    height: 32px !important;
    border-radius: 50% !important;
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    cursor: pointer !important;
    line-height: 1 !important;
}
.modal-hero {
    display: flex !important;
    gap: 20px !important;
    align-items: center !important;
    margin-bottom: 20px !important;
}
.modal-beer-img {
    width: 100px !important;
    height: 140px !important;
    object-fit: contain !important;
    filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.6)) !important;
}
.modal-header-info {
    flex: 1 !important;
}
.modal-title {
    font-size: 1.3rem !important;
    font-weight: 700 !important;
    margin: 8px 0 4px 0 !important;
    color: #fff !important;
}
.modal-brewery {
    font-size: 0.85rem !important;
    color: var(--text-secondary, #aaa) !important;
    text-transform: uppercase !important;
    margin: 0 0 10px 0 !important;
}
.modal-meta-tags {
    display: flex !important;
    gap: 6px !important;
    flex-wrap: wrap !important;
}
.meta-tag {
    background: rgba(255, 255, 255, 0.08) !important;
    color: #ddd !important;
    padding: 3px 8px !important;
    border-radius: 6px !important;
    font-size: 0.75rem !important;
}
.modal-actions-panel {
    display: flex !important;
    flex-direction: column !important;
    gap: 12px !important;
    margin-bottom: 20px !important;
}
.action-volume-selector {
    display: flex !important;
    gap: 8px !important;
}
.btn-vol {
    flex: 1 !important;
    padding: 8px !important;
    border-radius: 8px !important;
    background: rgba(255, 255, 255, 0.05) !important;
    border: 1px solid rgba(255, 255, 255, 0.1) !important;
    color: #ccc !important;
    font-size: 0.85rem !important;
    font-weight: 600 !important;
    cursor: pointer !important;
}
.btn-vol.active {
    background: var(--accent-gold, #ffc107) !important;
    color: #000 !important;
    border-color: var(--accent-gold, #ffc107) !important;
}
.btn-drink-main {
    background: var(--accent-gold, #ffc107) !important;
    color: #000 !important;
    border: none !important;
    border-radius: 12px !important;
    padding: 14px !important;
    font-size: 1.05rem !important;
    font-weight: 800 !important;
    cursor: pointer !important;
}
.modal-rating-section {
    background: rgba(255, 255, 255, 0.02) !important;
    border: 1px solid rgba(255, 255, 255, 0.05) !important;
    border-radius: 12px !important;
    padding: 16px !important;
    display: flex !important;
    flex-direction: column !important;
    gap: 10px !important;
    margin-bottom: 14px !important;
}
.rating-input-row {
    display: flex !important;
    justify-content: space-between !important;
    align-items: center !important;
    font-size: 0.9rem !important;
}
.score-input {
    width: 70px !important;
    padding: 6px 10px !important;
    background: #222 !important;
    border: 1px solid #444 !important;
    border-radius: 6px !important;
    color: var(--accent-gold, #ffc107) !important;
    font-weight: 700 !important;
    font-size: 1rem !important;
    text-align: center !important;
}
.comment-input {
    width: 100% !important;
    height: 70px !important;
    background: #222 !important;
    border: 1px solid #444 !important;
    border-radius: 8px !important;
    padding: 10px !important;
    color: #fff !important;
    font-size: 0.85rem !important;
    resize: none !important;
    box-sizing: border-box !important;
}
.btn-save-rating {
    background: rgba(255, 255, 255, 0.08) !important;
    border: 1px solid rgba(255, 255, 255, 0.15) !important;
    color: #fff !important;
    padding: 8px !important;
    border-radius: 8px !important;
    font-weight: 600 !important;
    cursor: pointer !important;
}
.modal-history-preview {
    font-size: 0.85rem !important;
    color: #888 !important;
    text-align: center !important;
}
"#;

pub struct StyleEngine;

impl StyleEngine {
    /// Returns the active CSS stylesheet bundled into memory according to the selected theme.
    pub fn get_stylesheet(theme: &str) -> &'static str {
        if theme == "museum" {
            STYLE_MUSEUM
        } else {
            STYLE_CORE
        }
    }

    /// Returns the complete concatenated application CSS including animation library and wrapped module.
    pub fn get_bundled_css(theme: &str) -> String {
        let mut css = String::with_capacity(
            STYLE_CORE.len()
                + STYLE_ANIMATE.len()
                + STYLE_WRAPPED.len()
                + STYLE_NATIVE_COMPONENTS.len()
                + 1024,
        );
        css.push_str("/* === Beerdex Native Stylesheet Bundle === */\n");
        css.push_str(STYLE_ANIMATE);
        css.push_str("\n\n");
        css.push_str(Self::get_stylesheet(theme));
        css.push_str("\n\n");
        css.push_str(STYLE_WRAPPED);
        css.push_str("\n\n");
        css.push_str(STYLE_NATIVE_COMPONENTS);
        css
    }

    /// Injects the bundled styles into the DOM document `<head>` on WASM platforms.
    #[cfg(target_arch = "wasm32")]
    pub fn inject_styles(theme: &str) -> Result<(), String> {
        let window = web_sys::window().ok_or_else(|| "No window found".to_string())?;
        let document = window
            .document()
            .ok_or_else(|| "No document found".to_string())?;
        let head = document
            .head()
            .ok_or_else(|| "No head element found".to_string())?;

        let style_elem = document
            .get_element_by_id("beerdex-native-styles")
            .unwrap_or_else(|| {
                let el = document.create_element("style").unwrap();
                el.set_id("beerdex-native-styles");
                head.append_child(&el).unwrap();
                el
            });

        let css = Self::get_bundled_css(theme);
        style_elem.set_text_content(Some(&css));
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_styles_embedded() {
        assert!(!STYLE_CORE.is_empty(), "Core style must not be empty");
        assert!(!STYLE_MUSEUM.is_empty(), "Museum style must not be empty");
        assert!(!STYLE_WRAPPED.is_empty(), "Wrapped style must not be empty");
        assert!(!STYLE_ANIMATE.is_empty(), "Animate style must not be empty");

        let bundled = StyleEngine::get_bundled_css("classic");
        assert!(
            bundled.contains("--rarity") || bundled.contains("card") || bundled.contains("beer")
        );
        assert!(bundled.len() > 100_000);
    }
}
