use beerdex_core::storage::BeerdexStorageState;
use std::fs;
use std::path::PathBuf;

pub struct DesktopStorage;

impl DesktopStorage {
    /// Resolves the operating system's standard user configuration directory.
    pub fn get_storage_dir() -> PathBuf {
        #[cfg(target_os = "windows")]
        {
            if let Ok(appdata) = std::env::var("APPDATA") {
                return PathBuf::from(appdata).join("beerdex");
            }
        }

        #[cfg(not(target_os = "windows"))]
        {
            if let Ok(home) = std::env::var("HOME") {
                return PathBuf::from(home).join(".config").join("beerdex");
            }
        }

        PathBuf::from(".beerdex_data")
    }

    pub fn get_state_file_path() -> PathBuf {
        Self::get_storage_dir().join("beerdex_state.json")
    }

    /// Loads the stored user data and preferences from the local file system.
    pub fn load_state() -> Result<BeerdexStorageState, String> {
        let path = Self::get_state_file_path();
        if !path.exists() {
            return Ok(BeerdexStorageState::default());
        }

        let content = fs::read_to_string(&path)
            .map_err(|e| format!("Failed to read state file at {:?}: {}", path, e))?;

        serde_json::from_str(&content).map_err(|e| format!("Failed to parse state JSON: {}", e))
    }

    /// Persists the user data and preferences to the local file system.
    pub fn save_state(state: &BeerdexStorageState) -> Result<(), String> {
        let dir = Self::get_storage_dir();
        if !dir.exists() {
            fs::create_dir_all(&dir)
                .map_err(|e| format!("Failed to create storage directory {:?}: {}", dir, e))?;
        }

        let path = Self::get_state_file_path();
        let json_str = serde_json::to_string_pretty(state)
            .map_err(|e| format!("Failed to serialize state: {}", e))?;

        // Atomic write: write to a temp file then rename, to avoid corruption
        // if the process crashes mid-write.
        let tmp_path = path.with_extension("json.tmp");
        fs::write(&tmp_path, &json_str)
            .map_err(|e| format!("Failed to write temp state file {:?}: {}", tmp_path, e))?;
        fs::rename(&tmp_path, &path)
            .map_err(|e| format!("Failed to rename temp state file {:?} -> {:?}: {}", tmp_path, path, e))?;

        Ok(())
    }

    /// Writes an export backup file to a specific destination path.
    pub fn export_backup_to_file(path: &PathBuf, json_content: &str) -> Result<(), String> {
        if let Some(parent) = path.parent() {
            if !parent.exists() {
                let _ = fs::create_dir_all(parent);
            }
        }
        fs::write(path, json_content).map_err(|e| format!("Failed to export backup file: {}", e))
    }
}
