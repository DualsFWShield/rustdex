use serde_json::Value;
use std::collections::HashMap;

#[derive(Debug, Clone)]
pub struct I18nEngine {
    current_lang: String,
    translations: HashMap<String, HashMap<String, String>>,
}

impl Default for I18nEngine {
    fn default() -> Self {
        Self::new("fr")
    }
}

impl I18nEngine {
    pub fn new(initial_lang: &str) -> Self {
        Self {
            current_lang: initial_lang.to_string(),
            translations: HashMap::new(),
        }
    }

    /// Loads a translation map from raw JSON bytes.
    pub fn load_locale_json(
        &mut self,
        lang: &str,
        json_str: &str,
    ) -> Result<(), serde_json::Error> {
        let clean = json_str.strip_prefix("\u{feff}").unwrap_or(json_str);
        let parsed: HashMap<String, Value> = serde_json::from_str(clean)?;
        let mut map = HashMap::new();
        for (k, v) in parsed {
            if let Some(s) = v.as_str() {
                map.insert(k, s.to_string());
            }
        }
        self.translations.insert(lang.to_string(), map);
        Ok(())
    }

    pub fn set_language(&mut self, lang: &str) {
        self.current_lang = lang.to_string();
    }

    pub fn current_language(&self) -> &str {
        &self.current_lang
    }

    /// Looks up a translation key with fallback.
    pub fn t(&self, key: &str) -> String {
        if let Some(lang_map) = self.translations.get(&self.current_lang) {
            if let Some(val) = lang_map.get(key) {
                return val.clone();
            }
        }
        // Fallback to French
        if self.current_lang != "fr" {
            if let Some(fr_map) = self.translations.get("fr") {
                if let Some(val) = fr_map.get(key) {
                    return val.clone();
                }
            }
        }
        if let Some(fallback) = Self::builtin_fallback(key, &self.current_lang) {
            return fallback.to_string();
        }
        key.to_string()
    }

    fn builtin_fallback(key: &str, lang: &str) -> Option<&'static str> {
        let is_en = lang == "en";
        match key {
            "pref_language" => Some(if is_en { "Language" } else { "Langue" }),
            "btn_drink_quick" => Some(if is_en { "+ Drink" } else { "+ Boire" }),
            "detail_btn_drink" => Some(if is_en {
                "Drink this beer"
            } else {
                "Boire cette bière"
            }),
            "no_beers_found" => Some(if is_en {
                "No beers found"
            } else {
                "Aucune bière trouvée"
            }),
            "nav_home" => Some("Dex"),
            "nav_history" => Some("Bus"),
            "nav_stats" => Some("Stats"),
            "nav_beerpedia" => Some("Beerpedia"),
            "nav_settings" => Some(if is_en { "Settings" } else { "Paramètres" }),
            "list_empty_collection" => Some(if is_en {
                "Your collection is empty"
            } else {
                "Votre collection est vide."
            }),
            "stats_history_no_data" => Some(if is_en {
                "No tasting recorded yet 🍻"
            } else {
                "Aucune dégustation enregistrée 🍻"
            }),
            "loading_app" => Some(if is_en {
                "Loading Beerdex..."
            } else {
                "Chargement du Beerdex..."
            }),
            _ => None,
        }
    }

    /// Looks up a translation key, returning fallback if not found or if translation equals key.
    pub fn t_or(&self, key: &str, fallback: &str) -> String {
        let text = self.t(key);
        if text == key {
            fallback.to_string()
        } else {
            text
        }
    }

    /// Looks up a translation key and interpolates variables `{var}`.
    pub fn t_with_args(&self, key: &str, args: &[(&str, &str)]) -> String {
        let mut text = self.t(key);
        for &(param, value) in args {
            text = text.replace(&format!("{{{}}}", param), value);
        }
        text
    }
}
