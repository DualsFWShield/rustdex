pub mod achievements;
pub mod aroma_wheel;
pub mod bac;
pub mod data;
pub mod deduplicator;
pub mod event_system;
pub mod i18n;
pub mod lz_string;
pub mod map;
pub mod match_engine;
pub mod models;
pub mod nlp;
pub mod qrcode_gen;
pub mod rarity;
pub mod recommendation;
pub mod storage;
pub mod thanos;
pub mod theme;
pub mod widget_bridge;
pub mod wrapped;

#[cfg(test)]
mod tests {
    use super::*;
    use achievements::{AchievementEngine, UserAchievementStats};
    use bac::{calculate_alcohol_grams, get_gamer_stats, hours_to_drive, simulate_bac, Gender};
    use deduplicator::{normalize, similarity};
    use models::{BacHistoryEntry, BacRule, Beer};
    use rarity::{calculate_rarity, get_import_bonus, promote_rarity_with_import};
    use std::collections::HashMap;
    use storage::BeerdexStorageState;

    #[test]
    fn test_beer_parsing() {
        let beer = Beer {
            title: "Duvel Triple Hop".to_string(),
            brewery: "Duvel Moortgat".to_string(),
            beer_type: "IPA".to_string(),
            volume: Some("33cl".to_string()),
            alcohol: Some("9,5%".to_string()),
            id: None,
            image: None,
            production_volume: None,
            distribution: None,
            barrel_aged: None,
            community_rating: None,
            ingredients: None,
            rarity_rank: None,
            barcode: Some("5411622014169".to_string()),
            country: Some("BE".to_string()),
            country_code: None,
            search_region: None,
            search_country: None,
        };

        assert!(beer.resolved_id().starts_with("DUVEL_TRIPLE_HOP_"));
        assert_eq!(beer.parsed_abv(), 9.5);
        assert_eq!(beer.parsed_volume_ml(), 330);
    }

    #[test]
    fn test_bac_calculation() {
        let now = 1700000000000;
        let grams = calculate_alcohol_grams(330, 8.5); // 330 * 0.085 * 0.8 = 22.44g
        assert!((grams - 22.44).abs() < 0.01);

        let history = vec![BacHistoryEntry {
            time: now - 3600000, // 1 hour ago
            volume: 330,
            abv: 8.5,
            grams,
        }];

        let sim = simulate_bac(&history, now, 75.0, Gender::Male, 15);
        assert!(sim.current_bac > 0.0);

        let rule = BacRule {
            name_key: "be".to_string(),
            sanction_threshold: 0.5,
            withdraw_threshold: 0.8,
            air_ratio: 0.22,
            sanction_key: "".to_string(),
            withdraw_key: "".to_string(),
        };
        let drive_time = hours_to_drive(&sim, &rule, now);
        assert!(drive_time >= 0.0);

        let gamer = get_gamer_stats(sim.current_bac);
        assert_eq!(gamer.rank_key, "bac_gamer_rank_gold");
    }

    #[test]
    fn test_rarity_calculation() {
        let beer = Beer {
            title: "Westvleteren 12 Vintage BA".to_string(),
            brewery: "Westvleteren".to_string(),
            beer_type: "Barrel Aged Quad".to_string(),
            volume: Some("33cl".to_string()),
            alcohol: Some("10.2%".to_string()),
            id: None,
            image: None,
            production_volume: None,
            distribution: None,
            barrel_aged: Some(true),
            community_rating: None,
            ingredients: None,
            rarity_rank: None,
            barcode: None,
            country: Some("BE".to_string()),
            country_code: None,
            search_region: None,
            search_country: None,
        };

        let result = calculate_rarity(&beer);
        assert_eq!(result.rarity, "legendaire");

        let (bonus, reason) = get_import_bonus("JP", "BE");
        assert_eq!(bonus, 3);
        assert!(reason.is_some());

        let promoted = promote_rarity_with_import("commun", 3);
        assert_eq!(promoted, "epique");
    }

    #[test]
    fn test_deduplicator() {
        assert_eq!(normalize("Chimay Bleue 2024"), "chimay bleue 2024");
        let sim = similarity("Duvel 33cl", "Duvel 330ml");
        assert!(sim > 0.7);
    }

    #[test]
    fn test_storage_mutations() {
        let mut state = BeerdexStorageState::new();
        state.save_rating(
            "beer_1",
            Some(17.5),
            Some("Superbe bière".to_string()),
            None,
        );

        assert_eq!(state.get_user_data("beer_1").unwrap().count, 1);
        assert_eq!(state.get_user_data("beer_1").unwrap().score, Some(17.5));

        state.add_consumption("beer_1", 330, None);
        assert_eq!(state.get_user_data("beer_1").unwrap().count, 2);

        state.toggle_favorite("beer_1");
        assert!(state.is_favorite("beer_1"));

        state.migrate_beer_data("beer_1", "beer_2");
        assert!(state.get_user_data("beer_1").is_none());
        assert_eq!(state.get_user_data("beer_2").unwrap().count, 2);
        assert_eq!(state.get_user_data("beer_2").unwrap().score, Some(17.5));
    }

    #[test]
    fn test_achievements_evaluation() {
        let mut user_data = HashMap::new();
        let beer = Beer {
            title: "Chimay Bleue".to_string(),
            brewery: "Chimay".to_string(),
            beer_type: "Trappiste Brune".to_string(),
            volume: Some("33cl".to_string()),
            alcohol: Some("9.0%".to_string()),
            id: Some("chimay_bleue".to_string()),
            image: None,
            production_volume: None,
            distribution: None,
            barrel_aged: None,
            community_rating: None,
            ingredients: None,
            rarity_rank: None,
            barcode: None,
            country: Some("BE".to_string()),
            country_code: None,
            search_region: None,
            search_country: None,
        };

        let data = models::UserBeerData {
            count: 5,
            score: Some(20.0),
            history: vec![models::ConsumptionRecord {
                date: "2026-01-01T00:00:00Z".to_string(),
                timestamp: 1700000000000,
                volume: 330,
            }],
            ..Default::default()
        };
        user_data.insert("chimay_bleue".to_string(), data);

        let catalog = vec![beer];
        let stats = UserAchievementStats::compute(&user_data, &catalog, None);

        assert!(AchievementEngine::is_unlocked("c_1", &stats));
        assert!(AchievementEngine::is_unlocked("c_5", &stats));
        assert!(AchievementEngine::is_unlocked("rate_lover", &stats));
        assert!(!AchievementEngine::is_unlocked("c_100", &stats));
    }
}
