use beerdex_core::storage::BeerdexStorageState;
#[cfg(target_arch = "wasm32")]
use beerdex_core::storage::{STORAGE_KEY_CUSTOM, STORAGE_KEY_RATINGS};
#[cfg(target_arch = "wasm32")]
use wasm_bindgen::JsCast;

pub struct WebStorage;

#[cfg(target_arch = "wasm32")]
impl WebStorage {
    fn get_local_storage() -> Result<web_sys::Storage, String> {
        let window = web_sys::window().ok_or("No global window object available")?;
        let storage = window
            .local_storage()
            .map_err(|e| format!("LocalStorage error: {:?}", e))?
            .ok_or("LocalStorage not supported or disabled")?;
        Ok(storage)
    }

    pub fn load_state() -> Result<BeerdexStorageState, String> {
        let storage = Self::get_local_storage()?;
        let mut state = BeerdexStorageState::default();

        if let Ok(Some(ratings_raw)) = storage.get_item(STORAGE_KEY_RATINGS) {
            if let Ok(ratings) = serde_json::from_str(&ratings_raw) {
                state.ratings = ratings;
            }
        }

        if let Ok(Some(custom_raw)) = storage.get_item(STORAGE_KEY_CUSTOM) {
            if let Ok(custom) = serde_json::from_str(&custom_raw) {
                state.custom_beers = custom;
            }
        }

        Ok(state)
    }

    pub fn save_state(state: &BeerdexStorageState) -> Result<(), String> {
        let storage = Self::get_local_storage()?;

        let ratings_json = serde_json::to_string(&state.ratings)
            .map_err(|e| format!("Serialization error: {}", e))?;
        storage
            .set_item(STORAGE_KEY_RATINGS, &ratings_json)
            .map_err(|e| format!("Storage set error: {:?}", e))?;

        let custom_json = serde_json::to_string(&state.custom_beers)
            .map_err(|e| format!("Serialization error: {}", e))?;
        storage
            .set_item(STORAGE_KEY_CUSTOM, &custom_json)
            .map_err(|e| format!("Storage set error: {:?}", e))?;

        Ok(())
    }

    /// Triggers an immediate browser file download for a backup JSON string.
    pub fn trigger_browser_download(filename: &str, content: &str) -> Result<(), String> {
        let window = web_sys::window().ok_or("No global window")?;
        let document = window.document().ok_or("No global document")?;

        let encoded = format!(
            "data:application/json;charset=utf-8,{}",
            js_sys::encode_uri_component(content)
        );

        let elem = document
            .create_element("a")
            .map_err(|e| format!("{:?}", e))?;
        elem.set_attribute("href", &encoded)
            .map_err(|e| format!("{:?}", e))?;
        elem.set_attribute("download", filename)
            .map_err(|e| format!("{:?}", e))?;

        if let Some(html_elem) = elem.dyn_ref::<web_sys::HtmlElement>() {
            html_elem.click();
        }

        Ok(())
    }
}

#[cfg(not(target_arch = "wasm32"))]
impl WebStorage {
    pub fn load_state() -> Result<BeerdexStorageState, String> {
        Err("WebStorage is only available on wasm32 targets".to_string())
    }

    pub fn save_state(_state: &BeerdexStorageState) -> Result<(), String> {
        Err("WebStorage is only available on wasm32 targets".to_string())
    }

    pub fn trigger_browser_download(_filename: &str, _content: &str) -> Result<(), String> {
        Err("Browser download is only available on wasm32 targets".to_string())
    }
}
