pub mod catalogs;
pub mod haptics;
pub mod p2p;
pub mod scanner;
pub mod storage_desktop;
pub mod storage_web;

use beerdex_core::storage::BeerdexStorageState;
pub use catalogs::EmbeddedCatalogs;
pub use storage_desktop::DesktopStorage;
pub use storage_web::WebStorage;

/// Universal storage facade that automatically delegates to the appropriate platform backend.
pub struct UnifiedStorage;

impl UnifiedStorage {
    /// Loads state from the active platform storage backend.
    pub fn load_state() -> Result<BeerdexStorageState, String> {
        #[cfg(target_arch = "wasm32")]
        {
            WebStorage::load_state()
        }

        #[cfg(not(target_arch = "wasm32"))]
        {
            DesktopStorage::load_state()
        }
    }

    /// Saves state to the active platform storage backend.
    pub fn save_state(state: &BeerdexStorageState) -> Result<(), String> {
        #[cfg(target_arch = "wasm32")]
        {
            WebStorage::save_state(state)
        }

        #[cfg(not(target_arch = "wasm32"))]
        {
            DesktopStorage::save_state(state)
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_embedded_catalogs_loading() {
        let db = EmbeddedCatalogs::load_database().expect("Embedded database should parse cleanly");
        assert!(
            db.beers.len() > 1000,
            "Should have loaded thousands of official beers"
        );
        assert!(!db.breweries.is_empty(), "Should have loaded breweries");
        assert!(!db.bac_rules.is_empty(), "Should have loaded BAC rules");

        // Test specific reference lookup
        let chimay = db
            .beers
            .iter()
            .find(|b| b.title.to_lowercase().contains("chimay"));
        assert!(chimay.is_some(), "Should find Chimay in catalog");
    }

    #[test]
    fn test_embedded_i18n_loading() {
        let i18n = EmbeddedCatalogs::load_i18n("fr").expect("i18n should parse cleanly");
        assert_eq!(i18n.current_language(), "fr");
        let app_title = i18n.t("nav_home");
        assert!(!app_title.is_empty());
    }

    #[test]
    fn test_desktop_storage_roundtrip() {
        let temp_dir = std::env::temp_dir().join("beerdex_test_storage");
        let _ = std::fs::remove_dir_all(&temp_dir);

        let mut state = BeerdexStorageState::new();
        state.add_consumption("test_beer_1", 330, None);
        state.save_rating(
            "test_beer_1",
            Some(19.0),
            Some("Masterpiece".to_string()),
            None,
        );

        let file_path = temp_dir.join("test_state.json");
        DesktopStorage::export_backup_to_file(&file_path, &serde_json::to_string(&state).unwrap())
            .expect("Export should succeed");

        assert!(file_path.exists());
        let _ = std::fs::remove_dir_all(&temp_dir);
    }
}
