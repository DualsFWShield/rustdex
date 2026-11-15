use crate::models::Beer;
use serde::{Deserialize, Serialize};
use std::collections::{HashMap, HashSet};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RecommendationConfig {
    pub favorite_weight: f64,
    pub rated_good_weight: f64,
    pub rated_neutral_weight: f64,
    pub rated_bad_weight: f64,
    pub drunk_weight: f64,
    pub repeat_drink_bonus: f64,
    pub loyalty_threshold: u32,
    pub max_results: usize,
    pub max_per_brewery: usize,
    pub max_per_type: usize,
}

impl Default for RecommendationConfig {
    fn default() -> Self {
        Self {
            favorite_weight: 3.0,
            rated_good_weight: 1.5,
            rated_neutral_weight: 1.0,
            rated_bad_weight: -1.0,
            drunk_weight: 1.0,
            repeat_drink_bonus: 0.6,
            loyalty_threshold: 3,
            max_results: 20,
            max_per_brewery: 3,
            max_per_type: 6,
        }
    }
}

#[derive(Debug, Clone, Default)]
pub struct UserTasteProfile {
    pub type_affinities: HashMap<String, f64>,
    pub brewery_affinities: HashMap<String, f64>,
    pub ideal_abv: Option<f64>,
    pub total_consumed_count: u32,
    pub confidence: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RecommendationItem {
    pub beer_id: String,
    pub title: String,
    pub brewery: String,
    pub beer_type: String,
    pub score: f64,
    pub match_percentage: u32,
    pub reasons: Vec<String>,
}

pub struct RecommendationEngine {
    pub config: RecommendationConfig,
}

impl RecommendationEngine {
    pub fn new(config: Option<RecommendationConfig>) -> Self {
        Self {
            config: config.unwrap_or_default(),
        }
    }

    pub fn build_taste_profile(
        &self,
        drunk_beers: &[(Beer, u32, Option<f64>, bool)], // (Beer, count, score, favorite)
    ) -> UserTasteProfile {
        let mut profile = UserTasteProfile::default();
        let mut abv_sum = 0.0;
        let mut abv_weight = 0.0;

        for (beer, count, score, favorite) in drunk_beers {
            let mut weight = self.config.drunk_weight;
            if *favorite {
                weight += self.config.favorite_weight;
            }
            if let Some(s) = score {
                if *s >= 15.0 {
                    weight += self.config.rated_good_weight;
                } else if *s >= 10.0 {
                    weight += self.config.rated_neutral_weight;
                } else {
                    weight += self.config.rated_bad_weight;
                }
            }

            // Diminishing returns repeat factor: 1 + repeat_bonus * ln(count)
            let repeat_multiplier = if *count > 1 {
                1.0 + self.config.repeat_drink_bonus * (*count as f64).ln()
            } else {
                1.0
            };
            let effective_weight = weight * repeat_multiplier;

            let b_type = beer.beer_type.to_lowercase().trim().to_string();
            *profile.type_affinities.entry(b_type).or_insert(0.0) += effective_weight;

            let brewery = beer.brewery.to_lowercase().trim().to_string();
            *profile.brewery_affinities.entry(brewery).or_insert(0.0) += effective_weight;

            let abv = beer.parsed_abv();
            if abv > 0.0 {
                abv_sum += abv * effective_weight.max(0.1);
                abv_weight += effective_weight.max(0.1);
            }

            profile.total_consumed_count += count;
        }

        if abv_weight > 0.0 {
            profile.ideal_abv = Some(abv_sum / abv_weight);
        }

        profile.confidence = (drunk_beers.len() as f64 / 25.0).clamp(0.15, 1.0);
        profile
    }

    pub fn recommend(
        &self,
        candidates: &[Beer],
        profile: &UserTasteProfile,
        drunk_ids: &HashSet<String>,
    ) -> Vec<RecommendationItem> {
        let mut scored_items: Vec<RecommendationItem> = Vec::new();
        let mut brewery_counts: HashMap<String, usize> = HashMap::new();
        let mut type_counts: HashMap<String, usize> = HashMap::new();

        for beer in candidates {
            let id = beer.resolved_id();
            if drunk_ids.contains(&id) {
                continue;
            }

            let b_type = beer.beer_type.to_lowercase().trim().to_string();
            let brewery = beer.brewery.to_lowercase().trim().to_string();

            let type_score = profile.type_affinities.get(&b_type).copied().unwrap_or(0.0);
            let brew_score = profile
                .brewery_affinities
                .get(&brewery)
                .copied()
                .unwrap_or(0.0);

            let abv_diff = if let Some(ideal) = profile.ideal_abv {
                (beer.parsed_abv() - ideal).abs()
            } else {
                2.0
            };
            let abv_score = (5.0 - abv_diff).max(0.0);

            let mut reasons = Vec::new();
            if type_score > 2.0 {
                reasons.push(format!("Vous appréciez le style {}", beer.beer_type));
            }
            if brew_score > 2.0 {
                reasons.push(format!("Brasserie {} reconnue", beer.brewery));
            }
            if abv_diff < 0.8 {
                reasons.push("Taux d'alcool idéal selon vos goûts".to_string());
            }

            // Blended composite score
            let raw_score = (type_score * 0.45) + (brew_score * 0.35) + (abv_score * 0.20);
            let normalized_percentage = ((raw_score / 15.0).clamp(0.1, 0.99) * 100.0) as u32;

            scored_items.push(RecommendationItem {
                beer_id: id,
                title: beer.title.clone(),
                brewery: beer.brewery.clone(),
                beer_type: beer.beer_type.clone(),
                score: raw_score,
                match_percentage: normalized_percentage,
                reasons,
            });
        }

        // Sort descending by score
        scored_items.sort_by(|a, b| {
            b.score
                .partial_cmp(&a.score)
                .unwrap_or(std::cmp::Ordering::Equal)
        });

        // Diversity filters (max per brewery and style)
        let mut diverse_results = Vec::new();
        for item in scored_items {
            let b_count = brewery_counts.entry(item.brewery.clone()).or_insert(0);
            let t_count = type_counts.entry(item.beer_type.clone()).or_insert(0);

            if *b_count >= self.config.max_per_brewery || *t_count >= self.config.max_per_type {
                continue;
            }

            *b_count += 1;
            *t_count += 1;
            diverse_results.push(item);

            if diverse_results.len() >= self.config.max_results {
                break;
            }
        }

        diverse_results
    }
}
