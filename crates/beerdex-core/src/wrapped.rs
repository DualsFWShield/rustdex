use crate::models::{Beer, UserBeerData};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TopBeerEntry {
    pub id: String,
    pub name: String,
    pub count: u32,
    pub image: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MonthStat {
    pub name: String,
    pub count: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EquivalenceStat {
    pub label: String,
    pub value: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WrappedStats {
    pub total_beers: u32,
    pub total_liters: u32,
    pub unique_beers: u32,
    pub favorite_beer: Option<TopBeerEntry>,
    pub favorite_style: String,
    pub favorite_brewery: Option<String>,
    pub top_month: Option<MonthStat>,
    pub equivalence: EquivalenceStat,
}

pub fn calculate_wrapped_stats(
    user_data: &HashMap<String, UserBeerData>,
    all_beers: &[Beer],
) -> WrappedStats {
    let mut total_beers = 0u32;
    let mut total_volume_ml = 0u64;
    let mut unique_beers = 0u32;
    let mut beer_counts: Vec<TopBeerEntry> = Vec::new();
    let mut styles: HashMap<String, u32> = HashMap::new();
    let mut breweries: HashMap<String, u32> = HashMap::new();
    let mut months: HashMap<u32, u32> = HashMap::new();

    let beer_map: HashMap<String, &Beer> = all_beers.iter().map(|b| (b.resolved_id(), b)).collect();

    for (id, data) in user_data {
        if data.count == 0 {
            continue;
        }

        unique_beers += 1;
        total_beers += data.count;

        let beer_obj = beer_map.get(id);

        if let Some(b) = beer_obj {
            beer_counts.push(TopBeerEntry {
                id: id.clone(),
                name: b.title.clone(),
                count: data.count,
                image: b.image.clone(),
            });

            if !b.brewery.trim().is_empty() {
                *breweries.entry(b.brewery.trim().to_string()).or_insert(0) += data.count;
            }

            let style_clean = b
                .beer_type
                .split('-')
                .next()
                .unwrap_or(&b.beer_type)
                .trim()
                .to_string();
            if !style_clean.is_empty() {
                *styles.entry(style_clean).or_insert(0) += data.count;
            }
        }

        if !data.history.is_empty() {
            for h in &data.history {
                total_volume_ml += h.volume as u64;
                let seconds = h.resolved_timestamp() / 1000;
                let month = (((seconds / 86400) / 30) % 12) as u32;
                *months.entry(month).or_insert(0) += 1;
            }
        } else {
            total_volume_ml += (data.count as u64) * 330;
        }
    }

    beer_counts.sort_by_key(|a| std::cmp::Reverse(a.count));
    let favorite_beer = beer_counts.first().cloned();

    let mut sorted_styles: Vec<_> = styles.into_iter().collect();
    sorted_styles.sort_by_key(|a| std::cmp::Reverse(a.1));
    let favorite_style = sorted_styles
        .first()
        .map(|s| s.0.clone())
        .unwrap_or_else(|| "Blonde".to_string());

    let mut sorted_breweries: Vec<_> = breweries.into_iter().collect();
    sorted_breweries.sort_by_key(|a| std::cmp::Reverse(a.1));
    let favorite_brewery = sorted_breweries.first().map(|b| b.0.clone());

    let month_names = [
        "Janvier",
        "Février",
        "Mars",
        "Avril",
        "Mai",
        "Juin",
        "Juillet",
        "Août",
        "Septembre",
        "Octobre",
        "Novembre",
        "Décembre",
    ];
    let mut sorted_months: Vec<_> = months.into_iter().collect();
    sorted_months.sort_by_key(|a| std::cmp::Reverse(a.1));
    let top_month = sorted_months.first().map(|m| MonthStat {
        name: month_names
            .get(m.0 as usize)
            .copied()
            .unwrap_or("Août")
            .to_string(),
        count: m.1,
    });

    let total_liters = (total_volume_ml / 1000) as u32;
    let equivalence = if total_liters >= 1000 {
        EquivalenceStat {
            label: "Une piscine olympique de bière".to_string(),
            value: total_liters,
        }
    } else if total_liters >= 500 {
        EquivalenceStat {
            label: "Un jacuzzi entier".to_string(),
            value: total_liters,
        }
    } else if total_liters >= 300 {
        EquivalenceStat {
            label: "Un grand fût de chêne".to_string(),
            value: total_liters,
        }
    } else if total_liters >= 150 {
        EquivalenceStat {
            label: "Une baignoire remplie à ras bord".to_string(),
            value: total_liters,
        }
    } else if total_liters >= 50 {
        EquivalenceStat {
            label: "Un aquarium géant".to_string(),
            value: total_liters,
        }
    } else {
        EquivalenceStat {
            label: format!("{} bouteilles dégustées", total_liters * 2),
            value: total_liters,
        }
    };

    WrappedStats {
        total_beers,
        total_liters,
        unique_beers,
        favorite_beer,
        favorite_style,
        favorite_brewery,
        top_month,
        equivalence,
    }
}
