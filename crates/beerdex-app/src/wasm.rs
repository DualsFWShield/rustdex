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
