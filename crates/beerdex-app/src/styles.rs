//! Native Rust CSS Engine & Embedded Stylesheets for Beerdex.
//! Eliminates external CSS file dependencies by packaging styles directly into memory.

pub const STYLE_CORE: &str = include_str!("../../../style.css");
pub const STYLE_MUSEUM: &str = include_str!("../../../style-museum.css");
pub const STYLE_WRAPPED: &str = include_str!("../../../css/wrapped.css");
pub const STYLE_ANIMATE: &str = include_str!("../../../css/vendor/animate.min.css");

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
            STYLE_CORE.len() + STYLE_ANIMATE.len() + STYLE_WRAPPED.len() + 1024,
        );
        css.push_str("/* === Beerdex Native Stylesheet Bundle === */\n");
        css.push_str(STYLE_ANIMATE);
        css.push_str("\n\n");
        css.push_str(Self::get_stylesheet(theme));
        css.push_str("\n\n");
        css.push_str(STYLE_WRAPPED);
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
