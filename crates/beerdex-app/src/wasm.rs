use wasm_bindgen::prelude::*;

#[wasm_bindgen(start)]
pub fn wasm_init() -> Result<(), JsValue> {
    web_sys::console::log_1(&"[Beerdex Rust] 🦀 WebAssembly Engine v5.1.0 initialized successfully. Native acceleration ready.".into());
    Ok(())
}

#[wasm_bindgen]
pub fn beerdex_version() -> String {
    "5.1.0 (Rust WebAssembly Engine)".to_string()
}

#[wasm_bindgen]
pub fn beerdex_calculate_bac(
    weight: f64,
    is_female: bool,
    age: u32,
    history_json: &str,
    now_ms: f64,
) -> f64 {
    #[derive(serde::Deserialize)]
    struct DrinkInput {
        time: i64,
        volume: u32,
        abv: f64,
    }

    let gender = if is_female {
        beerdex_core::bac::Gender::Female
    } else {
        beerdex_core::bac::Gender::Male
    };

    let history: Vec<beerdex_core::models::BacHistoryEntry> =
        if let Ok(inputs) = serde_json::from_str::<Vec<DrinkInput>>(history_json) {
            inputs
                .into_iter()
                .map(|i| {
                    let grams = beerdex_core::bac::calculate_alcohol_grams(i.volume, i.abv);
                    beerdex_core::models::BacHistoryEntry {
                        time: i.time,
                        volume: i.volume,
                        abv: i.abv,
                        grams,
                    }
                })
                .collect()
        } else {
            Vec::new()
        };

    let sim = beerdex_core::bac::simulate_bac(&history, now_ms as i64, weight, gender, age);
    sim.current_bac
}

#[wasm_bindgen]
pub fn beerdex_calculate_rarity(
    country: &str,
    style: &str,
    abv: f64,
    distribution: &str,
    barrel_aged: bool,
    ingredients: &str,
) -> String {
    let dummy_beer = beerdex_core::models::Beer {
        title: "temp".to_string(),
        brewery: "temp".to_string(),
        beer_type: style.to_string(),
        volume: Some("33cl".to_string()),
        alcohol: Some(format!("{:.1}%", abv)),
        id: None,
        image: None,
        production_volume: None,
        distribution: Some(distribution.to_string()),
        barrel_aged: Some(barrel_aged),
        community_rating: None,
        ingredients: Some(ingredients.to_string()),
        rarity_rank: None,
        barcode: None,
        country: if country.is_empty() {
            None
        } else {
            Some(country.to_string())
        },
        country_code: None,
        search_region: None,
        search_country: None,
    };

    let result = beerdex_core::rarity::calculate_rarity(&dummy_beer);
    result.rarity
}

#[wasm_bindgen]
pub fn beerdex_compress_lz(text: &str) -> String {
    beerdex_core::lz_string::compress_to_encoded_uri_component(text)
}

#[wasm_bindgen]
pub fn beerdex_decompress_lz(text: &str) -> Option<String> {
    beerdex_core::lz_string::decompress_from_encoded_uri_component(text)
}

#[wasm_bindgen]
pub fn beerdex_generate_qr_svg(text: &str, size_px: u32) -> String {
    beerdex_core::qrcode_gen::QrGenerator::to_svg_string(text, size_px)
}

#[wasm_bindgen]
pub fn beerdex_validate_ean13(barcode: &str) -> bool {
    beerdex_platform::scanner::ScannerEngine::validate_ean13(barcode)
}

#[wasm_bindgen]
pub fn beerdex_parse_scan(payload: &str) -> String {
    let parsed = beerdex_platform::scanner::ScannerEngine::parse_scanned_text(payload);
    serde_json::to_string(&parsed).unwrap_or_default()
}

#[wasm_bindgen]
pub fn beerdex_french_typography(text: &str) -> String {
    beerdex_core::nlp::NlpEngine::apply_french_typography(text)
}

#[wasm_bindgen]
pub fn beerdex_french_elision(text: &str) -> String {
    beerdex_core::nlp::NlpEngine::apply_french_elisions(text)
}

#[wasm_bindgen]
pub fn beerdex_similarity(a: &str, b: &str) -> f64 {
    beerdex_core::deduplicator::similarity(a, b)
}

#[wasm_bindgen]
pub fn beerdex_trigger_haptic(pattern: &str) {
    match pattern {
        "light" => beerdex_platform::haptics::HapticsEngine::impact(
            beerdex_platform::haptics::ImpactStyle::Light,
        ),
        "medium" => beerdex_platform::haptics::HapticsEngine::impact(
            beerdex_platform::haptics::ImpactStyle::Medium,
        ),
        "heavy" => beerdex_platform::haptics::HapticsEngine::impact(
            beerdex_platform::haptics::ImpactStyle::Heavy,
        ),
        "success" => beerdex_platform::haptics::HapticsEngine::notification(
            beerdex_platform::haptics::NotificationType::Success,
        ),
        "warning" => beerdex_platform::haptics::HapticsEngine::notification(
            beerdex_platform::haptics::NotificationType::Warning,
        ),
        "error" => beerdex_platform::haptics::HapticsEngine::notification(
            beerdex_platform::haptics::NotificationType::Error,
        ),
        _ => beerdex_platform::haptics::HapticsEngine::vibrate(15),
    }
}
