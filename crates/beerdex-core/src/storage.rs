use crate::deduplicator::{normalize, similarity};
use crate::models::{
    AnalyticsEvent, Beer, ConsumptionRecord, CrashLogEntry, CustomBeer, UserBeerData,
};
use chrono::Utc;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

pub const STORAGE_KEY_RATINGS: &str = "beerdex_ratings";
pub const STORAGE_KEY_CUSTOM: &str = "beerdex_custom_beers";
pub const STORAGE_KEY_PREF_PREFIX: &str = "beerdex_pref_";

/// Unified in-memory state repository that can sync with platform persistence (LocalStorage, Filesystem, or SQLite).
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct BeerdexStorageState {
    pub ratings: HashMap<String, UserBeerData>,
    pub custom_beers: Vec<CustomBeer>,
    pub preferences: HashMap<String, serde_json::Value>,
    pub orphan_archive: HashMap<String, UserBeerData>,
    pub crash_logs: Vec<CrashLogEntry>,
    pub analytics_queue: Vec<AnalyticsEvent>,
    pub dismissed_migrations: Vec<String>,
}

impl BeerdexStorageState {
    pub fn new() -> Self {
        Self::default()
    }

    pub fn push_crash_log(&mut self, log: CrashLogEntry) {
        if self.crash_logs.len() >= 50 {
            self.crash_logs.remove(0);
        }
        self.crash_logs.push(log);
    }

    pub fn push_analytics_event(&mut self, event_type: &str, payload: serde_json::Value) {
        self.analytics_queue.push(AnalyticsEvent {
            event_type: event_type.to_string(),
            payload,
            timestamp: Utc::now().timestamp_millis(),
        });
    }

    pub fn dismiss_migration(&mut self, custom_id: &str, official_id: &str) {
        let key = format!("{}___{}", custom_id, official_id);
        if !self.dismissed_migrations.contains(&key) {
            self.dismissed_migrations.push(key);
        }
    }

    pub fn is_migration_dismissed(&self, custom_id: &str, official_id: &str) -> bool {
        let key = format!("{}___{}", custom_id, official_id);
        self.dismissed_migrations.contains(&key)
    }

    pub fn get_user_data(&self, beer_id: &str) -> Option<&UserBeerData> {
        self.ratings.get(beer_id)
    }

    pub fn get_user_data_mut(&mut self, beer_id: &str) -> &mut UserBeerData {
        self.ratings.entry(beer_id.to_string()).or_default()
    }

    pub fn save_rating(
        &mut self,
        beer_id: &str,
        score: Option<f64>,
        comment: Option<String>,
        aromas: Option<Vec<String>>,
    ) {
        let entry = self.get_user_data_mut(beer_id);
        if score.is_some() {
            entry.score = score;
        }
        if comment.is_some() {
            entry.comment = comment;
        }
        if aromas.is_some() {
            entry.aromas = aromas;
        }
        entry.timestamp = Some(Utc::now().to_rfc3339());

        if entry.count == 0 && entry.history.is_empty() {
            entry.count = 1;
            entry.history.push(ConsumptionRecord {
                date: Utc::now().to_rfc3339(),
                timestamp: Utc::now().timestamp_millis(),
                volume: 330,
            });
        }
    }

    pub fn add_consumption(&mut self, beer_id: &str, volume_ml: u32, custom_date: Option<String>) {
        let entry = self.get_user_data_mut(beer_id);
        entry.count += 1;
        let now_dt = Utc::now();
        let date = custom_date.unwrap_or_else(|| now_dt.to_rfc3339());
        entry.history.push(ConsumptionRecord {
            date,
            timestamp: now_dt.timestamp_millis(),
            volume: volume_ml,
        });
        entry.timestamp = Some(now_dt.to_rfc3339());
    }

    pub fn remove_consumption(&mut self, beer_id: &str) -> bool {
        if let Some(entry) = self.ratings.get_mut(beer_id) {
            if entry.count > 0 {
                entry.count -= 1;
                entry.history.pop();
                return true;
            }
        }
        false
    }

    pub fn toggle_favorite(&mut self, beer_id: &str) -> bool {
        let entry = self.get_user_data_mut(beer_id);
        let new_fav = !entry.favorite.unwrap_or(false);
        entry.favorite = Some(new_fav);
        new_fav
    }

    pub fn is_favorite(&self, beer_id: &str) -> bool {
        self.ratings
            .get(beer_id)
            .and_then(|d| d.favorite)
            .unwrap_or(false)
    }

    pub fn add_custom_beer(&mut self, beer: CustomBeer) {
        self.custom_beers.retain(|b| b.id != beer.id);
        self.custom_beers.insert(0, beer);
    }

    pub fn delete_custom_beer(&mut self, beer_id: &str) {
        self.custom_beers.retain(|b| b.id != beer_id);
        self.ratings.remove(beer_id);
    }

    /// Migrates user data from an old ID (e.g. custom beer or deleted duplicate) to an official target beer.
    pub fn migrate_beer_data(&mut self, old_id: &str, new_id: &str) {
        if let Some(old_data) = self.ratings.remove(old_id) {
            let target = self.get_user_data_mut(new_id);
            target.count += old_data.count;

            let mut merged_history = target.history.clone();
            merged_history.extend(old_data.history);
            merged_history.sort_by(|a, b| a.date.cmp(&b.date));
            target.history = merged_history;

            if target.score.is_none() && old_data.score.is_some() {
                target.score = old_data.score;
            }
            if target.comment.is_none() && old_data.comment.is_some() {
                target.comment = old_data.comment;
            }
            if old_data.favorite == Some(true) {
                target.favorite = Some(true);
            }
            if target.aromas.is_none() && old_data.aromas.is_some() {
                target.aromas = old_data.aromas;
            }
        }
        self.delete_custom_beer(old_id);
    }

    /// Safely cleans up orphaned entries where beer IDs were removed from catalogs,
    /// performing fuzzy matching above 0.75 threshold.
    pub fn cleanup_orphaned_user_data(&mut self, all_beers: &[Beer]) -> usize {
        let valid_ids: std::collections::HashSet<String> =
            all_beers.iter().map(|b| b.resolved_id()).collect();
        let current_ids: Vec<String> = self.ratings.keys().cloned().collect();
        let mut migrated_count = 0;

        for id in current_ids {
            if valid_ids.contains(&id) || id.starts_with("CUSTOM_") || id.starts_with("API_") {
                continue;
            }

            let user_data = match self.ratings.get(&id) {
                Some(d) if d.count > 0 || d.score.is_some() || d.favorite == Some(true) => {
                    d.clone()
                }
                _ => {
                    self.ratings.remove(&id);
                    continue;
                }
            };

            // Fuzzy match query against all beers
            let query_norm = normalize(&id.replace('_', " "));
            let mut best_match = None;
            let mut best_score = 0.0;

            for beer in all_beers {
                let cand_id = beer.resolved_id();
                if cand_id.starts_with("CUSTOM_") {
                    continue;
                }
                let cand_norm = normalize(&beer.title);
                let score = similarity(&query_norm, &cand_norm);
                if score > best_score {
                    best_score = score;
                    best_match = Some(cand_id);
                }
            }

            if let Some(target_id) = best_match {
                if best_score >= 0.75 {
                    self.migrate_beer_data(&id, &target_id);
                    migrated_count += 1;
                    continue;
                }
            }

            // Archive and remove
            self.orphan_archive.insert(id.clone(), user_data);
            self.ratings.remove(&id);
        }

        migrated_count
    }
}
