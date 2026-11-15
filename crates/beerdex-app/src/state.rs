use beerdex_core::bac::{get_gamer_stats, simulate_bac, Gender};
use beerdex_core::data::BeerDatabase;
use beerdex_core::i18n::I18nEngine;
use beerdex_core::models::{BacHistoryEntry, Beer, GamerStats};
use beerdex_core::storage::BeerdexStorageState;
use beerdex_platform::{EmbeddedCatalogs, UnifiedStorage};
use chrono::Utc;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum AppView {
    Home,
    Drunk,
    Stats,
    Beerpedia,
    Settings,
    Poster,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ViewMode {
    Grid,
    List,
}

#[derive(Debug, Clone, Default, PartialEq)]
pub struct FilterCriteria {
    pub style: Option<String>,
    pub brewery: Option<String>,
    pub country: Option<String>,
    pub rarity: Option<String>,
    pub only_consumed: bool,
    pub only_favorites: bool,
}

pub struct AppState {
    pub db: BeerDatabase,
    pub storage: BeerdexStorageState,
    pub i18n: I18nEngine,
    pub view: AppView,
    pub view_mode: ViewMode,
    pub search_query: String,
    pub search_active: bool,
    pub filters: FilterCriteria,
    pub selected_beer: Option<Beer>,
    pub show_filter_modal: bool,
    pub toast: Option<String>,
}

impl AppState {
    pub fn new() -> Result<Self, String> {
        let db = EmbeddedCatalogs::load_database()
            .map_err(|e| format!("Failed to load database: {}", e))?;
        let i18n =
            EmbeddedCatalogs::load_i18n("fr").map_err(|e| format!("Failed to load i18n: {}", e))?;
        let storage = UnifiedStorage::load_state().unwrap_or_default();

        Ok(Self {
            db,
            storage,
            i18n,
            view: AppView::Home,
            view_mode: ViewMode::Grid,
            search_query: String::new(),
            search_active: false,
            filters: FilterCriteria::default(),
            selected_beer: None,
            show_filter_modal: false,
            toast: None,
        })
    }

    /// Returns the filtered and sorted slice of beers matching search & filter conditions.
    pub fn get_filtered_beers(&self) -> Vec<&Beer> {
        let mut results = self.db.filter_beers(
            &self.search_query,
            self.filters.style.as_deref(),
            self.filters.brewery.as_deref(),
            self.filters.country.as_deref(),
        );

        if self.filters.only_consumed || self.view == AppView::Drunk {
            results.retain(|b| {
                self.storage
                    .get_user_data(&b.resolved_id())
                    .map(|d| d.count > 0)
                    .unwrap_or(false)
            });
        }

        if self.filters.only_favorites {
            results.retain(|b| self.storage.is_favorite(&b.resolved_id()));
        }

        // Sort: Favorites first, preserving default catalog order for ties
        results.sort_by(|a, b| {
            let fav_a = self.storage.is_favorite(&a.resolved_id());
            let fav_b = self.storage.is_favorite(&b.resolved_id());
            fav_b.cmp(&fav_a)
        });

        results
    }

    /// Computes the current Blood Alcohol Content (BAC).
    pub fn current_bac(&self) -> f64 {
        let now = Utc::now().timestamp_millis();
        let history = self.get_bac_history();
        let sim = simulate_bac(&history, now, 70.0, Gender::Male, 0);
        sim.current_bac
    }

    /// Computes Gamer stats derived from current BAC.
    pub fn current_gamer_stats(&self) -> GamerStats {
        get_gamer_stats(self.current_bac())
    }

    fn get_bac_history(&self) -> Vec<BacHistoryEntry> {
        let mut history = Vec::new();
        for (id, data) in &self.storage.ratings {
            if let Some(beer) = self.db.find_by_id(id) {
                let abv = beer.parsed_abv();
                for entry in &data.history {
                    if let Ok(dt) = chrono::DateTime::parse_from_rfc3339(&entry.date) {
                        history.push(BacHistoryEntry {
                            time: dt.timestamp_millis(),
                            volume: entry.volume,
                            abv,
                            grams: beerdex_core::bac::calculate_alcohol_grams(entry.volume, abv),
                        });
                    }
                }
            }
        }
        history
    }

    pub fn log_drink(&mut self, beer_id: &str, volume_ml: u32) {
        self.storage.add_consumption(beer_id, volume_ml, None);
        let _ = UnifiedStorage::save_state(&self.storage);
        self.toast = Some(self.i18n.t("toast_drink_added"));
    }

    pub fn remove_drink(&mut self, beer_id: &str) {
        if self.storage.remove_consumption(beer_id) {
            let _ = UnifiedStorage::save_state(&self.storage);
            self.toast = Some(self.i18n.t("toast_drink_removed"));
        }
    }

    pub fn toggle_favorite(&mut self, beer_id: &str) -> bool {
        let fav = self.storage.toggle_favorite(beer_id);
        let _ = UnifiedStorage::save_state(&self.storage);
        fav
    }

    pub fn rate_beer(&mut self, beer_id: &str, score: f64, comment: &str) {
        self.storage.save_rating(
            beer_id,
            Some(score),
            if comment.trim().is_empty() {
                None
            } else {
                Some(comment.to_string())
            },
            None,
        );
        let _ = UnifiedStorage::save_state(&self.storage);
        self.toast = Some(self.i18n.t("toast_rating_saved"));
    }
}
