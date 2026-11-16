use beerdex_core::data::BeerDatabase;
use beerdex_core::i18n::I18nEngine;

/// Built-in static JSON catalogs embedded into the binary for 100% offline autonomy.
pub struct EmbeddedCatalogs;

impl EmbeddedCatalogs {
    pub const BELGIUM_BEER: &'static str = include_str!("../../../data/belgiumbeer.json");
    pub const FRENCH_BEER: &'static str = include_str!("../../../data/frenchbeer.json");
    pub const DEUTCH_BEER: &'static str = include_str!("../../../data/deutchbeer.json");
    pub const NL_BEER: &'static str = include_str!("../../../data/nlbeer.json");
    pub const US_BEER: &'static str = include_str!("../../../data/usbeer.json");
    pub const NEW_BEER: &'static str = include_str!("../../../data/newbeer.json");
    pub const CO_BEER: &'static str = include_str!("../../../data/cobeer.json");
    pub const KR_BEER: &'static str = include_str!("../../../data/krbeer.json");
    pub const JP_BEER: &'static str = include_str!("../../../data/jpbeer.json");
    pub const CN_BEER: &'static str = include_str!("../../../data/cnbeer.json");

    pub const BREWERIES: &'static str = include_str!("../../../data/breweries.json");
    pub const BAC_RULES: &'static str = include_str!("../../../data/bac_rules.json");

    pub const LOCALE_FR: &'static str = include_str!("../../../data/locales/fr.json");
    pub const LOCALE_EN: &'static str = include_str!("../../../data/locales/en.json");
    pub const NLP_FR: &'static str = include_str!("../../../data/locales/nlp_fr.json");
    pub const NLP_EN: &'static str = include_str!("../../../data/locales/nlp_en.json");
    pub const EVENTS_CONFIG: &'static str = include_str!("../../../event/events-config.json");
    pub const THANOS_ALIASES: &'static str = include_str!("../../../data/thanos_aliases.json");

    /// Instantiates and populates the complete official database.
    pub fn load_database() -> Result<BeerDatabase, serde_json::Error> {
        let mut db = BeerDatabase::new();

        db.load_beer_catalog_json(Self::NEW_BEER, "BE")?;
        db.load_beer_catalog_json(Self::BELGIUM_BEER, "BE")?;
        db.load_beer_catalog_json(Self::DEUTCH_BEER, "DE")?;
        db.load_beer_catalog_json(Self::FRENCH_BEER, "FR")?;
        db.load_beer_catalog_json(Self::NL_BEER, "NL")?;
        db.load_beer_catalog_json(Self::US_BEER, "US")?;
        db.load_beer_catalog_json(Self::CO_BEER, "CO")?;
        db.load_beer_catalog_json(Self::KR_BEER, "KR")?;
        db.load_beer_catalog_json(Self::JP_BEER, "JP")?;
        db.load_beer_catalog_json(Self::CN_BEER, "CN")?;

        db.load_breweries_json(Self::BREWERIES)?;
        db.load_bac_rules_json(Self::BAC_RULES)?;
        db.load_thanos_aliases_json(Self::THANOS_ALIASES)?;

        db.enrich_metadata();

        Ok(db)
    }

    /// Instantiates the i18n engine with French and English tables.
    pub fn load_i18n(initial_lang: &str) -> Result<I18nEngine, serde_json::Error> {
        let mut engine = I18nEngine::new(initial_lang);
        engine.load_locale_json("fr", Self::LOCALE_FR)?;
        engine.load_locale_json("en", Self::LOCALE_EN)?;
        Ok(engine)
    }

    /// Returns the embedded NLP dictionary JSON string for the given language.
    pub fn get_nlp_json(lang: &str) -> &'static str {
        if lang == "en" {
            Self::NLP_EN
        } else {
            Self::NLP_FR
        }
    }

    /// Parses the embedded seasonal events configuration.
    pub fn load_events_config() -> Result<serde_json::Value, serde_json::Error> {
        serde_json::from_str(Self::EVENTS_CONFIG)
    }
}
