use crate::models::{Beer, UserBeerData};
use serde::{Deserialize, Serialize};
use std::collections::{HashMap, HashSet};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Achievement {
    pub id: &'static str,
    pub title_key: &'static str,
    pub desc_key: &'static str,
    pub icon: &'static str,
    pub category_key: &'static str,
    pub rarity: &'static str,
    pub hidden: bool,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct UserPrefsStats {
    pub tutorial_completed: bool,
    pub bac_used: bool,
    pub theme_changed: bool,
    pub theme_shared: bool,
    pub museum_used: bool,
    pub dedup_used: bool,
    pub supported_dev: bool,
}

#[derive(Debug, Clone, Default)]
pub struct UserAchievementStats {
    pub total_count: u32,
    pub unique_count: u32,
    pub total_liters: f64,
    pub degrees: Vec<f64>,
    pub max_degree: f64,
    pub min_degree: f64,
    pub strong_count: u32, // ABV > 8.0
    pub rated_count: u32,
    pub high_rating_count: u32, // Score > 18.0
    pub low_rating_count: u32,  // Score < 10.0
    pub has_zero_rating: bool,
    pub has_perfect_rating: bool,
    pub has_average_rating: bool,
    pub fruit_count: u32,
    pub type_counts: HashMap<String, u32>,
    pub breweries: HashSet<String>,
    pub trappist_abbeys: HashSet<String>,
    pub unique_trappists: HashSet<String>,

    pub time_matin: u32,
    pub time_midi: u32,
    pub time_aprem: u32,
    pub time_soir: u32,
    pub time_nuit: u32,
    pub tournee_minerale: bool,

    pub first_letters: HashSet<char>,
    pub max_name_length: usize,
    pub min_name_length: usize,
    pub volumes: HashSet<u32>,
    pub rarity_counts: HashMap<String, u32>,

    pub has_custom_beer: bool,
    pub custom_count: u32,
    pub has_custom_photo: bool,
    pub has_glitch: bool,
    pub has_rick_roll: bool,
    pub has_bloup_i: bool,
    pub has_bloup_ii: bool,
    pub has_bloup_definitive: bool,
    pub has_low_alcohol_string: bool,

    pub prefs: UserPrefsStats,
}

impl UserAchievementStats {
    pub fn compute(
        user_data: &HashMap<String, UserBeerData>,
        beer_catalog: &[Beer],
        prefs: Option<UserPrefsStats>,
    ) -> Self {
        let mut stats = UserAchievementStats {
            min_degree: 100.0,
            min_name_length: 100,
            prefs: prefs.unwrap_or_default(),
            ..Default::default()
        };

        let beer_map: HashMap<String, &Beer> =
            beer_catalog.iter().map(|b| (b.resolved_id(), b)).collect();

        let mut all_timestamps: Vec<i64> = Vec::new();

        for (id, data) in user_data {
            let is_consumed = data.count > 0 || data.score.is_some();
            if is_consumed {
                stats.unique_count += 1;
            }

            stats.total_count += data.count;

            if let Some(score) = data.score {
                stats.rated_count += 1;
                if score == 0.0 {
                    stats.has_zero_rating = true;
                }
                if score >= 20.0 {
                    stats.has_perfect_rating = true;
                }
                if (score - 10.0).abs() < f64::EPSILON {
                    stats.has_average_rating = true;
                }
                if score < 10.0 {
                    stats.low_rating_count += 1;
                }
                if score > 18.0 {
                    stats.high_rating_count += 1;
                }
            }

            if is_consumed {
                if id == "NEVER_GONNA_GIVE_YOU_ALE_AMBREE_0.50" {
                    stats.has_rick_roll = true;
                }
                if id == "BLOUP_BLOUP_MARK_I" || id == "BLOP_V0" {
                    stats.has_bloup_i = true;
                }
                if id == "BLOUP_BLOUP_MARK_II" || id == "BLOP_V1" {
                    stats.has_bloup_ii = true;
                }
                if id == "BLOP_DEFINITIVE" || id == "BLOP" {
                    stats.has_bloup_definitive = true;
                }
                if id.starts_with("CUSTOM_") {
                    stats.has_custom_beer = true;
                    stats.custom_count += 1;
                    if let Some(b) = beer_map.get(id) {
                        if let Some(img) = &b.image {
                            if !img.contains("FUT.jpg") {
                                stats.has_custom_photo = true;
                            }
                        }
                    }
                }
            }

            for h in &data.history {
                let vol = h.volume;
                stats.total_liters += (vol as f64) / 1000.0;
                stats.volumes.insert(vol);

                let ts = h.resolved_timestamp();
                all_timestamps.push(ts);

                // Hour breakdown from milliseconds timestamp
                let seconds = ts / 1000;
                let hour = ((seconds / 3600) % 24) as u32;
                match hour {
                    5..=10 => stats.time_matin += 1,
                    11..=13 => stats.time_midi += 1,
                    14..=17 => stats.time_aprem += 1,
                    18..=23 => stats.time_soir += 1,
                    _ => stats.time_nuit += 1,
                }
            }

            if is_consumed {
                if let Some(beer) = beer_map.get(id) {
                    let abv = beer.parsed_abv();
                    if abv > 0.0 || beer.alcohol.is_some() {
                        stats.degrees.push(abv);
                        if abv > stats.max_degree {
                            stats.max_degree = abv;
                        }
                        if abv < stats.min_degree {
                            stats.min_degree = abv;
                        }
                        if abv > 8.0 {
                            stats.strong_count += 1;
                        }
                    } else {
                        stats.has_glitch = true;
                    }

                    if let Some(alc) = &beer.alcohol {
                        let lower = alc.to_lowercase();
                        if lower.contains("0.")
                            || lower.contains("1.")
                            || lower.contains("0,")
                            || lower.contains("1,")
                        {
                            stats.has_low_alcohol_string = true;
                        }
                    }

                    let b_type = beer.beer_type.to_lowercase();
                    *stats.type_counts.entry(b_type.clone()).or_insert(0) += data.count.max(1);

                    for fruit_kw in &[
                        "fruit",
                        "rouge",
                        "rubis",
                        "kriek",
                        "framboise",
                        "pêche",
                        "radler",
                        "rosée",
                        "cerise",
                        "myrtille",
                        "fraise",
                    ] {
                        if b_type.contains(fruit_kw) {
                            stats.fruit_count += data.count.max(1);
                            break;
                        }
                    }

                    let brewery = beer.brewery.to_lowercase();
                    stats.breweries.insert(brewery.clone());

                    for abbey in &[
                        "chimay",
                        "orval",
                        "rochefort",
                        "westmalle",
                        "westvleteren",
                        "achel",
                        "la trappe",
                        "zundert",
                        "engelszell",
                        "spencer",
                        "tre fontane",
                        "tynt meadow",
                    ] {
                        if brewery.contains(abbey) || b_type.contains(abbey) {
                            stats.trappist_abbeys.insert(abbey.to_string());
                            stats.unique_trappists.insert(beer.resolved_id());
                        }
                    }

                    let title = &beer.title;
                    let len = title.chars().count();
                    if len > stats.max_name_length {
                        stats.max_name_length = len;
                    }
                    if len > 0 && len < stats.min_name_length {
                        stats.min_name_length = len;
                    }

                    // Extract first letters of words
                    for word in title.split(|c: char| !c.is_alphanumeric()) {
                        let cleaned = crate::deduplicator::normalize(word);
                        if let Some(first) = cleaned.chars().find(|c| c.is_ascii_alphabetic()) {
                            stats.first_letters.insert(first.to_ascii_uppercase());
                        }
                    }

                    // Rarity counts
                    if let Some(r) = &beer.rarity_rank {
                        *stats.rarity_counts.entry(r.to_lowercase()).or_insert(0) += 1;
                    }
                }
            }
        }

        // Tournée minérale check (28 days gap)
        if all_timestamps.len() >= 2 {
            all_timestamps.sort_unstable();
            let mut max_gap = 0i64;
            for i in 1..all_timestamps.len() {
                let gap = all_timestamps[i] - all_timestamps[i - 1];
                if gap > max_gap {
                    max_gap = gap;
                }
            }
            let twenty_eight_days_ms = 28 * 24 * 60 * 60 * 1000;
            if max_gap >= twenty_eight_days_ms {
                stats.tournee_minerale = true;
            }
        }

        stats
    }

    pub fn has_degree(&self, target: f64) -> bool {
        self.degrees.iter().any(|&d| (d - target).abs() < 0.1)
    }

    pub fn count_by_type(&self, type_query: &str) -> u32 {
        let q = type_query.to_lowercase();
        self.type_counts
            .iter()
            .filter(|(k, _)| k.contains(&q))
            .map(|(_, v)| *v)
            .sum()
    }

    pub fn count_by_rarity(&self, rarity_query: &str) -> u32 {
        let q = rarity_query.to_lowercase();
        self.rarity_counts.get(&q).copied().unwrap_or(0)
    }
}

pub struct AchievementEngine;

impl AchievementEngine {
    pub fn all_definitions() -> Vec<Achievement> {
        let mut list = vec![
            // --- COMPTEUR (Total Drunk) --- (15)
            Achievement {
                id: "c_1",
                title_key: "ach_c_1_title",
                desc_key: "ach_c_1_desc",
                icon: "🍺",
                category_key: "ach_cat_counter",
                rarity: "commun",
                hidden: false,
            },
            Achievement {
                id: "c_5",
                title_key: "ach_c_5_title",
                desc_key: "ach_c_5_desc",
                icon: "🥂",
                category_key: "ach_cat_counter",
                rarity: "commun",
                hidden: false,
            },
            Achievement {
                id: "c_10",
                title_key: "ach_c_10_title",
                desc_key: "ach_c_10_desc",
                icon: "🍻",
                category_key: "ach_cat_counter",
                rarity: "commun",
                hidden: false,
            },
            Achievement {
                id: "c_25",
                title_key: "ach_c_25_title",
                desc_key: "ach_c_25_desc",
                icon: "🏋️",
                category_key: "ach_cat_counter",
                rarity: "rare",
                hidden: false,
            },
            Achievement {
                id: "c_50",
                title_key: "ach_c_50_title",
                desc_key: "ach_c_50_desc",
                icon: "🏅",
                category_key: "ach_cat_counter",
                rarity: "rare",
                hidden: false,
            },
            Achievement {
                id: "c_69",
                title_key: "ach_c_69_title",
                desc_key: "ach_c_69_desc",
                icon: "😉",
                category_key: "ach_cat_counter",
                rarity: "epique",
                hidden: true,
            },
            Achievement {
                id: "c_75",
                title_key: "ach_c_75_title",
                desc_key: "ach_c_75_desc",
                icon: "🥧",
                category_key: "ach_cat_counter",
                rarity: "rare",
                hidden: false,
            },
            Achievement {
                id: "c_100",
                title_key: "ach_c_100_title",
                desc_key: "ach_c_100_desc",
                icon: "🛡️",
                category_key: "ach_cat_counter",
                rarity: "super_rare",
                hidden: false,
            },
            Achievement {
                id: "c_150",
                title_key: "ach_c_150_title",
                desc_key: "ach_c_150_desc",
                icon: "👔",
                category_key: "ach_cat_counter",
                rarity: "super_rare",
                hidden: false,
            },
            Achievement {
                id: "c_200",
                title_key: "ach_c_200_title",
                desc_key: "ach_c_200_desc",
                icon: "👀",
                category_key: "ach_cat_counter",
                rarity: "epique",
                hidden: false,
            },
            Achievement {
                id: "c_300",
                title_key: "ach_c_300_title",
                desc_key: "ach_c_300_desc",
                icon: "⚔️",
                category_key: "ach_cat_counter",
                rarity: "epique",
                hidden: false,
            },
            Achievement {
                id: "c_420",
                title_key: "ach_c_420_title",
                desc_key: "ach_c_420_desc",
                icon: "🌿",
                category_key: "ach_cat_counter",
                rarity: "mythique",
                hidden: true,
            },
            Achievement {
                id: "c_500",
                title_key: "ach_c_500_title",
                desc_key: "ach_c_500_desc",
                icon: "🧙‍♂️",
                category_key: "ach_cat_counter",
                rarity: "mythique",
                hidden: false,
            },
            Achievement {
                id: "c_666",
                title_key: "ach_c_666_title",
                desc_key: "ach_c_666_desc",
                icon: "💀",
                category_key: "ach_cat_counter",
                rarity: "legendaire",
                hidden: true,
            },
            Achievement {
                id: "c_1000",
                title_key: "ach_c_1000_title",
                desc_key: "ach_c_1000_desc",
                icon: "👑",
                category_key: "ach_cat_counter",
                rarity: "ultra_legendaire",
                hidden: false,
            },
            // --- VARIÉTÉ (Unique Beers) --- (10)
            Achievement {
                id: "v_5",
                title_key: "ach_v_5_title",
                desc_key: "ach_v_5_desc",
                icon: "🔍",
                category_key: "ach_cat_variety",
                rarity: "commun",
                hidden: false,
            },
            Achievement {
                id: "v_10",
                title_key: "ach_v_10_title",
                desc_key: "ach_v_10_desc",
                icon: "🍴",
                category_key: "ach_cat_variety",
                rarity: "commun",
                hidden: false,
            },
            Achievement {
                id: "v_20",
                title_key: "ach_v_20_title",
                desc_key: "ach_v_20_desc",
                icon: "🧭",
                category_key: "ach_cat_variety",
                rarity: "rare",
                hidden: false,
            },
            Achievement {
                id: "v_30",
                title_key: "ach_v_30_title",
                desc_key: "ach_v_30_desc",
                icon: "🤠",
                category_key: "ach_cat_variety",
                rarity: "super_rare",
                hidden: false,
            },
            Achievement {
                id: "v_40",
                title_key: "ach_v_40_title",
                desc_key: "ach_v_40_desc",
                icon: "🧳",
                category_key: "ach_cat_variety",
                rarity: "super_rare",
                hidden: false,
            },
            Achievement {
                id: "v_50",
                title_key: "ach_v_50_title",
                desc_key: "ach_v_50_desc",
                icon: "🍷",
                category_key: "ach_cat_variety",
                rarity: "epique",
                hidden: false,
            },
            Achievement {
                id: "v_75",
                title_key: "ach_v_75_title",
                desc_key: "ach_v_75_desc",
                icon: "🧠",
                category_key: "ach_cat_variety",
                rarity: "epique",
                hidden: false,
            },
            Achievement {
                id: "v_100",
                title_key: "ach_v_100_title",
                desc_key: "ach_v_100_desc",
                icon: "📖",
                category_key: "ach_cat_variety",
                rarity: "mythique",
                hidden: false,
            },
            Achievement {
                id: "v_200",
                title_key: "ach_v_200_title",
                desc_key: "ach_v_200_desc",
                icon: "🧬",
                category_key: "ach_cat_variety",
                rarity: "legendaire",
                hidden: false,
            },
            Achievement {
                id: "v_all",
                title_key: "ach_v_all_title",
                desc_key: "ach_v_all_desc",
                icon: "🌎",
                category_key: "ach_cat_variety",
                rarity: "ultra_legendaire",
                hidden: false,
            },
            // --- VOLUME (Total Liters) --- (14)
            Achievement {
                id: "vol_1",
                title_key: "ach_vol_1_title",
                desc_key: "ach_vol_1_desc",
                icon: "💧",
                category_key: "ach_cat_volume",
                rarity: "commun",
                hidden: false,
            },
            Achievement {
                id: "vol_5",
                title_key: "ach_vol_5_title",
                desc_key: "ach_vol_5_desc",
                icon: "🚰",
                category_key: "ach_cat_volume",
                rarity: "commun",
                hidden: false,
            },
            Achievement {
                id: "vol_10",
                title_key: "ach_vol_10_title",
                desc_key: "ach_vol_10_desc",
                icon: "🪣",
                category_key: "ach_cat_volume",
                rarity: "rare",
                hidden: false,
            },
            Achievement {
                id: "vol_20",
                title_key: "ach_vol_20_title",
                desc_key: "ach_vol_20_desc",
                icon: "💼",
                category_key: "ach_cat_volume",
                rarity: "rare",
                hidden: false,
            },
            Achievement {
                id: "vol_42",
                title_key: "ach_vol_42_title",
                desc_key: "ach_vol_42_desc",
                icon: "♾️",
                category_key: "ach_cat_volume",
                rarity: "super_rare",
                hidden: true,
            },
            Achievement {
                id: "vol_50",
                title_key: "ach_vol_50_title",
                desc_key: "ach_vol_50_desc",
                icon: "🛢️",
                category_key: "ach_cat_volume",
                rarity: "super_rare",
                hidden: false,
            },
            Achievement {
                id: "vol_100",
                title_key: "ach_vol_100_title",
                desc_key: "ach_vol_100_desc",
                icon: "🪵",
                category_key: "ach_cat_volume",
                rarity: "epique",
                hidden: false,
            },
            Achievement {
                id: "vol_150",
                title_key: "ach_vol_150_title",
                desc_key: "ach_vol_150_desc",
                icon: "🛁",
                category_key: "ach_cat_volume",
                rarity: "epique",
                hidden: false,
            },
            Achievement {
                id: "vol_250",
                title_key: "ach_vol_250_title",
                desc_key: "ach_vol_250_desc",
                icon: "🐠",
                category_key: "ach_cat_volume",
                rarity: "mythique",
                hidden: false,
            },
            Achievement {
                id: "vol_500",
                title_key: "ach_vol_500_title",
                desc_key: "ach_vol_500_desc",
                icon: "🧖",
                category_key: "ach_cat_volume",
                rarity: "mythique",
                hidden: false,
            },
            Achievement {
                id: "vol_1000",
                title_key: "ach_vol_1000_title",
                desc_key: "ach_vol_1000_desc",
                icon: "🚛",
                category_key: "ach_cat_volume",
                rarity: "legendaire",
                hidden: false,
            },
            Achievement {
                id: "vol_2000",
                title_key: "ach_vol_2000_title",
                desc_key: "ach_vol_2000_desc",
                icon: "🏊",
                category_key: "ach_cat_volume",
                rarity: "legendaire",
                hidden: false,
            },
            Achievement {
                id: "vol_5000",
                title_key: "ach_vol_5000_title",
                desc_key: "ach_vol_5000_desc",
                icon: "⛵",
                category_key: "ach_cat_volume",
                rarity: "ultra_legendaire",
                hidden: false,
            },
            Achievement {
                id: "vol_10000",
                title_key: "ach_vol_10000_title",
                desc_key: "ach_vol_10000_desc",
                icon: "🌊",
                category_key: "ach_cat_volume",
                rarity: "ultra_legendaire",
                hidden: false,
            },
            // --- ALCOOL (ABV Constraints) --- (10)
            Achievement {
                id: "abv_light",
                title_key: "ach_abv_light_title",
                desc_key: "ach_abv_light_desc",
                icon: "🥤",
                category_key: "ach_cat_power",
                rarity: "rare",
                hidden: false,
            },
            Achievement {
                id: "abv_std",
                title_key: "ach_abv_std_title",
                desc_key: "ach_abv_std_desc",
                icon: "🖖",
                category_key: "ach_cat_power",
                rarity: "commun",
                hidden: false,
            },
            Achievement {
                id: "abv_strong",
                title_key: "ach_abv_strong_title",
                desc_key: "ach_abv_strong_desc",
                icon: "💪",
                category_key: "ach_cat_power",
                rarity: "rare",
                hidden: false,
            },
            Achievement {
                id: "abv_heavy",
                title_key: "ach_abv_heavy_title",
                desc_key: "ach_abv_heavy_desc",
                icon: "🔨",
                category_key: "ach_cat_power",
                rarity: "super_rare",
                hidden: false,
            },
            Achievement {
                id: "abv_rocket",
                title_key: "ach_abv_rocket_title",
                desc_key: "ach_abv_rocket_desc",
                icon: "🚀",
                category_key: "ach_cat_power",
                rarity: "epique",
                hidden: false,
            },
            Achievement {
                id: "abv_14",
                title_key: "ach_abv_14_title",
                desc_key: "ach_abv_14_desc",
                icon: "🚔",
                category_key: "ach_cat_power",
                rarity: "mythique",
                hidden: false,
            },
            Achievement {
                id: "abv_devil",
                title_key: "ach_abv_devil_title",
                desc_key: "ach_abv_devil_desc",
                icon: "🔥",
                category_key: "ach_cat_power",
                rarity: "mythique",
                hidden: true,
            },
            Achievement {
                id: "abv_zero",
                title_key: "ach_abv_zero_title",
                desc_key: "ach_abv_zero_desc",
                icon: "🚫",
                category_key: "ach_cat_power",
                rarity: "rare",
                hidden: false,
            },
            Achievement {
                id: "abv_pi",
                title_key: "ach_abv_pi_title",
                desc_key: "ach_abv_pi_desc",
                icon: "🧮",
                category_key: "ach_cat_power",
                rarity: "legendaire",
                hidden: true,
            },
            Achievement {
                id: "abv_high_count",
                title_key: "ach_abv_high_count_title",
                desc_key: "ach_abv_high_count_desc",
                icon: "⛑️",
                category_key: "ach_cat_power",
                rarity: "epique",
                hidden: false,
            },
            // --- NOTATION (Ratings) --- (10)
            Achievement {
                id: "rate_1",
                title_key: "ach_rate_1_title",
                desc_key: "ach_rate_1_desc",
                icon: "🖊️",
                category_key: "ach_cat_critic",
                rarity: "commun",
                hidden: false,
            },
            Achievement {
                id: "rate_10",
                title_key: "ach_rate_10_title",
                desc_key: "ach_rate_10_desc",
                icon: "🪶",
                category_key: "ach_cat_critic",
                rarity: "rare",
                hidden: false,
            },
            Achievement {
                id: "rate_50",
                title_key: "ach_rate_50_title",
                desc_key: "ach_rate_50_desc",
                icon: "📢",
                category_key: "ach_cat_critic",
                rarity: "super_rare",
                hidden: false,
            },
            Achievement {
                id: "rate_100",
                title_key: "ach_rate_100_title",
                desc_key: "ach_rate_100_desc",
                icon: "⭐",
                category_key: "ach_cat_critic",
                rarity: "epique",
                hidden: false,
            },
            Achievement {
                id: "rate_hater",
                title_key: "ach_rate_hater_title",
                desc_key: "ach_rate_hater_desc",
                icon: "👎",
                category_key: "ach_cat_critic",
                rarity: "mythique",
                hidden: true,
            },
            Achievement {
                id: "rate_severe",
                title_key: "ach_rate_severe_title",
                desc_key: "ach_rate_severe_desc",
                icon: "😠",
                category_key: "ach_cat_critic",
                rarity: "rare",
                hidden: false,
            },
            Achievement {
                id: "rate_lover",
                title_key: "ach_rate_lover_title",
                desc_key: "ach_rate_lover_desc",
                icon: "❤️",
                category_key: "ach_cat_critic",
                rarity: "super_rare",
                hidden: false,
            },
            Achievement {
                id: "rate_generous",
                title_key: "ach_rate_generous_title",
                desc_key: "ach_rate_generous_desc",
                icon: "😘",
                category_key: "ach_cat_critic",
                rarity: "super_rare",
                hidden: false,
            },
            Achievement {
                id: "rate_average",
                title_key: "ach_rate_average_title",
                desc_key: "ach_rate_average_desc",
                icon: "⚖️",
                category_key: "ach_cat_critic",
                rarity: "rare",
                hidden: false,
            },
            Achievement {
                id: "rate_all",
                title_key: "ach_rate_all_title",
                desc_key: "ach_rate_all_desc",
                icon: "✅",
                category_key: "ach_cat_critic",
                rarity: "mythique",
                hidden: false,
            },
            // --- BRASSERIES & TYPES --- (7)
            Achievement {
                id: "type_ipa",
                title_key: "ach_type_ipa_title",
                desc_key: "ach_type_ipa_desc",
                icon: "🌿",
                category_key: "ach_cat_styles",
                rarity: "rare",
                hidden: false,
            },
            Achievement {
                id: "type_stout",
                title_key: "ach_type_stout_title",
                desc_key: "ach_type_stout_desc",
                icon: "🌑",
                category_key: "ach_cat_styles",
                rarity: "rare",
                hidden: false,
            },
            Achievement {
                id: "type_files",
                title_key: "ach_type_files_title",
                desc_key: "ach_type_files_desc",
                icon: "🍋",
                category_key: "ach_cat_styles",
                rarity: "super_rare",
                hidden: false,
            },
            Achievement {
                id: "type_white",
                title_key: "ach_type_white_title",
                desc_key: "ach_type_white_desc",
                icon: "❄️",
                category_key: "ach_cat_styles",
                rarity: "rare",
                hidden: false,
            },
            Achievement {
                id: "type_abbey",
                title_key: "ach_type_abbey_title",
                desc_key: "ach_type_abbey_desc",
                icon: "⛪",
                category_key: "ach_cat_styles",
                rarity: "rare",
                hidden: false,
            },
            Achievement {
                id: "type_fruit",
                title_key: "ach_type_fruit_title",
                desc_key: "ach_type_fruit_desc",
                icon: "🍎",
                category_key: "ach_cat_styles",
                rarity: "rare",
                hidden: false,
            },
            Achievement {
                id: "brew_trappiste",
                title_key: "ach_brew_trappiste_title",
                desc_key: "ach_brew_trappiste_desc",
                icon: "✝️",
                category_key: "ach_cat_styles",
                rarity: "rare",
                hidden: false,
            },
            // --- TRAPPEURS --- (2)
            Achievement {
                id: "trappist_belgian",
                title_key: "ach_trappist_belgian_title",
                desc_key: "ach_trappist_belgian_desc",
                icon: "💣",
                category_key: "ach_cat_styles",
                rarity: "epique",
                hidden: false,
            },
            Achievement {
                id: "trappist_world",
                title_key: "ach_trappist_world_title",
                desc_key: "ach_trappist_world_desc",
                icon: "🌍",
                category_key: "ach_cat_styles",
                rarity: "mythique",
                hidden: false,
            },
            // --- FUN / HIDDEN --- (11)
            Achievement {
                id: "fun_names",
                title_key: "ach_fun_names_title",
                desc_key: "ach_fun_names_desc",
                icon: "🔤",
                category_key: "ach_cat_fun",
                rarity: "commun",
                hidden: false,
            },
            Achievement {
                id: "fun_z",
                title_key: "ach_fun_z_title",
                desc_key: "ach_fun_z_desc",
                icon: "🎭",
                category_key: "ach_cat_fun",
                rarity: "rare",
                hidden: true,
            },
            Achievement {
                id: "fun_q",
                title_key: "ach_fun_q_title",
                desc_key: "ach_fun_q_desc",
                icon: "🦅",
                category_key: "ach_cat_fun",
                rarity: "rare",
                hidden: true,
            },
            Achievement {
                id: "fun_x",
                title_key: "ach_fun_x_title",
                desc_key: "ach_fun_x_desc",
                icon: "❌",
                category_key: "ach_cat_fun",
                rarity: "rare",
                hidden: true,
            },
            Achievement {
                id: "fun_long",
                title_key: "ach_fun_long_title",
                desc_key: "ach_fun_long_desc",
                icon: "📜",
                category_key: "ach_cat_fun",
                rarity: "super_rare",
                hidden: false,
            },
            Achievement {
                id: "fun_short",
                title_key: "ach_fun_short_title",
                desc_key: "ach_fun_short_desc",
                icon: "🤏",
                category_key: "ach_cat_fun",
                rarity: "super_rare",
                hidden: false,
            },
            Achievement {
                id: "fun_custom",
                title_key: "ach_fun_custom_title",
                desc_key: "ach_fun_custom_desc",
                icon: "⚗️",
                category_key: "ach_cat_fun",
                rarity: "super_rare",
                hidden: false,
            },
            Achievement {
                id: "fun_custom_10",
                title_key: "ach_fun_custom_10_title",
                desc_key: "ach_fun_custom_10_desc",
                icon: "🏭",
                category_key: "ach_cat_fun",
                rarity: "epique",
                hidden: false,
            },
            Achievement {
                id: "fun_photo",
                title_key: "ach_fun_photo_title",
                desc_key: "ach_fun_photo_desc",
                icon: "📷",
                category_key: "ach_cat_fun",
                rarity: "super_rare",
                hidden: false,
            },
            Achievement {
                id: "secret_1",
                title_key: "ach_secret_1_title",
                desc_key: "ach_secret_1_desc",
                icon: "🐛",
                category_key: "ach_cat_fun",
                rarity: "mythique",
                hidden: true,
            },
            Achievement {
                id: "troll_lol_lol",
                title_key: "ach_troll_lol_lol_title",
                desc_key: "ach_troll_lol_lol_desc",
                icon: "🤡",
                category_key: "ach_cat_fun",
                rarity: "ultra_legendaire",
                hidden: true,
            },
            // --- RARETÉ --- (10)
            Achievement {
                id: "rare_hunter",
                title_key: "ach_rare_hunter_title",
                desc_key: "ach_rare_hunter_desc",
                icon: "💎",
                category_key: "ach_cat_rarity",
                rarity: "rare",
                hidden: false,
            },
            Achievement {
                id: "rare_elite",
                title_key: "ach_rare_elite_title",
                desc_key: "ach_rare_elite_desc",
                icon: "💰",
                category_key: "ach_cat_rarity",
                rarity: "super_rare",
                hidden: false,
            },
            Achievement {
                id: "super_rare_1",
                title_key: "ach_super_rare_1_title",
                desc_key: "ach_super_rare_1_desc",
                icon: "🍀",
                category_key: "ach_cat_rarity",
                rarity: "super_rare",
                hidden: false,
            },
            Achievement {
                id: "super_rare_5",
                title_key: "ach_super_rare_5_title",
                desc_key: "ach_super_rare_5_desc",
                icon: "📦",
                category_key: "ach_cat_rarity",
                rarity: "epique",
                hidden: false,
            },
            Achievement {
                id: "epique_1",
                title_key: "ach_epique_1_title",
                desc_key: "ach_epique_1_desc",
                icon: "🐉",
                category_key: "ach_cat_rarity",
                rarity: "epique",
                hidden: false,
            },
            Achievement {
                id: "mythique_1",
                title_key: "ach_mythique_1_title",
                desc_key: "ach_mythique_1_desc",
                icon: "🧙",
                category_key: "ach_cat_rarity",
                rarity: "mythique",
                hidden: false,
            },
            Achievement {
                id: "legendaire_1",
                title_key: "ach_legendaire_1_title",
                desc_key: "ach_legendaire_1_desc",
                icon: "🏆",
                category_key: "ach_cat_rarity",
                rarity: "legendaire",
                hidden: false,
            },
            Achievement {
                id: "ultra_1",
                title_key: "ach_ultra_1_title",
                desc_key: "ach_ultra_1_desc",
                icon: "☀️",
                category_key: "ach_cat_rarity",
                rarity: "ultra_legendaire",
                hidden: false,
            },
            Achievement {
                id: "fondateur_1",
                title_key: "ach_fondateur_1_title",
                desc_key: "ach_fondateur_1_desc",
                icon: "🌌",
                category_key: "ach_cat_rarity",
                rarity: "fondateur",
                hidden: true,
            },
            Achievement {
                id: "rarity_master",
                title_key: "ach_rarity_master_title",
                desc_key: "ach_rarity_master_desc",
                icon: "👑",
                category_key: "ach_cat_rarity",
                rarity: "legendaire",
                hidden: false,
            },
            // --- TEMPS & SOBRIÉTÉ --- (6)
            Achievement {
                id: "time_matin",
                title_key: "ach_time_matin_title",
                desc_key: "ach_time_matin_desc",
                icon: "🌅",
                category_key: "ach_cat_time",
                rarity: "mythique",
                hidden: false,
            },
            Achievement {
                id: "time_midi",
                title_key: "ach_time_midi_title",
                desc_key: "ach_time_midi_desc",
                icon: "☀️",
                category_key: "ach_cat_time",
                rarity: "rare",
                hidden: false,
            },
            Achievement {
                id: "time_aprem",
                title_key: "ach_time_aprem_title",
                desc_key: "ach_time_aprem_desc",
                icon: "🌤️",
                category_key: "ach_cat_time",
                rarity: "commun",
                hidden: false,
            },
            Achievement {
                id: "time_soir",
                title_key: "ach_time_soir_title",
                desc_key: "ach_time_soir_desc",
                icon: "🌆",
                category_key: "ach_cat_time",
                rarity: "commun",
                hidden: false,
            },
            Achievement {
                id: "time_nuit",
                title_key: "ach_time_nuit_title",
                desc_key: "ach_time_nuit_desc",
                icon: "🦉",
                category_key: "ach_cat_time",
                rarity: "epique",
                hidden: false,
            },
            Achievement {
                id: "sobriety_tournee",
                title_key: "ach_sobriety_tournee_title",
                desc_key: "ach_sobriety_tournee_desc",
                icon: "💧",
                category_key: "ach_cat_time",
                rarity: "epique",
                hidden: false,
            },
            // --- UX & EXPLORATEUR --- (7)
            Achievement {
                id: "ux_tutorial",
                title_key: "ach_ux_tutorial_title",
                desc_key: "ach_ux_tutorial_desc",
                icon: "🎓",
                category_key: "ach_cat_ux",
                rarity: "commun",
                hidden: false,
            },
            Achievement {
                id: "ux_bac",
                title_key: "ach_ux_bac_title",
                desc_key: "ach_ux_bac_desc",
                icon: "🩸",
                category_key: "ach_cat_ux",
                rarity: "commun",
                hidden: false,
            },
            Achievement {
                id: "ux_theme",
                title_key: "ach_ux_theme_title",
                desc_key: "ach_ux_theme_desc",
                icon: "🎨",
                category_key: "ach_cat_ux",
                rarity: "commun",
                hidden: false,
            },
            Achievement {
                id: "ux_share",
                title_key: "ach_ux_share_title",
                desc_key: "ach_ux_share_desc",
                icon: "📤",
                category_key: "ach_cat_ux",
                rarity: "rare",
                hidden: false,
            },
            Achievement {
                id: "ux_museum",
                title_key: "ach_ux_museum_title",
                desc_key: "ach_ux_museum_desc",
                icon: "🏛️",
                category_key: "ach_cat_ux",
                rarity: "rare",
                hidden: false,
            },
            Achievement {
                id: "ux_dedup",
                title_key: "ach_ux_dedup_title",
                desc_key: "ach_ux_dedup_desc",
                icon: "🧹",
                category_key: "ach_cat_ux",
                rarity: "rare",
                hidden: false,
            },
            Achievement {
                id: "ux_support",
                title_key: "ach_ux_support_title",
                desc_key: "ach_ux_support_desc",
                icon: "☕",
                category_key: "ach_cat_ux",
                rarity: "epique",
                hidden: true,
            },
            // --- FORMATS --- (4)
            Achievement {
                id: "fill_1",
                title_key: "ach_fill_1_title",
                desc_key: "ach_fill_1_desc",
                icon: "👶",
                category_key: "ach_cat_formats",
                rarity: "commun",
                hidden: false,
            },
            Achievement {
                id: "fill_2",
                title_key: "ach_fill_2_title",
                desc_key: "ach_fill_2_desc",
                icon: "✓",
                category_key: "ach_cat_formats",
                rarity: "commun",
                hidden: false,
            },
            Achievement {
                id: "fill_3",
                title_key: "ach_fill_3_title",
                desc_key: "ach_fill_3_desc",
                icon: "🍺",
                category_key: "ach_cat_formats",
                rarity: "commun",
                hidden: false,
            },
            Achievement {
                id: "fill_4",
                title_key: "ach_fill_4_title",
                desc_key: "ach_fill_4_desc",
                icon: "🍾",
                category_key: "ach_cat_formats",
                rarity: "rare",
                hidden: false,
            },
            // --- FONDATEURS --- (3)
            Achievement {
                id: "founder_mark_1",
                title_key: "ach_founder_1_title",
                desc_key: "ach_founder_1_desc",
                icon: "🛡️",
                category_key: "ach_cat_founder",
                rarity: "fondateur",
                hidden: true,
            },
            Achievement {
                id: "founder_mark_2",
                title_key: "ach_founder_2_title",
                desc_key: "ach_founder_2_desc",
                icon: "⚜️",
                category_key: "ach_cat_founder",
                rarity: "fondateur",
                hidden: true,
            },
            Achievement {
                id: "founder_mark_3",
                title_key: "ach_founder_3_title",
                desc_key: "ach_founder_3_desc",
                icon: "👑",
                category_key: "ach_cat_founder",
                rarity: "fondateur",
                hidden: true,
            },
        ];

        // --- ALPHABET CHALLENGE (26) ---
        let alphabet = [
            'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q',
            'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z',
        ];
        for c in alphabet {
            let rarity = match c {
                'X' | 'Y' | 'Z' | 'Q' | 'W' => "super_rare",
                _ => "rare",
            };
            // Note: Box::leak string slice for static str lifetime
            let id: &'static str = Box::leak(format!("alpha_{}", c).into_boxed_str());
            let icon: &'static str = Box::leak(c.to_string().into_boxed_str());

            list.push(Achievement {
                id,
                title_key: "ach_alpha_title",
                desc_key: "ach_alpha_desc",
                icon,
                category_key: "ach_cat_alphabet",
                rarity,
                hidden: false,
            });
        }

        list
    }

    pub fn is_unlocked(id: &str, s: &UserAchievementStats) -> bool {
        match id {
            // Counter
            "c_1" => s.total_count >= 1,
            "c_5" => s.total_count >= 5,
            "c_10" => s.total_count >= 10,
            "c_25" => s.total_count >= 25,
            "c_50" => s.total_count >= 50,
            "c_69" => s.total_count >= 69,
            "c_75" => s.total_count >= 75,
            "c_100" => s.total_count >= 100,
            "c_150" => s.total_count >= 150,
            "c_200" => s.total_count >= 200,
            "c_300" => s.total_count >= 300,
            "c_420" => s.total_count >= 420,
            "c_500" => s.total_count >= 500,
            "c_666" => s.total_count >= 666,
            "c_1000" => s.total_count >= 1000,

            // Variety
            "v_5" => s.unique_count >= 5,
            "v_10" => s.unique_count >= 10,
            "v_20" => s.unique_count >= 20,
            "v_30" => s.unique_count >= 30,
            "v_40" => s.unique_count >= 40,
            "v_50" => s.unique_count >= 50,
            "v_75" => s.unique_count >= 75,
            "v_100" => s.unique_count >= 100,
            "v_200" => s.unique_count >= 200,
            "v_all" => s.unique_count >= 500,

            // Volume
            "vol_1" => s.total_liters >= 1.0,
            "vol_5" => s.total_liters >= 5.0,
            "vol_10" => s.total_liters >= 10.0,
            "vol_20" => s.total_liters >= 20.0,
            "vol_42" => s.total_liters >= 42.0,
            "vol_50" => s.total_liters >= 50.0,
            "vol_100" => s.total_liters >= 100.0,
            "vol_150" => s.total_liters >= 150.0,
            "vol_250" => s.total_liters >= 250.0,
            "vol_500" => s.total_liters >= 500.0,
            "vol_1000" => s.total_liters >= 1000.0,
            "vol_2000" => s.total_liters >= 2000.0,
            "vol_5000" => s.total_liters >= 5000.0,
            "vol_10000" => s.total_liters >= 10000.0,

            // Power / ABV
            "abv_light" => {
                s.degrees.iter().any(|&d| d > 0.0 && d < 2.0) || s.has_low_alcohol_string
            }
            "abv_std" => s.has_degree(5.0),
            "abv_strong" => s.max_degree >= 8.0,
            "abv_heavy" => s.max_degree >= 10.0,
            "abv_rocket" => s.max_degree >= 12.0,
            "abv_14" => s.max_degree >= 14.0,
            "abv_devil" => s.has_degree(6.66) || s.has_degree(6.6),
            "abv_zero" => s.has_degree(0.0),
            "abv_pi" | "abv_ pi" => s
                .degrees
                .iter()
                .any(|&d| (d - std::f64::consts::PI).abs() < 0.05),
            "abv_high_count" => s.strong_count >= 10,

            // Critic
            "rate_1" => s.rated_count >= 1,
            "rate_10" => s.rated_count >= 10,
            "rate_50" => s.rated_count >= 50,
            "rate_100" => s.rated_count >= 100,
            "rate_hater" => s.has_zero_rating,
            "rate_severe" => s.low_rating_count >= 5,
            "rate_lover" => s.has_perfect_rating,
            "rate_generous" => s.high_rating_count >= 10,
            "rate_average" => s.has_average_rating,
            "rate_all" => s.total_count > 10 && s.rated_count >= s.unique_count,

            // Styles & Abbeys
            "type_ipa" => s.count_by_type("ipa") >= 5,
            "type_stout" => s.count_by_type("stout") >= 5 || s.count_by_type("porter") >= 5,
            "type_files" => s.count_by_type("lambic") >= 3 || s.count_by_type("gueuze") >= 3,
            "type_white" => s.count_by_type("blanche") >= 5 || s.count_by_type("witbier") >= 5,
            "type_abbey" => s.count_by_type("abbaye") >= 5 || s.count_by_type("abbey") >= 5,
            "type_fruit" => s.fruit_count >= 5,
            "brew_trappiste" => s.unique_trappists.len() >= 3 || s.count_by_type("trappiste") >= 3,
            "trappist_belgian" => [
                "chimay",
                "orval",
                "rochefort",
                "westmalle",
                "westvleteren",
                "achel",
            ]
            .iter()
            .all(|b| {
                s.trappist_abbeys.contains(*b) || s.breweries.iter().any(|br| br.contains(*b))
            }),
            "trappist_world" => {
                s.trappist_abbeys.len() >= 12
                    || [
                        "chimay",
                        "orval",
                        "rochefort",
                        "westmalle",
                        "westvleteren",
                        "achel",
                        "la trappe",
                        "zundert",
                        "engelszell",
                        "spencer",
                        "tre fontane",
                        "tynt meadow",
                    ]
                    .iter()
                    .all(|b| {
                        s.trappist_abbeys.contains(*b)
                            || s.breweries.iter().any(|br| br.contains(*b))
                    })
            }

            // Fun & Hidden
            "fun_names" => s.first_letters.len() >= 5,
            "fun_z" => s.first_letters.contains(&'Z'),
            "fun_q" => s.first_letters.contains(&'Q'),
            "fun_x" => s.first_letters.contains(&'X'),
            "fun_long" => s.max_name_length >= 25,
            "fun_short" => s.min_name_length > 0 && s.min_name_length < 4,
            "fun_custom" => s.has_custom_beer,
            "fun_custom_10" => s.custom_count >= 10,
            "fun_photo" => s.has_custom_photo,
            "secret_1" => s.has_glitch,
            "troll_lol_lol" => s.has_rick_roll,

            // Rarity
            "rare_hunter" => s.count_by_rarity("rare") >= 1,
            "rare_elite" => s.count_by_rarity("rare") >= 5,
            "super_rare_1" => s.count_by_rarity("super_rare") >= 1,
            "super_rare_5" => s.count_by_rarity("super_rare") >= 5,
            "epique_1" => s.count_by_rarity("epique") >= 1,
            "mythique_1" => s.count_by_rarity("mythique") >= 1,
            "legendaire_1" => s.count_by_rarity("legendaire") >= 1,
            "ultra_1" => s.count_by_rarity("ultra_legendaire") >= 1,
            "fondateur_1" => s.count_by_rarity("fondateur") >= 1,
            "rarity_master" => {
                s.count_by_rarity("rare") >= 1
                    && s.count_by_rarity("super_rare") >= 1
                    && s.count_by_rarity("epique") >= 1
                    && s.count_by_rarity("mythique") >= 1
                    && s.count_by_rarity("legendaire") >= 1
            }

            // Time & Sobriety
            "time_matin" => s.time_matin > 0,
            "time_midi" => s.time_midi > 0,
            "time_aprem" => s.time_aprem > 0,
            "time_soir" => s.time_soir > 0,
            "time_nuit" => s.time_nuit > 0,
            "sobriety_tournee" => s.tournee_minerale,

            // UX
            "ux_tutorial" => s.prefs.tutorial_completed,
            "ux_bac" => s.prefs.bac_used,
            "ux_theme" => s.prefs.theme_changed,
            "ux_share" => s.prefs.theme_shared,
            "ux_museum" => s.prefs.museum_used,
            "ux_dedup" => s.prefs.dedup_used,
            "ux_support" => s.prefs.supported_dev,

            // Formats
            "fill_1" => s.volumes.contains(&250),
            "fill_2" => s.volumes.contains(&330),
            "fill_3" => s.volumes.contains(&500),
            "fill_4" => s.volumes.contains(&750),

            // Founders
            "founder_mark_1" => s.has_bloup_i,
            "founder_mark_2" => s.has_bloup_ii,
            "founder_mark_3" => s.has_bloup_definitive,

            // Alphabet A-Z
            other if other.starts_with("alpha_") => {
                let letter = other.strip_prefix("alpha_").unwrap();
                if let Some(c) = letter.chars().next() {
                    s.first_letters.contains(&c.to_ascii_uppercase())
                } else {
                    false
                }
            }

            _ => false,
        }
    }
}
