#[cfg(target_arch = "wasm32")]
use crate::render_app_shell;
use crate::state::AppState;
#[cfg(target_arch = "wasm32")]
use crate::state::{AppView, ViewMode};
use std::cell::RefCell;

#[cfg(target_arch = "wasm32")]
use wasm_bindgen::prelude::*;

thread_local! {
    static APP_INSTANCE: RefCell<Option<AppState>> = const { RefCell::new(None) };
}

#[cfg(target_arch = "wasm32")]
#[wasm_bindgen(start)]
pub fn wasm_init() -> Result<(), JsValue> {
    let state = AppState::new().map_err(|e| JsValue::from_str(&e))?;
    let theme = state
        .storage
        .preferences
        .get("theme")
        .and_then(|v| v.as_str())
        .unwrap_or("classic");
    let _ = crate::styles::StyleEngine::inject_styles(theme);
    APP_INSTANCE.with(|cell| {
        *cell.borrow_mut() = Some(state);
    });

    render_dom()?;
    Ok(())
}

#[cfg(target_arch = "wasm32")]
pub fn render_dom() -> Result<(), JsValue> {
    let window = web_sys::window().ok_or("No window")?;
    let document = window.document().ok_or("No document")?;

    APP_INSTANCE.with(|cell| {
        if let Some(ref state) = *cell.borrow() {
            if let Some(app_elem) = document.get_element_by_id("app") {
                app_elem.set_inner_html(&render_app_shell(state));
            }
        }
        Ok::<(), JsValue>(())
    })?;

    Ok(())
}

#[cfg(target_arch = "wasm32")]
#[wasm_bindgen]
pub fn beerdex_switch_view(view_name: &str) -> Result<(), JsValue> {
    APP_INSTANCE.with(|cell| {
        if let Some(ref mut state) = *cell.borrow_mut() {
            state.view = match view_name {
                "home" => AppView::Home,
                "drunk" => AppView::Drunk,
                "stats" => AppView::Stats,
                "beerpedia" => AppView::Beerpedia,
                "settings" => AppView::Settings,
                "poster" => AppView::Poster,
                _ => AppView::Home,
            };
        }
    });
    render_dom()
}

#[cfg(target_arch = "wasm32")]
#[wasm_bindgen]
pub fn beerdex_toggle_view_mode() -> Result<(), JsValue> {
    APP_INSTANCE.with(|cell| {
        if let Some(ref mut state) = *cell.borrow_mut() {
            state.view_mode = match state.view_mode {
                ViewMode::Grid => ViewMode::List,
                ViewMode::List => ViewMode::Grid,
            };
        }
    });
    render_dom()
}

#[cfg(target_arch = "wasm32")]
#[wasm_bindgen]
pub fn beerdex_search(query: &str) -> Result<(), JsValue> {
    APP_INSTANCE.with(|cell| {
        if let Some(ref mut state) = *cell.borrow_mut() {
            state.search_query = query.to_string();
            state.search_active = !query.is_empty();
        }
    });
    render_dom()
}

#[cfg(target_arch = "wasm32")]
#[wasm_bindgen]
pub fn beerdex_toggle_search() -> Result<(), JsValue> {
    APP_INSTANCE.with(|cell| {
        if let Some(ref mut state) = *cell.borrow_mut() {
            state.search_active = !state.search_active;
        }
    });
    render_dom()
}

#[cfg(target_arch = "wasm32")]
#[wasm_bindgen]
pub fn beerdex_open_filter_modal() -> Result<(), JsValue> {
    APP_INSTANCE.with(|cell| {
        if let Some(ref mut state) = *cell.borrow_mut() {
            state.show_filter_modal = true;
        }
    });
    render_dom()
}

#[cfg(target_arch = "wasm32")]
#[wasm_bindgen]
pub fn beerdex_close_filter_modal() -> Result<(), JsValue> {
    APP_INSTANCE.with(|cell| {
        if let Some(ref mut state) = *cell.borrow_mut() {
            state.show_filter_modal = false;
        }
    });
    render_dom()
}

#[cfg(target_arch = "wasm32")]
#[wasm_bindgen]
pub fn beerdex_set_filter_style(style: &str) -> Result<(), JsValue> {
    APP_INSTANCE.with(|cell| {
        if let Some(ref mut state) = *cell.borrow_mut() {
            if state.filters.style.as_deref() == Some(style) {
                state.filters.style = None;
            } else {
                state.filters.style = Some(style.to_string());
            }
        }
    });
    render_dom()
}

#[cfg(target_arch = "wasm32")]
#[wasm_bindgen]
pub fn beerdex_set_filter_rarity(rarity: &str) -> Result<(), JsValue> {
    APP_INSTANCE.with(|cell| {
        if let Some(ref mut state) = *cell.borrow_mut() {
            if state.filters.rarity.as_deref() == Some(rarity) {
                state.filters.rarity = None;
            } else {
                state.filters.rarity = Some(rarity.to_string());
            }
        }
    });
    render_dom()
}

#[cfg(target_arch = "wasm32")]
#[wasm_bindgen]
pub fn beerdex_set_filter_country(country: &str) -> Result<(), JsValue> {
    APP_INSTANCE.with(|cell| {
        if let Some(ref mut state) = *cell.borrow_mut() {
            if country.is_empty() {
                state.filters.country = None;
            } else {
                state.filters.country = Some(country.to_uppercase());
            }
        }
    });
    render_dom()
}

#[cfg(target_arch = "wasm32")]
#[wasm_bindgen]
pub fn beerdex_toggle_filter_consumed() -> Result<(), JsValue> {
    APP_INSTANCE.with(|cell| {
        if let Some(ref mut state) = *cell.borrow_mut() {
            state.filters.only_consumed = !state.filters.only_consumed;
        }
    });
    render_dom()
}

#[cfg(target_arch = "wasm32")]
#[wasm_bindgen]
pub fn beerdex_toggle_filter_favorites() -> Result<(), JsValue> {
    APP_INSTANCE.with(|cell| {
        if let Some(ref mut state) = *cell.borrow_mut() {
            state.filters.only_favorites = !state.filters.only_favorites;
        }
    });
    render_dom()
}

#[cfg(target_arch = "wasm32")]
#[wasm_bindgen]
pub fn beerdex_reset_filters() -> Result<(), JsValue> {
    APP_INSTANCE.with(|cell| {
        if let Some(ref mut state) = *cell.borrow_mut() {
            state.filters = crate::state::FilterCriteria::default();
            state.search_query.clear();
        }
    });
    render_dom()
}

#[cfg(target_arch = "wasm32")]
#[wasm_bindgen]
pub fn beerdex_set_theme(theme_name: &str) -> Result<(), JsValue> {
    APP_INSTANCE.with(|cell| {
        if let Some(ref mut state) = *cell.borrow_mut() {
            state.storage.preferences.insert(
                "theme".to_string(),
                serde_json::Value::String(theme_name.to_string()),
            );
            let _ = beerdex_platform::UnifiedStorage::save_state(&state.storage);
        }
    });
    let _ = crate::styles::StyleEngine::inject_styles(theme_name);
    render_dom()
}

#[cfg(target_arch = "wasm32")]
#[wasm_bindgen]
pub fn beerdex_set_preference(key: &str, val_json: &str) -> Result<(), JsValue> {
    APP_INSTANCE.with(|cell| {
        if let Some(ref mut state) = *cell.borrow_mut() {
            if let Ok(parsed) = serde_json::from_str::<serde_json::Value>(val_json) {
                state.storage.preferences.insert(key.to_string(), parsed);
                let _ = beerdex_platform::UnifiedStorage::save_state(&state.storage);
            }
        }
    });
    render_dom()
}

#[cfg(target_arch = "wasm32")]
#[wasm_bindgen]
pub fn beerdex_log_drink(beer_id: &str, volume_ml: u32) -> Result<(), JsValue> {
    APP_INSTANCE.with(|cell| {
        if let Some(ref mut state) = *cell.borrow_mut() {
            state.log_drink(beer_id, volume_ml);
        }
    });
    render_dom()
}

#[cfg(target_arch = "wasm32")]
#[wasm_bindgen]
pub fn beerdex_toggle_favorite(beer_id: &str) -> Result<bool, JsValue> {
    let result = APP_INSTANCE.with(|cell| {
        if let Some(ref mut state) = *cell.borrow_mut() {
            Ok(state.toggle_favorite(beer_id))
        } else {
            Err(JsValue::from_str("App not initialized"))
        }
    })?;
    render_dom()?;
    Ok(result)
}

#[cfg(target_arch = "wasm32")]
#[wasm_bindgen]
pub fn beerdex_open_beer_modal(beer_id: &str) -> Result<(), JsValue> {
    APP_INSTANCE.with(|cell| {
        if let Some(ref mut state) = *cell.borrow_mut() {
            state.selected_beer = state.db.find_by_id(beer_id).cloned();
        }
    });
    render_dom()
}

#[cfg(target_arch = "wasm32")]
#[wasm_bindgen]
pub fn beerdex_close_modal() -> Result<(), JsValue> {
    APP_INSTANCE.with(|cell| {
        if let Some(ref mut state) = *cell.borrow_mut() {
            state.selected_beer = None;
        }
    });
    render_dom()
}

#[cfg(target_arch = "wasm32")]
#[wasm_bindgen]
pub fn beerdex_get_current_bac() -> f64 {
    APP_INSTANCE.with(|cell| {
        if let Some(ref state) = *cell.borrow() {
            state.current_bac()
        } else {
            0.0
        }
    })
}

#[cfg(target_arch = "wasm32")]
#[wasm_bindgen]
pub fn beerdex_compress_lz(text: &str) -> String {
    beerdex_core::lz_string::compress_to_encoded_uri_component(text)
}

#[cfg(target_arch = "wasm32")]
#[wasm_bindgen]
pub fn beerdex_decompress_lz(text: &str) -> Option<String> {
    beerdex_core::lz_string::decompress_from_encoded_uri_component(text)
}

#[cfg(target_arch = "wasm32")]
#[wasm_bindgen]
pub fn beerdex_generate_qr_svg(text: &str, size_px: u32) -> String {
    beerdex_core::qrcode_gen::QrGenerator::to_svg_string(text, size_px)
}

#[cfg(target_arch = "wasm32")]
#[wasm_bindgen]
pub fn beerdex_validate_ean13(barcode: &str) -> bool {
    beerdex_platform::scanner::ScannerEngine::validate_ean13(barcode)
}

#[cfg(target_arch = "wasm32")]
#[wasm_bindgen]
pub fn beerdex_parse_scan(payload: &str) -> String {
    let parsed = beerdex_platform::scanner::ScannerEngine::parse_scanned_text(payload);
    serde_json::to_string(&parsed).unwrap_or_default()
}

#[cfg(target_arch = "wasm32")]
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

#[cfg(target_arch = "wasm32")]
#[wasm_bindgen]
pub fn beerdex_set_language(lang: &str) -> Result<(), JsValue> {
    APP_INSTANCE.with(|cell| {
        if let Some(ref mut state) = *cell.borrow_mut() {
            state.i18n.set_language(lang);
            state.storage.preferences.insert(
                "app_language".to_string(),
                serde_json::Value::String(lang.to_string()),
            );
            let _ = beerdex_platform::UnifiedStorage::save_state(&state.storage);
        }
    });
    render_dom()
}

#[cfg(target_arch = "wasm32")]
#[wasm_bindgen]
pub fn beerdex_save_rating(beer_id: &str, score: f64, comment: &str) -> Result<(), JsValue> {
    APP_INSTANCE.with(|cell| {
        if let Some(ref mut state) = *cell.borrow_mut() {
            state.rate_beer(beer_id, score, comment);
        }
    });
    render_dom()
}

#[cfg(target_arch = "wasm32")]
#[wasm_bindgen]
pub fn beerdex_export_backup_json() -> String {
    APP_INSTANCE.with(|cell| {
        if let Some(ref state) = *cell.borrow() {
            serde_json::to_string_pretty(&state.storage).unwrap_or_default()
        } else {
            String::new()
        }
    })
}

#[cfg(target_arch = "wasm32")]
#[wasm_bindgen]
pub fn beerdex_import_backup_json(json_str: &str) -> Result<bool, JsValue> {
    let result = APP_INSTANCE.with(|cell| {
        if let Some(ref mut state) = *cell.borrow_mut() {
            if let Ok(imported) = serde_json::from_str::<beerdex_core::storage::BeerdexStorageState>(json_str) {
                state.storage = imported;
                let _ = beerdex_platform::UnifiedStorage::save_state(&state.storage);
                Ok(true)
            } else {
                Ok(false)
            }
        } else {
            Err(JsValue::from_str("Not initialized"))
        }
    })?;
    render_dom()?;
    Ok(result)
}

#[cfg(target_arch = "wasm32")]
#[wasm_bindgen]
pub fn beerdex_reset_data(target: &str) -> Result<(), JsValue> {
    APP_INSTANCE.with(|cell| {
        if let Some(ref mut state) = *cell.borrow_mut() {
            match target {
                "ratings" => {
                    for (_, u) in state.storage.ratings.iter_mut() {
                        u.score = None;
                        u.comment = None;
                    }
                }
                "history" => {
                    for (_, u) in state.storage.ratings.iter_mut() {
                        u.count = 0;
                        u.history.clear();
                    }
                }
                "favorites" => {
                    for (_, u) in state.storage.ratings.iter_mut() {
                        u.favorite = None;
                    }
                }
                "custom" => {
                    state.storage.custom_beers.clear();
                }
                "all" => {
                    state.storage = beerdex_core::storage::BeerdexStorageState::default();
                }
                _ => {}
            }
            let _ = beerdex_platform::UnifiedStorage::save_state(&state.storage);
        }
    });
    render_dom()
}
