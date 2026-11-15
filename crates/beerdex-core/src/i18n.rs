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
        let parsed: HashMap<String, Value> = serde_json::from_str(json_str)?;
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
        key.to_string()
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
